import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

export function useApplicationHighlight(ready: boolean, refresh: () => void, activate?: () => void) {
  const [params] = useSearchParams()
  const location = useLocation()
  const value = params.get('applicationId')
  const id = value && /^[1-9]\d*$/.test(value) ? Number(value) : null
  useEffect(() => {
    if (id !== null) {
      activate?.()
      refresh()
    }
  }, [id, location.key, refresh, activate])
  useEffect(() => {
    if (id === null || !ready) return
    activate?.()
    const frame = requestAnimationFrame(() => {
      document.getElementById(`application-${id}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [id, ready, activate, location.key])
  return id
}
