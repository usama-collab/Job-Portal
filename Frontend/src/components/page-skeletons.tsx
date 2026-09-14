import { useLocation } from 'react-router-dom'
import type { SkeletonKind } from '../lib/page-skeleton-kind'

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-slate-200 ${className}`} />
}

function Field() {
  return <div className="space-y-2"><Bar className="h-3 w-24" /><Bar className="h-11 w-full rounded-xl bg-slate-100" /></div>
}

export function JobCardSkeleton() {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
    <div className="flex items-start gap-4 sm:gap-5">
      <Bar className="h-12 w-12 shrink-0 rounded-2xl sm:h-14 sm:w-14" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><div className="w-3/4 space-y-3"><Bar className="h-6 w-3/4" /><Bar className="h-4 w-1/2 bg-slate-100" /></div><Bar className="hidden h-6 w-24 rounded-full sm:block" /></div>
        <div className="mt-5 flex gap-2"><Bar className="h-8 w-24 bg-slate-100" /><Bar className="h-8 w-20 bg-slate-100" /><Bar className="hidden h-8 w-24 bg-slate-100 sm:block" /></div>
        <Bar className="mt-5 h-4 w-full bg-slate-100" /><Bar className="mt-2 h-4 w-4/5 bg-slate-100" />
        <div className="mt-6 flex justify-between border-t border-slate-100 pt-5"><Bar className="h-4 w-28 bg-slate-100" /><Bar className="h-4 w-20" /></div>
      </div>
    </div>
  </div>
}

function JobsSkeleton() {
  return <div className="min-h-screen bg-slate-50 pb-24">
    <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-6 sm:py-8"><div className="mx-auto flex max-w-5xl flex-col gap-2 rounded-2xl border border-slate-200 p-2.5 md:flex-row"><Bar className="h-12 flex-1 rounded-xl bg-slate-100" /><Bar className="h-12 flex-1 rounded-xl bg-slate-100" /><Bar className="h-12 w-full rounded-xl bg-blue-100 md:w-36" /></div></div>
    <div className="mx-auto max-w-5xl space-y-4 px-5 pt-8 sm:px-6 sm:pt-10"><Bar className="mb-7 h-8 w-52" />{[0, 1, 2, 3].map((item) => <JobCardSkeleton key={item} />)}</div>
  </div>
}

function JobDetailSkeleton() {
  return <div className="mx-auto max-w-5xl p-6 py-12"><Bar className="mb-8 h-5 w-44 bg-slate-100" />
    <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 md:p-12">
      <div className="flex justify-between gap-6"><div className="min-w-0 flex-1"><Bar className="h-6 w-28 rounded-full bg-blue-100" /><Bar className="mt-5 h-11 w-3/4" /><div className="mt-7 flex flex-wrap gap-3"><Bar className="h-9 w-32 bg-slate-100" /><Bar className="h-9 w-28 bg-slate-100" /><Bar className="h-9 w-32 bg-slate-100" /></div></div><Bar className="hidden h-20 w-20 rounded-3xl md:block" /></div>
      <div className="mt-10 grid gap-12 border-t border-slate-100 pt-10 md:grid-cols-3"><div className="space-y-4 md:col-span-2"><Bar className="h-7 w-40" />{[0, 1, 2, 3, 4, 5].map((item) => <Bar key={item} className={`h-4 bg-slate-100 ${item % 3 === 2 ? 'w-2/3' : 'w-full'}`} />)}</div><div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8"><Bar className="h-4 w-28" /><Bar className="mt-7 h-14 w-full rounded-2xl bg-blue-100" /><Bar className="mt-3 h-12 w-full rounded-2xl" /></div></div>
    </div>
  </div>
}

function ApplicationRowsSkeleton({ applicants = false }: { applicants?: boolean }) {
  return <div className="space-y-4">{[0, 1, 2].map((item) => <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-4"><Bar className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100" /><div className="flex-1 space-y-3"><Bar className="h-5 w-1/2" /><Bar className="h-4 w-1/3 bg-slate-100" /></div><Bar className="hidden h-7 w-24 rounded-full sm:block" /></div><div className="mt-6 flex gap-3 border-t border-slate-100 pt-5"><Bar className="h-4 w-28 bg-slate-100" /><Bar className="h-4 w-24 bg-slate-100" />{applicants && <Bar className="h-4 w-20 bg-slate-100" />}</div></div>)}</div>
}

function ApplicationsSkeleton() {
  return <div className="mx-auto max-w-4xl px-4 py-12"><Bar className="h-10 w-44" /><Bar className="mt-3 h-4 w-72 max-w-full bg-slate-100" /><div className="mb-8 mt-10 flex gap-6 overflow-hidden border-b border-slate-200 pb-4">{[0, 1, 2, 3].map((item) => <Bar key={item} className="h-5 w-20 shrink-0 bg-slate-100" />)}</div><ApplicationRowsSkeleton /></div>
}

function ApplicantsSkeleton() {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12"><Bar className="h-4 w-40 bg-slate-100" /><Bar className="mb-10 mt-5 h-10 w-64" /><ApplicationRowsSkeleton applicants /></div>
}

function DashboardSkeleton() {
  return <div className="min-h-screen bg-slate-50 pb-24"><section className="border-b border-blue-100 bg-blue-50 px-5 py-14 sm:px-6 sm:py-16"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="space-y-4"><Bar className="h-8 w-36 rounded-full bg-white" /><Bar className="h-12 w-72 max-w-full" /><Bar className="h-5 w-96 max-w-full bg-white" /></div><Bar className="h-12 w-44 rounded-xl bg-blue-100" /></div><div className="mt-10 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="rounded-2xl border border-blue-100 bg-white p-6"><Bar className="h-10 w-10 rounded-xl bg-blue-100" /><Bar className="mt-4 h-4 w-28 bg-slate-100" /><Bar className="mt-3 h-8 w-16" /></div>)}</div></div></section><div className="mx-auto max-w-6xl px-5 pt-11 sm:px-6 sm:pt-14"><Bar className="h-7 w-48" /><div className="mt-7 grid gap-5 lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="rounded-3xl border border-slate-200 bg-white p-7"><Bar className="h-7 w-2/3" /><Bar className="mt-3 h-4 w-1/3 bg-slate-100" /><div className="mt-7 flex gap-3"><Bar className="h-8 w-24 bg-slate-100" /><Bar className="h-8 w-24 bg-slate-100" /></div><Bar className="mt-8 h-12 w-full rounded-xl bg-blue-100" /></div>)}</div></div></div>
}

function FormSkeleton({ apply = false, edit = false }: { apply?: boolean; edit?: boolean }) {
  const width = apply ? 'max-w-4xl' : 'max-w-3xl'
  return <div className="min-h-screen bg-slate-50/50 px-4 py-8 sm:py-12"><div className={`mx-auto ${width}`}>
    <Bar className="mb-6 h-5 w-40 bg-slate-100" />
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className={`h-2 ${edit ? 'bg-amber-100' : 'bg-blue-100'}`} /><div className="border-b border-slate-100 px-6 py-8 sm:px-10"><Bar className="h-9 w-64 max-w-full" /><Bar className="mt-3 h-4 w-80 max-w-full bg-slate-100" /></div><div className="space-y-8 px-6 py-8 sm:px-10">
      {apply && <div><Bar className="mb-4 h-5 w-36" /><div className="grid h-40 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50"><Bar className="h-8 w-8 rounded-lg" /></div></div>}
      {apply ? <div><Bar className="mb-5 h-5 w-44" /><div className="grid gap-5 sm:grid-cols-2"><Field /><Field /><Field /><Field /></div></div> :
        <div><Bar className="mb-5 h-5 w-44" /><Field /><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field /><Field /></div></div>}
      <div><Bar className="mb-5 h-5 w-48" /><Field /><Bar className="mt-5 h-32 w-full rounded-xl bg-slate-100" /></div>
      <div className="flex justify-end"><Bar className="h-12 w-40 rounded-xl bg-blue-100" /></div>
    </div></div>
  </div></div>
}

function OnboardingSkeleton() {
  return <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-12"><div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><Bar className="h-12 w-12 rounded-2xl bg-blue-100" /><Bar className="mt-5 h-9 w-3/4" /><Bar className="mt-3 h-4 w-full bg-slate-100" /><Bar className="mt-2 h-4 w-4/5 bg-slate-100" /><div className="mt-8 space-y-6"><Field /><Field /><div><Bar className="mb-2 h-3 w-32" /><Bar className="h-32 w-full rounded-xl bg-slate-100" /></div><Field /><Bar className="h-12 w-full rounded-xl bg-blue-100" /></div></div></div>
}

function ProfileSkeleton() {
  return <div className="mx-auto max-w-5xl px-4 py-10"><div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="h-40 bg-blue-100" /><div className="px-8 pb-8"><div className="-mt-16 flex items-end justify-between"><Bar className="h-32 w-32 rounded-2xl border-4 border-white" /><Bar className="h-10 w-32 rounded-xl bg-slate-100" /></div><Bar className="mt-6 h-8 w-48" /><Bar className="mt-3 h-5 w-3/4 bg-slate-100" /><div className="mt-6 flex gap-5"><Bar className="h-4 w-40 bg-slate-100" /><Bar className="h-4 w-32 bg-slate-100" /></div></div></div><div className="grid gap-8 lg:grid-cols-3"><div className="h-72 rounded-2xl border border-slate-200 bg-white p-8"><Bar className="h-6 w-36" /><Bar className="mt-8 h-36 w-full bg-slate-100" /></div><div className="space-y-8 lg:col-span-2">{[0, 1].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-8"><Bar className="h-6 w-40" /><Bar className="mt-6 h-4 w-full bg-slate-100" /><Bar className="mt-3 h-4 w-3/4 bg-slate-100" /></div>)}</div></div></div>
}

export function ConversationListSkeleton() {
  return <div className="space-y-1 p-2" role="status" aria-label="Loading conversations">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg px-3 py-4"><Bar className="h-11 w-11 shrink-0 rounded-lg" /><div className="flex-1 space-y-2"><Bar className="h-4 w-2/3" /><Bar className="h-3 w-full bg-slate-100" /></div></div>)}</div>
}

export function MessageHistorySkeleton() {
  return <div className="space-y-5 px-4 py-5" role="status" aria-label="Loading conversation">{[0, 1, 2].map((item) => <div key={item} className={`space-y-2 ${item === 1 ? 'ml-auto w-2/3' : 'w-3/4'}`}><Bar className="h-14 w-full rounded-xl bg-slate-100" /><Bar className="h-3 w-20 bg-slate-100" /></div>)}</div>
}

function MessagesSkeleton({ thread = false }: { thread?: boolean }) {
  return <div className="bg-[#f5f5f4] px-3 py-4 sm:px-6"><div className="mx-auto grid h-[calc(100dvh-6rem)] min-h-[400px] max-w-[1400px] gap-4 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]"><aside className={`min-h-0 overflow-hidden rounded-xl border border-stone-200 bg-white ${thread ? 'hidden md:block' : ''}`}><div className="border-b border-stone-200 p-4"><Bar className="h-6 w-28" /><Bar className="mt-3 h-11 w-full rounded-lg bg-slate-100" /></div><ConversationListSkeleton /></aside><div className={`overflow-hidden rounded-xl border border-stone-200 bg-white ${thread ? '' : 'hidden md:block'}`}><div className="flex items-center gap-3 border-b border-stone-200 p-4"><Bar className="h-11 w-11 rounded-lg" /><Bar className="h-5 w-40" /></div><MessageHistorySkeleton /><Bar className="mx-4 mt-8 h-24 w-[calc(100%-2rem)] rounded-xl bg-slate-100" /></div></div></div>
}

export function NotificationRowsSkeleton() {
  return <div role="status" aria-label="Loading notifications">{[0, 1, 2, 3].map((item) => <div key={item} className="flex gap-4 border-b border-slate-100 p-5 last:border-0"><Bar className="h-10 w-10 shrink-0 rounded-xl bg-blue-100" /><div className="flex-1 space-y-2"><Bar className="h-4 w-4/5" /><Bar className="h-4 w-3/5 bg-slate-100" /><Bar className="h-3 w-20 bg-slate-100" /></div></div>)}</div>
}

function NotificationsSkeleton() {
  return <div className="mx-auto max-w-3xl px-4 py-12"><Bar className="h-10 w-56" /><Bar className="mt-3 h-4 w-80 max-w-full bg-slate-100" /><div className="mt-8 flex justify-between"><div className="flex gap-2"><Bar className="h-9 w-16 rounded-lg bg-slate-100" /><Bar className="h-9 w-20 rounded-lg bg-slate-100" /></div><Bar className="h-9 w-32 rounded-lg bg-slate-100" /></div><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white"><NotificationRowsSkeleton /></div></div>
}

function AuthSkeleton({ fields, social }: { fields: number; social: boolean }) {
  return <div className="grid min-h-dvh bg-white lg:grid-cols-2"><div className="flex items-center bg-slate-50 px-5 py-8 sm:px-8"><div className="mx-auto w-full max-w-lg"><Bar className="mx-auto mb-6 h-8 w-28 rounded-lg bg-blue-100" /><div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 sm:p-9"><Bar className="mx-auto h-7 w-48" /><Bar className="mx-auto mt-3 h-4 w-64 max-w-full bg-slate-100" />{social && <Bar className="mt-8 h-11 w-full rounded-xl bg-slate-100" />}<div className="mt-8 space-y-4">{Array.from({ length: fields }, (_, item) => <Field key={item} />)}<Bar className="h-11 w-full rounded-xl bg-blue-100" /></div></div></div></div><div className="hidden bg-blue-700 lg:block"><div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-5 px-12"><Bar className="h-10 w-40 bg-blue-500" /><Bar className="h-12 w-full bg-blue-500" /><Bar className="h-5 w-4/5 bg-blue-500" /><Bar className="h-48 w-full rounded-3xl bg-blue-600" /></div></div></div>
}

export function PageSkeleton({ kind }: { kind: SkeletonKind }) {
  const { pathname } = useLocation()
  return <div role="status" aria-label="Loading page content" data-skeleton={kind} className="motion-safe:animate-pulse" aria-busy="true">
    {kind === 'jobs' ? <JobsSkeleton /> : kind === 'job-detail' ? <JobDetailSkeleton /> :
      kind === 'apply' ? <FormSkeleton apply /> : kind === 'applications' ? <ApplicationsSkeleton /> :
      kind === 'profile' ? <ProfileSkeleton /> : kind === 'dashboard' ? <DashboardSkeleton /> :
      kind === 'applicants' ? <ApplicantsSkeleton /> : kind === 'job-form' ? <FormSkeleton edit={pathname.endsWith('/edit')} /> :
      kind === 'onboarding' ? <OnboardingSkeleton /> : kind === 'messages' ? <MessagesSkeleton thread={pathname.split('/').length > 2} /> :
      kind === 'notifications' ? <NotificationsSkeleton /> : <AuthSkeleton fields={pathname === '/register' ? 4 : pathname === '/forgot-password' ? 1 : 2} social={kind === 'auth'} />}
  </div>
}
