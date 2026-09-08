import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageNav } from './message-nav'
import { installNotificationSession } from '../lib/notification-session'
import { useAuthStore } from '../store/authStore'
import * as messages from '../api/messages'

vi.mock('../api/messages', () => ({ getMessageCount: vi.fn() }))

const token = `e30.${btoa(JSON.stringify({ sub: '1', exp: 9999999999 }))}.test`
let client: QueryClient
let uninstall: () => void

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  uninstall = installNotificationSession(client)
  useAuthStore.getState().login(token, 'refresh')
  vi.mocked(messages.getMessageCount).mockResolvedValue({ unread_count: 3 })
})

afterEach(() => {
  cleanup()
  useAuthStore.getState().logout()
  uninstall()
  client.clear()
})

function show(path: string) {
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><MessageNav /></MemoryRouter></QueryClientProvider>)
  return screen.getByRole('link', { name: /Messages/ })
}

describe('message navigation icon', () => {
  it('uses an outlined chat bubble away from messaging', () => {
    const link = show('/jobs')
    expect(link.getAttribute('aria-current')).toBeNull()
    expect(link.querySelector('path')?.classList.contains('fill-transparent')).toBe(true)
    expect(link.querySelectorAll('circle')).toHaveLength(3)
  })

  it('fills the chat bubble on messaging routes and supports a filled focus state', () => {
    const link = show('/messages/8')
    expect(link.getAttribute('aria-current')).toBe('page')
    expect(link.querySelector('path')?.classList.contains('fill-current')).toBe(true)
    expect(link.querySelector('path')?.classList.contains('group-focus-visible:fill-current')).toBe(true)
    expect(link.querySelector('circle')?.classList.contains('fill-white')).toBe(true)
  })
})
