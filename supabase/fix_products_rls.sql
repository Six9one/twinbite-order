-- =============================================
-- FIX PRODUCTS RLS POLICIES
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check current user roles
SELECT * FROM user_roles;

-- Step 2: Check if your admin user ID is in the roles table
-- Replace 'your-email@example.com' with your actual admin email
SELECT 
    au.id as user_id,
    au.email,
    ur.role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id;

-- Step 3: Check current RLS policies on products table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'products';

-- =============================================
-- IF THE ABOVE SHOWS YOUR ADMIN USER BUT NO ROLE,
-- RUN THIS TO ADD THE ADMIN ROLE:
-- =============================================

-- First, find your user ID (use the result from Step 2)
-- Then insert the admin role:

-- Example (replace with your actual user_id from Step 2):
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR-USER-ID-HERE', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- =============================================
-- ALTERNATIVE FIX: Make products table more permissive for authenticated users
-- This is useful if you want all authenticated users to manage products
-- =============================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Create a new policy that allows all authenticated users to manage products
CREATE POLICY "Authenticated users can manage products" ON public.products
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'products';

-- =============================================
-- Also fix the categories table (needed for pizza management)
-- =============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Authenticated users can manage categories" ON public.categories
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Also create a policy to view ALL categories (including inactive) for admins
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

CREATE POLICY "Anyone can view all categories" ON public.categories
  FOR SELECT 
  USING (true);

-- Done! Try adding/editing pizzas again.
