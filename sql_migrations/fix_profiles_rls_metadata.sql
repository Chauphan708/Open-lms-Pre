-- ============================================
-- SQL MIGRATION: FIX INSECURE PROFILE RLS POLICIES REFERENCING USER_METADATA
-- Description: Drop RLS policies that might use user_metadata and replace them with secure ones.
-- ============================================

-- Enable RLS on public.profiles just in case
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies that might refer to user_metadata or are named insecurely
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow teachers and admins to insert/update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles modify access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép đọc thông tin profile công khai" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép người dùng tự cập nhật thông tin cá nhân" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép đọc profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chỉ tài khoản chính nó được sửa profile" ON public.profiles;

-- 2. Create secure SELECT policy (all authenticated users can read profiles)
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Create secure INSERT policy
-- Allow new authenticated users to insert their own profile during sign-up
-- Or teachers/admins to insert profiles
CREATE POLICY "Allow insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid()::text = id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- 4. Create secure UPDATE policy
-- Users can update their own profile, or admins/teachers can update any profile
CREATE POLICY "Allow update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
)
WITH CHECK (
    auth.uid()::text = id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);

-- 5. Create secure DELETE policy
-- Only admins can delete profiles (or teachers, depending on roles)
CREATE POLICY "Allow delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER')
);
