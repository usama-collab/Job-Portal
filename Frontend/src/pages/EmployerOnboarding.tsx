import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { createCompany, uploadCompanyLogo, type CompanyPayload } from "../api/company";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useProfile } from "../hooks/useProfile";

const EmployerOnboarding = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [form, setForm] = useState({ name: "", website: "", description: "" });
  const [logo, setLogo] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: CompanyPayload) => {
      const company = await createCompany(payload);
      if (!logo) return { company, logoFailed: false };
      try {
        return { company: await uploadCompanyLogo(company.id, logo), logoFailed: false };
      } catch {
        return { company, logoFailed: true };
      }
    },
    onSuccess: async ({ logoFailed }) => {
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      await queryClient.invalidateQueries({ queryKey: ["my-company"] });
      if (logoFailed) toast.warning("Company created, but the logo could not be uploaded");
      else toast.success("Company profile created");
      navigate("/employer/dashboard", { replace: true });
    },
    onError: (error: unknown) => {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      toast.error(detail || "Could not create the company profile");
    },
  });

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (profile?.company_membership) return <Navigate to="/employer/dashboard" replace />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      name: form.name.trim(),
      website: form.website.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-12">
      <Card className="mx-auto max-w-2xl rounded-3xl border-slate-200 shadow-xl shadow-blue-500/5">
        <CardHeader className="space-y-3 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Building2 /></div>
          <CardTitle className="text-3xl font-black">Create your company profile</CardTitle>
          <CardDescription className="text-base">This profile owns your job posts and unlocks recruiting tools. You can still apply for jobs with the same account.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name *</Label>
              <Input id="company-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme, Inc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <Input id="company-website" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-description">About the company</Label>
              <Textarea id="company-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does your company do?" className="min-h-32" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-logo">Company logo</Label>
              <Input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-slate-500">Optional. PNG, JPG, or WebP up to 8 MB.</p>
            </div>
            <Button type="submit" disabled={mutation.isPending || !form.name.trim()} className="h-12 w-full rounded-xl bg-blue-600 font-bold hover:bg-blue-700">
              {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating company...</> : "Start recruiting"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EmployerOnboarding;
