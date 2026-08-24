import { useState, useRef } from "react"; // Added useRef
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added mutation hooks
import { getMyProfile, uploadAvatar } from "../api/user"; // Import uploadAvatar
import { Button } from "../components/ui/button";
import { 
  Briefcase, 
  Mail, 
  Pencil, 
  Calendar,
  Camera,
  Loader2
} from "lucide-react";
import EditProfileModal from "../components/EditProfileModal";
import { toast } from "sonner";

const Profile = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile-me"],
    queryFn: getMyProfile,
  });

  // 2. Upload Mutation
  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success("Profile photo updated!");
    },
    onError: () => {
      toast.error("Failed to upload image. Ensure it's an image file.");
    }
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
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

  const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in duration-500">
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="h-40 bg-linear-to-r from-blue-500 to-indigo-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-16 mb-6">

            {/* AVATAR SECTION WITH UPLOAD */}
            <div className="relative group">
              <div className="relative w-32 h-32 rounded-2xl border-4 border-white overflow-hidden bg-slate-100 shadow-md">
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                ) : null}
                <img
                  src={profile.avatar_url ? `${baseUrl}${profile.avatar_url}` : `https://ui-avatars.com/api/?name=${profile.name}&background=random`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                {/* Hover Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="text-white" size={24} />
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </div>

            <Button 
              variant="outline" 
              className="gap-2 shadow-sm rounded-xl font-bold"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Pencil size={16} /> Edit Profile
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-[1000] tracking-tight text-gray-900">
                {profile.name || "Anonymous User"}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl font-medium">
                {profile.bio || "No bio added. Click edit to tell people about yourself."}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-500 font-bold">
            <div className="flex items-center gap-1.5">
              <Mail size={18} className="text-blue-500" />
              {profile.email}
            </div>
            <div className="flex items-center gap-1.5 capitalize">
              <Briefcase size={18} className="text-blue-500" />
              {profile.role}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={18} className="text-blue-500" />
              Joined {new Date(profile.created_at).getFullYear()}
            </div>
          </div>
        </div>
      </div>

      {/* ... Rest of your component (Skills, Experience, etc.) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white border rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-black mb-6">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.skills?.length > 0 ? (
                    profile.skills.map((skill: string, index: number) => (
                        <span key={index} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-black border border-slate-100 uppercase tracking-wider">
                        {skill}
                        </span>
                    ))
                    ) : (
                    <p className="text-gray-400 italic">No skills listed yet.</p>
                    )}
                </div>
            </section>
            {/* Add your other sections here */}
          </div>
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        initialData={profile}
      />
    </div>
  );
};

export default Profile;
