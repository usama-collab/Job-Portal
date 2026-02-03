import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMyApplications, type Application } from "../api/application";
import { Button } from "../components/ui/button";
import { 
  Briefcase, 
  ChevronRight, 
  Clock, 
  Loader2, 
  SearchX 
} from "lucide-react";

const statusConfig: Record<string, { color: string; label: string }> = {
  applied: { color: "bg-blue-50 text-blue-700 border-blue-100", label: "Applied" },
  under_review: { color: "bg-amber-50 text-amber-700 border-amber-100", label: "Under Review" },
  shortlisted: { color: "bg-purple-50 text-purple-700 border-purple-100", label: "Shortlisted" },
  hired: { color: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Hired" },
  rejected: { color: "bg-red-50 text-red-700 border-red-100", label: "Rejected" },
};

const MyApplications = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: getMyApplications,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
        <p className="text-slate-500 font-medium">Tracking your applications...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-red-100 rounded-3xl text-center shadow-xl">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <SearchX size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Connection Error</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm font-medium">We couldn't reach the server. Please check your internet.</p>
        <Button onClick={() => window.location.reload()} className="w-full rounded-xl" variant="outline">Retry</Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center animate-in fade-in duration-500">
        <div className="bg-slate-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Briefcase size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">No Applications Yet</h1>
        <p className="text-slate-500 font-medium mb-8">Your dream job is waiting. Start applying to see them here!</p>
        <Button 
            onClick={() => navigate("/jobs")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          Explore Openings
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
             Career Journey<span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-500 font-medium italic">Track the status of your potential next roles.</p>
        </div>
        <div className="hidden sm:block px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="text-blue-700 font-black text-sm uppercase tracking-widest">
                {data.length} Total
            </span>
        </div>
      </div>

      <div className="grid gap-4">
        {data.map((app) => {
          const status = statusConfig[app.status] || { color: "bg-slate-50 text-slate-600", label: app.status };
          
          return (
            <div
              key={app.id}
              onClick={() => navigate(`/jobs/${app.job_id}`)}
              className="group bg-white border border-slate-200 rounded-3xl p-6 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
            >
              {/* Animated accent on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        Position ID: #{app.job_id}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                        <Clock size={14} />
                        <span>Applied on {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <span
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${status.color}`}
                  >
                    {status.label}
                  </span>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="text-center md:text-left">
            <h3 className="text-xl font-black">Need more opportunities?</h3>
            <p className="text-slate-400 text-sm font-medium">New jobs are added every hour. Don't miss out.</p>
        </div>
        <Button 
            onClick={() => navigate("/jobs")}
            className="bg-white text-slate-900 hover:bg-slate-100 font-black rounded-2xl h-12 px-8"
        >
            Find More Jobs
        </Button>
      </div>
    </div>
  );
};

export default MyApplications;