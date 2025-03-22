import { supabase } from "@/lib/db/supabase";

export async function loadAllUsers() {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_all_profiles");
    if (!rpcError) {
      return rpcData || [];
    };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load all users", error);
    };

    return data || [];
  } catch (error) {
    console.error("Error loading users:", error);
  };
}

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
  const filePath = `user-files/${userId}/${fileName}`;

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

export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error("Authentication required");
    };

    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, requesterId: session?.user.id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(errorData, "Failed to delete user");
    };
  } catch (error) {
    console.error("Error deleting user:", error);
  };
};

export async function createUser(userData: { email: string; password: string; name: string; role: string }): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error("Authentication required");
    }

    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(errorData.error || "Failed to create user");
    }
  } catch (error) {
    console.error("Error creating user:", error);
    console.error("Failed to create user", error);
  }
}

export async function updateUser(userId: string, updates: { name?: string; role?: string }): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error("Authentication required");
    }

    const response = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(errorData.error || "Failed to update user");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    console.error("Failed to update user", error);
  }
}