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
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 11.5a7.5 7.5 0 0 1-8 7.48 8.7 8.7 0 0 1-2.93-.72L4 20l1.74-4.36A7.5 7.5 0 1 1 20 11.5Z"
        className={`transition-[fill] group-focus-visible:fill-current ${active ? 'fill-current' : 'fill-transparent'}`}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[9, 12, 15].map((cx) => <circle key={cx} cx={cx} cy="11.5" r="1"
        className={`transition-colors group-focus-visible:fill-white ${active ? 'fill-white' : 'fill-current'}`} />)}
    </svg>
    {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span>}
  </Link>
}
