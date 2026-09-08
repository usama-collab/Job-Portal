import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Send } from 'lucide-react'
import { getConversation, getMessages, readConversation, sendMessage, type Message, type MessagePage } from '../api/messages'
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
  return <div className="mx-auto max-w-6xl px-4 py-6">
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`${applicationId ? 'hidden md:block' : ''} min-h-[70vh] border-r border-slate-200`} aria-label="Conversations">
        <div className="border-b border-slate-200 px-5 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Your conversations with employers</p>
        </div>
        <div className="p-2">
        {inbox.isPending && <p className="p-3 text-sm text-slate-500" role="status">Loading conversations…</p>}
        {inbox.isError && <p className="p-3 text-sm" role="status">Could not update conversations. <Button variant="ghost" onClick={() => void inbox.refetch()}>Retry</Button></p>}
        {!accessError(inbox.error) && items.map((item) => <Link key={item.application_id} to={`/messages/${item.application_id}`}
          className={`mb-1 block rounded-xl px-4 py-3 transition-colors ${item.application_id === id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{item.company_name}</span>
              <span className="mt-0.5 block truncate text-sm text-slate-600">{item.job_title}</span>
            </span>
            {item.unread_count > 0 && <span className="mt-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-xs font-bold text-white" aria-label={`${item.unread_count} unread`}>{item.unread_count}</span>}
          </span>
          <span className="mt-2 block truncate text-sm text-slate-500">{item.latest_message?.body ?? 'No messages yet'}</span>
        </Link>)}
        {!inbox.isPending && !inbox.isError && !items.length && <p className="p-3 text-sm text-slate-500">No conversations yet. Start a message from an application.</p>}
        {inbox.hasNextPage && <Button variant="ghost" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>Load more</Button>}
        </div>
      </aside>
      {applicationId ? (Number.isSafeInteger(id) && id > 0 ? <Thread key={`${scope}:${id}`} id={id} scope={scope} /> : <p>Conversation not found.</p>) :
        <div className="hidden min-h-[70vh] place-items-center p-10 text-center text-slate-500 md:grid">Choose a conversation, or start one from an application.</div>}
    </div>
  </div>
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
  return <section className="flex min-h-[70vh] min-w-0 flex-col overflow-hidden bg-white">
    <header className="border-b border-slate-200 px-5 py-4">
      <Link to="/messages" className="mb-2 block text-sm text-blue-600 md:hidden">← Inbox</Link>
      <h2 className="text-lg font-bold text-slate-900">{context.data?.company_name ?? 'Application conversation'}</h2>
      {context.data && <p className="mt-0.5 text-sm text-slate-500">{context.data.job_title} · <span className="capitalize">{context.data.status.replaceAll('_', ' ')}</span></p>}
    </header>
    {(history.isPending || context.isPending) && <p role="status" className="p-4">Loading conversation…</p>}
    {(history.isError || context.isError) && <p role="status" className="p-4 text-amber-800">Updates are unavailable. <Button variant="ghost" onClick={refresh}>Retry</Button></p>}
    <div ref={viewport} onScroll={() => {
      const el = viewport.current
      if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
    }} className="h-[52vh] min-h-80 flex-1 space-y-5 overflow-y-auto bg-slate-50/40 px-5 py-6" aria-label="Message history">
      {history.data?.next_before_id && <Button variant="ghost" disabled={older.isPending} onClick={() => older.mutate(history.data!.next_before_id!)}>Load older messages</Button>}
      {older.isError && <p role="alert">Could not load older messages. Please retry.</p>}
      {!history.isPending && !history.isError && !history.data?.items.length && <p className="text-sm text-slate-500">Start the conversation about this application.</p>}
      {history.data?.items.map((message) => {
        const outgoing = String(message.sender_id) === currentUserId
        return <article key={message.id} data-message-direction={outgoing ? 'outgoing' : 'incoming'}
          className={`flex max-w-[82%] flex-col ${outgoing ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm [overflow-wrap:anywhere] ${outgoing ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}>
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
    <form className="border-t border-slate-200 bg-white p-4" onSubmit={(event) => {
      event.preventDefault()
      const body = draft.trim()
      if (!body || send.isPending || body.length > 5000) return
      if (retryMessage.current?.body !== body) retryMessage.current = { body, uuid: crypto.randomUUID() }
      send.mutate(retryMessage.current)
    }}>
      <label htmlFor="message-body" className="sr-only">Message</label>
      <Textarea id="message-body" className="min-h-24 resize-none rounded-xl border-slate-300 bg-slate-50/50 px-4 py-3 shadow-none focus-visible:bg-white" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} placeholder="Write a message…" />
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-400">{draft.length}/5000</span><Button className="rounded-full bg-blue-600 px-5 hover:bg-blue-700" type="submit" aria-label="Send message" disabled={!draft.trim() || send.isPending || !context.data || history.isPending}>{send.isPending ? 'Sending…' : <><Send />Send</>}</Button></div>
      {send.isError && <p role="alert" className="text-sm text-red-700">{isAxiosError(send.error) && send.error.response?.status === 429 ? 'Too many messages. Wait a minute, then retry.' : 'Could not confirm delivery. Your draft is saved here; retry to send it safely.'}</p>}
    </form>
  </section>
}
