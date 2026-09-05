import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getAllJobs } from '../api/jobs'
import Jobs from './Jobs'
import Home from './Home'

vi.mock('../api/jobs', () => ({ getAllJobs: vi.fn() }))
afterEach(cleanup)

function Location() {
  return <output data-testid="url">{useLocation().search}</output>
}

function renderSearch(url: string) {
  vi.mocked(getAllJobs).mockResolvedValue(Array.from({ length: 5 }, (_, id) => ({
    id, title: 'Engineer', description: 'Build products', location: 'London SW1A 1AA',
    company_id: 1, created_at: '', is_active: true,
  })))
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('location search', () => {
  it('sends both filters from the homepage to job results', async () => {
    const user = renderSearch('/')
    await user.type(screen.getByLabelText('Job title, keywords, or company'), ' Engineer ')
    await user.type(screen.getByLabelText('City, ZIP or postal code'), ' SW1A 1AA ')
    await user.click(screen.getByRole('button', { name: 'Search jobs' }))
    await waitFor(() => expect(getAllJobs).toHaveBeenLastCalledWith('Engineer', 0, 5, 'SW1A 1AA'))
  })

  it('preserves location on pagination and resets the page for a new location', async () => {
    const user = renderSearch('/jobs?q=Engineer&location=London')
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await waitFor(() => expect(getAllJobs).toHaveBeenLastCalledWith('Engineer', 5, 5, 'London'))
    await user.clear(screen.getByLabelText('City, ZIP or postal code'))
    await user.type(screen.getByLabelText('City, ZIP or postal code'), '10001{Enter}')
    await waitFor(() => expect(getAllJobs).toHaveBeenLastCalledWith('Engineer', 0, 5, '10001'))
    expect(screen.getByTestId('url').textContent).toContain('page=1')
  })

  it('supports location-only searches and clearing the location', async () => {
    const user = renderSearch('/jobs?location=Karachi')
    await waitFor(() => expect(getAllJobs).toHaveBeenLastCalledWith('', 0, 5, 'Karachi'))
    await user.clear(screen.getByLabelText('City, ZIP or postal code'))
    await user.click(screen.getByRole('button', { name: 'Find Jobs' }))
    await waitFor(() => expect(getAllJobs).toHaveBeenLastCalledWith('', 0, 5, ''))
    expect(screen.getByTestId('url').textContent).not.toContain('location=')
  })
})
