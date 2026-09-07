import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotificationScope, useRecentNotifications, useUnreadCount } from '../hooks/useNotifications'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { MarkAllReadButton, NotificationFeedback, NotificationList } from './notification-list'

function SessionBell() {
  const [open, setOpen] = useState(false)
  const count = useUnreadCount()
  const recent = useRecentNotifications(open)
  const unread = count.data?.unread_count

  return <Popover open={open} onOpenChange={(value) => {
    setOpen(value)
    if (value) void count.refetch()
  }}>
    <PopoverTrigger asChild>
      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 text-slate-600" aria-label={`Notifications${unread === undefined ? '' : `, ${unread} unread`}${count.isError ? ', updates unavailable' : ''}`}>
        <Bell className="h-5 w-5" />
        {!!unread && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold leading-5 text-white">{unread > 99 ? '99+' : unread}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" collisionPadding={16} className="mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-slate-100 p-0 shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
        <h2 className="font-bold text-slate-900">Notifications</h2>
        <MarkAllReadButton disabled={unread === 0} />
      </div>
      <div className="max-h-[min(28rem,65dvh)] overflow-y-auto">
        <NotificationFeedback pending={recent.isPending} error={recent.isError} hasData={!!recent.data} retry={() => { void recent.refetch(); void count.refetch() }} />
        {recent.data && <NotificationList items={recent.data.items} onNavigate={() => setOpen(false)} />}
      </div>
      <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 p-3 text-center text-sm font-bold text-blue-600 hover:bg-blue-50">View all notifications</Link>
    </PopoverContent>
  </Popover>
}

export function NotificationBell() {
  const scope = useNotificationScope()
  return scope ? <SessionBell key={scope} /> : null
}
