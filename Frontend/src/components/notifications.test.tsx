import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { NotificationBell } from './notification-bell'
import Notifications from '../pages/Notifications'
import { NotificationList } from './notification-list'
import { useUnreadCount } from '../hooks/useNotifications'
import { installNotificationSession, notificationScope, notificationWrite } from '../lib/notification-session'
import { useAuthStore } from '../store/authStore'
import * as api from '../api/notifications'
import type { Notification } from '../api/notifications'
import { toast } from 'sonner'

vi.mock('../api/notifications', () => ({
  getNotifications: vi.fn(), getUnreadCount: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
// Exercise notification behavior without JSDOM's slow portal/focus simulation.
// The actual Radix dropdown, keyboard dismissal, and mobile layout are covered
// by the browser smoke test against the real API.
vi.mock('./ui/popover', async () => {
  const { createContext, useContext, cloneElement } = await import('react')
  const Context = createContext<{ open: boolean, onOpenChange: (open: boolean) => void }>({ open: false, onOpenChange: () => {} })
  return {
    Popover: ({ children, open, onOpenChange }: { children: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) => <Context.Provider value={{ open, onOpenChange }}>{children}</Context.Provider>,
    PopoverTrigger: ({ children }: { children: React.ReactElement<{ onClick: () => void }> }) => {
      const state = useContext(Context)
      return cloneElement(children, { onClick: () => state.onOpenChange(!state.open) })
    },
    PopoverContent: ({ children }: { children: React.ReactNode }) => useContext(Context).open ? <div role="dialog">{children}</div> : null,
  }
})

const item: Notification = {
  id: 1, type: 'application_received', application_id: 8, job_id: 3, company_id: 2,
  title: 'New application', message: 'Ayesha applied for Engineer at Acme.',
  created_at: new Date().toISOString(), read_at: null,
  target_path: '/employer/jobs/3/applicants?applicationId=8',
}
function token(id: number) { return `e30.${btoa(JSON.stringify({ sub: String(id), exp: 9999999999 }))}.test` }
let client: QueryClient
let uninstall: () => void

beforeEach(() => {
  vi.resetAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  uninstall = installNotificationSession(client)
  useAuthStore.getState().login(token(1), 'refresh')
  vi.mocked(api.getUnreadCount).mockResolvedValue({ unread_count: 1 })
  vi.mocked(api.getNotifications).mockResolvedValue({ items: [item], next_cursor: null })
  vi.mocked(api.markNotificationRead).mockResolvedValue({ ...item, read_at: new Date().toISOString() })
  vi.mocked(api.markAllNotificationsRead).mockResolvedValue({ updated_count: 1 })
})

afterEach(() => {
  cleanup()
  useAuthStore.getState().logout()
  uninstall()
  client.clear()
  focusManager.setFocused(undefined)
  vi.useRealTimers()
})

function Location() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}{location.search}</p>
}
function show(component: React.ReactNode) {
  return render(<QueryClientProvider client={client}><MemoryRouter>{component}<Location /></MemoryRouter></QueryClientProvider>)
}

describe('notification experience', () => {
  it('loads count, opens dropdown without marking read, and links to inbox', async () => {
    show(<NotificationBell />)
    const button = await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    const badge = button.querySelector('[data-slot="unread-badge"]')
    expect(badge?.classList.contains('h-4')).toBe(true)
    expect(badge?.classList.contains('min-w-4')).toBe(true)
    expect(badge?.classList.contains('right-0')).toBe(true)
    expect(badge?.classList.contains('top-0')).toBe(true)
    expect(button.querySelector('svg')?.classList.contains('fill-current')).toBe(false)
    fireEvent.click(button)
    expect(button.querySelector('svg')?.classList.contains('fill-current')).toBe(true)
    expect(await screen.findByText(item.message)).toBeTruthy()
    expect(api.markNotificationRead).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'View all notifications' }).getAttribute('href')).toBe('/notifications')
    expect(api.getNotifications).toHaveBeenCalledWith(10, false, null, expect.any(AbortSignal))

    fireEvent.click(button)
    expect(screen.queryByText(item.message)).toBeNull()
    expect(button.querySelector('svg')?.classList.contains('fill-current')).toBe(false)
    expect(button.querySelector('svg')?.classList.contains('group-focus:fill-current')).toBe(false)
  })

  it('caps the visual badge while keeping an exact accessible count', async () => {
    vi.mocked(api.getUnreadCount).mockResolvedValue({ unread_count: 120 })
    show(<NotificationBell />)
    expect(await screen.findByRole('button', { name: 'Notifications, 120 unread' })).toBeTruthy()
    expect(screen.getByText('99+')).toBeTruthy()
  })

  it('marks a notification read before navigating to the application', async () => {
    show(<NotificationList items={[item]} />)
    fireEvent.click(screen.getByText(item.message))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(item.target_path))
    expect(api.markNotificationRead).toHaveBeenCalledWith(1, expect.anything())
  })

  it('allows navigation when marking read fails and reports the failure', async () => {
    vi.mocked(api.markNotificationRead).mockRejectedValue(new Error('Offline'))
    show(<NotificationList items={[item]} />)
    fireEvent.click(screen.getByText(item.message))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(item.target_path))
    expect(toast.error).toHaveBeenCalled()
    expect(screen.getByLabelText('Unread')).toBeTruthy()
  })

  it('marks all pages read and refreshes the count', async () => {
    show(<Notifications />)
    await screen.findByText(item.message)
    vi.mocked(api.getUnreadCount).mockResolvedValue({ unread_count: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Mark all as read' }) as HTMLButtonElement).disabled).toBe(true))
    expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it('supports cursor pagination and unread filtering', async () => {
    vi.mocked(api.getNotifications).mockImplementation(async (_limit, unreadOnly, cursor) => ({
      items: unreadOnly ? [] : cursor ? [{ ...item, id: 2, message: 'Older update', read_at: item.created_at }] : [item],
      next_cursor: !unreadOnly && !cursor ? 'next' : null,
    }))
    show(<Notifications />)
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('Older update')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unread' }))
    expect(await screen.findByText('You’re all caught up')).toBeTruthy()
    expect(screen.queryByText('Older update')).toBeNull()
  })

  it('retains an unavailable notification without navigating', () => {
    show(<NotificationList items={[{ ...item, target_path: null, read_at: item.created_at }]} />)
    expect(screen.getByText('Application no longer available')).toBeTruthy()
    fireEvent.click(screen.getByText(item.message))
    expect(screen.getByTestId('location').textContent).toBe('/')
  })

  it('hides the bell when logged out and clears private caches on account switch', async () => {
    show(<NotificationBell />)
    await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    const previous = notificationScope()
    act(() => useAuthStore.getState().logout())
    expect(screen.queryByRole('button', { name: /Notifications/ })).toBeNull()
    expect(client.getQueriesData({ queryKey: ['notifications', previous] })).toEqual([])
    act(() => useAuthStore.getState().login(token(2), 'other-refresh'))
    await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    expect(notificationScope()).not.toBe(previous)
  })

  it('cancels pending writes on account switch but preserves them on token refresh', () => {
    const pending = notificationWrite()
    const scope = notificationScope()
    act(() => useAuthStore.getState().login(token(1), 'rotated-refresh'))
    expect(notificationScope()).toBe(scope)
    expect(pending.signal.aborted).toBe(false)
    act(() => useAuthStore.getState().login(token(2), 'different-refresh'))
    expect(pending.signal.aborted).toBe(true)
    pending.release()
  })

  it('discards a late query response after account switching', async () => {
    let finish!: (value: { unread_count: number }) => void
    vi.mocked(api.getUnreadCount).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    show(<NotificationBell />)
    const oldScope = notificationScope()
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    await act(async () => {
      useAuthStore.getState().login(token(2), 'different-refresh')
      finish({ unread_count: 999 })
    })
    await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    expect(screen.queryByText('99+')).toBeNull()
    expect(client.getQueriesData({ queryKey: ['notifications', oldScope] })).toEqual([])
  })

  it('shows an error and supports retry without pretending the inbox is empty', async () => {
    vi.mocked(api.getNotifications).mockRejectedValue(new Error('offline'))
    show(<Notifications />)
    expect(await screen.findByText('Could not load notifications.', {}, { timeout: 2500 })).toBeTruthy()
    expect(screen.queryByText('You’re all caught up')).toBeNull()
    vi.mocked(api.getNotifications).mockResolvedValue({ items: [item], next_cursor: null })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText(item.message)).toBeTruthy()
  })

  it('does not navigate or show errors from a mutation completed after logout', async () => {
    let reject!: (reason: Error) => void
    vi.mocked(api.markNotificationRead).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    show(<NotificationList items={[item]} />)
    fireEvent.click(screen.getByText(item.message))
    await waitFor(() => expect(reject).toBeTypeOf('function'))
    await act(async () => {
      useAuthStore.getState().logout()
      reject(new Error('late failure'))
    })
    expect(screen.getByTestId('location').textContent).toBe('/')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('polls every 30 seconds and pauses while the window is hidden', async () => {
    vi.useFakeTimers()
    function Counter() { useUnreadCount(); return null }
    show(<Counter />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(api.getUnreadCount).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(api.getUnreadCount).toHaveBeenCalledTimes(2)
    act(() => focusManager.setFocused(false))
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(api.getUnreadCount).toHaveBeenCalledTimes(2)
    await act(async () => { focusManager.setFocused(true); await vi.advanceTimersByTimeAsync(0) })
    expect(api.getUnreadCount).toHaveBeenCalledTimes(3)
  })
})
