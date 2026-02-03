import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { getJobById } from "../api/jobs"
import { Button } from "../components/ui/button"
import { getMyApplications } from "../api/application"
import { jwtDecode } from "jwt-decode"
import type { DecodedToken } from "../layouts/MainLayout"

const JobDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // 1. Token & Role Extraction
  const token = localStorage.getItem('token')
  let userRole: string | null = null
  
  if (token) {
    try {
      const decoded = jwtDecode<DecodedToken>(token)
      userRole = decoded.role
    } catch (e) {
      console.error("Invalid token found", e)
    }
  }

  // 2. Fetch Job Details
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobById(id!),
    enabled: !!id
  })

  // 3. Fetch User's Applications to check if they already applied
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: getMyApplications,
    enabled: !!token && userRole === 'seeker', 
  })

  // 4. Derive "hasApplied" state
  const hasApplied = myApplications?.some(
    (app) => app.job_id === job?.id || app.job_id === Number(id)
  )

  // 5. Handle Navigation to Apply Page
  const handleApplyNavigation = () => {
    // We pass the job title in 'state' so the Apply page can display it
    // without doing another API fetch
    navigate(`/jobs/${id}/apply`, { 
      state: { jobTitle: job?.title } 
    })
  }

  // Loading & Error UI
  if (isLoading) return (
    <div className="flex justify-center p-10">
      <p className="animate-pulse text-gray-500">Loading job details...</p>
    </div>
  )
  
  if (isError || !job) {
    return (
      <div className="p-10 max-w-3xl mx-auto text-center border rounded-lg mt-10">
        <h2 className="text-xl font-semibold mb-2">Job not found</h2>
        <p className="text-gray-500 mb-6">The job post you are looking for may have been removed.</p>
        <Button onClick={() => navigate('/jobs')}>Back to Job Board</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button 
        variant="ghost" 
        className="mb-6 hover:bg-gray-100" 
        onClick={() => navigate(-1)}
      >
        ← Back to Search
      </Button>

      <div className="bg-white border rounded-xl p-8 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-lg text-blue-600 font-medium mt-1">{job.company || "Company Confidential"}</p>
            <div className="flex gap-4 mt-2 text-gray-500 text-sm">
              <span>📍 {job.location || "Remote"}</span>
              <span>💼 {job.employment_type || "Full-time"}</span>
              {(job.salary_min || job.salary_max) && (
                <span>💰 ${job.salary_min} - ${job.salary_max}</span>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-400">
              {job.company?.[0] || "J"}
            </div>
          </div>
        </div>

        <hr className="my-6" />

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Job Description</h3>
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {job.description}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center border-t pt-8">
          {!token ? (
            <Button className="w-full sm:w-auto px-8" onClick={() => navigate('/login')}>
              Login to Apply
            </Button>
          ) : userRole === 'seeker' ? (
            <Button
              className={`w-full sm:w-auto px-8 py-6 text-lg ${hasApplied ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleApplyNavigation}
              disabled={hasApplied}
            >
              {hasApplied ? "Application Submitted ✓" : "Apply for this Position"}
            </Button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-800 text-sm">
              You are logged in as an <strong>{userRole}</strong>. Only Job Seekers can apply.
            </div>
          )}

          <Button variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg">
            Save for later
          </Button>
        </div>
      </div>
    </div>
  )
}

export default JobDetail