import { lazy, StrictMode, useEffect, type ComponentType } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { PageLoadingProvider } from './page-loading'
import { useInitialPageLoading, usePageLoading } from '../lib/page-loading'
import { LazyPage } from '../routes/LazyPage'

function Wait({ pending = true }: { pending?: boolean }) {
  usePageLoading(pending)
  return <p>Page shell</p>
}

function InitialWait({ pending }: { pending: boolean }) {
  useInitialPageLoading(pending)
  return <p>{pending ? 'Local feedback' : 'Page ready'}</p>
}

const loader = () => screen.queryByRole('status', { name: 'Loading page' })
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('delayed page loading', () => {
  it('does not flash for work completed before 200ms', async () => {
    const view = render(<PageLoadingProvider><Wait /></PageLoadingProvider>)
    await advance(199)
    expect(loader()).toBeNull()
    view.rerender(<PageLoadingProvider><Wait pending={false} /></PageLoadingProvider>)
    await advance(1000)
    expect(loader()).toBeNull()
  })

  it('shows once after 200ms, keeps it visible for 250ms, and restores interaction', async () => {
    document.body.style.overflow = 'auto'
    const view = render(<PageLoadingProvider><Wait /></PageLoadingProvider>)
    await advance(200)
    expect(loader()).toBeTruthy()
    expect(screen.getByText('Page shell').parentElement?.hasAttribute('inert')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    view.rerender(<PageLoadingProvider><Wait pending={false} /></PageLoadingProvider>)
    await advance(249)
    expect(loader()).toBeTruthy()
    await advance(1)
    expect(loader()).toBeNull()
    expect(screen.getByText('Page shell').parentElement?.hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('auto')
    document.body.style.overflow = ''
  })

  it('coalesces fallback-to-data handoffs and waits for all owners', async () => {
    const view = render(<PageLoadingProvider><Wait key="chunk" /></PageLoadingProvider>)
    await advance(150)
    view.rerender(<PageLoadingProvider><Wait key="data" /><Wait key="guard" /></PageLoadingProvider>)
    await advance(50)
    expect(loader()).toBeTruthy()
    view.rerender(<PageLoadingProvider><Wait key="data" /></PageLoadingProvider>)
    await advance(400)
    expect(loader()).toBeTruthy()
    view.rerender(<PageLoadingProvider><p>Finished</p></PageLoadingProvider>)
    await advance(0)
    expect(loader()).toBeNull()
  })

  it('cancels a scheduled dismissal when another wait starts', async () => {
    const view = render(<PageLoadingProvider><Wait /></PageLoadingProvider>)
    await advance(200)
    const first = loader()
    view.rerender(<PageLoadingProvider><Wait pending={false} /></PageLoadingProvider>)
    await advance(100)
    view.rerender(<PageLoadingProvider><Wait /></PageLoadingProvider>)
    await advance(500)
    expect(loader()).toBe(first)
    view.rerender(<PageLoadingProvider><Wait pending={false} /></PageLoadingProvider>)
    await advance(0)
    expect(loader()).toBeNull()
  })

  it('cleans timers and registrations during Strict Mode replay and unmount', async () => {
    const view = render(<StrictMode><PageLoadingProvider><Wait /></PageLoadingProvider></StrictMode>)
    await advance(200)
    expect(screen.getAllByRole('status', { name: 'Loading page' })).toHaveLength(1)
    view.unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(vi.getTimerCount()).toBe(0)
    await advance(1000)
    expect(loader()).toBeNull()
  })

  it('keeps later tab and data waits local after the initial page becomes ready', async () => {
    const ui = (pending: boolean) => <MemoryRouter><PageLoadingProvider><InitialWait pending={pending} /></PageLoadingProvider></MemoryRouter>
    const view = render(ui(true))
    await advance(200)
    expect(loader()).toBeTruthy()
    view.rerender(ui(false))
    await advance(250)
    expect(loader()).toBeNull()
    view.rerender(ui(true))
    await advance(1000)
    expect(loader()).toBeNull()
    expect(screen.getByText('Local feedback')).toBeTruthy()
  })

  it('ignores uncached background queries and cached page refetches', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['page'], 'Cached page')
    const background = deferred<string>()
    const refreshed = deferred<string>()
    function Page() {
      useQuery({ queryKey: ['notification-count'], queryFn: () => background.promise })
      const query = useQuery({ queryKey: ['page'], queryFn: () => refreshed.promise })
      useInitialPageLoading(query.isLoading)
      return <p>{query.data}</p>
    }
    const view = render(<QueryClientProvider client={client}><MemoryRouter><PageLoadingProvider><Page /></PageLoadingProvider></MemoryRouter></QueryClientProvider>)
    await advance(1000)
    expect(screen.getByText('Cached page')).toBeTruthy()
    expect(loader()).toBeNull()
    view.unmount()
    client.clear()
  })
})

describe('lazy route transitions', () => {
  function navigation(Page: ComponentType) {
    const mounts = vi.fn()
    function Layout() {
      useEffect(() => { mounts() }, [])
      const navigate = useNavigate()
      return <><nav><Link to="/slow">Slow page</Link><Link to="/">Home</Link><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button></nav><Outlet /></>
    }
    render(<MemoryRouter><PageLoadingProvider><Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/slow" element={<LazyPage><Page /></LazyPage>} />
      </Route>
    </Routes></PageLoadingProvider></MemoryRouter>)
    return mounts
  }

  it('shows a slow chunk fallback without remounting the layout, and skips cached revisits', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    const mounts = navigation(lazy(() => chunk.promise))
    fireEvent.click(screen.getByRole('link', { name: 'Slow page' }))
    await advance(200)
    expect(loader()).toBeTruthy()
    await act(async () => chunk.resolve({ default: () => <h1>Destination</h1> }))
    await advance(250)
    expect(loader()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Destination' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
    await advance(1000)
    expect(screen.getByRole('heading', { name: 'Destination' })).toBeTruthy()
    expect(loader()).toBeNull()
    expect(mounts).toHaveBeenCalledTimes(1)
  })

  it('releases an abandoned route wait without letting its late resolution reopen the loader', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    navigation(lazy(() => chunk.promise))
    fireEvent.click(screen.getByRole('link', { name: 'Slow page' }))
    await advance(100)
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    await advance(500)
    expect(loader()).toBeNull()
    await act(async () => chunk.resolve({ default: () => <h1>Stale destination</h1> }))
    await advance(1000)
    expect(loader()).toBeNull()
    expect(screen.queryByText('Stale destination')).toBeNull()
  })

  it('keeps one overlay through the chunk-to-initial-data handoff', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    const data = deferred<string>()
    function Page() {
      const query = useQuery({ queryKey: ['destination'], queryFn: () => data.promise })
      useInitialPageLoading(query.isLoading)
      return <p>{query.data ?? 'Waiting for data'}</p>
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const Destination = lazy(() => chunk.promise)
    const view = render(<QueryClientProvider client={client}><MemoryRouter><PageLoadingProvider><LazyPage><Destination /></LazyPage></PageLoadingProvider></MemoryRouter></QueryClientProvider>)
    await advance(200)
    const first = loader()
    expect(first).toBeTruthy()
    await act(async () => chunk.resolve({ default: Page }))
    await advance(300)
    expect(loader()).toBe(first)
    await act(async () => data.resolve('Data ready'))
    await advance(10)
    expect(screen.getByText('Data ready')).toBeTruthy()
    // React Query schedules its observer notification before React can release
    // the registration; flush the resulting dismissal timer separately.
    await advance(0)
    expect(loader()).toBeNull()
    view.unmount()
    client.clear()
  })

  it('releases the wait when a loaded page redirects', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    navigation(lazy(() => chunk.promise))
    fireEvent.click(screen.getByRole('link', { name: 'Slow page' }))
    await advance(200)
    await act(async () => chunk.resolve({ default: () => <Navigate to="/" replace /> }))
    await advance(250)
    expect(loader()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeTruthy()
  })

  it('replaces a failed chunk with a recoverable error and releases the overlay', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const chunk = deferred<{ default: ComponentType }>()
    navigation(lazy(() => chunk.promise))
    fireEvent.click(screen.getByRole('link', { name: 'Slow page' }))
    await advance(200)
    await act(async () => chunk.reject(new Error('Chunk download failed')))
    await advance(250)
    expect(loader()).toBeNull()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Back to home' }))
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeTruthy()
  })
})
