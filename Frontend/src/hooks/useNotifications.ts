import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from '../api/notifications'
import { useAuthStore } from '../store/authStore'
import { notificationScope } from '../lib/notification-session'

export function useNotificationScope() {
  useAuthStore((state) => state.token)
  return notificationScope()
}

const polling = {
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 1,
} as const

export function useUnreadCount() {
  const scope = useNotificationScope()
  return useQuery({
    queryKey: ['notifications', scope, 'count'],
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled: !!scope,
    ...polling,
  })
}

export function useRecentNotifications(open: boolean) {
  const scope = useNotificationScope()
  return useQuery({
    queryKey: ['notifications', scope, 'recent'],
    queryFn: ({ signal }) => getNotifications(10, false, null, signal),
    enabled: !!scope && open,
    ...polling,
  })
}

export function useNotificationHistory(unreadOnly: boolean) {
  const scope = useNotificationScope()
  return useInfiniteQuery({
    queryKey: ['notifications', scope, 'history', unreadOnly],
    queryFn: ({ signal, pageParam }) => getNotifications(20, unreadOnly, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: !!scope,
    ...polling,
  })
}

export function useNotificationActions() {
  const scope = useNotificationScope()
  const client = useQueryClient()
  const refresh = () => {
    if (scope === notificationScope()) {
      return client.invalidateQueries({ queryKey: ['notifications', scope] })
    }
  }
  const read = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh })
  return { read, readAll, scope }
}
