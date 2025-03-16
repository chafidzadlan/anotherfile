export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  name?: string;
  avatar_url?: string;
  created_at: string;
};