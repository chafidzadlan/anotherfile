
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { data: storageObjects } = await supabaseAdmin
      .storage
      .from('user-content')
      .list(`avatars/${userId}`);

    if (storageObjects && storageObjects.length > 0) {
      await supabaseAdmin
        .storage
        .from('user-content')
        .remove(storageObjects.map(obj => `avatars/${userId}/${obj.name}`));
    }

    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
