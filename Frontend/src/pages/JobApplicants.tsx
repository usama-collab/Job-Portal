import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { getApplicationsForJob, type Application, type UpdateApplicationStatusPayload } from "../api/application"
import { Button } from "../components/ui/button"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateApplicationStatus } from "../api/application"


// const statusColor = {
//   applied: "bg-blue-100 text-blue-700",
//   under_review: "bg-yellow-100 text-yellow-700",
//   shortlisted: "bg-purple-100 text-purple-700",
//   hired: "bg-green-100 text-green-700",
//   rejected: "bg-red-100 text-red-700",
// }

const STATUS_OPTIONS = [
  "applied",
  "under_review",
  "shortlisted",
  "hired",
  "rejected",
] as const


const JobApplicants = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

const { mutate: updateStatus, isPending } = useMutation({
  mutationFn: ({
    applicationId,
    status,
  }: {
    applicationId: number
    status: UpdateApplicationStatusPayload["status"]
  }) => updateApplicationStatus(applicationId, { status }),

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["job-applicants", jobId],
    })
  },
})


  const { data, isLoading, isError } = useQuery<Application[]>({
    queryKey: ["job-applicants", jobId],
    queryFn: () => getApplicationsForJob(Number(jobId)),
    enabled: !!jobId,
  })

  if (isLoading) {
    return <p className="p-6">Loading applicants...</p>
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">
          You are not authorized or job not found
        </p>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No applications yet for this job.
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Applicants</h1>

      <div className="space-y-4">
        {data.map((app: Application) => (
          <div
            key={app.id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{app.user_email}</p>
              <p className="text-sm text-gray-600">
                Applied on {new Date(app.created_at).toLocaleDateString()}
              </p>
            </div>

            <select
            value={app.status}
            disabled={isPending}
            onChange={(e) =>
                updateStatus({
                applicationId: app.id,
                status: e.target.value as UpdateApplicationStatusPayload["status"],
                })
            }
            className="border rounded-md px-3 py-1 text-sm capitalize"
            >
            {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                {status.replace("_", " ")}
                </option>
            ))}
            </select>

          </div>
        ))}
      </div>
    </div>
  )
}

export default JobApplicants
