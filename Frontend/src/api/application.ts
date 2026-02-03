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
}

export interface UpdateApplicationStatusPayload {
  status: "applied" | "under_review" | "shortlisted" | "hired" | "rejected"
}


export const applyToJob = async (jobId: number, coverLetter: string, resumeFile: File) => {
    // We use FormData for file uploads
    const formData = new FormData();
    formData.append('cover_letter', coverLetter);
    formData.append('resume', resumeFile);

    const response = await api.post(`/applications/jobs/${jobId}/apply`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
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