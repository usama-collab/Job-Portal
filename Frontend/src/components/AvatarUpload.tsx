import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentAvatar: string;
}

const AvatarUpload = ({ currentAvatar }: AvatarUploadProps) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { mutate: uploadAvatar } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      
      const token = localStorage.getItem("token");
      return axios.post("http://localhost:8000/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success("Avatar updated!", {
        description: "Your new profile picture is now live.",
      });
      setIsUploading(false);
    },
    onError: () => {
      toast.error("Upload failed", {
        description: "Please ensure the image is under 2MB.",
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadAvatar(file);
    }
  };

  return (
    <div className="relative group">
      <img
        src={currentAvatar}
        alt="Profile Avatar"
        className="w-32 h-32 rounded-2xl border-4 border-white object-cover bg-white shadow-md transition-all group-hover:brightness-75"
      />
      
      <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/50 p-2 rounded-full text-white">
          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default AvatarUpload;