-- ============================================================================
-- MIGRATION: 005_tenant_plans.sql
-- DESCRIPTION: Add plan column to public.tenants for subscription tier tracking
-- ============================================================================

BEGIN;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';

COMMIT;
