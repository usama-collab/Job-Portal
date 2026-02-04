import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getApplicationsForJob, 
  updateApplicationStatus, 
  type Application, 
  type UpdateApplicationStatusPayload 
} from "../api/application";
import { Button } from "../components/ui/button";
import { 
  User, 
  Calendar, 
  Mail, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Users, 
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  Quote
} from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  "applied",
  "under_review",
  "shortlisted",
  "hired",
  "rejected",
] as const;

type JobApplication = Application & {
  cover_letter?: string | null;
  resume_path?: string | null;
  resume_filename?: string | null;
};

const statusStyles: Record<(typeof STATUS_OPTIONS)[number], string> = {
  applied: "bg-blue-500",
  under_review: "bg-amber-500",
  shortlisted: "bg-purple-500",
  hired: "bg-emerald-500",
  rejected: "bg-red-500",
};

const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: number; status: UpdateApplicationStatusPayload["status"] }) => 
      updateApplicationStatus(applicationId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applicants", jobId] });
      toast.success("Status Updated");
    },
  });

  const { data, isLoading, isError } = useQuery<JobApplication[]>({
    queryKey: ["job-applicants", jobId],
    queryFn: () => getApplicationsForJob(Number(jobId)),
    enabled: !!jobId,
  });

  const getResumeUrl = (resumePath: string) => {
    const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    const normalizedPath = String(resumePath).replace(/^\/+/, "");
    return apiBaseUrl ? `${apiBaseUrl}/${normalizedPath}` : normalizedPath;
  };

  const handleOpenResume = (resumePath: string | null | undefined) => {
    if (!resumePath) {
      toast.error("No resume uploaded for this applicant.");
      return;
    }

    const resumeUrl = getResumeUrl(resumePath);
    const newTab = window.open(resumeUrl, "_blank", "noopener,noreferrer");
    if (!newTab) {
      const link = document.createElement("a");
      link.href = resumeUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadResume = async (
    resumePath: string | null | undefined,
    fileName: string
  ) => {
    if (!resumePath) {
      toast.error("No resume uploaded for this applicant.");
      return;
    }

    const resumeUrl = getResumeUrl(resumePath);

    try {
      const res = await fetch(resumeUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "resume.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.info("Downloading Resume...");
    } catch {
      toast.info("Opening resume (use the browser download button).");
      handleOpenResume(resumePath);
    }
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!jobId) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xl">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Missing job id</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm font-medium">We can’t load applicants without a job id.</p>
        <Button onClick={() => navigate(-1)} className="w-full rounded-xl" variant="outline">Go Back</Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-red-100 rounded-3xl text-center shadow-xl">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Couldn’t load applicants</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm font-medium">Please check your connection and try again.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["job-applicants", jobId] })} className="w-full rounded-xl" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-700">
      <div className="mb-10">
        <Button 
          variant="ghost" 
          className="p-0 hover:bg-transparent text-slate-500 hover:text-blue-600 font-bold gap-2 group mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Button>
        <h1 className="text-4xl font-[1000] tracking-tighter text-slate-900">
          Review Candidates<span className="text-blue-600">.</span>
        </h1>
      </div>

      <div className="grid gap-6">
        {data?.length === 0 && (
          <div className="max-w-md mx-auto mt-10 p-10 bg-white border border-slate-200 rounded-[2rem] text-center shadow-lg">
            <div className="bg-slate-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
              <Users size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">No applicants yet</h2>
            <p className="text-slate-500 font-medium text-sm">Check back later — new applications will show up here.</p>
          </div>
        )}
        {data?.map((app) => (
          <div
            key={app.id}
            className="group bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500"
          >
            <div className="flex flex-col gap-8">
              {/* Top Row: Info & Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-600 transition-all duration-500">
                      <User size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        {app.user_email?.split("@")[0] ?? `Applicant #${app.user_id}`}
                      </h2>
                      {app.status === 'hired' && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5"><Mail size={12} /> {app.user_email}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2 pr-4 border border-slate-100 h-fit">
                  <div className={`h-2.5 w-2.5 rounded-full ml-2 ${statusStyles[app.status]}`} />
                  <select
                    value={app.status}
                    disabled={isPending}
                    onChange={(e) =>
                      updateStatus({
                        applicationId: app.id,
                        status: e.target.value as UpdateApplicationStatusPayload["status"],
                      })
                    }
                    className="bg-transparent border-none text-sm font-black text-slate-700 capitalize focus:ring-0 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>

              {/* Middle Row: Cover Letter */}
              {app.cover_letter && (
                <div className="relative bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                  <Quote className="absolute top-4 right-4 text-slate-200" size={40} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-2">
                    <FileText size={14} /> Cover Letter
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-wrap break-words relative z-10">
                    {app.cover_letter}
                  </p>
                </div>
              )}

              {/* Bottom Row: Resume Download */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400">
                   <FileText size={18} />
                   <span className="text-xs font-bold uppercase tracking-widest">
                    {app.resume_filename ?? "No resume uploaded"}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenResume(app.resume_path)}
                    disabled={!app.resume_path}
                    className="rounded-xl h-11 px-5 font-bold"
                  >
                    <ExternalLink size={18} />
                    Open
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      handleDownloadResume(
                        app.resume_path,
                        app.resume_filename ?? `Resume_${app.user_id}.pdf`
                      )
                    }
                    disabled={!app.resume_path}
                    className="bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl px-6 py-2 h-11 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                  >
                    <Download size={18} />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobApplicants;
