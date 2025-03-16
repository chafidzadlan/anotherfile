"use client";

import { useEffect, useState } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/lib/db/supabase";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role: data?.role || "user",
          name: data?.name || session.user.user_metadata?.name,
          avatar_url: data?.avatar_url,
          created_at: data?.created_at,
        });
      };
      setIsLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role: data?.role || "user",
            name: data?.name || session.user.user_metadata?.name,
            avatar_url: data?.avatar_url,
            created_at: data?.created_at,
          });
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        };
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Another File
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A simple and elegant file management application to organize your documents, media, and digital assets.
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
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} onLogout={handleLogout} />
      <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
        <div className="md:col-span-1">
          File Sidebar
        </div>
        <div className="md:col-span-3">File Content</div>
      </main>
    </div>
  );
}
