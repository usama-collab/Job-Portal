import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export const PageLoadingContext = createContext<(() => () => void) | null>(null)

// A mounted fallback owns its registration; leaving it always releases the wait.
export function usePageLoading(pending: boolean) {
  const register = useContext(PageLoadingContext)
  useEffect(() => {
    if (pending && register) return register()
  }, [pending, register])
  return pending && register !== null
}

// Once a page can render, its later tabs, mutations and refreshes stay local.
export function useInitialPageLoading(pending: boolean) {
  const { pathname } = useLocation()
  const [entry, setEntry] = useState({ pathname, ready: !pending })
  const ready = entry.pathname === pathname ? entry.ready : !pending
  if (entry.pathname !== pathname || (!pending && !entry.ready)) {
    setEntry({ pathname, ready: ready || !pending })
  }
  return usePageLoading(pending && !ready)
}
