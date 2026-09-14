import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PageLoadingContext, usePageLoading } from '../lib/page-loading'

const MIN_VISIBLE_MS = 350
const SETTLE_MS = 80

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [waits, setWaits] = useState<Set<symbol>>(() => new Set())
  const [initializing, setInitializing] = useState(true)
  const startedAt = useRef<number | null>(null)
  const register = useCallback(() => {
    if (!initializing) return () => {}
    const token = Symbol()
    setWaits((current) => new Set(current).add(token))
    return () => setWaits((current) => {
      const next = new Set(current)
      next.delete(token)
      return next
    })
  }, [initializing])

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now()
    if (!initializing || waits.size) return
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current))
    const timer = window.setTimeout(() => setInitializing(false), remaining + SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [initializing, waits])

  useEffect(() => {
    if (!initializing) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [initializing])

  return <PageLoadingContext.Provider value={register}>
    <div inert={initializing} aria-busy={initializing || undefined}>{children}</div>
    {initializing && <div className="jobify-startup" role="status" aria-label="Loading Jobify">
      <div className="jobify-startup-content" aria-hidden="true">
        <span className="jobify-startup-wordmark">Jobify<span>.</span></span>
        <span className="jobify-startup-track"><span className="jobify-startup-progress" /></span>
      </div>
    </div>}
  </PageLoadingContext.Provider>
}

export function RouteLoadingFallback() {
  usePageLoading(true)
  return <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Loading page content">
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      <div className="grid gap-5 pt-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-44 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-3/5 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-2/5 rounded bg-slate-100" />
          <div className="mt-8 h-12 rounded bg-slate-100" />
        </div>)}
      </div>
    </div>
  </div>
}
