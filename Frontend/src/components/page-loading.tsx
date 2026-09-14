import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PageLoadingContext, usePageLoading } from '../lib/page-loading'
import { useLocation } from 'react-router-dom'
import { PageSkeleton } from './page-skeletons'
import { skeletonKindForPath } from '../lib/page-skeleton-kind'

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
  const { pathname } = useLocation()
  return <PageSkeleton kind={skeletonKindForPath(pathname)} />
}
