import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowUpRight, Building2, ChevronDown, MessageSquare, Send } from 'lucide-react'
import { getConversation, getMessages, readConversation, sendMessage, type Conversation, type Message, type MessagePage } from '../api/messages'
import { accessError, messagePolling, useConversations } from '../hooks/useMessages'
import { useNotificationScope } from '../hooks/useNotifications'
import { notificationScope, notificationWrite } from '../lib/notification-session'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { mergeMessages } from '../lib/messages'

export default function Messages() {
  const { applicationId } = useParams()
  const scope = useNotificationScope()
  const inbox = useConversations()
  const items = [...new Map((inbox.data?.pages.flatMap((page) => page.items) ?? []).slice().reverse().map((item) => [item.application_id, item])).values()]
    .sort((a, b) => (b.latest_message?.id ?? 0) - (a.latest_message?.id ?? 0))
  const id = Number(applicationId)
  const [filter, setFilter] = useState('all')
  const currentUserId = scope?.split(':')[0]
  const visibleItems = filter === 'unread' ? items.filter((item) => item.unread_count > 0) : items
  return <div className="bg-[#f5f5f4] px-3 py-4 sm:px-6">
    <div className="mx-auto grid h-[calc(100dvh-6rem)] min-h-[400px] max-w-[1400px] gap-4 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className={`${applicationId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white`} aria-label="Conversations">
        <div className="shrink-0 border-b border-stone-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900">Messages</h1>
            <ConnectionBadge />
          </div>
          <div className="relative mt-3">
            <label htmlFor="inbox-filter" className="sr-only">Filter conversations</label>
            <select id="inbox-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600">
              <option value="all">Inbox</option>
              <option value="unread">Unread</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-600" aria-hidden="true" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {inbox.isPending && <p className="p-3 text-sm text-slate-500" role="status">Loading conversations…</p>}
        {inbox.isError && <p className="p-3 text-sm" role="status">Could not update conversations. <Button variant="ghost" onClick={() => void inbox.refetch()}>Retry</Button></p>}
        {!accessError(inbox.error) && visibleItems.map((item) => <Link key={item.application_id} to={`/messages/${item.application_id}`} aria-current={item.application_id === id ? 'page' : undefined}
          className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-4 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${item.application_id === id ? 'bg-blue-50' : 'hover:bg-stone-50'}`}>
          <CompanyAvatar name={item.company_name} logo={item.company_logo_url} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className={`truncate text-sm ${item.unread_count ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{item.company_name}</span>
              {item.latest_message && <time className="shrink-0 text-[11px] text-slate-500" dateTime={item.latest_message.created_at}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.latest_message.created_at))}</time>}
            </span>
            <span className="mt-1 flex items-center gap-2">
              <span className="block flex-1 truncate text-sm text-slate-500">{item.latest_message && String(item.latest_message.sender_id) === currentUserId ? 'You: ' : ''}{item.latest_message?.body ?? 'No messages yet'}</span>
              {item.unread_count > 0 && <span className="min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white" aria-label={`${item.unread_count} unread`}>{item.unread_count}</span>}
            </span>
          </span>
        </Link>)}
        {!inbox.isPending && !inbox.isError && !visibleItems.length && <p className="p-3 text-sm text-slate-500">{filter === 'unread' ? 'You’re all caught up. No unread conversations.' : 'No conversations yet. Start a message from an application.'}</p>}
        {inbox.hasNextPage && <Button variant="ghost" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>Load more</Button>}
        </div>
      </aside>
      {applicationId ? (Number.isSafeInteger(id) && id > 0 ? <Thread key={`${scope}:${id}`} id={id} scope={scope} /> : <p>Conversation not found.</p>) :
        <div className="hidden place-items-center rounded-xl border border-stone-200 bg-white p-10 text-center md:grid"><div><MessageSquare className="mx-auto mb-4 h-10 w-10 text-blue-600" /><h2 className="font-semibold text-slate-900">Your conversations, all in one place</h2><p className="mt-2 text-sm text-slate-500">Choose a conversation, or start one from an application.</p></div></div>}
    </div>
  </div>
}

function ConnectionBadge() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return <span role="status" title="Your network connection" className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${online ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}><span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />{online ? 'Online' : 'Offline'}</span>
}

function CompanyAvatar({ name, logo }: { name: string, logo?: string | null }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const colors = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-700', 'bg-teal-100 text-teal-700']
  const color = colors[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]
  return <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${logo && failedLogo !== logo ? 'border border-stone-100 bg-white' : color}`}>
    {logo && failedLogo !== logo ? <img src={`${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/${logo.replace(/^\//, '')}`} alt={`${name} logo`} className="h-full w-full object-contain p-1" onError={() => setFailedLogo(logo)} /> : <Building2 className="h-5 w-5" aria-hidden="true" />}
  </span>
}

function JobSummary({ conversation }: { conversation: Conversation }) {
  return <aside aria-label="Job details" className="hidden overflow-y-auto rounded-xl border border-stone-200 bg-white xl:block">
    <div className="border-b border-stone-200 p-5">
      <div className="flex items-start gap-3"><CompanyAvatar name={conversation.company_name} logo={conversation.company_logo_url} /><div className="min-w-0"><h3 className="font-bold leading-snug text-slate-900">{conversation.job_title}</h3><p className="mt-2 text-sm text-slate-600">{conversation.company_name}</p>{conversation.location && <p className="mt-1 text-sm text-slate-500">{conversation.location}</p>}</div></div>
    </div>
    <div className="space-y-5 p-5 text-sm">
      {conversation.employment_type && <div><h4 className="font-bold text-slate-900">Job type</h4><p className="mt-2 capitalize text-slate-600">{conversation.employment_type.replaceAll('_', ' ')}</p></div>}
      {(conversation.salary_min != null || conversation.salary_max != null) && <div><h4 className="font-bold text-slate-900">Salary range</h4><p className="mt-2 text-slate-600">{conversation.salary_min != null && conversation.salary_max != null ? `${conversation.salary_min.toLocaleString()} – ${conversation.salary_max.toLocaleString()}` : conversation.salary_min != null ? `From ${conversation.salary_min.toLocaleString()}` : `Up to ${conversation.salary_max!.toLocaleString()}`}</p></div>}
      <div><h4 className="font-bold text-slate-900">Application status</h4><span className="mt-2 inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">{conversation.status.replaceAll('_', ' ')}</span></div>
      <Link to={`/jobs/${conversation.job_id}`} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">View full job description<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  </aside>
}

function messageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function Thread({ id, scope }: { id: number, scope: string | null }) {
  const client = useQueryClient()
  const key = ['messaging', scope, 'thread', id] as const
  const [blocked, setBlocked] = useState(false)
  const [draft, setDraft] = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const [focused, setFocused] = useState(() => document.visibilityState === 'visible' && document.hasFocus())
  const viewport = useRef<HTMLDivElement>(null)
  const preserveScroll = useRef<{ height: number, top: number } | null>(null)
  const retryMessage = useRef<{ body: string, uuid: string } | null>(null)
  const acknowledged = useRef(0)
  const context = useQuery({ queryKey: [...key, 'context'], queryFn: ({ signal }) => getConversation(id, signal),
    enabled: !!scope && !blocked, ...messagePolling,
    refetchInterval: (q) => accessError(q.state.error) ? false : 30_000 })
  const history = useQuery({ queryKey: [...key, 'history'], enabled: !!scope && !blocked,
    queryFn: async ({ signal }): Promise<MessagePage> => {
      const previous = client.getQueryData<MessagePage>([...key, 'history'])
      const newest = previous?.items.at(-1)?.id
      if (!newest) return getMessages(id, {}, signal)
      let cursor: number | null = newest
      let incoming: Message[] = []
      do {
        const page: MessagePage = await getMessages(id, { after_id: cursor }, signal)
        incoming = mergeMessages(incoming, page.items)
        cursor = page.next_after_id
      } while (cursor)
      // Older history may have loaded while catch-up was in flight.
      const current = client.getQueryData<MessagePage>([...key, 'history']) ?? previous
      return { items: mergeMessages(current?.items ?? [], incoming), next_before_id: current?.next_before_id ?? null, next_after_id: null }
    }, ...messagePolling, refetchInterval: (q) => accessError(q.state.error) ? false : 5_000 })
  const refresh = () => {
    if (scope !== notificationScope()) return
    void client.invalidateQueries({ queryKey: ['messaging', scope] })
    void client.invalidateQueries({ queryKey: ['notifications', scope] })
  }
  const send = useMutation({
    mutationFn: ({ body, uuid }: { body: string, uuid: string }) => sendMessage(id, body, uuid),
    onSuccess: (_message, submitted) => {
      if (scope !== notificationScope()) return
      setDraft((value) => value.trim() === submitted.body ? '' : value)
      retryMessage.current = null
      setAtBottom(true)
      refresh()
    }, retry: false,
  })
  const read = useMutation({ mutationFn: (messageId: number) => readConversation(id, messageId),
    onSuccess: (result) => { acknowledged.current = Math.max(acknowledged.current, result.last_read_message_id); refresh() }, retry: false })
  const older = useMutation({
    mutationFn: async (before: number) => {
      const request = notificationWrite()
      try { return await getMessages(id, { before_id: before }, request.signal) }
      finally { request.release() }
    },
    onSuccess: (page) => {
      if (scope !== notificationScope()) return
      const element = viewport.current
      if (element) preserveScroll.current = { height: element.scrollHeight, top: element.scrollTop }
      client.setQueryData<MessagePage>([...key, 'history'], (old) => ({
        items: mergeMessages(page.items, old?.items ?? []), next_before_id: page.next_before_id, next_after_id: null,
      }))
    }, retry: false,
  })
  const denied = [context.error, history.error, send.error, read.error, older.error].some(accessError)
  useEffect(() => {
    if (!denied) return
    setBlocked(true)
    setDraft('')
    void client.cancelQueries({ queryKey: ['messaging', scope, 'thread', id] })
    client.removeQueries({ queryKey: ['messaging', scope, 'thread', id] })
    void client.invalidateQueries({ queryKey: ['messaging', scope, 'inbox'] })
    void client.invalidateQueries({ queryKey: ['messaging', scope, 'count'] })
  }, [denied, client, scope, id])
  useEffect(() => {
    const update = () => setFocused(document.visibilityState === 'visible' && document.hasFocus())
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    document.addEventListener('visibilitychange', update)
    return () => { window.removeEventListener('focus', update); window.removeEventListener('blur', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    if (preserveScroll.current) {
      element.scrollTop = preserveScroll.current.top + element.scrollHeight - preserveScroll.current.height
      preserveScroll.current = null
    } else if (atBottom) element.scrollTop = element.scrollHeight
  }, [history.data, atBottom])
  const newest = history.data?.items.at(-1)?.id ?? 0
  const mark = read.mutate
  useEffect(() => {
    if (!blocked && !denied && scope === notificationScope() && focused && atBottom && newest > acknowledged.current && !read.isPending && !read.isError) mark(newest)
  }, [newest, focused, atBottom, blocked, denied, scope, read.isPending, read.isError, mark])

  if (blocked || denied) return <section className="rounded-2xl border bg-white p-6"><Link to="/messages">← Inbox</Link><p role="alert" className="mt-4">This conversation is no longer available.</p></section>
  const currentUserId = scope?.split(':')[0]
  return <div className="grid min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
  <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
    <header className="shrink-0 border-b border-stone-200 px-4 py-3">
      <Link to="/messages" className="mb-2 block text-sm text-blue-600 md:hidden">← Inbox</Link>
      <div className="flex items-center gap-3">
        <CompanyAvatar name={context.data?.company_name ?? 'Company'} logo={context.data?.company_logo_url} />
        <div className="min-w-0 flex-1"><h2 className="truncate font-bold text-slate-900">{context.data?.company_name ?? 'Application conversation'}</h2><p className="mt-0.5 text-xs text-slate-500">Application conversation</p></div>
        {context.data && <Link to={`/jobs/${context.data.job_id}`} className="shrink-0 text-xs font-medium text-blue-600 hover:underline xl:hidden">View job<ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></Link>}
      </div>
    </header>
    {(history.isPending || context.isPending) && <p role="status" className="p-4">Loading conversation…</p>}
    {(history.isError || context.isError) && <p role="status" className="p-4 text-amber-800">Updates are unavailable. <Button variant="ghost" onClick={refresh}>Retry</Button></p>}
    <div ref={viewport} onScroll={() => {
      const el = viewport.current
      if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
    }} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-white px-4 py-5" aria-label="Message history">
      {history.data?.next_before_id && <Button variant="ghost" disabled={older.isPending} onClick={() => older.mutate(history.data!.next_before_id!)}>Load older messages</Button>}
      {older.isError && <p role="alert">Could not load older messages. Please retry.</p>}
      {!history.isPending && !history.isError && !history.data?.items.length && <p className="text-sm text-slate-500">Start the conversation about this application.</p>}
      {history.data?.items.map((message) => {
        const outgoing = String(message.sender_id) === currentUserId
        return <article key={message.id} data-message-direction={outgoing ? 'outgoing' : 'incoming'}
          className={`flex max-w-[82%] flex-col ${outgoing ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
          <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${outgoing ? 'rounded-br-sm bg-blue-50 text-slate-900' : 'rounded-bl-sm border border-stone-200 bg-white text-slate-800'}`}>
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
          <div className={`mt-1.5 flex items-center gap-1.5 px-1 text-xs text-slate-500 ${outgoing ? 'justify-end' : ''}`}>
            {!outgoing && <><span className="font-semibold text-slate-600">{message.sender_name}</span><span aria-hidden="true">·</span></>}
            <time dateTime={message.created_at}>{messageTime(message.created_at)}</time>
          </div>
        </article>
      })}
    </div>
    {!atBottom && <Button variant="ghost" onClick={() => setAtBottom(true)}>New messages / jump to latest</Button>}
    {read.isError && <p role="status" className="px-4 text-sm text-amber-800">Could not save read position. <Button variant="ghost" onClick={() => { read.reset(); if (focused && atBottom && newest) read.mutate(newest) }}>Retry</Button></p>}
    <form className="shrink-0 border-t border-stone-200 bg-white p-4 focus-within:shadow-[inset_0_2px_0_0_#2563eb]" onSubmit={(event) => {
      event.preventDefault()
      const body = draft.trim()
      if (!body || send.isPending || body.length > 5000) return
      if (retryMessage.current?.body !== body) retryMessage.current = { body, uuid: crypto.randomUUID() }
      send.mutate(retryMessage.current)
    }}>
      <label htmlFor="message-body" className="sr-only">Message</label>
      <Textarea id="message-body" className="h-24 min-h-0 resize-none rounded-none border-0 bg-white p-0 shadow-none [field-sizing:fixed] focus-visible:ring-0" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} placeholder="Write your message…" />
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-400">{draft.length}/5000</span><Button className="rounded-lg bg-blue-600 px-5 hover:bg-blue-700" type="submit" aria-label="Send message" disabled={!draft.trim() || send.isPending || !context.data || history.isPending}>{send.isPending ? 'Sending…' : <><Send />Send</>}</Button></div>
      {send.isError && <p role="alert" className="text-sm text-red-700">{isAxiosError(send.error) && send.error.response?.status === 429 ? 'Too many messages. Wait a minute, then retry.' : 'Could not confirm delivery. Your draft is saved here; retry to send it safely.'}</p>}
    </form>
  </section>
  {context.data && <JobSummary conversation={context.data} />}
  </div>
}
