import type { QueryClient } from '@tanstack/react-query'
import { jwtDecode } from 'jwt-decode'
import { useAuthStore } from '../store/authStore'

let session = 0
const pendingWrites = new Set<AbortController>()

export function notificationWrite() {
  const controller = new AbortController()
  pendingWrites.add(controller)
  return { signal: controller.signal, release: () => pendingWrites.delete(controller) }
}

function userId(token: string | null): string | null {
  if (!token) return null
  try {
    const { sub } = jwtDecode<{ sub?: string }>(token)
    return typeof sub === 'string' && /^\d+$/.test(sub) ? sub : null
  } catch { return null }
}

export function notificationScope() {
  const id = userId(useAuthStore.getState().token)
  return id ? `${id}:${session}` : null
}

// Register before rendering: clear private caches synchronously on identity
// changes, including storage events. Token refresh for the same user is harmless.
export function installNotificationSession(client: QueryClient) {
  return useAuthStore.subscribe((state, previous) => {
    if (userId(state.token) === userId(previous.token)) return
    session += 1
    pendingWrites.forEach((controller) => controller.abort())
    pendingWrites.clear()
    void client.cancelQueries({ queryKey: ['notifications'] })
    client.removeQueries({ queryKey: ['notifications'] })
  })
}
