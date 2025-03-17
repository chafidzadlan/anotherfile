"use client";

import { useState } from "react";
import { loadAllUsers, deleteUserAccount, updateUser, createUser } from "@/lib/storage";
import { useToasts } from "@/hooks/useToast";
import { User } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminPage() {
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    saving: false,
    refreshingUsers: false,
    submitting: false,
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { success, error: showError } = useToasts();

  const fetchAllUsers = async () => {
    setLoadingStates(prev => ({ ...prev, refreshingUsers: true }));

    try {
      const data = await loadAllUsers();
      setAllUsers(data);
    } catch (error) {
      console.error(error);
      showError("Failed to load users");
    } finally {
      setLoadingStates(prev => ({ ...prev, refreshingUsers: false }));
    };
  };

  const handleDeleteUser = async (userId: string) => {
    setLoadingStates(prev => ({ ...prev, submitting: true }));

    try {
      await deleteUserAccount(userId);
      setAllUsers(prev => prev.filter(user => user.id !== userId));
      success("User deleted", "The user has been deleted successfully");
    } catch (error) {
      console.error(error, "Failed to delete user");
    } finally {
      setLoadingStates(prev => ({ ...prev, submitting: false }));
    };
  };

  const handleSaveUser = async (userData: { id?: string; email: string; password?: string; name: string; role: string }) => {
    setLoadingStates(prev => ({ ...prev, submitting: true }));

    try {
      if (userData.id) {
        await updateUser(userData.id, {
          name: userData.name,
          role: userData.role
        });
      } else {
        if (!userData.password) {
          showError("Password is required when creating a new user");
          setLoadingStates(prev => ({ ...prev, submitting: false }));
          return;
        };
        await createUser({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
        });
      };

      await fetchAllUsers();
      success(userData.id ? "User Updated" : "User Created", `User ${userData.id ? "updated" : "created"} successfully`);
    } catch (error) {
      console.error(error);
      showError(`Failed to ${userData.id ? "update" : "create"} user`);
    } finally {
      setLoadingStates(prev => ({ ...prev, submitting: false }));
    };
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto p-4 flex-1">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to files
          </Link>
          <h1 className="text-2xl font-bold text-center mb-4">Admin Dashboard</h1>
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="files">Manage Files</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <UserManagement
                users={allUsers}
                onDelete={handleDeleteUser}
                onSave={handleSaveUser}
                onRefresh={fetchAllUsers}
                loadingStates={{  refreshing: loadingStates.refreshingUsers, submitting: loadingStates.submitting }}
              />
            </TabsContent>
            <TabsContent value="files">

            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};