import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getJobById } from "../api/jobs";
import { Button } from "../components/ui/button";
import { getMyApplications } from "../api/application";
import { toggleSaveJob, getMySavedJobs } from "../api/savedJobs";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "../layouts/MainLayout";
import { 
  Bookmark, 
  BookmarkCheck, 
  Loader2, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Token & Role Extraction
  const token = localStorage.getItem('token');
  let userRole: string | null = null;
  
  if (token) {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      userRole = decoded.role;
    } catch (e) {
      console.error("Invalid token found", e);
    }
  }

  // 2. Fetch Job Details
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobById(id!),
    enabled: !!id
  });

  // 3. Fetch User's Applications (to check "Already Applied")
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: getMyApplications,
    enabled: !!token && userRole === 'seeker', 
  });

  // 4. Fetch Saved Jobs (to check "Already Saved")
  const { data: savedJobs } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: getMySavedJobs,
    enabled: !!token && userRole === 'seeker',
  });

  // 5. Derive Statuses
  const hasApplied = myApplications?.some(
    (app) => app.job_id === job?.id || app.job_id === Number(id)
  );

  const isSaved = savedJobs?.some(
    (item: any) => item.job_id === job?.id || item.job_id === Number(id)
  );

  // 6. Mutations
  const { mutate: handleToggleSave, isPending: isToggling } = useMutation({
    mutationFn: () => toggleSaveJob(Number(id)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      if (data.status === "saved") {
        toast.success("Job saved to your profile");
      } else {
        toast.info("Job removed from saved");
      }
    },
    onError: () => toast.error("Failed to update saved jobs")
  });

  const handleApplyNavigation = () => {
    navigate(`/jobs/${id}/apply`, { 
      state: { jobTitle: job?.title } 
    });
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
      <p className="text-slate-400 font-bold animate-pulse">Loading job specifications...</p>
    </div>
  );
  
  if (isError || !job) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-slate-200 rounded-[2rem] text-center shadow-xl">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Job Post Expired</h2>
        <p className="text-slate-500 mb-6 font-medium">This position is no longer accepting applications or has been removed.</p>
        <Button onClick={() => navigate('/jobs')} className="w-full rounded-xl h-12">Back to Job Board</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 py-12 animate-in fade-in duration-700">
      <Button 
        variant="ghost" 
        className="mb-8 text-slate-500 font-bold gap-2 group p-0 hover:bg-transparent" 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to search results
      </Button>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-blue-500/5 relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Featured Role
                </span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Posted {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-[1000] tracking-tighter text-slate-900 leading-tight">
                {job.title}
              </h1>
              <div className="flex flex-wrap gap-6 text-slate-600">
                <div className="flex items-center gap-2 font-bold">
                  <div className="p-2 bg-slate-100 rounded-lg"><Building2 size={16} className="text-blue-600" /></div>
                  {job.company || "Company Confidential"}
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <div className="p-2 bg-slate-100 rounded-lg"><MapPin size={16} className="text-blue-600" /></div>
                  {job.location || "Remote"}
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <div className="p-2 bg-slate-100 rounded-lg"><Briefcase size={16} className="text-blue-600" /></div>
                  {job.employment_type || "Full-time"}
                </div>
                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-2 font-bold text-emerald-600">
                    <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign size={16} /></div>
                    ${job.salary_min?.toLocaleString()} - ${job.salary_max?.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center text-3xl font-black text-slate-400 border border-white shadow-inner shrink-0">
              {job.company?.[0] || "J"}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-12 border-t border-slate-100 pt-10">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  Role Overview
                </h3>
                <div className="text-slate-600 leading-relaxed font-medium whitespace-pre-line text-lg">
                  {job.description}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 sticky top-24">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Action Center</h4>
                
                <div className="flex flex-col gap-3">
                  {!token ? (
                    <Button 
                      className="w-full h-14 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all" 
                      onClick={() => navigate('/login')}
                    >
                      Login to Apply
                    </Button>
                  ) : userRole === 'seeker' ? (
                    <Button
                      className={`w-full h-14 rounded-2xl text-lg font-black transition-all shadow-xl ${
                        hasApplied 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none cursor-default' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                      }`}
                      onClick={handleApplyNavigation}
                      disabled={hasApplied}
                    >
                      {hasApplied ? (
                        <span className="flex items-center gap-2"><CheckCircle2 size={20} /> Applied</span>
                      ) : "Quick Apply"}
                    </Button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-bold leading-relaxed">
                      You are logged in as an <span className="underline">{userRole}</span>. Switching to a seeker account is required to apply.
                    </div>
                  )}

                  {/* Functional Save Button */}
                  {userRole === 'seeker' && (
                    <Button 
                      variant={isSaved ? "default" : "outline"} 
                      className={`w-full h-14 rounded-2xl text-lg font-black transition-all duration-300 ${
                        isSaved 
                        ? 'bg-amber-500 hover:bg-amber-600 border-none text-white shadow-lg shadow-amber-100' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                      onClick={() => handleToggleSave()}
                      disabled={isToggling}
                    >
                      {isToggling ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : isSaved ? (
                        <span className="flex items-center gap-2"><BookmarkCheck className="fill-white" size={20} /> Saved</span>
                      ) : (
                        <span className="flex items-center gap-2"><Bookmark size={20} /> Save for later</span>
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                  Secure application via Jobify.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;