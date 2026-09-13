import { Component, Suspense, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RouteLoadingFallback } from '../components/page-loading'
import { Button } from '../components/ui/button'

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">This page couldn’t load</h1>
      <p role="alert" className="text-sm text-slate-500">Check your connection and reload to try again.</p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
      <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">Back to home</Link>
    </section>
    return this.props.children
  }
}

export function LazyPage({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // A fresh page boundary can show its fallback during router transitions;
  // the surrounding layout, navigation and providers remain mounted.
  return <PageErrorBoundary key={pathname}>
    <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>
  </PageErrorBoundary>
}
