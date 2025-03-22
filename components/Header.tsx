"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { useToasts } from "@/hooks/useToast";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user?: User | null;
  onLogout: () => Promise<void>;
};

export default function Header({ user, onLogout }: HeaderProps) {
  const router = useRouter();
  const { success, error: handleError } = useToasts();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await onLogout();

      router.push("/");

      success("Logged out", "You have been successfully logged out");
    } catch (error) {
      console.error("Logout error:", error);
      handleError("Error", "Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    };
  };

  if (isLoggingOut) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="mr-2 h-8 w-8">
          Logging out...
        </div>
      </div>
    );
  };

  return (
    <header className="border-b p-4 bg-card sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold hover:text-primary transition-colors">Another File</Link>
        <div className="flex items-center gap-4">
          Theme Toggle
          {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || ""} alt={user.name || user.email} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 py-2">
                  <p className="text-sm font-medium leading-none capitalize">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer flex w-full items-center">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer flex w-full items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};