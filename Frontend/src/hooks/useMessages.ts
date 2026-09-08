import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getConversations, getMessageCount } from '../api/messages'
import { useNotificationScope } from './useNotifications'

export function accessError(error: unknown) {
  return isAxiosError(error) && [401, 403, 404].includes(error.response?.status ?? 0)
}
export const messagePolling = {
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: (count: number, error: unknown) => !accessError(error) && count < 1,
} as const

export function useMessageCount() {
  const scope = useNotificationScope()
  return useQuery({ queryKey: ['messaging', scope, 'count'], queryFn: ({ signal }) => getMessageCount(signal),
    enabled: !!scope, ...messagePolling, refetchInterval: (q) => accessError(q.state.error) ? false : 30_000 })
}

export function useConversations() {
  const scope = useNotificationScope()
  return useInfiniteQuery({ queryKey: ['messaging', scope, 'inbox'],
    queryFn: ({ signal, pageParam }) => getConversations(pageParam, signal),
    initialPageParam: null as number | null, getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled: !!scope, ...messagePolling, refetchInterval: (q) => accessError(q.state.error) ? false : 30_000 })
}
