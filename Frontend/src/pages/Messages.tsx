import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
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
    <h1 className="mb-5 text-3xl font-bold text-slate-900">Messages</h1>
    <div className="grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={`${applicationId ? 'hidden md:block' : ''} rounded-2xl border bg-white p-3`} aria-label="Conversations">
        {inbox.isPending && <p role="status">Loading conversations…</p>}
        {inbox.isError && <p role="status">Could not update conversations. <Button variant="ghost" onClick={() => void inbox.refetch()}>Retry</Button></p>}
        {!accessError(inbox.error) && items.map((item) => <Link key={item.application_id} to={`/messages/${item.application_id}`}
          className={`mb-2 block rounded-xl p-3 ${item.application_id === id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
          <span className="block font-semibold">{item.job_title}</span>
          <span className="block text-sm text-slate-500">{item.company_name} · {item.applicant_name}</span>
          <span className="mt-1 block truncate text-sm text-slate-600">{item.latest_message?.body}</span>
          {item.unread_count > 0 && <span className="text-xs font-bold text-blue-700">{item.unread_count} unread</span>}
        </Link>)}
        {!inbox.isPending && !inbox.isError && !items.length && <p className="p-3 text-sm text-slate-500">No conversations yet. Start a message from an application.</p>}
        {inbox.hasNextPage && <Button variant="ghost" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>Load more</Button>}
      </aside>
      {applicationId ? (Number.isSafeInteger(id) && id > 0 ? <Thread key={`${scope}:${id}`} id={id} scope={scope} /> : <p>Conversation not found.</p>) :
        <div className="hidden rounded-2xl border bg-white p-10 text-slate-500 md:block">Choose a conversation, or start one from an application.</div>}
    </div>
  </div>
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
  return <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white">
    <header className="border-b p-4">
      <Link to="/messages" className="mb-2 block text-sm text-blue-600 md:hidden">← Inbox</Link>
      <h2 className="font-bold">{context.data?.job_title ?? 'Application conversation'}</h2>
      {context.data && <p className="text-sm text-slate-500">{context.data.company_name} · {context.data.applicant_name} · {context.data.status.replaceAll('_', ' ')}</p>}
    </header>
    {(history.isPending || context.isPending) && <p role="status" className="p-4">Loading conversation…</p>}
    {(history.isError || context.isError) && <p role="status" className="p-4 text-amber-800">Updates are unavailable. <Button variant="ghost" onClick={refresh}>Retry</Button></p>}
    <div ref={viewport} onScroll={() => {
      const el = viewport.current
      if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
    }} className="h-[50vh] min-h-64 space-y-3 overflow-y-auto p-4" aria-label="Message history">
      {history.data?.next_before_id && <Button variant="ghost" disabled={older.isPending} onClick={() => older.mutate(history.data!.next_before_id!)}>Load older messages</Button>}
      {older.isError && <p role="alert">Could not load older messages. Please retry.</p>}
      {!history.isPending && !history.isError && !history.data?.items.length && <p className="text-sm text-slate-500">Start the conversation about this application.</p>}
      {history.data?.items.map((message) => <article key={message.id}
        className={`max-w-[90%] rounded-2xl p-3 ${String(message.sender_id) === scope?.split(':')[0] ? 'ml-auto bg-blue-50' : 'bg-slate-100'}`}>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500"><span className="font-semibold">{message.sender_name}</span><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></div>
        <p className="mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{message.body}</p>
      </article>)}
    </div>
    {!atBottom && <Button variant="ghost" onClick={() => setAtBottom(true)}>New messages / jump to latest</Button>}
    {read.isError && <p role="status" className="px-4 text-sm text-amber-800">Could not save read position. <Button variant="ghost" onClick={() => { read.reset(); if (focused && atBottom && newest) read.mutate(newest) }}>Retry</Button></p>}
    <form className="space-y-2 border-t p-4" onSubmit={(event) => {
      event.preventDefault()
      const body = draft.trim()
      if (!body || send.isPending || body.length > 5000) return
      if (retryMessage.current?.body !== body) retryMessage.current = { body, uuid: crypto.randomUUID() }
      send.mutate(retryMessage.current)
    }}>
      <label htmlFor="message-body" className="text-sm font-semibold">Message</label>
      <Textarea id="message-body" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} placeholder="Write about this application…" />
      <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{draft.length}/5000</span><Button type="submit" disabled={!draft.trim() || send.isPending || !context.data || history.isPending}>{send.isPending ? 'Sending…' : 'Send message'}</Button></div>
      {send.isError && <p role="alert" className="text-sm text-red-700">{isAxiosError(send.error) && send.error.response?.status === 429 ? 'Too many messages. Wait a minute, then retry.' : 'Could not confirm delivery. Your draft is saved here; retry to send it safely.'}</p>}
    </form>
  </section>
}
