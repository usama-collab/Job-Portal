import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob } from "../api/jobs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner"; // Beautiful toast notifications
import { 
  MapPin, 
  DollarSign, 
  Building2, 
  ArrowLeft, 
  Loader2, 
  Sparkles 
} from "lucide-react";

const CreateJob = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        salary_min: '',
        salary_max: '',
        employment_type: '',
        company: '',
        is_active: true
    });

    const { mutate, isPending } = useMutation({
        mutationFn: createJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
            toast.success("Job Posted Successfully!", {
                description: "Your listing is now live and visible to candidates.",
            });
            navigate('/employer/dashboard');
        },
        onError: (err: any) => {
            const errorMsg = err?.response?.data?.detail || "Failed to create job";
            toast.error("Error", { description: errorMsg });
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setForm((prev) => ({ ...prev, is_active: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.description) {
            toast.warning("Missing Fields", { description: "Please fill in all required fields (*)." });
            return;
        }
        mutate({
            ...form,
            salary_min: Number(form.salary_min),
            salary_max: Number(form.salary_max),
        });
    };

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
                    <div className="h-2 bg-blue-600" />
                    <CardHeader className="bg-white border-b border-slate-50 p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                <Sparkles size={20} />
                            </div>
                            <CardTitle className="text-3xl font-black tracking-tight">Create a Job</CardTitle>
                        </div>
                        <CardDescription className="text-base text-slate-500 font-medium">
                            Fill in the details below to find your next great hire.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 bg-white">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* Basic Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600/80">Basic Information</h3>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Job Title *</Label>
                                    <Input
                                        name="title"
                                        placeholder="e.g. Senior Frontend Developer"
                                        value={form.title}
                                        onChange={handleChange}
                                        disabled={isPending}
                                        className="h-12 rounded-xl focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Description *</Label>
                                    <Textarea
                                        name="description"
                                        placeholder="Tell us about the role, responsibilities, and requirements..."
                                        value={form.description}
                                        onChange={handleChange}
                                        className="min-h-50 rounded-xl focus:ring-blue-500 p-4 leading-relaxed"
                                        disabled={isPending}
                                    />
                                </div>
                            </div>

                            {/* Details Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                                        <Building2 size={16} className="text-slate-400" /> Company Name
                                    </Label>
                                    <Input
                                        name="company"
                                        placeholder="Your Company"
                                        value={form.company}
                                        onChange={handleChange}
                                        className="h-11 rounded-xl"
                                        disabled={isPending}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700 flex items-center gap-2">
                                        <MapPin size={16} className="text-slate-400" /> Location
                                    </Label>
                                    <Input
                                        name="location"
                                        placeholder="e.g. New York, Remote"
                                        value={form.location}
                                        onChange={handleChange}
                                        className="h-11 rounded-xl"
                                        disabled={isPending}
                                    />
                                </div>
                            </div>

                            {/* Salary Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600/80">Compensation & Type</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700 flex items-center gap-2">
                                            <DollarSign size={16} className="text-slate-400" /> Min Salary
                                        </Label>
                                        <Input
                                            name="salary_min"
                                            type="number"
                                            placeholder="0"
                                            value={form.salary_min}
                                            onChange={handleChange}
                                            className="h-11 rounded-xl"
                                            disabled={isPending}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700 flex items-center gap-2">
                                            <DollarSign size={16} className="text-slate-400" /> Max Salary
                                        </Label>
                                        <Input
                                            name="salary_max"
                                            type="number"
                                            placeholder="0"
                                            value={form.salary_max}
                                            onChange={handleChange}
                                            className="h-11 rounded-xl"
                                            disabled={isPending}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Employment Type</Label>
                                    <Input
                                        name="employment_type"
                                        placeholder="e.g. Full-time, Contract, Freelance"
                                        value={form.employment_type}
                                        onChange={handleChange}
                                        className="h-11 rounded-xl"
                                        disabled={isPending}
                                    />
                                </div>
                            </div>

                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-bold text-slate-900">Active Status</Label>
                                    <p className="text-sm text-slate-500 font-medium">If active, candidates can see and apply to this job.</p>
                                </div>
                                <Switch 
                                    checked={form.is_active} 
                                    onCheckedChange={handleSwitchChange}
                                    disabled={isPending}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                <Button 
                                    type="submit" 
                                    disabled={isPending}
                                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-base font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Posting...
                                        </>
                                    ) : "Publish Job Posting"}
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={isPending}
                                    className="flex-1 h-12 font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                                    onClick={() => navigate("/employer/dashboard")}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateJob;