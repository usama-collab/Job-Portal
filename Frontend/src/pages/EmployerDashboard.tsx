import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { getMyJobs, deleteJob, type EmployerJob } from "../api/jobs";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  // AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { 
  Plus, 
  Users, 
  Briefcase, 
  Trash2, 
  Edit3, 
  MapPin, 
  Loader2 
} from "lucide-react";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // States
  const [isNavigating, setIsNavigating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: number; title: string } | null>(null);

  // 1. Fetch Employer Jobs
  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ["employer-jobs"],
    queryFn: getMyJobs,
  });

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (jobId: number) => deleteJob(String(jobId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      setDeleteModalOpen(false);
      setSelectedJob(null);
    },
    onError: (err: any) => {
      console.error(err);
      alert("Failed to delete the job. Please try again.");
    }
  });

  const openDeleteDialog = (job: EmployerJob) => {
    setSelectedJob({ id: job.id, title: job.title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedJob) {
      deleteMutation.mutate(selectedJob.id);
    }
  };

  // 🔄 LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  // ❌ ERROR STATE
  if (isError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="bg-red-50 p-4 rounded-full text-red-500">
            <Trash2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Oops! Something went wrong</h2>
        <p className="text-slate-500 max-w-xs">We couldn't load your dashboard. Please check your connection and try again.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* HEADER SECTION */}
      <div className="bg-white border-b mb-8">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Employer Dashboard</h1>
              <p className="text-slate-500 mt-1 font-medium">Manage your active listings and review applicants.</p>
            </div>
            <Button
              onClick={() => { setIsNavigating(true); navigate("/employer/jobs/create"); }}
              disabled={isNavigating}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl font-bold shadow-lg shadow-blue-200 gap-2 transition-all active:scale-95"
            >
              {isNavigating ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus size={20} />}
              Post a New Job
            </Button>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <Briefcase size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Jobs</p>
                  <p className="text-2xl font-black text-slate-900">{jobs?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {(!jobs || jobs.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="text-slate-300 h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No jobs posted yet</h3>
            <p className="text-slate-500 mb-8">Start hiring by posting your first job opportunity.</p>
            <Button 
                variant="outline" 
                className="rounded-xl font-bold px-8"
                onClick={() => navigate("/employer/jobs/create")}
            >
              Get Started
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-2 flex items-center gap-2">
                Your Listings <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{jobs.length}</span>
            </h2>
            {jobs.map((job: EmployerJob) => (
              <Card key={job.id} className="group border-slate-200 hover:border-blue-300 transition-all rounded-2xl overflow-hidden shadow-sm hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                    <div className="space-y-1">
                      <h2 className="font-extrabold text-xl text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {job.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          ID: #{job.id}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          {job.location || "Remote"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        className="font-bold text-slate-600 gap-2 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                        onClick={() => navigate(`/employer/jobs/${job.id}/applicants`)}
                      >
                        <Users size={18} />
                        Applicants
                      </Button>

                      <Button
                        variant="ghost"
                        className="font-bold text-slate-600 gap-2 hover:bg-slate-100 rounded-xl"
                        onClick={() => navigate(`/employer/jobs/${job.id}/edit`)}
                      >
                        <Edit3 size={18} />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        className="font-bold text-red-500 gap-2 hover:bg-red-50 hover:text-red-600 rounded-xl"
                        onClick={() => openDeleteDialog(job)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-100">
          <AlertDialogHeader>
            <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="text-red-600 h-6 w-6" />
            </div>
            {/* <AlertDialogTitle className="text-center text-xl font-bold text-slate-900">
              Delete Job Posting?
            </AlertDialogTitle> */}
            <AlertDialogDescription className="text-center text-slate-500 text-sm">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{selectedJob?.title}"</span>? 
              This will remove all associated applicant data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex sm:justify-center gap-2 mt-4">
            <AlertDialogCancel 
              variant="outline" 
              size="default" 
              className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              variant="outline" 
              size="default" 
              onClick={confirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl font-bold shadow-lg shadow-red-100 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployerDashboard;