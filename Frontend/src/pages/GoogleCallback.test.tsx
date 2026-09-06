import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { toast, Toaster } from 'sonner'
import api from '../api/axios'
import { GOOGLE_VERIFIER_KEY } from '../lib/google-auth'
import { useAuthStore } from '../store/authStore'
import GoogleCallback from './GoogleCallback'

vi.mock('../api/axios', () => ({ default: { post: vi.fn() } }))
const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  act(() => { toast.dismiss(); useAuthStore.getState().logout() })
  window.history.replaceState(null, '', '/')
})
function mount(fragment = '#code=handoff', verifier = 'verifier') {
  window.history.replaceState(null, '', '/auth/google/callback' + fragment)
  if (verifier) sessionStorage.setItem(GOOGLE_VERIFIER_KEY, verifier)
  const client = new QueryClient()
  client.setQueryData(['profile-me'], { name: 'Previous account' })
  render(<StrictMode><QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/auth/google/callback']}><Routes>
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/jobs" element={<h1>Jobs page</h1>} />
    </Routes><Toaster /></MemoryRouter>
  </QueryClientProvider></StrictMode>)
  return client
}
it('exchanges once in Strict Mode, clears fragment and profile, saves session and welcomes', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { access_token: token, refresh_token: 'refresh' } })
  const client = mount()
  expect(window.location.hash).toBe('')
  expect(await screen.findByText('Jobs page')).toBeTruthy()
  expect(await screen.findByText('Welcome back')).toBeTruthy()
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/googleauth/exchange', { code: 'handoff', verifier: 'verifier' }, { skipAuthRefresh: true })
  expect(sessionStorage.getItem(GOOGLE_VERIFIER_KEY)).toBeNull()
  expect(client.getQueryData(['profile-me'])).toBeUndefined()
  expect(useAuthStore.getState().token).toBe(token)
})
it('offers login retry after exchange failure', async () => {
  vi.mocked(api.post).mockRejectedValue(new Error('expired'))
  mount()
  expect((await screen.findByRole('alert')).textContent).toContain('expired')
  expect(screen.getByRole('link').getAttribute('href')).toBe('/login')
})
it('rejects a missing browser verifier without exchanging', async () => {
  mount('#code=handoff', '')
  expect((await screen.findByRole('alert')).textContent).toContain('browser tab')
  expect(api.post).not.toHaveBeenCalled()
})
it('handles cancellation', async () => {
  mount('#error=cancelled')
  expect((await screen.findByRole('alert')).textContent).toContain('cancelled')
  expect(api.post).not.toHaveBeenCalled()
})
it('rejects an invalid session', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { access_token: 'invalid', refresh_token: 'refresh' } })
  mount()
  expect((await screen.findByRole('alert')).textContent).toContain('invalid session')
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(localStorage.getItem('token')).toBeNull()
})
it('handles storage failure without a partial session', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { access_token: token, refresh_token: 'refresh' } })
  mount()
  const setItem = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === 'refresh_token') throw new Error('storage blocked')
    setItem.call(this, key, value)
  })
  expect((await screen.findByRole('alert')).textContent).toContain('could not be saved')
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(localStorage.getItem('token')).toBeNull()
})
