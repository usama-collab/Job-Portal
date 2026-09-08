import { Link, useLocation } from 'react-router-dom'
import { accessError, useMessageCount } from '../hooks/useMessages'

export function MessageNav() {
  const location = useLocation()
  const query = useMessageCount()
  const count = accessError(query.error) ? 0 : query.data?.unread_count ?? 0
  const active = location.pathname === '/messages' || location.pathname.startsWith('/messages/')
  return <Link to="/messages" aria-label={`Messages, ${count} unread`} title="Messages"
    aria-current={active ? 'page' : undefined}
    className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:bg-blue-50 focus-visible:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>
    <svg data-slot="message-icon" viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.75 3.5h14.5A2.75 2.75 0 0 1 22 6.25v9.5a2.75 2.75 0 0 1-2.75 2.75H10l-4.8 3.1a.75.75 0 0 1-1.15-.63V18.4A2.75 2.75 0 0 1 2 15.75v-9.5A2.75 2.75 0 0 1 4.75 3.5Z"
        className="fill-current"
      />
      <path d="M7 9h10M7 13h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
    {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}
  </Link>
}
