import api from "./axios"

// export interface Application{
//     id: number
//     job_id: number
//     status: string
// }

export interface Application {
  id: number
  job_id: number
  status: "applied" | "under_review" | "shortlisted" | "hired" | "rejected"
  created_at: string
  user_id: number
  user_email?: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  current_job_title?: string | null
  total_experience_years?: string | null
  current_salary?: string | null
  expected_salary?: string | null
  salary_currency?: string | null
  notice_period?: string | null
  university_name?: string | null
  degree?: string | null
  field_of_study?: string | null
  graduation_year?: number | null
}

export interface UpdateApplicationStatusPayload {
  status: "applied" | "under_review" | "shortlisted" | "hired" | "rejected"
}


export interface ApplicationDetails {
  full_name: string
  email: string
  phone: string
  city: string
  current_job_title: string
  total_experience_years: string
  current_salary: string
  expected_salary: string
  salary_currency: string
  notice_period: string
  university_name: string
  degree: string
  field_of_study: string
  graduation_year: string
  cover_letter: string
}

export const applyToJob = async (jobId: number, details: ApplicationDetails, resumeFile: File) => {
    const formData = new FormData();
    Object.entries(details).forEach(([key, value]) => {
      if (value.trim()) formData.append(key, value.trim())
    })
    formData.append('resume', resumeFile);

    const response = await api.post(`/applications/jobs/${jobId}/apply`, formData);
    return response.data;
}

export const getMyApplications = async (): Promise<Application[]> => {
    const response = await api.get('/applications/me')
    return response.data
}

export const getApplicationsForJob = async(jobId: number) => {
    const response = await api.get(`/applications/jobs/${jobId}`)
    return response.data
}

export const updateApplicationStatus = async (
  applicationId: number,
  payload: UpdateApplicationStatusPayload
) => {
  const res = await api.put(
    `/applications/${applicationId}/status`,
    payload
  )
  return res.data
}
