import api from "./axios";

export const toggleSaveJob = async (jobId: number) => {
  const res = await api.post(`/saved-jobs/${jobId}`);
  return res.data; // Returns { "status": "saved" } or { "status": "unsaved" }
};

export const getMySavedJobs = async () => {
  const res = await api.get("/saved-jobs/");
  return res.data;
};