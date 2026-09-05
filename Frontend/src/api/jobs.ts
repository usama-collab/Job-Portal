import api from "./axios";


export interface Job{
    id: number
    title: string
    description: string
    location?: string
    salary_min?: string
    salary_max?: string
    employment_type?: string
    company?: string
    company_id: number
    created_at: string
    created_by_user_id?: number
    is_active: boolean
}

export interface EmployerJob {
  id: number
  title: string
  location?: string
  created_at: string
  description: string
  salary_min?: number
  salary_max?: number
  employment_type?: string
  is_active: boolean
  applications_count: number
}

export interface CreateJobPayload{
    title: string
    description: string
    location?: string
    salary_min?: number
    salary_max?: number
    employment_type?: string
    is_active: boolean
}


export const getAllJobs = async (q?: string, skip = 0, limit = 10, location?: string): Promise<Job[]> => {
    const response = await api.get('/jobs/',{
        params: {
            q,
            location,
            skip,
            limit
        }
    })
    return response.data
}

export const getJobById = async (id: string): Promise<Job> => {
    const response = await api.get(`/jobs/${id}`)
    return response.data
}

export const getMyJobs = async (): Promise<EmployerJob[]> => {
  const res = await api.get("/jobs/me")
  return res.data
}

export const createJob = async (payload: CreateJobPayload) => {
    const response = await api.post('/jobs/create', payload)
    return response.data
}

export  const updateJob = async (jobId: string, payload: CreateJobPayload) => {
    const response = await api.put(`/jobs/update/${jobId}`, payload)
    return response.data

}

export  const deleteJob = async (jobId: string) => {
    const response = await api.delete(`/jobs/${jobId}`)
    return response.data

}
