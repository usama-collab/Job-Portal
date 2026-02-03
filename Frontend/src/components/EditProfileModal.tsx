import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyProfile } from "../api/user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: any;
}

const EditProfileModal = ({ isOpen, onClose, initialData }: EditProfileProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
  values: {
    name: initialData?.name || "",
    bio: initialData?.bio || "",
    // Array -> "Skill 1, Skill 2"
    skills: Array.isArray(initialData?.skills) ? initialData.skills.join(", ") : "",
    // Array -> "Full Experience Text"
    experience: Array.isArray(initialData?.experience) ? initialData.experience.join("\n") : "",
  },
});

  const { mutate, isPending } = useMutation({
  mutationFn: (data: any) => {
    // Transform the flat form strings into arrays for the API
    const payload = {
      name: data.name,
      bio: data.bio,
      // Convert "React, FastAPI" -> ["React", "FastAPI"]
      skills: typeof data.skills === 'string' 
        ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
        : data.skills,
      // Convert the experience text block into a single-item array to satisfy List[Any]
      experience: typeof data.experience === 'string' 
        ? [data.experience] 
        : data.experience,
    };
    
    return updateMyProfile(payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    onClose();
  },
});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Edit Professional Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input {...register("name")} placeholder="John Doe" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Short Bio</label>
            <Input {...register("bio")} placeholder="Senior Software Engineer at..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Skills (comma separated)</label>
            <Input {...register("skills")} placeholder="React, FastAPI, Docker" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Experience</label>
            <Textarea 
              {...register("experience")} 
              placeholder="Describe your work history..." 
              className="h-32"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;