import { useState } from 'react'
import { useNotificationHistory, useNotificationScope, useUnreadCount } from '../hooks/useNotifications'
import { MarkAllReadButton, NotificationFeedback, NotificationList } from '../components/notification-list'
import { Button } from '../components/ui/button'

function NotificationInbox() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const history = useNotificationHistory(unreadOnly)
  const count = useUnreadCount()
  // Deduplicate if a refetch overlaps loading another page.
  const items = [...new Map(history.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item])).values()]

  return <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="text-4xl font-black tracking-tight text-slate-900">Notifications<span className="text-blue-600">.</span></h1>
    <p className="mt-2 text-slate-500">Keep up with your applications and recruiting activity.</p>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label="Filter notifications">
        <Button variant={unreadOnly ? 'ghost' : 'secondary'} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</Button>
        <Button variant={unreadOnly ? 'secondary' : 'ghost'} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</Button>
      </div>
      <MarkAllReadButton disabled={count.data?.unread_count === 0} />
    </div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <NotificationFeedback pending={history.isPending} error={history.isError} hasData={!!history.data} retry={() => void history.refetch()} />
      {history.data && <NotificationList items={items} />}
    </div>
    {history.hasNextPage && <div className="mt-6 text-center"><Button variant="outline" disabled={history.isFetching} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button></div>}
  </div>
}

export default function Notifications() {
  const scope = useNotificationScope()
  return scope ? <NotificationInbox key={scope} /> : null
}
