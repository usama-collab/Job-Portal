import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { requestPasswordReset } from '../api/auth'
import ForgotPassword from './ForgotPassword'

vi.mock('../api/auth', () => ({ requestPasswordReset: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('forgot password', () => {
  it('submits the email and shows a neutral check-email state', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ message: 'accepted' })
    const user = userEvent.setup()
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    await user.type(screen.getByLabelText('Email address'), 'person@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com')
    expect((await screen.findByRole('status')).textContent).toContain('Check your email')
  })

  it('explains throttling without exposing account status', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new axios.AxiosError('limited', undefined, undefined, undefined, { status: 429 } as never))
    const user = userEvent.setup()
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    await user.type(screen.getByLabelText('Email address'), 'person@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Too many requests')
  })
})
