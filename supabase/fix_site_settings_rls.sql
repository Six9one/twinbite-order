-- Fix site_settings RLS policies to allow updates
-- Run this in Supabase SQL Editor if you get permission errors

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

-- Create more permissive policies
-- Allow anyone to insert/update site settings (simple admin panel)
CREATE POLICY "Enable insert for all" ON public.site_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all" ON public.site_settings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Also fix opening_hours table if it has similar issues
DROP POLICY IF EXISTS "Admins can manage opening hours" ON public.opening_hours;
DROP POLICY IF EXISTS "Anyone can view opening hours" ON public.opening_hours;

CREATE POLICY "Enable read for all" ON public.opening_hours
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all" ON public.opening_hours
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all" ON public.opening_hours
  FOR UPDATE USING (true) WITH CHECK (true);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename IN ('site_settings', 'opening_hours');
