import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getMyJobs } from '../api/jobs'
import { getMyCompany } from '../api/company'
import EmployerDashboard from './EmployerDashboard'
import MainLayout from '../layouts/MainLayout'

vi.mock('../api/jobs', () => ({ getMyJobs: vi.fn(), deleteJob: vi.fn() }))
vi.mock('../api/company', () => ({ getMyCompany: vi.fn() }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ data: { email: 'owner@example.com', company_membership: { role: 'owner' } } }) }))
vi.mock('../api/auth', () => ({ logoutUser: vi.fn() }))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const renderWithQuery = (ui: React.ReactNode, route = '/') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  </QueryClientProvider>,
)

describe('EmployerDashboard', () => {
  it('shows listing metrics and expanded job details', async () => {
    vi.mocked(getMyCompany).mockResolvedValue({ id: 1, name: 'Acme', created_at: '2026-08-01T00:00:00Z' })
    vi.mocked(getMyJobs).mockResolvedValue([{
      id: 7,
      title: 'Platform Engineer',
      description: 'Build reliable services for our growing platform.',
      location: 'Karachi 75500',
      created_at: '2026-08-20T00:00:00Z',
      salary_min: 120000,
      salary_max: 150000,
      employment_type: 'full-time',
      is_active: true,
      applications_count: 4,
    }])

    renderWithQuery(<EmployerDashboard />)

    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeTruthy()
    expect(screen.getByText('Platform Engineer')).toBeTruthy()
    expect(screen.getByText('Karachi 75500')).toBeTruthy()
    expect(screen.getByText('Full Time')).toBeTruthy()
    expect(screen.getByText('$120,000 – $150,000')).toBeTruthy()
    expect(screen.getAllByText('4 applicants').length).toBeGreaterThan(0)
  })
})

describe('saved navigation icon', () => {
  it('is filled on the applications route', () => {
    localStorage.setItem('token', 'test-token')
    renderWithQuery(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/applications" element={<p>Applications</p>} />
        </Route>
      </Routes>,
      '/applications',
    )

    const button = screen.getByTitle('My Applications')
    expect(button.querySelector('svg')?.classList.contains('fill-current')).toBe(true)
  })
})
