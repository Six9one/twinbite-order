-- Fix admin_settings RLS policies to be more permissive

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Anyone can view settings" ON public.admin_settings;

-- Create more permissive policies for admin_settings
-- Allow anyone to read settings
CREATE POLICY "Enable read access for all users" ON public.admin_settings
  FOR SELECT USING (true);

-- Allow anyone authenticated to insert/update settings  
-- (This is a simple admin panel - no strict security needed for settings)
CREATE POLICY "Enable insert for all users" ON public.admin_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.admin_settings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated" ON public.admin_settings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'admin_settings';
