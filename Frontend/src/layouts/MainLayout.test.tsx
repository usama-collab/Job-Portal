import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MainLayout from './MainLayout'

const profileMock = vi.hoisted(() => ({
  data: undefined as undefined | {
    email: string
    company_membership?: { role: string }
  },
}))

vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ data: profileMock.data }) }))
vi.mock('../api/auth', () => ({ logoutUser: vi.fn() }))

beforeEach(() => {
  profileMock.data = undefined
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderLayout(route = '/') {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="*" element={<p>Page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function expectMobileMenuTrigger() {
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
  expect(trigger.className).toContain('md:hidden')
}

describe('mobile navigation', () => {
  it('provides a mobile menu trigger and preserves signed-out actions', () => {
    renderLayout()
    expectMobileMenuTrigger()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    const mobileNavigation = document.querySelector('nav[aria-label="Mobile navigation"]') as HTMLElement
    expect(mobileNavigation).toBeTruthy()
    expect(within(mobileNavigation).getByRole('link', { name: 'Find Jobs' }).getAttribute('href')).toBe('/jobs')
    expect(within(mobileNavigation).getByRole('link', { name: 'Sign in' })).toBeTruthy()
    expect(within(mobileNavigation).getByRole('link', { name: 'Get Started' })).toBeTruthy()
    expect(within(mobileNavigation).queryByRole('link', { name: 'Start recruiting' })).toBeNull()
  })

  it('links signed-in job seekers to employer onboarding', () => {
    localStorage.setItem('token', 'test-token')
    profileMock.data = { email: 'seeker@example.com' }

    renderLayout()
    expectMobileMenuTrigger()
    const recruitingLink = screen.getByRole('link', { name: 'Start recruiting' })

    expect(recruitingLink.getAttribute('href')).toBe('/employer/onboarding')
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  })

  it('links company members to the recruiting dashboard', () => {
    localStorage.setItem('token', 'test-token')
    profileMock.data = { email: 'owner@example.com', company_membership: { role: 'owner' } }

    renderLayout()
    expectMobileMenuTrigger()
    const recruitingLink = screen.getByRole('link', { name: 'Recruiting' })

    expect(recruitingLink.getAttribute('href')).toBe('/employer/dashboard')
    expect(screen.queryByRole('link', { name: 'Start recruiting' })).toBeNull()
  })
})
