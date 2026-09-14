import { lazy, StrictMode, type ComponentType } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { PageLoadingProvider } from './page-loading'
import { useInitialPageLoading } from '../lib/page-loading'
import { LazyPage } from '../routes/LazyPage'

const branded = () => screen.queryByRole('status', { name: 'Loading Jobify' })
const skeleton = () => screen.queryByRole('status', { name: 'Loading page content' })
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => { resolve = yes })
  return { promise, resolve }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('startup loading', () => {
  it('covers navbar and main together until the first app render is ready', async () => {
    const view = render(<PageLoadingProvider><nav>Navigation</nav><main>Home page</main></PageLoadingProvider>)
    expect(branded()).toBeTruthy()
    expect(screen.getByText('Home page').parentElement?.hasAttribute('inert')).toBe(true)
    await advance(429)
    expect(branded()).toBeTruthy()
    await advance(1)
    expect(branded()).toBeNull()
    expect(screen.getByText('Navigation')).toBeTruthy()
    expect(screen.getByText('Home page')).toBeTruthy()
    expect(screen.getByText('Home page').parentElement?.hasAttribute('inert')).toBe(false)
    view.unmount()
  })

  it('stays over a lazy chunk and its first query until both settle', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    const data = deferred<string>()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Page() {
      const query = useQuery({ queryKey: ['startup-page'], queryFn: () => data.promise })
      useInitialPageLoading(query.isLoading)
      return <p>{query.data ?? 'Inline loading state'}</p>
    }
    const Destination = lazy(() => chunk.promise)
    render(<QueryClientProvider client={client}><MemoryRouter><PageLoadingProvider>
      <nav>Navigation</nav><main><LazyPage><Destination /></LazyPage></main>
    </PageLoadingProvider></MemoryRouter></QueryClientProvider>)
    expect(branded()).toBeTruthy()
    await advance(1000)
    expect(branded()).toBeTruthy()
    await act(async () => chunk.resolve({ default: Page }))
    await advance(1000)
    expect(branded()).toBeTruthy()
    await act(async () => data.resolve('Page ready'))
    await advance(0)
    await advance(430)
    expect(branded()).toBeNull()
    expect(screen.getByText('Navigation')).toBeTruthy()
    expect(screen.getByText('Page ready')).toBeTruthy()
    client.clear()
  })

  it('cleans up its timer and body lock in Strict Mode', async () => {
    const view = render(<StrictMode><PageLoadingProvider><main>Home</main></PageLoadingProvider></StrictMode>)
    expect(screen.getAllByRole('status', { name: 'Loading Jobify' })).toHaveLength(1)
    view.unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('internal navigation', () => {
  it('keeps the layout mounted and shows a skeleton for a slow route chunk', async () => {
    const chunk = deferred<{ default: ComponentType }>()
    const Layout = () => <><nav><Link to="/slow">Slow page</Link></nav><main><Outlet /></main></>
    const Destination = lazy(() => chunk.promise)
    render(<MemoryRouter><PageLoadingProvider><Routes><Route element={<Layout />}>
      <Route path="/" element={<h1>Home page</h1>} />
      <Route path="/slow" element={<LazyPage><Destination /></LazyPage>} />
    </Route></Routes></PageLoadingProvider></MemoryRouter>)
    await advance(430)
    fireEvent.click(screen.getByRole('link', { name: 'Slow page' }))
    await advance(1000)
    expect(branded()).toBeNull()
    expect(skeleton()).toBeTruthy()
    expect(screen.getByRole('navigation')).toBeTruthy()
    expect(screen.getByRole('main')).toBeTruthy()
    await act(async () => chunk.resolve({ default: () => <h1>Destination</h1> }))
    expect(skeleton()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Destination' })).toBeTruthy()
  })

  it('keeps query loading feedback local after startup', async () => {
    const data = deferred<string>()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Page() {
      const query = useQuery({ queryKey: ['route-page'], queryFn: () => data.promise })
      useInitialPageLoading(query.isLoading)
      return <p>{query.data ?? 'Local query feedback'}</p>
    }
    render(<QueryClientProvider client={client}><MemoryRouter><PageLoadingProvider>
      <nav><Link to="/page">Page</Link></nav><main><Routes>
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/page" element={<Page />} />
      </Routes></main>
    </PageLoadingProvider></MemoryRouter></QueryClientProvider>)
    await advance(430)
    fireEvent.click(screen.getByRole('link', { name: 'Page' }))
    await advance(1000)
    expect(branded()).toBeNull()
    expect(screen.getByText('Local query feedback')).toBeTruthy()
    expect(screen.getByRole('navigation')).toBeTruthy()
    await act(async () => data.resolve('Query ready'))
    await advance(0)
    expect(screen.getByText('Query ready')).toBeTruthy()
    client.clear()
  })
})
