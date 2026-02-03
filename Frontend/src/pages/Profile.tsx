import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../api/user";
import { Button } from "../components/ui/button";
import { 
  Briefcase, 
  Mail, 
  Pencil, 
  Globe, 
  Building2, 
  Calendar 
} from "lucide-react";
import EditProfileModal from "../components/EditProfileModal";

const Profile = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // 1. Fetch Profile Data
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile-me"],
    queryFn: getMyProfile,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="p-10 text-center text-red-500">
        <p className="text-xl font-semibold">Error loading profile</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  const baseUrl = "http://localhost:8000"; // Ensure this matches your FastAPI server
  const isEmployer = profile.role === "employer";

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header Banner Section */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="h-40 bg-linear-to-r from-blue-500 to-indigo-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            <div className="relative">
              <img
                src={profile.avatar_url ? `${baseUrl}${profile.avatar_url}` : "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                alt="Profile Avatar"
                className="w-32 h-32 rounded-2xl border-4 border-white object-cover bg-white shadow-md"
              />
            </div>
            <Button 
              variant="outline" 
              className="gap-2 shadow-sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Pencil size={16} /> Edit Profile
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
                {profile.name || "Anonymous User"}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
                {profile.bio || "No bio added. Click edit to tell people about yourself."}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Mail size={18} className="text-gray-400" /> 
              {profile.email}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase size={18} className="text-gray-400" /> 
              <span className="capitalize">{profile.role}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={18} className="text-gray-400" /> 
              Joined {new Date(profile.created_at).getFullYear()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Skills Section */}
          <section className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Skills & Expertise</h2>
            <div className="flex flex-wrap gap-2">
                {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                profile.skills.map((skill: string, index: number) => (
                    <span 
                    key={index} 
                    className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"
                    >
                    {skill}
                    </span>
                ))
                ) : (
                <p className="text-gray-400 italic">No skills listed yet.</p>
                )}
            </div>
            </section>

          {/* Experience Section */}
          <section className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Professional Experience</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {/* If experience is a list, join it back into a string for display */}
                {Array.isArray(profile.experience) 
                ? profile.experience.join('\n\n') 
                : profile.experience || "No experience added."}
            </div>
            </section>

          {/* Employer Specific Section: Company Profile */}
          {isEmployer && (
            <section className="bg-white border rounded-2xl p-6 shadow-sm border-l-4 border-l-indigo-500">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                Company Details
              </h2>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Company Name</h4>
                  <p className="text-lg font-medium">{profile.company_name || "Not specified"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Website</h4>
                  {profile.company_website ? (
                    <a href={profile.company_website} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                      {profile.company_website} <Globe size={14} />
                    </a>
                  ) : (
                    <p className="text-gray-400 italic">No website provided</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">About the Company</h4>
                  <p className="text-gray-700">{profile.company_description || "Add a description to tell candidates about your company culture."}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Area */}
        <div className="space-y-8">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Profile Strength</h3>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: profile.skills && profile.experience ? '100%' : '50%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {profile.skills && profile.experience 
                ? "Your profile is looking great!" 
                : "Complete your skills and experience to stand out."}
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold mb-2">Jobify Premium</h3>
            <p className="text-sm text-slate-400 mb-4">Get noticed 3x faster with featured profile placement.</p>
            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold">
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal Component */}
      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        initialData={profile}
      />
    </div>
  );
};

export default Profile;