import React, { useState } from "react";
import { updateUserProfile, uploadAvatar } from "@/lib/storage";
import { supabase } from "@/lib/db/supabase";
import { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface ProfileTabProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  showError: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, setUser, showError, success }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      if (profileData.name !== user.name) {
        await updateUserProfile(user.id, {
          name: profileData.name,
        });
      };

      let avatarUrl = user.avatar_url;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(user.id, avatarFile);
          await updateUserProfile(user.id, {
            avatar_url: avatarUrl,
          });
        } catch (error) {
          console.error(error);
          showError("Avatar update failed", "Your profile information was updated, but we couldn't update your avatar");
        };
      };

      if (profileData.email !== user.email) {
        const { error } = await supabase.auth.updateUser({
          email: profileData.email,
        });
        if (error) {
          showError("Email update failed", "Your profile was updated, but we couldn't update your email");
        } else {
          success("Email update requested", "Please check your new email for a confirmation link");
        };
      };

      setUser({
        ...user,
        name: profileData.name,
        avatar_url: avatarFile ? avatarUrl : user.avatar_url,
      });

      success("Profile updated", "Your profile has been updated successfully");
    } catch (error) {
      console.error(error);
      showError("Failed to update profile");
    } finally {
      setIsSaving(false);
    };
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Invalid file", "Please upload an image file");
      return;
    };
    if (file.size > 2 * 1024 * 1024) {
      showError("File too large", "Please upload an image smaller than 2MB");
      return;
    };

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  return (
    <Card>
      <form onSubmit={handleProfileUpdate}>
        <CardHeader className="text-center pb-4">
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your profile information and avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || user.avatar_url || ""} alt={user.name} />
                <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid w-full max-w-sm items-center gap-2 pt-4">
                <Label htmlFor="avatar">Avatar</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-4 flex-1 pb-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Username"
                  value={profileData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={profileData.email}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-muted-foreground pl-1">
                  Changing your email will require verification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileTab;