import { Bell, Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Notification } from '../api/notifications'
import { useNotificationActions } from '../hooks/useNotifications'
import { notificationScope } from '../lib/notification-session'
import { Button } from './ui/button'

function relativeTime(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
}

export function MarkAllReadButton({ disabled = false }: { disabled?: boolean }) {
  const { readAll, scope } = useNotificationActions()
  return <Button variant="ghost" size="sm" disabled={disabled || readAll.isPending} onClick={() => {
    readAll.mutate(undefined, { onError: () => {
      if (scope === notificationScope()) toast.error('Could not mark notifications as read. Please try again.')
    } })
  }}>
    {readAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
    Mark all as read
  </Button>
}

export function NotificationList({ items, onNavigate }: { items: Notification[], onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { read, scope } = useNotificationActions()
  const markRead = async (item: Notification) => {
    if (item.read_at) return
    try { await read.mutateAsync(item.id) }
    catch {
      if (scope === notificationScope()) toast.error('Could not mark this notification as read. Please try again.')
    }
  }

  if (!items.length) return <div className="px-6 py-12 text-center text-slate-500">
    <Bell className="mx-auto mb-3 h-8 w-8 text-slate-300" />
    <p className="font-semibold">You’re all caught up</p>
    <p className="mt-1 text-sm">New application updates will appear here.</p>
  </div>

  return <ul className="divide-y divide-slate-100" aria-label="Notifications">
    {items.map((item) => <li key={item.id} className={`flex items-start gap-2 p-4 ${item.read_at ? 'bg-white' : 'bg-blue-50/70'}`}>
      <button className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-blue-600" onClick={async () => {
        await markRead(item)
        if (scope !== notificationScope()) return
        if (item.target_path) {
          onNavigate?.()
          navigate(item.target_path)
        }
      }}>
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {!item.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
          {item.title}
        </span>
        <span className="mt-1 block break-words text-sm leading-relaxed text-slate-600">{item.message}</span>
        <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()} className="mt-2 block text-xs text-slate-500">{relativeTime(item.created_at)}</time>
        {!item.target_path && <span className="mt-1 block text-xs text-slate-500">Application no longer available</span>}
      </button>
      {!item.read_at && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-blue-600" disabled={read.isPending} aria-label={`Mark as read: ${item.message}`} onClick={() => void markRead(item)}>
        <Check className="h-4 w-4" />
      </Button>}
    </li>)}
  </ul>
}

export function NotificationFeedback({ pending, error, hasData, retry }: { pending: boolean, error: boolean, hasData: boolean, retry: () => void }) {
  if (pending) return <p role="status" className="p-6 text-center text-sm text-slate-500">Loading notifications…</p>
  if (!error) return null
  return <div role="status" className="p-4 text-sm text-amber-800">
    <p>{hasData ? 'Updates are unavailable. Showing the last loaded notifications.' : 'Could not load notifications.'}</p>
    <Button variant="ghost" size="sm" onClick={retry}>Retry</Button>
  </div>
}
