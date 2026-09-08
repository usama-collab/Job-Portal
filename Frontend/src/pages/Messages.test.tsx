import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError } from 'axios'
import Messages from './Messages'
import { mergeMessages } from '../lib/messages'
import * as api from '../api/messages'
import { installNotificationSession, notificationScope } from '../lib/notification-session'
import { useAuthStore } from '../store/authStore'

vi.mock('../api/messages', () => ({ getConversation: vi.fn(), getConversations: vi.fn(), getMessages: vi.fn(), sendMessage: vi.fn(), readConversation: vi.fn(), getMessageCount: vi.fn() }))
const message: api.Message = { id: 1, sender_id: 2, sender_name: 'Employer', body: 'Interview invitation', created_at: '2026-09-08T10:00:00Z' }
const conversation: api.Conversation = { application_id: 8, conversation_id: 1, job_id: 3, job_title: 'Engineer', company_name: 'Acme', applicant_name: 'Applicant', status: 'applied', latest_message: message, unread_count: 1 }
let client: QueryClient
let uninstall: () => void
const token = (id: number) => `e30.${btoa(JSON.stringify({ sub: String(id), exp: 9999999999 }))}.test`

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  uninstall = installNotificationSession(client)
  useAuthStore.getState().login(token(1), 'refresh')
  vi.mocked(api.getConversations).mockResolvedValue({ items: [conversation], next_cursor: null })
  vi.mocked(api.getConversation).mockResolvedValue(conversation)
  vi.mocked(api.getMessages).mockImplementation(async (_id, params) => ({ items: params?.after_id ? [] : [message], next_before_id: null, next_after_id: null }))
  vi.mocked(api.readConversation).mockImplementation(async (_id, messageId) => ({ last_read_message_id: messageId }))
  vi.mocked(api.sendMessage).mockResolvedValue({ ...message, id: 2, sender_id: 1 })
})
afterEach(() => { cleanup(); useAuthStore.getState().logout(); uninstall(); client.clear(); vi.restoreAllMocks(); vi.useRealTimers() })
function show(path = '/messages/8') {
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/messages" element={<Messages />} /><Route path="/messages/:applicationId" element={<Messages />} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('application messaging', () => {
  it('opens an inbox thread and acknowledges only the displayed message position', async () => {
    show('/messages')
    fireEvent.click(await screen.findByRole('link', { name: /Engineer/ }))
    await screen.findByLabelText('Message')
    await waitFor(() => expect(api.readConversation).toHaveBeenCalledWith(8, 1))
    expect(api.getMessages).toHaveBeenCalledWith(8, {}, expect.any(AbortSignal))
  })

  it('keeps drafts on failure and reuses the UUID for an uncertain send retry', async () => {
    vi.mocked(api.sendMessage).mockRejectedValueOnce(new Error('network'))
    show()
    const input = await screen.findByLabelText('Message')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy())
    fireEvent.change(input, { target: { value: 'Hello employer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await screen.findByRole('alert')
    expect((input as HTMLTextAreaElement).value).toBe('Hello employer')
    const uuid = vi.mocked(api.sendMessage).mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(2))
    expect(vi.mocked(api.sendMessage).mock.calls[1]).toEqual([8, 'Hello employer', uuid])
    await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe(''))
  })

  it('does not acknowledge history in an unfocused tab', async () => {
    vi.mocked(document.hasFocus).mockReturnValue(false)
    show()
    await screen.findByText('Employer')
    expect(api.readConversation).not.toHaveBeenCalled()
    vi.mocked(document.hasFocus).mockReturnValue(true)
    fireEvent(window, new Event('focus'))
    await waitFor(() => expect(api.readConversation).toHaveBeenCalledWith(8, 1))
  })

  it('clears private history and drafts on account changes', async () => {
    show()
    const input = await screen.findByLabelText('Message')
    fireEvent.change(input, { target: { value: 'Private draft' } })
    const oldScope = notificationScope()
    vi.mocked(api.getMessages).mockResolvedValue({ items: [], next_before_id: null, next_after_id: null })
    act(() => useAuthStore.getState().login(token(3), 'another-refresh'))
    await waitFor(() => expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe(''))
    expect(client.getQueriesData({ queryKey: ['messaging', oldScope] })).toEqual([])
    expect(screen.queryByText('Employer')).toBeNull()
  })

  it('removes the composer when access is revoked', async () => {
    show()
    await screen.findByText('Employer')
    const error = new AxiosError('not found', '404', undefined, undefined, { status: 404 } as never)
    vi.mocked(api.getMessages).mockRejectedValue(error)
    await act(async () => { await client.invalidateQueries({ queryKey: ['messaging', notificationScope(), 'thread', 8] }) })
    await screen.findByText('This conversation is no longer available.')
    expect(screen.queryByLabelText('Message')).toBeNull()
    expect(screen.queryByText('Employer')).toBeNull()
  })

  it('merges catch-up pages without duplicate messages or changing chronological order', () => {
    expect(mergeMessages([{ ...message, id: 3 }, message], [message, { ...message, id: 2 }]).map((m) => m.id)).toEqual([1, 2, 3])
  })

  it('fetches every catch-up page before advancing the message history', async () => {
    vi.mocked(document.hasFocus).mockReturnValue(false)
    show()
    await screen.findByText('Employer')
    vi.mocked(api.getMessages).mockImplementation(async (_id, params) => {
      if (params?.after_id === 1) return { items: [{ ...message, id: 2, body: 'Second' }], next_after_id: 2, next_before_id: null }
      if (params?.after_id === 2) return { items: [{ ...message, id: 3, body: 'Third' }], next_after_id: null, next_before_id: null }
      return { items: [], next_after_id: null, next_before_id: null }
    })
    await act(async () => { await client.invalidateQueries({ queryKey: ['messaging', notificationScope(), 'thread', 8, 'history'] }) })
    expect(await screen.findByText('Second')).toBeTruthy()
    expect(screen.getByText('Third')).toBeTruthy()
    expect(screen.getByLabelText('Message history').querySelectorAll('article')).toHaveLength(3)
    expect(api.readConversation).not.toHaveBeenCalled()
  })

  it('renders hostile text literally and does not acknowledge while reading older history', async () => {
    vi.mocked(api.getMessages).mockResolvedValue({ items: [{ ...message, body: '<img src=x onerror=alert(1)>' }], next_after_id: null, next_before_id: null })
    show()
    await screen.findByText('<img src=x onerror=alert(1)>')
    await waitFor(() => expect(api.readConversation).toHaveBeenCalledWith(8, 1))
    const history = screen.getByLabelText('Message history')
    expect(history.querySelector('img')).toBeNull()
    Object.defineProperties(history, { scrollHeight: { value: 1000, configurable: true }, clientHeight: { value: 300, configurable: true }, scrollTop: { value: 0, writable: true, configurable: true } })
    fireEvent.scroll(history)
    vi.mocked(api.getMessages).mockResolvedValue({ items: [{ ...message, id: 2, body: 'Unread new arrival' }], next_after_id: null, next_before_id: null })
    await act(async () => { await client.invalidateQueries({ queryKey: ['messaging', notificationScope(), 'thread', 8, 'history'] }) })
    await screen.findByText('Unread new arrival')
    expect(api.readConversation).not.toHaveBeenCalledWith(8, 2)
    fireEvent.click(screen.getByRole('button', { name: 'New messages / jump to latest' }))
    await waitFor(() => expect(api.readConversation).toHaveBeenCalledWith(8, 2))
  })
})
