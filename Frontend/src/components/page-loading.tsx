import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PageLoadingContext, usePageLoading } from '../lib/page-loading'
import { BrandMark } from './brand-logo'

const SHOW_DELAY_MS = 200
const MIN_VISIBLE_MS = 250

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [waits, setWaits] = useState<Set<symbol>>(() => new Set())
  const [visible, setVisible] = useState(false)
  const shownAt = useRef<number | null>(null)
  const pending = waits.size > 0
  const register = useCallback(() => {
    const token = Symbol()
    setWaits((current) => new Set(current).add(token))
    return () => setWaits((current) => {
      const next = new Set(current)
      next.delete(token)
      return next
    })
  }, [])

  useEffect(() => {
    // Effect updates from a fallback-to-page handoff are batched, so the same
    // visible interval covers both the chunk and its initial data request.
    if (pending) {
      if (shownAt.current !== null) return
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now()
        setVisible(true)
      }, SHOW_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
    if (shownAt.current === null) return
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current))
    const timer = window.setTimeout(() => {
      shownAt.current = null
      setVisible(false)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [pending])

  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [visible])

  return <PageLoadingContext.Provider value={register}>
    <div inert={visible} aria-busy={visible || undefined}>{children}</div>
    {visible && <div className="fixed inset-0 z-[100] grid min-h-dvh place-items-center bg-white px-6" role="status" aria-live="polite" aria-label="Loading page">
      <div className="flex flex-col items-center gap-5" aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className="motion-safe:animate-pulse"><BrandMark className="h-14 w-14" /></div>
          <span className="text-3xl font-black tracking-[-0.045em] text-slate-950">Jobify<span className="text-blue-600">.</span></span>
        </div>
        <span className="text-sm font-medium text-slate-500">Loading…</span>
      </div>
    </div>}
  </PageLoadingContext.Provider>
}

export function PageLoadingPlaceholder() {
  return <div className="min-h-[60vh]" />
}

export function RouteLoadingFallback() {
  usePageLoading(true)
  return <PageLoadingPlaceholder />
}
