import { Link, useLocation } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import { accessError, useMessageCount } from '../hooks/useMessages'

export function MessageNav() {
  const location = useLocation()
  const query = useMessageCount()
  const count = accessError(query.error) ? 0 : query.data?.unread_count ?? 0
  const active = location.pathname === '/messages' || location.pathname.startsWith('/messages/')
  return <Link to="/messages" aria-label={`Messages, ${count} unread`} title="Messages"
    aria-current={active ? 'page' : undefined}
    className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:bg-blue-50 focus-visible:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>
    <MessageSquareText data-slot="message-icon" aria-hidden="true" className="h-6 w-6" />
    {count > 0 && <span data-slot="unread-badge" aria-hidden="true" className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">{count > 99 ? '99+' : count}</span>}
  </Link>
}
