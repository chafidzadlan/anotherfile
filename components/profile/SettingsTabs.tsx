import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/db/supabase";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { Loader2, Trash2 } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface SettingsTabProps {
  user: User;
  showError: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
}

export default function SettingsTab({ user, showError, success }: SettingsTabProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const router = useRouter();

  const handleAccountDeletion = async () => {
    if (!user || !deletePassword) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: deletePassword,
      });
      if (error) {
        setDeletePasswordError("Incorrect password");
        setIsDeleting(false);
        return;
      };

      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        showError(result.error || "Failed to delete account");
      }

      success("Account deleted", "Your account has been permanently deleted");

      await supabase.auth.signOut();

      router.push("/");
    } catch (error) {
      console.error(error, "Failed to delete account");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    } finally {
      setDeletePassword("")
      setDeletePasswordError("");
    };
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Manage your account settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all of your content</p>
          <p className="text-sm font-medium">Account: {user.email}</p>
          <div className="mt-4">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all of your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="delete-password">Enter your password to confirm</Label>
                    <Input
                      id="delete-password"
                      type="password"
                      placeholder="******"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        setDeletePasswordError("");
                      }}
                    />
                    {deletePasswordError && (
                      <p className="text-sm text-destructive">{deletePasswordError}</p>
                    )}
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setDeletePassword("");
                      setDeletePasswordError("");
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();

                      if (!deletePassword) {
                        setDeletePassword("Password is required to delete your account");
                        return;
                      };

                      await handleAccountDeletion();
                    }}
                    className="bg-destructive hover:bg-destructive/80"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}