import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { accessError, useMessageCount } from '../hooks/useMessages'

export function MessageNav() {
  const query = useMessageCount()
  const count = accessError(query.error) ? 0 : query.data?.unread_count ?? 0
  return <Link to="/messages" aria-label={`Messages, ${count} unread`} title="Messages"
    className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-blue-50 hover:text-blue-600">
    <MessageSquare className="h-5 w-5" />
    {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}
  </Link>
}
