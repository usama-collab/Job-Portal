import { useQuery } from '@tanstack/react-query'
import { getAllJobs, type Job } from '../api/jobs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { JobSearchFields } from '../components/job-search-fields'
import { MapPin, Briefcase, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

const LIMIT = 5

const Jobs = () => {
  const [params] = useSearchParams()
  return <JobResults key={JSON.stringify([params.get('q'), params.get('location')])} />
}

const JobResults = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q") || ''
  const location = searchParams.get('location') || ''
  const page = Number(searchParams.get("page") || 1)
  const skip = (page - 1) * LIMIT

  const [search, setSearch] = useState(q)
  const [locationSearch, setLocationSearch] = useState(location)
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', q, location, page],
    queryFn: () => getAllJobs(q, skip, LIMIT, location),
    placeholderData: (previousData) => previousData,
  })

  const onSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (locationSearch.trim()) params.set('location', locationSearch.trim())
    params.set('page', '1')
    setSearchParams(params)
  }

  const changePage = (next: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    setSearchParams(params)
  }
  const nextPage = () => changePage(page + 1)
  const prevPage = () => changePage(page - 1)

  if (isError) return (
    <div className="max-w-6xl mx-auto p-10 text-center">
      <p className="text-red-500 font-medium">Failed to load jobs. Please check your connection.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header / Search Section */}
      <div className="bg-white border-b sticky top-16 z-40 py-8 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <form onSubmit={onSearch} className="flex flex-col md:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <JobSearchFields search={search} location={locationSearch} onSearchChange={setSearch} onLocationChange={setLocationSearch} />
            <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-base font-bold rounded-xl shadow-md shadow-blue-100">
              Find Jobs
            </Button>
          </form>
          <p className="text-xs text-slate-500 mt-3 px-1">
            {data ? `Showing ${data.length} jobs for "${q || 'All'}"${location ? ` in "${location}"` : ''}` : 'Searching...'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 mt-4">
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            // Skeleton Loader Effect
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
            ))
          ) : data?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No jobs found</h3>
              <p className="text-slate-500">Try adjusting your keywords or location.</p>
            </div>
          ) : (
            data?.map((job: Job) => (
              <div
                key={job.id}
                className="group relative bg-white border border-slate-200 p-6 rounded-2xl hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h2>
                    <p className="text-blue-600 font-semibold flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" /> {job.company || "Company Confidential"}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                    <Clock className="h-3 w-3" /> New
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {job.location || 'Remote'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    Full-time
                  </div>
                </div>

                <p className="text-slate-600 text-sm mt-4 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                <div className="mt-5 pt-5 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jobify Direct</span>
                    <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 group-hover:gap-2 transition-all">
                        View Details <ChevronRight size={14} />
                    </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && data && data.length > 0 && (
          <div className='flex justify-between items-center mt-10 bg-white p-4 rounded-xl border shadow-sm'>
            <Button
              variant='ghost'
              className="font-bold gap-2 text-slate-600"
              disabled={page === 1}
              onClick={prevPage}
            >
              <ChevronLeft size={18} /> Previous
            </Button>

            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Page</span>
                <span className="h-8 w-8 flex items-center justify-center bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-100">
                    {page}
                </span>
            </div>

            <Button
              variant="ghost"
              className="font-bold gap-2 text-slate-600"
              disabled={!data || data.length < LIMIT}
              onClick={nextPage}
            >
              Next <ChevronRight size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Ensure you import the new icons
import { Building2 } from 'lucide-react'

export default Jobs
