import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { startGoogleLogin } from '../lib/google-auth'
import Login from '../pages/Login'
import Register from '../pages/Register'

vi.mock('../lib/google-auth', () => ({ startGoogleLogin: vi.fn() }))
afterEach(cleanup)
it.each([Login, Register])('starts Google from the auth page', async (Page) => {
  vi.mocked(startGoogleLogin).mockResolvedValue(undefined)
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Page /></MemoryRouter></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
  expect(startGoogleLogin).toHaveBeenCalledOnce()
})
it('shows a retryable error when browser storage is blocked', async () => {
  vi.mocked(startGoogleLogin).mockRejectedValue(new Error('storage'))
  render(<MemoryRouter><Register /></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
  expect((await screen.findByRole('alert')).textContent).toContain('enable browser storage')
  expect(screen.getByRole('button', { name: 'Continue with Google' }).hasAttribute('disabled')).toBe(false)
})
