import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, Edit3, Loader2, MapPin, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { deleteJob, getMyJobs, type EmployerJob } from '../api/jobs'
import { getMyCompany } from '../api/company'
import { Button } from '../components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'

const employmentLabel = (value?: string) => value
  ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Full-time'

const salaryLabel = (job: EmployerJob) => {
  const format = (value: number) => `$${value.toLocaleString()}`
  if (job.salary_min && job.salary_max) return `${format(job.salary_min)} – ${format(job.salary_max)}`
  if (job.salary_min) return `From ${format(job.salary_min)}`
  if (job.salary_max) return `Up to ${format(job.salary_max)}`
  return 'Salary not listed'
}

const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Recently posted' : `Posted ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

const EmployerDashboard = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isNavigating, setIsNavigating] = useState(false)
  const [selectedJob, setSelectedJob] = useState<EmployerJob | null>(null)

  const { data: jobs, isLoading, isError } = useQuery({ queryKey: ['employer-jobs'], queryFn: getMyJobs })
  const { data: company } = useQuery({ queryKey: ['my-company'], queryFn: getMyCompany })

  const deleteMutation = useMutation({
    mutationFn: (jobId: number) => deleteJob(String(jobId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] })
      toast.success('Job listing deleted')
      setSelectedJob(null)
    },
    onError: () => toast.error('Failed to delete the job. Please try again.'),
  })

  const postJob = () => {
    setIsNavigating(true)
    navigate('/employer/jobs/create')
  }

  if (isLoading) return <DashboardState icon={<Loader2 className="animate-spin" />} title="Preparing your workspace…" copy="Loading jobs and applicant activity." />
  if (isError) return <DashboardState icon={<BriefcaseBusiness />} title="We couldn't load your dashboard" copy="Check your connection, then try again." action={<Button onClick={() => window.location.reload()} variant="outline" className="mt-5 rounded-xl">Try again</Button>} />

  const totalJobs = jobs?.length || 0
  const activeJobs = jobs?.filter((job) => job.is_active).length || 0
  const applicants = jobs?.reduce((total, job) => total + job.applications_count, 0) || 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 pb-24">
      <div className="pointer-events-none absolute -left-44 top-96 h-96 w-96 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 top-[42rem] h-80 w-80 rounded-full bg-indigo-200/25 blur-3xl" />

      <section className="relative overflow-hidden border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_52%,#eef2ff_100%)] px-5 py-14 sm:px-6 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[52px] border-white/50" />
        <div className="jobs-rise relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3.5 py-2 text-xs font-extrabold text-blue-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" />Hiring workspace</span>
              <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">{company?.name || 'Employer Dashboard'}</h1>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">Manage listings, track applicant interest, and keep your hiring pipeline moving.</p>
            </div>
            <Button onClick={postJob} disabled={isNavigating} className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl motion-reduce:transform-none">
              {isNavigating ? <Loader2 className="animate-spin" /> : <Plus />} Post a new job
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat icon={<BriefcaseBusiness />} label="Total listings" value={totalJobs} tone="blue" />
            <Stat icon={<Sparkles />} label="Active jobs" value={activeJobs} tone="emerald" />
            <Stat icon={<Users />} label="Total applicants" value={applicants} tone="violet" />
          </div>
        </div>
      </section>

      <main className="relative mx-auto max-w-6xl px-5 pt-11 sm:px-6 sm:pt-14">
        <div className="mb-7 flex items-end justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Your listings</p><h2 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-slate-900">Roles you're hiring for</h2></div>
          {totalJobs > 0 && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-slate-500 ring-1 ring-slate-200">{totalJobs} {totalJobs === 1 ? 'listing' : 'listings'}</span>}
        </div>

        {!jobs?.length ? (
          <div className="jobs-rise rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-20 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-8 w-8" /></span>
            <h3 className="mt-5 text-xl font-black text-slate-900">Ready for your first listing?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Publish a role and start connecting with qualified candidates.</p>
            <Button onClick={postJob} className="mt-6 rounded-xl bg-blue-600 font-bold hover:bg-blue-700"><Plus /> Post your first job</Button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} onApplicants={() => navigate(`/employer/jobs/${job.id}/applicants`)} onEdit={() => navigate(`/employer/jobs/${job.id}/edit`)} onDelete={() => setSelectedJob(job)} />)}
          </div>
        )}
      </main>

      <AlertDialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <AlertDialogContent className="max-w-md rounded-3xl border-slate-100 shadow-2xl">
          <AlertDialogHeader>
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 /></span>
            <AlertDialogTitle className="text-center text-xl font-black text-slate-900">Delete this job listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-6 text-slate-500">“{selectedJob?.title}” and its associated applicant data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:justify-center">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedJob && deleteMutation.mutate(selectedJob.id)} disabled={deleteMutation.isPending} className="flex-1 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700">{deleteMutation.isPending ? <Loader2 className="animate-spin" /> : 'Delete listing'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const JobCard = ({ job, index, onApplicants, onEdit, onDelete }: { job: EmployerJob; index: number; onApplicants: () => void; onEdit: () => void; onDelete: () => void }) => (
  <article style={{ animationDelay: `${index * 70}ms` }} className="jobs-card-rise group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_35px_-24px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_55px_-24px_rgba(37,99,235,0.28)] motion-reduce:transform-none">
    <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 to-indigo-500 transition-transform duration-300 group-hover:scale-x-100" />
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><div className="mb-3 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${job.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} /><span className={`text-[11px] font-black uppercase tracking-wider ${job.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>{job.is_active ? 'Active' : 'Inactive'}</span><span className="text-xs text-slate-300">•</span><span className="text-xs font-bold text-slate-400">#{job.id}</span></div><h3 className="truncate text-xl font-black tracking-[-0.025em] text-slate-900 transition-colors group-hover:text-blue-600">{job.title}</h3></div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-5 w-5" /></span>
    </div>
    <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">{job.description}</p>
    <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
      <Detail icon={<MapPin />} label={job.location || 'Remote'} />
      <Detail icon={<BriefcaseBusiness />} label={employmentLabel(job.employment_type)} />
      <Detail icon={<Users />} label={`${job.applications_count} ${job.applications_count === 1 ? 'applicant' : 'applicants'}`} />
      <Detail icon={<CalendarDays />} label={dateLabel(job.created_at)} />
    </div>
    <p className="mt-4 text-sm font-extrabold text-slate-800">{salaryLabel(job)}</p>
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
      <Button onClick={onApplicants} className="flex-1 rounded-xl bg-blue-50 font-bold text-blue-700 hover:bg-blue-100"><Users /> Applicants <ArrowUpRight className="h-4 w-4" /></Button>
      <Button onClick={onEdit} variant="outline" size="icon" title="Edit job" className="rounded-xl border-slate-200 text-slate-600 hover:text-blue-600"><Edit3 /></Button>
      <Button onClick={onDelete} variant="outline" size="icon" title="Delete job" className="rounded-xl border-slate-200 text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600"><Trash2 /></Button>
    </div>
  </article>
)

const Detail = ({ icon, label }: { icon: React.ReactNode; label: string }) => <span className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100"><span className="shrink-0 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span className="truncate">{label}</span></span>

const Stat = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'blue' | 'emerald' | 'violet' }) => {
  const colors = { blue: 'bg-blue-50 text-blue-600 ring-blue-100', emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100', violet: 'bg-violet-50 text-violet-600 ring-violet-100' }
  return <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.5)] backdrop-blur"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 [&>svg]:h-5 [&>svg]:w-5 ${colors[tone]}`}>{icon}</div><p className="mt-4 text-2xl font-black text-slate-900">{value}</p><p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p></div>
}

const DashboardState = ({ icon, title, copy, action }: { icon: React.ReactNode; title: string; copy: string; action?: React.ReactNode }) => <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 [&>svg]:h-7 [&>svg]:w-7">{icon}</span><h2 className="mt-5 text-xl font-black text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-500">{copy}</p>{action}</div>

export default EmployerDashboard
