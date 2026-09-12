import api from "./axios";

export interface WorkExperience {
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string | null;
  source_excerpt?: string | null;
}

export interface Education {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  source_excerpt?: string | null;
}

export interface Project {
  name: string;
  role?: string | null;
  description?: string | null;
  technologies: string[];
  url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  source_excerpt?: string | null;
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  email_verified: boolean;
  created_at: string;
  bio?: string | null;
  skills?: string[] | null;
  experience?: unknown[] | null;
  work_experience?: WorkExperience[] | null;
  education?: Education[] | null;
  projects?: Project[] | null;
  avatar_url?: string | null;
  company_membership?: { company_id: number; role: string; company_name: string } | null;
}

export interface ResumeMetadata {
  resume_id: string;
  filename: string;
  uploaded_at: string;
  download_url: string;
}

export interface ResumeAnalysis {
  analysis_id: string;
  resume_id: string;
  expires_at: string;
  skills: Array<{ name: string; source_excerpt?: string | null }>;
  work_experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  warnings: string[];
}

export const getMyProfile = async (): Promise<Profile> => {
  const response = await api.get('/users/profile/me');
  return response.data;
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await api.post("/users/me/avatar", formData);
  return response.data;
};

export interface ProfileUpdatePayload {
  name?: string;
  bio?: string;
  skills?: string[];
  experience?: unknown[];
  work_experience?: WorkExperience[];
  education?: Education[];
  projects?: Project[];
}

export const updateProfile = async (payload: ProfileUpdatePayload) => {
  const response = await api.put('/users/me/update', payload);
  return response.data;
};

export const updateMyProfile = updateProfile;

export const getProfileResume = async (): Promise<ResumeMetadata> =>
  (await api.get('/users/me/resume')).data;

export const uploadProfileResume = async (file: File): Promise<ResumeMetadata> => {
  const body = new FormData();
  body.append('resume', file);
  return (await api.post('/users/me/resume', body)).data;
};

export const importProfileResume = async (applicationId: number): Promise<ResumeMetadata> =>
  (await api.post('/users/me/resume/import', { application_id: applicationId })).data;

export const deleteProfileResume = async (): Promise<void> => {
  await api.delete('/users/me/resume');
};

export const downloadProfileResume = async (filename: string): Promise<void> => {
  const response = await api.get('/users/me/resume/download', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const analyzeProfileResume = async (resumeId: string): Promise<ResumeAnalysis> =>
  (await api.post('/users/me/resume/analyze', { resume_id: resumeId, consent: true }, { timeout: 95_000 })).data;

export const getResumeAnalysis = async (): Promise<ResumeAnalysis> =>
  (await api.get('/users/me/resume/analysis')).data;

export interface ApplyAnalysisPayload {
  analysis_id: string;
  resume_id: string;
  skills: string[];
  work_experience: WorkExperience[];
  education: Education[];
  projects: Project[];
}

export const applyResumeAnalysis = async (payload: ApplyAnalysisPayload): Promise<Profile> =>
  (await api.post('/users/me/resume/analysis/apply', payload)).data;
