import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import { registerUser } from '../api/auth'
import Register from './Register'

vi.mock('../api/auth', () => ({ registerUser: vi.fn() }))

afterEach(() => {
  act(() => { toast.dismiss() })
  cleanup()
})

async function submitRegistration(confirmPassword = 'test-password') {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
      <Toaster />
    </MemoryRouter>,
  )
  await user.type(screen.getByLabelText('Full name'), 'Test User')
  await user.type(screen.getByLabelText('Email address'), 'test@example.com')
  await user.type(screen.getByLabelText('Password', { exact: true }), 'test-password')
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Register' }))
}

describe('registration notification', () => {
  it('waits for successful registration and keeps the notification visible after redirect', async () => {
    let resolveRegistration!: (value: unknown) => void
    vi.mocked(registerUser).mockReturnValue(new Promise((resolve) => {
      resolveRegistration = resolve
    }))

    await submitRegistration()

    expect(registerUser).toHaveBeenCalledExactlyOnceWith({
      name: 'Test User', email: 'test@example.com', password: 'test-password',
    })
    expect(screen.queryByText('Account created. Please verify your email')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Login page' })).toBeNull()

    await act(async () => { resolveRegistration({}) })

    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeTruthy()
    expect(await screen.findByText('Account created. Please verify your email')).toBeTruthy()
  })

  it('shows an error without a success notification or redirect when registration fails', async () => {
    vi.mocked(registerUser).mockRejectedValue(new Error('Registration failed'))

    await submitRegistration()

    expect(await screen.findByText('Registration failed. Please try a different email.')).toBeTruthy()
    expect(screen.queryByText('Account created. Please verify your email')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Login page' })).toBeNull()
  })

  it('does not register or show success when passwords do not match', async () => {
    await submitRegistration('different-password')

    expect(await screen.findByText('Passwords do not match')).toBeTruthy()
    expect(registerUser).not.toHaveBeenCalled()
    expect(screen.queryByText('Account created. Please verify your email')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Login page' })).toBeNull()
  })
})
