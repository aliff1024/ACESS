-- Run this in your Supabase dashboard: SQL Editor > New Query
-- This fixes RLS policies so educators and admins can read user info for enrollments.

-- Drop restrictive default policies (they conflict with the broader ones below)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;

-- Allow any authenticated user to SELECT all users (needed for enrollment display)
CREATE POLICY "authenticated users can read all users" 
ON public.users FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow admins to UPDATE any user (role changes, soft-delete, etc.)
CREATE POLICY "admins can update all users" 
ON public.users FOR UPDATE 
USING (
  (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'::text)
)
WITH CHECK (
  (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'::text)
);
