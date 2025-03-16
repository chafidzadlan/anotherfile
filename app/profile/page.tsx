"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
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

            </TabsContent>
            <TabsContent value="password">

            </TabsContent>
            <TabsContent value="settings">

            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}