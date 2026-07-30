-- ============================================================================
-- MIGRATION: 003_fix_tenants_rls.sql
-- DESCRIPTION: Fix RLS policies on public.tenants table to permit public read & onboarding inserts
-- ============================================================================

BEGIN;

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop restricting policy on tenants table
DROP POLICY IF EXISTS tenants_tenant_all ON public.tenants;
DROP POLICY IF EXISTS "Allow public read for tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow public insert for tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow tenant admin update" ON public.tenants;

-- 1. Public SELECT policy: Anyone can read tenant details (needed for domain/slug resolution)
CREATE POLICY "Allow public read for tenants" ON public.tenants
  FOR SELECT USING (true);

-- 2. Public INSERT policy: Anyone can register a new restaurant tenant
CREATE POLICY "Allow public insert for tenants" ON public.tenants
  FOR INSERT WITH CHECK (true);

-- 3. UPDATE/DELETE policy: Admins or active tenant sessions can update tenant settings
CREATE POLICY "Allow tenant admin update" ON public.tenants
  FOR UPDATE USING (id = public.current_tenant_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.current_tenant_id() OR public.has_role(auth.uid(), 'admin'));

COMMIT;
