"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { useToasts } from "@/hooks/useToast";
import { User } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProfileTab from "@/components/profile/ProfileTab";
import PasswordTab from "@/components/profile/PasswordTab";
import LoadingSpinner from "@/components/LoadingSpinner";
import NotAuthenticatedMessage from "@/components/NotAuthenticationMessage";
import SettingsTab from "@/components/profile/SettingsTabs";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error: showError } = useToasts();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/");
          return;
        };

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        const userData = {
          id: session.user.id,
          email: session.user.email || "",
          role: data?.role || "user",
          name: data?.name || session.user.user_metadata?.name || "",
          avatar_url: data?.avatar_url || "",
          created_at: data?.created_at,
        };
        setUser(userData);
      } catch (error) {
        console.error(error);
        showError("Failed to load user profile");
        router.push("/");
      } finally {
        setIsLoading(false);
      };
    };

    fetchUser();
  }, [router, showError]);

  if (isLoading) {
    return (
      <LoadingSpinner />
    );
  };

  if (!user) {
    return (
      <NotAuthenticatedMessage />
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto p-4 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-4">
            <Link href="/" className="inline-flex items-center text-sm justify-start text-muted-foreground hover:text-primary mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to files
            </Link>
          </div>
          <div className="flex justify-center items-center mb-4">
            <h1 className="text-2xl font-bold">Your Profile</h1>
          </div>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <ProfileTab
                user={user}
                setUser={setUser}
                showError={showError}
                success={success}
              />
            </TabsContent>
            <TabsContent value="password">
              <PasswordTab
                user={user}
                showError={showError}
                success={success}
              />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab
                user={user}
                showError={showError}
                success={success}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};