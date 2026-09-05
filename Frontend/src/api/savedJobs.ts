import api from "./axios";
import type { Job } from "./jobs";

export interface SavedJob {
  id: number;
  user_id: number;
  job_id: number;
  created_at: string;
  job: Job;
}

export const toggleSaveJob = async (jobId: number) => {
  const res = await api.post(`/saved-jobs/${jobId}`);
  return res.data; // Returns { "status": "saved" } or { "status": "unsaved" }
};

export const getMySavedJobs = async (): Promise<SavedJob[]> => {
  const res = await api.get("/saved-jobs/");
  return res.data;
};
