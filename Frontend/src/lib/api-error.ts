import axios from "axios";

export const getApiErrorDetail = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;
  const detail = error.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
};
