import { supabase } from "@/lib/db/supabase";
export async function updateUserProfile(userId: string, updates: { name?: string, avatar_url?: string }): Promise<void> {
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined && value !== null)
  );
  if (Object.keys(filteredUpdates).length === 0) {
    return;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      id: userId,
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    console.error(error, "Failed to update user profile");
  };
};

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file) {
    console.error("No file provided for avatar upload");
  };

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("user-content")
    .upload(filePath,file);
  if (uploadError) {
    console.error("Failed to upload avatar", uploadError);
  }

  const { data } = supabase.storage
    .from("user-content")
    .getPublicUrl(filePath);
  if (!data || !data.publicUrl) {
    console.error("Failed to get avatar URL");
  };

  return data.publicUrl;
};