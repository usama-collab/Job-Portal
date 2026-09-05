import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import ScrollToTop from './ScrollToTop'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const TestRoutes = () => {
  const navigate = useNavigate()

  return (
    <>
      <ScrollToTop />
      <Link to="/second">Second page</Link>
      <button onClick={() => navigate('?page=2')}>Change query</button>
      <Routes>
        <Route path="/first" element={<h1>First page</h1>} />
        <Route path="/second" element={<h1>Second page</h1>} />
      </Routes>
    </>
  )
}

describe('ScrollToTop', () => {
  it('scrolls to the top when the route pathname changes', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/first']}>
        <TestRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1))
    scrollTo.mockClear()
    await user.click(screen.getByRole('link', { name: 'Second page' }))

    await waitFor(() => expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    }))
  })

  it('does not alter scrolling for query-string navigation', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/first']}>
        <TestRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1))
    scrollTo.mockClear()
    await user.click(screen.getByRole('button', { name: 'Change query' }))

    expect(scrollTo).not.toHaveBeenCalled()
  })
})
