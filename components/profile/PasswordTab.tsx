import React, { useState } from "react";
import { supabase } from "@/lib/db/supabase";
import { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface PasswordTabProps {
  user: User;
  showError: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
}

const PasswordTab: React.FC<PasswordTabProps> = ({ user, showError, success }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [id.replace("password-", "")]: value,
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("Passwords don't match", "New password and confirmation must match");
      return;
    };

    setIsSaving(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordData.currentPassword,
      });
      if (signInError) {
        showError("Invalid password", "Your current password is incorrect");
        setIsSaving(false);
        return;
      };

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      success("Password updated", "Your password has been changed successfully");
    } catch (error) {
      console.error(error);
      showError("Failed to update password");
    } finally {
      setIsSaving(false);
    };
  };

  return (
    <Card>
      <form onSubmit={handlePasswordChange}>
        <CardHeader className="text-center">
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="password-currentPassword">Current Password</Label>
            <Input
              id="password-currentPassword"
              type="password"
              placeholder="Current Password"
              value={passwordData.currentPassword}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-newPassword">New Password</Label>
            <Input
              id="password-newPassword"
              type="password"
              placeholder="New Password"
              value={passwordData.newPassword}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-confirmPassword">Confirm Password</Label>
            <Input
              id="password-confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={passwordData.confirmPassword}
              onChange={handleInputChange}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PasswordTab;