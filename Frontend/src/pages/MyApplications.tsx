import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyApplications, type Application } from "../api/application";
import { getMySavedJobs, toggleSaveJob } from "../api/savedJobs";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
  Briefcase, 
  ChevronRight, 
  Clock, 
  Loader2, 
  Bookmark, 
  Send, 
  CalendarCheck, 
  Archive,
  Trash2,
  MapPin,
  Building2
} from "lucide-react";

const TABS = [
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'applied', label: 'Applied', icon: Send },
  { id: 'interviews', label: 'Interviews', icon: CalendarCheck },
  { id: 'archived', label: 'Archived', icon: Archive },
] as const;

type TabId = typeof TABS[number]['id'];

const statusConfig: Record<string, { color: string; label: string }> = {
  applied: { color: "bg-blue-50 text-blue-700 border-blue-100", label: "Applied" },
  under_review: { color: "bg-amber-50 text-amber-700 border-amber-100", label: "Review" },
  shortlisted: { color: "bg-purple-50 text-purple-700 border-purple-100", label: "Shortlisted" },
  hired: { color: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Hired" },
  rejected: { color: "bg-red-50 text-red-700 border-red-100", label: "Rejected" },
};

const MyApplications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('applied');

  // 1. Fetch Applied Jobs
  const { data: appliedJobs, isLoading: isAppliedLoading } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: getMyApplications,
  });

  // 2. Fetch Saved Jobs
  const { data: savedJobs, isLoading: isSavedLoading } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: getMySavedJobs,
    enabled: activeTab === 'saved', 
  });

  // 3. Remove Saved Job Mutation
  const { mutate: removeSaved } = useMutation({
    mutationFn: (jobId: number) => toggleSaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success("Job removed", {
        description: "The job has been removed from your saved list."
      });
    },
    onError: () => toast.error("Failed to remove job")
  });

  const isLoading = isAppliedLoading || (activeTab === 'saved' && isSavedLoading);

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      <p className="text-slate-500 font-bold tracking-tight">Syncing your dashboard...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-700">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-[1000] tracking-tighter text-slate-900 leading-none">
          My Jobs<span className="text-blue-600">.</span>
        </h1>
        <p className="text-slate-500 font-medium italic mt-2">Manage your journey and track your status.</p>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              {tab.label}
              
              {tab.id === 'applied' && appliedJobs && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-md">
                  {appliedJobs.length}
                </span>
              )}
              {tab.id === 'saved' && savedJobs && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-md">
                  {savedJobs.length}
                </span>
              )}

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.3)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Logic */}
      <div className="space-y-4">
        
        {/* APPLIED JOBS */}
        {activeTab === 'applied' && (
          appliedJobs && appliedJobs.length > 0 ? (
            appliedJobs.map((app) => (
              <div
                key={app.id}
                onClick={() => navigate(`/jobs/${app.job_id}`)}
                className="group bg-white border border-slate-200 rounded-3xl p-6 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        Position ID: #{app.job_id}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1">
                        <span className="flex items-center gap-1"><Clock size={14} /> Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusConfig[app.status]?.color || "bg-slate-50"}`}>
                      {statusConfig[app.status]?.label || app.status}
                    </span>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Send} message="You haven't applied to any jobs yet." btnText="Find Jobs" onBtnClick={() => navigate('/jobs')} />
          )
        )}

        {/* SAVED JOBS */}
        {activeTab === 'saved' && (
          savedJobs && savedJobs.length > 0 ? (
            savedJobs.map((item: any) => (
              <div
                key={item.id}
                className="group bg-white border border-slate-200 rounded-[2rem] p-6 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-200 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div 
                    className="flex items-start gap-5 cursor-pointer flex-1"
                    onClick={() => navigate(`/jobs/${item.job_id}`)}
                  >
                    <div className="bg-amber-50 p-4 rounded-2xl text-amber-500 group-hover:bg-amber-100 transition-colors shrink-0">
                      <Bookmark size={24} fill="currentColor" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-600 leading-none">
                        {item.job.title}
                      </h2>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><Building2 size={12} /> {item.job.company}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {item.job.location}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSaved(item.job_id);
                    }}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Bookmark} message="No saved jobs yet." btnText="Explore Jobs" onBtnClick={() => navigate('/jobs')} />
          )
        )}

        {/* INTERVIEWS & ARCHIVED (Placeholders) */}
        {(activeTab === 'interviews' || activeTab === 'archived') && (
          <EmptyState 
            icon={activeTab === 'interviews' ? CalendarCheck : Archive} 
            message={`Your ${activeTab} items will show up here.`} 
            btnText="Browse Careers" 
            onBtnClick={() => navigate('/jobs')} 
          />
        )}
      </div>
    </div>
  );
};

// Reusable Empty State Component
const EmptyState = ({ icon: Icon, message, btnText, onBtnClick }: any) => (
  <div className="py-20 text-center animate-in fade-in zoom-in-95 duration-500">
    <div className="bg-slate-100 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
        <Icon size={40} />
    </div>
    <p className="text-slate-500 font-bold text-lg mb-8">{message}</p>
    <Button onClick={onBtnClick} className="bg-slate-900 hover:bg-blue-600 text-white font-black px-10 py-7 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95">
      {btnText}
    </Button>
  </div>
);

export default MyApplications;