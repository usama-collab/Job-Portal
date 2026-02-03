import { useForm,useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJobById, updateJob } from "../api/jobs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Building2, 
  ArrowLeft, 
  Loader2, 
  Save,
  AlertCircle
} from "lucide-react";

interface JobForm {
  title: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string;
  company?: string;
  is_active: boolean;
}

const EditJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch existing job data
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["employer-job", jobId],
    queryFn: () => getJobById(jobId!),
    enabled: !!jobId,
  });

  // 2. Initialize Form
  const { register, handleSubmit, setValue, control, formState: { isDirty } } = useForm<JobForm>({
    values: job ? {
      title: job.title,
      description: job.description,
      location: job.location || "",
      salary_min: job.salary_min ? Number(job.salary_min) : undefined,
      salary_max: job.salary_max ? Number(job.salary_max) : undefined,
      employment_type: job.employment_type || "",
      company: job.company || "",
      is_active: job.is_active ?? true, 
    } : undefined
  });

  // Watch is_active for the Switch component
  const isActive = useWatch({
    control,
    name: "is_active",
  });

  // 3. Update Mutation
  const { mutate, isPending } = useMutation({
    mutationFn: (payload: JobForm) => updateJob(jobId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-job", jobId] });
      toast.success("Job Updated Successfully", {
        description: "Your changes have been saved and are now live.",
      });
      navigate("/employer/dashboard");
    },
    onError: (err: any) => {
      toast.error("Update Failed", {
        description: err?.response?.data?.detail || "Could not save changes.",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Fetching job details...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-red-100 rounded-3xl text-center shadow-xl">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500 h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm font-medium">This posting may have been removed or you don't have permission to edit it.</p>
        <Button onClick={() => navigate(-1)} className="w-full rounded-xl" variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-transparent hover:text-blue-600 font-bold gap-2 p-0 transition-all group"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Button>

        <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
          <div className="h-2 bg-amber-500" /> {/* Different accent color for Edit mode */}
          <CardHeader className="bg-white border-b border-slate-50 p-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                            <Briefcase size={20} />
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Edit Post</CardTitle>
                    </div>
                    <CardDescription className="text-base text-slate-500 font-medium">
                        Refine your listing to attract the best candidates.
                    </CardDescription>
                </div>
                {isDirty && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-3 py-1 rounded-full animate-pulse">
                        Unsaved Changes
                    </span>
                )}
            </div>
          </CardHeader>

          <CardContent className="p-8 bg-white">
            <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-8">
              
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600/80">Core Details</h3>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Job Title</Label>
                  <Input
                    {...register("title", { required: true })}
                    placeholder="e.g. Senior Software Engineer"
                    className="h-12 rounded-xl focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Description</Label>
                  <Textarea
                    {...register("description", { required: true })}
                    placeholder="Describe the role..."
                    className="min-h-50 rounded-xl focus:ring-blue-500 p-4 leading-relaxed"
                  />
                </div>
              </div>

              {/* Company & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" /> Company
                  </Label>
                  <Input
                    {...register("company")}
                    placeholder="Company Name"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" /> Location
                  </Label>
                  <Input
                    {...register("location")}
                    placeholder="Remote, NY, etc."
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Compensation */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600/80">Salary & Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <DollarSign size={16} className="text-slate-400" /> Min Salary
                    </Label>
                    <Input
                      type="number"
                      {...register("salary_min", { valueAsNumber: true })}
                      placeholder="0"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                      <DollarSign size={16} className="text-slate-400" /> Max Salary
                    </Label>
                    <Input
                      type="number"
                      {...register("salary_max", { valueAsNumber: true })}
                      placeholder="0"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Employment Type</Label>
                    <Input
                        {...register("employment_type")}
                        placeholder="Full-time, Contract, etc."
                        className="h-11 rounded-xl"
                    />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                    <Label className="text-base font-black text-slate-900">Active Listing</Label>
                    <p className="text-sm text-slate-500 font-medium">Toggle off to temporarily hide this job from candidates.</p>
                </div>
                <Switch 
                    checked={isActive} 
                    onCheckedChange={(checked) => setValue("is_active", checked, { shouldDirty: true })}
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button 
                    type="submit" 
                    disabled={isPending || !isDirty}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-base font-black rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} className="mr-2" />
                            Update Posting
                        </>
                    )}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-12 font-black text-slate-400 hover:bg-slate-100 rounded-xl"
                    onClick={() => navigate("/employer/dashboard")}
                >
                    Discard Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditJob;