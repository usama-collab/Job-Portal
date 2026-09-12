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

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    name?: string | null;
    bio?: string | null;
    skills?: string[] | null;
  };
}

interface EditProfileForm {
  name: string;
  bio: string;
  skills: string;
}

const EditProfileModal = ({ isOpen, onClose, initialData }: EditProfileProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm<EditProfileForm>({
  values: {
    name: initialData?.name || "",
    bio: initialData?.bio || "",
    // Array -> "Skill 1, Skill 2"
    skills: Array.isArray(initialData?.skills) ? initialData.skills.join(", ") : "",
  },
});

  const { mutate, isPending } = useMutation({
  mutationFn: (data: EditProfileForm) => {
    // Transform the flat form strings into arrays for the API
    const payload = {
      name: data.name,
      bio: data.bio,
      skills: data.skills.split(',').map((s) => s.trim()).filter(Boolean),
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
