import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { loginUser } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Login from './Login'

vi.mock('../api/auth', () => ({ loginUser: vi.fn() }))

afterEach(() => {
  act(() => {
    toast.dismiss()
    useAuthStore.getState().logout()
  })
  cleanup()
  vi.clearAllMocks()
})

function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/jobs" element={<h1>Jobs page</h1>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('login notification', () => {
  it('shows a welcome notification after a successful login and redirect', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      access_token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.',
      refresh_token: 'refresh-token',
    })

    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Email address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'test-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Jobs page' })).toBeTruthy()
    expect(await screen.findByText('Welcome back')).toBeTruthy()
  })
})
