"use client";

import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/lib/db/supabase";
import Header from "@/components/Header";
import FileManagement from "@/components/dashboard/FileManagement";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          const userInfo = {
            id: session.user.id,
            email: session.user.email || "",
            role: data?.role || "user",
            name: data?.name || session.user.user_metadata?.name,
            avatar_url: data?.avatar_url,
            created_at: data?.created_at,
          };

          setUser(userInfo);
        }
      } catch (error) {
        console.error("Error fetching user", error);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            const userInfo = {
              id: session.user.id,
              email: session.user.email || "",
              role: data?.role || "user",
              name: data?.name || session.user.user_metadata?.name,
              avatar_url: data?.avatar_url,
              created_at: data?.created_at,
            };

            setUser(userInfo);
          } catch (error) {
            console.error("Error handling auth state change", error);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Another File
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Store, access, and share your files from any device, anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      <div className="flex-1 overflow-hidden">
        <FileManagement user={user} />
      </div>
    </div>
  );
}