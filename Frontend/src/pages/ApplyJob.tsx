import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyToJob } from "../api/application";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea"; // Assuming you have this shadcn component
import { ArrowLeft, FileText, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ApplyJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const jobTitle = location.state?.jobTitle || "the position";

  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!id || !resume) throw new Error("Missing data");
      return applyToJob(Number(id), coverLetter, resume);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("Applied Successfully", {
        description: "Your applicaton has been submitted successfully",
      });
      navigate("/jobs");
    },
    onError: (err: any) => {
      toast.error("Failed To Apply", {
        description: err?.response?.data?.detail || "Could not save changes.",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return alert("Please upload a resume");
    mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Navigation / Header Area */}
        <div className="mb-8 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="group gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-all p-0 hover:bg-transparent" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to listings
          </Button>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Jobify Application Portal
          </div>
        </div>

        <Card className="shadow-xl shadow-blue-500/5 border-slate-100 rounded-2xl overflow-hidden bg-white">
          <div className="h-2 bg-blue-600 w-full" />
          <CardHeader className="pt-10 px-8">
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900 mb-2">
              Apply for <span className="text-blue-600">{jobTitle}</span>
            </CardTitle>
            <CardDescription className="text-base text-slate-500">
              Please provide your professional details and resume to be considered for this role.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-8 mt-4">
              {/* Cover Letter Section */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Cover Letter
                </label>
                <Textarea
                  required
                  className="min-h-55 rounded-xl border-slate-200 focus:ring-blue-500 p-4 text-base leading-relaxed placeholder:text-slate-400"
                  placeholder="Tell the employer why you are the perfect candidate for this role..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
                <p className="text-[12px] text-slate-400 font-medium italic">
                  Tip: Briefly mention your relevant skills and passion for the company.
                </p>
              </div>

              {/* Resume Upload Section */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <UploadCloud size={16} className="text-blue-600" />
                  Resume (PDF)
                </label>
                <div className={`
                  relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-3
                  ${resume ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300'}
                `}>
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => setResume(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  
                  {resume ? (
                    <>
                      <CheckCircle2 className="text-green-500 h-10 w-10" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">{resume.name}</p>
                        <p className="text-xs text-slate-500 mt-1">File selected - Click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="text-slate-300 h-10 w-10" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 italic">Click to upload your resume</p>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-tighter">Supported formats: PDF only</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => navigate(-1)} 
                  className="flex-1 h-12 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Discard Application
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending} 
                  className="flex-2 h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 text-base font-bold rounded-xl"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Application...
                    </>
                  ) : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplyJob;