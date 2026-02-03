import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyApplications, type Application } from "../api/application";

const statusColor: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  shortlisted: "bg-purple-100 text-purple-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const MyApplications = () => {
  const navigate = useNavigate();

  // Use the imported Application type here
  const { data, isLoading, isError } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: getMyApplications,
  });

  if (isLoading) {
    return <p className="p-6">Loading your applications...</p>;
  }

  if (isError) {
    return <p className="p-6 text-red-500">Failed to load applications</p>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">You haven’t applied to any jobs yet.</p>
        <button
          onClick={() => navigate("/jobs")}
          className="text-blue-600 underline"
        >
          Browse jobs
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Applications</h1>

      <div className="space-y-4">
        {data.map((app) => (
          <div
            key={app.id}
            onClick={() => navigate(`/jobs/${app.job_id}`)}
            className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-medium">Job ID #{app.job_id}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  // Use 'as string' or a fallback to satisfy the index signature
                  statusColor[app.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {app.status.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyApplications;