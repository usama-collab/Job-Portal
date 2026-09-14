import { createContext, useContext, useEffect } from 'react'

export const PageLoadingContext = createContext<(() => () => void) | null>(null)

// Waits only affect the first app load. Later routes keep their own fallbacks.
export function usePageLoading(pending: boolean) {
  const register = useContext(PageLoadingContext)
  useEffect(() => {
    if (pending && register) return register()
  }, [pending, register])
}

export const useInitialPageLoading = usePageLoading
