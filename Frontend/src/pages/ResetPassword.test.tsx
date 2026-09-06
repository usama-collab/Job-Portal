import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast, Toaster } from 'sonner'

import { resetPassword } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import ResetPassword from './ResetPassword'

vi.mock('../api/auth', () => ({ resetPassword: vi.fn() }))
const token = 'a'.repeat(43)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  act(() => { toast.dismiss(); useAuthStore.getState().logout() })
  window.history.replaceState(null, '', '/')
})

function mount(fragment = `#token=${token}`) {
  window.history.replaceState(null, '', `/reset-password${fragment}`)
  const client = new QueryClient()
  client.setQueryData(['profile-me', 'old-token'], { name: 'Old profile' })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<h1>Forgot page</h1>} />
          <Route path="/login" element={<h1>Login page</h1>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

describe('reset password', () => {
  it('removes the fragment, validates matching fields, and submits the token', async () => {
    vi.mocked(resetPassword).mockResolvedValue({ message: 'done' })
    useAuthStore.getState().login('old-access', 'old-refresh')
    const client = mount()
    expect(window.location.hash).toBe('')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText('Passwords do not match')).toBeTruthy()
    expect(resetPassword).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(resetPassword).toHaveBeenCalledWith(token, 'new-password')
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeTruthy()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(client.getQueryData(['profile-me', 'old-token'])).toBeUndefined()
  })

  it('rejects missing links and offers a new request', () => {
    mount('')
    expect(screen.getByRole('alert').textContent).toContain('This link can’t be used')
    expect(screen.getByRole('link', { name: 'Request a new reset link' }).getAttribute('href')).toBe('/forgot-password')
  })

  it('keeps entered values for retryable failures', async () => {
    const error = new axios.AxiosError('unavailable')
    vi.mocked(resetPassword).mockRejectedValue(error)
    mount()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'keep-me')
    await user.type(screen.getByLabelText('Confirm new password'), 'keep-me')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect((await screen.findByRole('alert')).textContent).toContain('details are still here')
    expect((screen.getByLabelText('New password') as HTMLInputElement).value).toBe('keep-me')
  })

  it('replaces the form when the backend rejects a used link', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new axios.AxiosError('invalid', undefined, undefined, undefined, { status: 400 } as never))
    mount()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('New password'), 'new')
    await user.type(screen.getByLabelText('Confirm new password'), 'new')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect((await screen.findByRole('alert')).textContent).toContain('This link can’t be used')
  })
})
