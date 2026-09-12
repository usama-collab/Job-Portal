import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { getMyApplications, type Application } from "../api/application";
import {
  analyzeProfileResume,
  applyResumeAnalysis,
  deleteProfileResume,
  downloadProfileResume,
  getProfileResume,
  getResumeAnalysis,
  importProfileResume,
  uploadProfileResume,
  type Education,
  type Project,
  type ResumeAnalysis,
  type WorkExperience,
} from "../api/user";
import { getApiErrorDetail } from "../lib/api-error";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type Selected = Record<string, boolean>;

const selectedFor = (analysis: ResumeAnalysis): Selected => {
  const selected: Selected = {};
  for (const section of ["skill", "work", "education", "project"] as const) {
    const items = section === "skill" ? analysis.skills
      : section === "work" ? analysis.work_experience
      : section === "education" ? analysis.education : analysis.projects;
    items.forEach((_, index) => { selected[`${section}-${index}`] = true; });
  }
  return selected;
};

const Evidence = ({ value }: { value?: string | null }) => value ? (
  <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800">Source: “{value}”</p>
) : null;

export default function ResumeAnalyzer() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [applicationId, setApplicationId] = useState("");
  const [consent, setConsent] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [selected, setSelected] = useState<Selected>({});

  const resumeQuery = useQuery({ queryKey: ["profile-resume"], queryFn: getProfileResume, retry: false });
  const applicationsQuery = useQuery<Application[]>({ queryKey: ["my-applications"], queryFn: getMyApplications });
  const draftQuery = useQuery({
    queryKey: ["resume-analysis"],
    queryFn: getResumeAnalysis,
    retry: false,
    enabled: Boolean(resumeQuery.data),
  });

  const refreshResume = async () => {
    setAnalysis(null);
    setSelected({});
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile-resume"] }),
      queryClient.invalidateQueries({ queryKey: ["resume-analysis"] }),
    ]);
  };

  const upload = useMutation({
    mutationFn: uploadProfileResume,
    onSuccess: async () => { await refreshResume(); toast.success("Profile resume uploaded"); },
    onError: (error) => toast.error(getApiErrorDetail(error, "Could not upload the resume")),
  });
  const importResume = useMutation({
    mutationFn: importProfileResume,
    onSuccess: async () => { await refreshResume(); toast.success("Application resume imported"); },
    onError: (error) => toast.error(getApiErrorDetail(error, "Could not import the resume")),
  });
  const remove = useMutation({
    mutationFn: deleteProfileResume,
    onSuccess: async () => { await refreshResume(); toast.success("Profile resume removed"); },
    onError: (error) => toast.error(getApiErrorDetail(error, "Could not remove the resume")),
  });
  const analyze = useMutation({
    mutationFn: analyzeProfileResume,
    onSuccess: (value) => { setAnalysis(value); setSelected(selectedFor(value)); },
    onError: (error) => toast.error(getApiErrorDetail(error, "Could not analyze the resume")),
  });
  const apply = useMutation({
    mutationFn: applyResumeAnalysis,
    onSuccess: async () => {
      setAnalysis(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile-me"] }),
        queryClient.invalidateQueries({ queryKey: ["resume-analysis"] }),
      ]);
      toast.success("Selected resume details added to your profile");
    },
    onError: (error) => toast.error(getApiErrorDetail(error, "Could not save the selected details")),
  });

  const updateWork = (index: number, patch: Partial<WorkExperience>) => setAnalysis((current) => current && ({
    ...current,
    work_experience: current.work_experience.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));
  const updateEducation = (index: number, patch: Partial<Education>) => setAnalysis((current) => current && ({
    ...current,
    education: current.education.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));
  const updateProject = (index: number, patch: Partial<Project>) => setAnalysis((current) => current && ({
    ...current,
    projects: current.projects.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  }));

  const saveSelected = () => {
    if (!analysis) return;
    apply.mutate({
      analysis_id: analysis.analysis_id,
      resume_id: analysis.resume_id,
      skills: analysis.skills.filter((_, i) => selected[`skill-${i}`]).map((item) => item.name),
      work_experience: analysis.work_experience.filter((_, i) => selected[`work-${i}`]),
      education: analysis.education.filter((_, i) => selected[`education-${i}`]),
      projects: analysis.projects.filter((_, i) => selected[`project-${i}`]),
    });
  };

  const reviewPrevious = () => {
    const previous = draftQuery.data;
    if (!previous) return;
    setAnalysis(previous);
    setSelected(selectedFor(previous));
  };

  const pending = upload.isPending || importResume.isPending || remove.isPending;
  const resumableApplications = (applicationsQuery.data ?? []).filter((item) => item.resume_filename);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-3">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black"><FileText className="text-blue-600" /> Resume & AI profile import</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a text-based PDF or DOCX, then review every detail before saving it.</p>
        </div>
        <input
          ref={fileRef}
          className="hidden"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
        />
        <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
          {upload.isPending ? <Loader2 className="animate-spin" /> : <UploadCloud />} {resumeQuery.data ? "Replace" : "Upload resume"}
        </Button>
      </div>

      {resumeQuery.data ? (
        <div className="mt-5 flex flex-col gap-4 rounded-xl border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold text-slate-800">{resumeQuery.data.filename}</p><p className="text-xs text-slate-500">Uploaded {new Date(resumeQuery.data.uploaded_at).toLocaleDateString()}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void downloadProfileResume(resumeQuery.data.filename)}><Download /> Download</Button>
            <Button size="sm" disabled={analyze.isPending || !consent} onClick={() => analyze.mutate(resumeQuery.data.resume_id)}>
              {analyze.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Analyze resume
            </Button>
            {draftQuery.data?.resume_id === resumeQuery.data.resume_id && <Button variant="outline" size="sm" onClick={reviewPrevious}>Review previous</Button>}
            <Button variant="outline" size="sm" disabled={pending} onClick={() => { if (window.confirm("Remove this profile resume? Past application resumes will be kept.")) remove.mutate(); }} aria-label="Remove profile resume"><Trash2 /></Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-slate-500">No profile resume uploaded yet.</div>
      )}

      {resumableApplications.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <select className="h-10 flex-1 rounded-md border bg-white px-3 text-sm" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            <option value="">Choose a resume from a past application</option>
            {resumableApplications.map((item) => <option key={item.id} value={item.id}>{item.job_title ?? `Application #${item.id}`} — {item.resume_filename}</option>)}
          </select>
          <Button variant="outline" disabled={!applicationId || pending} onClick={() => importResume.mutate(Number(applicationId))}>Import</Button>
        </div>
      )}

      <label className="mt-4 flex items-start gap-2 text-xs text-slate-600"><input className="mt-0.5" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to send extracted resume text to OpenAI for this analysis. Nothing is added to my profile until I save selected items. OpenAI may retain API content for abuse monitoring under its data policy.</label>

      <Dialog open={Boolean(analysis)} onOpenChange={(open) => { if (!open) setAnalysis(null); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Review extracted resume details</DialogTitle><DialogDescription>Edit the suggestions, uncheck anything you do not want, then save. AI results can be wrong.</DialogDescription></DialogHeader>
          {analysis && <div className="space-y-6">
            {analysis.warnings.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{analysis.warnings.join(" ")}</div>}

            <div className="space-y-2"><h3 className="font-black">Skills</h3>{analysis.skills.map((item, index) => <div key={index} className="rounded-xl border p-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected[`skill-${index}`])} onChange={(e) => setSelected({ ...selected, [`skill-${index}`]: e.target.checked })} /><Input value={item.name} onChange={(e) => setAnalysis({ ...analysis, skills: analysis.skills.map((skill, i) => i === index ? { ...skill, name: e.target.value } : skill) })} /></label><Evidence value={item.source_excerpt} />
            </div>)}</div>

            <div className="space-y-2"><h3 className="font-black">Work experience</h3>{analysis.work_experience.map((item, index) => <div key={index} className="space-y-2 rounded-xl border p-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={Boolean(selected[`work-${index}`])} onChange={(e) => setSelected({ ...selected, [`work-${index}`]: e.target.checked })} /> Include</label>
              <div className="grid gap-2 sm:grid-cols-2"><Input value={item.title} aria-label="Job title" onChange={(e) => updateWork(index, { title: e.target.value })} /><Input value={item.company} aria-label="Company" onChange={(e) => updateWork(index, { company: e.target.value })} /><Input value={item.location ?? ""} aria-label="Work location" placeholder="Location" onChange={(e) => updateWork(index, { location: e.target.value || null })} /><label className="flex items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={item.is_current} onChange={(e) => updateWork(index, { is_current: e.target.checked, end_date: e.target.checked ? null : item.end_date })} /> Current role</label><Input value={item.start_date ?? ""} placeholder="Start: YYYY or YYYY-MM" onChange={(e) => updateWork(index, { start_date: e.target.value || null })} /><Input disabled={item.is_current} value={item.end_date ?? ""} placeholder="End: YYYY or YYYY-MM" onChange={(e) => updateWork(index, { end_date: e.target.value || null })} /></div>
              <Textarea value={item.description ?? ""} placeholder="Description" onChange={(e) => updateWork(index, { description: e.target.value || null })} /><Evidence value={item.source_excerpt} />
            </div>)}</div>

            <div className="space-y-2"><h3 className="font-black">Education</h3>{analysis.education.map((item, index) => <div key={index} className="space-y-2 rounded-xl border p-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={Boolean(selected[`education-${index}`])} onChange={(e) => setSelected({ ...selected, [`education-${index}`]: e.target.checked })} /> Include</label>
              <div className="grid gap-2 sm:grid-cols-2"><Input value={item.institution} aria-label="Institution" onChange={(e) => updateEducation(index, { institution: e.target.value })} /><Input value={item.degree ?? ""} aria-label="Degree" onChange={(e) => updateEducation(index, { degree: e.target.value || null })} /><Input value={item.field_of_study ?? ""} aria-label="Field of study" onChange={(e) => updateEducation(index, { field_of_study: e.target.value || null })} /><Input value={item.start_date ?? ""} placeholder="Start: YYYY or YYYY-MM" onChange={(e) => updateEducation(index, { start_date: e.target.value || null })} /><Input value={item.end_date ?? ""} placeholder="End: YYYY or YYYY-MM" onChange={(e) => updateEducation(index, { end_date: e.target.value || null })} /></div><Textarea value={item.description ?? ""} placeholder="Education details" onChange={(e) => updateEducation(index, { description: e.target.value || null })} /><Evidence value={item.source_excerpt} />
            </div>)}</div>

            <div className="space-y-2"><h3 className="font-black">Projects</h3>{analysis.projects.map((item, index) => <div key={index} className="space-y-2 rounded-xl border p-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={Boolean(selected[`project-${index}`])} onChange={(e) => setSelected({ ...selected, [`project-${index}`]: e.target.checked })} /> Include</label>
              <div className="grid gap-2 sm:grid-cols-2"><Input value={item.name} aria-label="Project name" onChange={(e) => updateProject(index, { name: e.target.value })} /><Input value={item.role ?? ""} aria-label="Project role" onChange={(e) => updateProject(index, { role: e.target.value || null })} /><Input value={item.technologies.join(", ")} aria-label="Technologies" onChange={(e) => updateProject(index, { technologies: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /><Input value={item.url ?? ""} aria-label="Project URL" onChange={(e) => updateProject(index, { url: e.target.value || null })} /><Input value={item.start_date ?? ""} placeholder="Start: YYYY or YYYY-MM" onChange={(e) => updateProject(index, { start_date: e.target.value || null })} /><Input value={item.end_date ?? ""} placeholder="End: YYYY or YYYY-MM" onChange={(e) => updateProject(index, { end_date: e.target.value || null })} /></div>
              <Textarea value={item.description ?? ""} placeholder="Description" onChange={(e) => updateProject(index, { description: e.target.value || null })} /><Evidence value={item.source_excerpt} />
            </div>)}</div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setAnalysis(null)}>Cancel</Button><Button disabled={apply.isPending} onClick={saveSelected}>{apply.isPending && <Loader2 className="animate-spin" />} Save selected items</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
