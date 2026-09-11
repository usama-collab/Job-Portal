import axios from "axios";

export const getApiErrorDetail = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) return fallback;

  const messages = detail.flatMap((issue: unknown) => {
    if (!issue || typeof issue !== "object" || !("msg" in issue) || typeof issue.msg !== "string") return [];
    const location = "loc" in issue && Array.isArray(issue.loc) ? issue.loc : [];
    const field = location.filter((part: unknown) => typeof part === "string" && !["body", "query", "path"].includes(part)).join(" ").replaceAll("_", " ");
    const label = field ? field.charAt(0).toUpperCase() + field.slice(1) : "";
    return [label ? `${label}: ${issue.msg}` : issue.msg];
  });
  return messages.join("; ") || fallback;
};
