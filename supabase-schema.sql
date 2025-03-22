-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- This table is created automatically by Supabase

-- Profiles table (extends the users table with additional fields)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can only read/update their own profile, admins can read/update all profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin());

-- Function to create profile after user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for avatars
-- Run this in the SQL editor:
-- SELECT create_bucket('user-content', 'User uploaded content including avatars');

-- Set up storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-content');

CREATE POLICY "Users can upload their own avatars and admins can upload for anyone"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-content' AND
    (storage.foldername(name))[1] = 'user-files' AND
    (auth.uid()::text = (storage.foldername(name))[2] OR is_admin())
  );

CREATE POLICY "Users can update their own avatars and admins can update for anyone"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-content' AND
    (storage.foldername(name))[1] = 'user-files' AND
    (auth.uid()::text = (storage.foldername(name))[2] OR is_admin())
  );

CREATE POLICY "Users can delete their own avatars and admins can delete for anyone"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-content' AND
    (storage.foldername(name))[1] = 'user-files' AND
    (auth.uid()::text = (storage.foldername(name))[2] OR is_admin())
  );

-- Admin function to get all profiles
CREATE OR REPLACE FUNCTION admin_get_all_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin function to get all profiles
CREATE OR REPLACE FUNCTION admin_get_all_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
END;
$$;

-- Create a files table to store file metadata
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  folder TEXT NOT NULL DEFAULT 'documents',
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Row-level security policies for files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Users can only view their own files, admins can view all
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- Users can only insert their own files
CREATE POLICY "Users can insert their own files"
  ON files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own files, admins can update any
CREATE POLICY "Users can update their own files"
  ON files FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- Users can only delete their own files, admins can delete any
CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();