import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyToJob, type ApplicationDetails } from "../api/application";
import { getJobById } from "../api/jobs";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, FileText, GraduationCap, Loader2, UploadCloud, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorDetail } from "../lib/api-error";
import { useProfile } from "../hooks/useProfile";

const MAX_RESUME_SIZE = 8 * 1024 * 1024;
const RESUME_EXTENSIONS = ["pdf", "doc", "docx"];
const CURRENT_YEAR = new Date().getFullYear();

const initialDetails: ApplicationDetails = {
  full_name: "", email: "", phone: "", city: "", current_job_title: "",
  total_experience_years: "", current_salary: "", expected_salary: "",
  salary_currency: "USD", notice_period: "", university_name: "", degree: "",
  field_of_study: "", graduation_year: "", cover_letter: "",
};

type FieldProps = { id: keyof ApplicationDetails; label: string; required?: boolean; children: React.ReactNode; hint?: string };

function FormField({ id, label, required, children, hint }: FieldProps) {
  return <div className="space-y-2">
    <Label htmlFor={id} className="font-bold text-slate-700">{label}{required && <span className="text-red-500" aria-hidden="true"> *</span>}</Label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>;
}

const fieldClass = "h-11 rounded-xl border-slate-200 bg-white px-3 focus-visible:border-blue-500 focus-visible:ring-blue-500/20";
const selectClass = `${fieldClass} w-full text-sm text-slate-700 outline-none focus:ring-3`;

const ApplyJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: job, isLoading: isJobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobById(id!),
    enabled: !!id,
  });
  const jobTitle = job?.title || location.state?.jobTitle || "the position";
  const managedCompanyId = profile?.company_membership?.company_id;
  const managesJobCompany = managedCompanyId != null && managedCompanyId === job?.company_id;
  const [details, setDetails] = useState(initialDetails);
  const [editedProfileFields, setEditedProfileFields] = useState({ full_name: false, email: false, city: false });
  const [resume, setResume] = useState<File | null>(null);

  const resolvedDetails = {
    ...details,
    full_name: editedProfileFields.full_name ? details.full_name : (profile?.name || details.full_name),
    email: editedProfileFields.email ? details.email : (profile?.email || details.email),
    city: editedProfileFields.city ? details.city : (profile?.location || details.city),
  };

  const setField = (field: keyof ApplicationDetails, value: string) => {
    if (field === "full_name" || field === "email" || field === "city") {
      setEditedProfileFields((current) => ({ ...current, [field]: true }));
    }
    setDetails((current) => ({ ...current, [field]: value }));
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!id || !resume) throw new Error("Please select a resume before submitting.");
      return applyToJob(Number(id), resolvedDetails, resume);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("Application submitted", { description: "Your application has been sent successfully." });
      navigate("/jobs");
    },
    onError: (err: unknown) => toast.error("Failed to apply", { description: getApiErrorDetail(err, "We could not submit your application.") }),
  });

  const handleResume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) { setResume(null); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!RESUME_EXTENSIONS.includes(extension)) {
      event.target.value = ""; setResume(null); toast.error("Use a PDF, DOC, or DOCX resume."); return;
    }
    if (file.size === 0 || file.size > MAX_RESUME_SIZE) {
      event.target.value = ""; setResume(null);
      toast.error(file.size === 0 ? "The selected file is empty." : "Resume must be 8 MB or smaller."); return;
    }
    setResume(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resume) { toast.error("Please upload your resume or CV."); return; }
    const digits = resolvedDetails.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) { toast.error("Enter a valid phone number with 7 to 15 digits."); return; }
    mutate();
  };

  if (isProfileLoading || isJobLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-label="Checking application eligibility" /></div>;
  }

  if (managesJobCompany) {
    return <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4">
      <Card className="w-full rounded-2xl border-slate-200 text-center shadow-xl shadow-blue-500/5">
        <CardHeader className="space-y-3 p-8">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-400" />
          <CardTitle>You manage this company</CardTitle>
          <CardDescription>Company owners and managers cannot apply to their own company&apos;s jobs.</CardDescription>
          <Button type="button" onClick={() => navigate(`/jobs/${id}`)} className="mt-3">Back to job</Button>
        </CardHeader>
      </Card>
    </div>;
  }

  return <div className="min-h-screen bg-slate-50/50 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" className="group gap-2 p-0 font-semibold text-slate-600 hover:bg-transparent hover:text-blue-600" onClick={() => navigate(-1)}><ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" /> Back to listings</Button>
        <div className="hidden text-xs font-bold uppercase tracking-widest text-slate-400 sm:block">Jobify Application Portal</div>
      </div>
      <Card className="overflow-hidden rounded-2xl border-slate-100 bg-white shadow-xl shadow-blue-500/5">
        <div className="h-2 w-full bg-blue-600" />
        <CardHeader className="px-6 pt-8 sm:px-10 sm:pt-10">
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Apply for <span className="text-blue-600">{jobTitle}</span></CardTitle>
          <CardDescription className="text-base text-slate-500">Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-10 sm:px-10">
          <form onSubmit={handleSubmit} className="mt-4 space-y-10">
            <section className="space-y-3" aria-labelledby="resume-heading">
              <div><h2 id="resume-heading" className="flex items-center gap-2 text-base font-black text-slate-900"><UploadCloud size={18} className="text-blue-600" /> Resume / CV <span className="text-red-500">*</span></h2><p className="mt-1 text-sm text-slate-500">Upload this first, then complete your application details.</p></div>
              <div className={`relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${resume ? "border-green-300 bg-green-50/40" : "border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/30"}`}>
                <input id="resume" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResume} className="absolute inset-0 cursor-pointer opacity-0" aria-describedby="resume-help" />
                {resume ? <><CheckCircle2 className="h-10 w-10 text-green-500" /><div><p className="max-w-md break-all text-sm font-bold text-slate-700">{resume.name}</p><p className="mt-1 text-xs text-slate-500">{(resume.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p></div></> : <><UploadCloud className="h-10 w-10 text-slate-300" /><div><p className="text-sm font-bold text-slate-700">Click to upload your resume</p><p id="resume-help" className="mt-1 text-xs uppercase tracking-wide text-slate-400">PDF, DOC, or DOCX · Max 8 MB</p></div></>}
              </div>
            </section>

            <section className="space-y-5" aria-labelledby="personal-heading">
              <h2 id="personal-heading" className="flex items-center gap-2 border-b border-slate-100 pb-3 text-lg font-black text-slate-900"><UserRound size={19} className="text-blue-600" /> Personal information</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id="full_name" label="Full name" required><Input id="full_name" autoComplete="name" required minLength={2} maxLength={100} value={resolvedDetails.full_name} onChange={(e) => setField("full_name", e.target.value)} className={fieldClass} placeholder="Your full legal name" /></FormField>
                <FormField id="email" label="Email address" required><Input id="email" type="email" autoComplete="email" required maxLength={320} value={resolvedDetails.email} onChange={(e) => setField("email", e.target.value)} className={fieldClass} placeholder="you@example.com" /></FormField>
                <FormField id="phone" label="Phone number" required hint="Include your country code for international applications."><Input id="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} value={details.phone} onChange={(e) => setField("phone", e.target.value)} className={fieldClass} placeholder="+1 555 123 4567" /></FormField>
                <FormField id="city" label="Current city" required><Input id="city" autoComplete="address-level2" required minLength={2} maxLength={100} value={resolvedDetails.city} onChange={(e) => setField("city", e.target.value)} className={fieldClass} placeholder="City, Country" /></FormField>
              </div>
            </section>

            <section className="space-y-5" aria-labelledby="professional-heading">
              <h2 id="professional-heading" className="flex items-center gap-2 border-b border-slate-100 pb-3 text-lg font-black text-slate-900"><BriefcaseBusiness size={19} className="text-blue-600" /> Professional details</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id="current_job_title" label="Current job title"><Input id="current_job_title" maxLength={120} value={details.current_job_title} onChange={(e) => setField("current_job_title", e.target.value)} className={fieldClass} placeholder="e.g. Software Engineer" /></FormField>
                <FormField id="total_experience_years" label="Total experience (years)"><Input id="total_experience_years" type="number" inputMode="decimal" min="0" max="80" step="0.1" value={details.total_experience_years} onChange={(e) => setField("total_experience_years", e.target.value)} className={fieldClass} placeholder="e.g. 4.5" /></FormField>
                <FormField id="current_salary" label="Current annual salary" hint="Optional — leave blank if not applicable or confidential."><Input id="current_salary" type="number" inputMode="decimal" min="0" max="999999999999" step="0.01" value={details.current_salary} onChange={(e) => setField("current_salary", e.target.value)} className={fieldClass} placeholder="e.g. 75000" /></FormField>
                <FormField id="expected_salary" label="Expected annual salary" hint="Optional — leave blank if negotiable."><Input id="expected_salary" type="number" inputMode="decimal" min="0" max="999999999999" step="0.01" value={details.expected_salary} onChange={(e) => setField("expected_salary", e.target.value)} className={fieldClass} placeholder="e.g. 90000" /></FormField>
                <FormField id="salary_currency" label="Salary currency" required><Input id="salary_currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={details.salary_currency} onChange={(e) => setField("salary_currency", e.target.value.toUpperCase())} className={fieldClass} placeholder="USD" /></FormField>
                <FormField id="notice_period" label="Notice period" required><select id="notice_period" required value={details.notice_period} onChange={(e) => setField("notice_period", e.target.value)} className={selectClass}><option value="">Select availability</option><option value="immediate">Immediate</option><option value="15_days">15 days</option><option value="30_days">30 days</option><option value="60_days">60 days</option><option value="90_days">90 days</option><option value="more_than_90_days">More than 90 days</option></select></FormField>
              </div>
            </section>

            <section className="space-y-5" aria-labelledby="education-heading">
              <h2 id="education-heading" className="flex items-center gap-2 border-b border-slate-100 pb-3 text-lg font-black text-slate-900"><GraduationCap size={20} className="text-blue-600" /> Highest education</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id="university_name" label="University / institution" required><Input id="university_name" autoComplete="organization" required minLength={2} maxLength={160} value={details.university_name} onChange={(e) => setField("university_name", e.target.value)} className={fieldClass} placeholder="Institution name" /></FormField>
                <FormField id="degree" label="Degree / qualification" required><Input id="degree" required minLength={2} maxLength={120} value={details.degree} onChange={(e) => setField("degree", e.target.value)} className={fieldClass} placeholder="e.g. Bachelor of Science" /></FormField>
                <FormField id="field_of_study" label="Field of study"><Input id="field_of_study" maxLength={120} value={details.field_of_study} onChange={(e) => setField("field_of_study", e.target.value)} className={fieldClass} placeholder="e.g. Computer Science" /></FormField>
                <FormField id="graduation_year" label="Graduation year" required hint="For current students, enter your expected graduation year."><Input id="graduation_year" type="number" inputMode="numeric" required min="1950" max={CURRENT_YEAR + 8} step="1" value={details.graduation_year} onChange={(e) => setField("graduation_year", e.target.value)} className={fieldClass} placeholder={String(CURRENT_YEAR)} /></FormField>
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="cover-letter-heading">
              <Label id="cover-letter-heading" htmlFor="cover_letter" className="text-base font-black text-slate-900"><FileText size={18} className="text-blue-600" /> Cover letter <span className="text-red-500">*</span></Label>
              <Textarea id="cover_letter" required minLength={20} maxLength={10000} className="min-h-48 rounded-xl border-slate-200 p-4 text-base leading-relaxed focus-visible:border-blue-500 focus-visible:ring-blue-500/20" placeholder="Tell the employer why you are a strong candidate for this role..." value={details.cover_letter} onChange={(e) => setField("cover_letter", e.target.value)} />
              <div className="flex justify-between gap-4 text-xs text-slate-400"><span>Include relevant skills, experience, and motivation.</span><span>{details.cover_letter.length.toLocaleString()} / 10,000</span></div>
            </section>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={isPending} className="h-12 flex-1 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Discard application</Button>
              <Button type="submit" disabled={isPending} className="h-12 flex-2 rounded-xl bg-blue-600 text-base font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending application...</> : "Submit application"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>;
};

export default ApplyJob;
