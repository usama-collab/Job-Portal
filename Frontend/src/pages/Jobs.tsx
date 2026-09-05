import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { ArrowUpRight, Briefcase, Building2, ChevronLeft, ChevronRight, Clock3, MapPin, SearchX, Sparkles, X } from 'lucide-react'
import { getAllJobs, type Job } from '../api/jobs'
import { Button } from '../components/ui/button'
import { JobSearchFields } from '../components/job-search-fields'

const LIMIT = 5

const titleCase = (value?: string) => value
  ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Full-time'

const salaryLabel = ({ salary_min, salary_max }: Job) => {
  if (!salary_min && !salary_max) return null
  const money = (value: string) => `$${Number(value).toLocaleString()}`
  if (salary_min && salary_max) return `${money(salary_min)} – ${money(salary_max)}`
  return salary_min ? `From ${money(salary_min)}` : `Up to ${money(salary_max!)}`
}

const postedLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently posted'
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
  if (days === 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  return days < 30 ? `Posted ${days} days ago` : `Posted ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

const Jobs = () => {
  const [params] = useSearchParams()
  return <JobResults key={`${params.get('q')}:${params.get('location')}`} />
}

const JobResults = () => {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const location = params.get('location') || ''
  const page = Number(params.get('page') || 1)
  const [search, setSearch] = useState(q)
  const [locationSearch, setLocationSearch] = useState(location)
  const navigate = useNavigate()

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['jobs', q, location, page],
    queryFn: () => getAllJobs(q, (page - 1) * LIMIT, LIMIT, location),
    placeholderData: (previous) => previous,
  })

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('q', search.trim())
    if (locationSearch.trim()) next.set('location', locationSearch.trim())
    next.set('page', '1')
    setParams(next)
  }

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  const clearFilter = (name?: 'q' | 'location') => {
    const next = new URLSearchParams(params)
    if (name) next.delete(name)
    else {
      next.delete('q')
      next.delete('location')
    }
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 pb-24">
      <div className="pointer-events-none absolute -left-48 top-80 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-[38rem] h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl" />

      <section className="relative overflow-hidden border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_48%,#eef2ff_100%)] px-5 pb-14 pt-14 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[52px] border-white/50" />
        <div className="jobs-rise relative mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3.5 py-2 text-xs font-extrabold text-blue-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Opportunities picked for ambition
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
              Find a role that fits <span className="text-blue-600">your next move.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Explore opportunities from growing teams and search by role, skill, company, or location.</p>
          </div>

          <form onSubmit={submitSearch} className="flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/95 p-2.5 shadow-[0_24px_70px_-24px_rgba(30,64,175,0.32)] ring-1 ring-slate-200/70 backdrop-blur transition-shadow duration-300 focus-within:shadow-[0_28px_80px_-22px_rgba(37,99,235,0.38)] md:flex-row">
            <JobSearchFields search={search} location={locationSearch} onSearchChange={setSearch} onLocationChange={setLocationSearch} />
            <Button type="submit" className="h-12 rounded-xl bg-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl motion-reduce:transform-none">
              Find Jobs <ArrowUpRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      <main className="relative mx-auto max-w-5xl px-5 pt-10 sm:px-6 sm:pt-12">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Latest opportunities</p>
            <h2 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-slate-900 sm:text-3xl">
              {isLoading ? 'Finding the right roles…' : `${data?.length || 0} ${data?.length === 1 ? 'job' : 'jobs'} on this page`}
            </h2>
          </div>
          {(q || location) && (
            <div className="flex flex-wrap items-center gap-2">
              {q && <FilterChip label={q} onClear={() => clearFilter('q')} />}
              {location && <FilterChip label={location} icon={<MapPin className="h-3 w-3" />} onClear={() => clearFilter('location')} />}
              <button type="button" onClick={() => clearFilter()} className="px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:text-blue-600">Clear all</button>
            </div>
          )}
        </header>

        <div className={`space-y-4 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60' : 'opacity-100'}`} aria-busy={isFetching}>
          {isLoading ? [...Array(4)].map((_, index) => <JobSkeleton key={index} />)
            : isError ? <StateCard icon={<SearchX />} title="We couldn't load the jobs" copy="Check your connection and try refreshing this page." />
            : data?.length === 0 ? <StateCard icon={<SearchX />} title="No matching roles yet" copy="Try a broader keyword or nearby location to see more opportunities." action={(q || location) ? <Button onClick={() => clearFilter()} variant="outline" className="mt-6 rounded-xl border-blue-200 font-bold text-blue-700 hover:bg-blue-50">View all jobs</Button> : undefined} />
            : data?.map((job, index) => <JobCard key={job.id} job={job} index={index} onOpen={() => navigate(`/jobs/${job.id}`)} />)}
        </div>

        {!isLoading && !isError && data && data.length > 0 && (
          <nav aria-label="Job results pagination" className="mt-10 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.5)] backdrop-blur sm:p-4">
            <Button variant="ghost" className="gap-2 rounded-xl font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700" disabled={page === 1} onClick={() => changePage(page - 1)}><ChevronLeft /><span className="hidden sm:inline">Previous</span></Button>
            <div className="flex items-center gap-3"><span className="hidden text-xs font-bold uppercase tracking-widest text-slate-400 sm:inline">Page</span><span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-black text-white shadow-md shadow-blue-200">{page}</span></div>
            <Button variant="ghost" className="gap-2 rounded-xl font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700" disabled={data.length < LIMIT} onClick={() => changePage(page + 1)}><span className="hidden sm:inline">Next</span><ChevronRight /></Button>
          </nav>
        )}
      </main>
    </div>
  )
}

const JobCard = ({ job, index, onOpen }: { job: Job; index: number; onOpen: () => void }) => {
  const company = job.company || 'Company Confidential'
  const salary = salaryLabel(job)
  const openFromKeyboard = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }
  return (
    <article role="link" tabIndex={0} aria-label={`View ${job.title} at ${company}`} onClick={onOpen} onKeyDown={openFromKeyboard} style={{ animationDelay: `${index * 70}ms` }} className="jobs-card-rise group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_35px_-24px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_55px_-24px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transform-none sm:p-7">
      <div className="absolute inset-y-0 left-0 w-1 origin-center scale-y-0 rounded-r-full bg-blue-600 transition-transform duration-300 group-hover:scale-y-100" />
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-200 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transform-none sm:h-14 sm:w-14">{company.charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h3 className="text-xl font-black tracking-[-0.025em] text-slate-900 transition-colors group-hover:text-blue-600 sm:text-2xl">{job.title}</h3><p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-600"><Building2 className="h-4 w-4 text-blue-500" />{company}</p></div>
            <span className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Actively hiring</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600 sm:text-sm">
            <Meta icon={<MapPin />} label={job.location || 'Remote'} /><Meta icon={<Briefcase />} label={titleCase(job.employment_type)} />{salary && <Meta label={salary} />}
          </div>
          <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600 sm:pr-8">{job.description}</p>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5"><span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Clock3 className="h-3.5 w-3.5" />{postedLabel(job.created_at)}</span><span className="flex items-center gap-1.5 text-sm font-extrabold text-blue-600">View role <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" /></span></div>
        </div>
      </div>
    </article>
  )
}

const FilterChip = ({ label, icon, onClear }: { label: string; icon?: ReactNode; onClear: () => void }) => <span className="inline-flex max-w-52 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{icon}<span className="truncate">{label}</span><button type="button" onClick={onClear} aria-label={`Remove ${label} filter`} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3" /></button></span>

const Meta = ({ icon, label }: { icon?: ReactNode; label: string }) => <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">{icon && <span className="[&>svg]:h-4 [&>svg]:w-4 text-slate-400">{icon}</span>}{label}</span>

const JobSkeleton = () => <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6"><div className="flex gap-5"><div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100" /><div className="flex-1"><div className="h-6 w-2/5 rounded bg-slate-100" /><div className="mt-3 h-4 w-1/4 rounded bg-slate-100" /><div className="mt-6 h-16 rounded bg-slate-100" /></div></div></div>

const StateCard = ({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) => <div className="jobs-rise rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-20 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 [&>svg]:h-7 [&>svg]:w-7">{icon}</span><h3 className="mt-5 text-xl font-black text-slate-900">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{copy}</p>{action}</div>

export default Jobs
