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
  it('uses the compact solid message icon with a circular badge', async () => {
    const link = show('/jobs')
    expect(link.getAttribute('aria-current')).toBeNull()
    const icon = link.querySelector('[data-slot="message-icon"]')
    expect(icon?.classList.contains('h-6')).toBe(true)
    expect(icon?.getAttribute('fill')).toBe('none')
    expect(icon?.querySelector('path')?.classList.contains('fill-current')).toBe(true)
    expect(icon?.querySelector('g')?.getAttribute('transform')).toContain('scale(.833333)')
    await screen.findByText('3')
    const badge = link.querySelector('[data-slot="unread-badge"]')
    expect(badge?.classList.contains('h-4')).toBe(true)
    expect(badge?.classList.contains('min-w-4')).toBe(true)
    expect(badge?.classList.contains('right-0')).toBe(true)
    expect(badge?.classList.contains('top-0')).toBe(true)
  })

  it('highlights the message icon on messaging routes', () => {
    const link = show('/messages/8')
    expect(link.getAttribute('aria-current')).toBe('page')
    expect(link.classList.contains('text-blue-600')).toBe(true)
  })
})
