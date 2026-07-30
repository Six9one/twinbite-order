-- ============================================================================
-- MIGRATION: 002_tenant_order_counters.sql
-- DESCRIPTION: Per-tenant isolated order counter sequence & unique constraints
-- ============================================================================

BEGIN;

-- 1. Alter global_order_counter to be tenant-scoped
ALTER TABLE public.global_order_counter DROP CONSTRAINT IF EXISTS global_order_counter_pkey;
ALTER TABLE public.global_order_counter DROP CONSTRAINT IF EXISTS global_order_counter_id_check;

-- Add tenant_id if not present
ALTER TABLE public.global_order_counter ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill default tenant for existing counter
UPDATE public.global_order_counter 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Enforce primary key (tenant_id)
ALTER TABLE public.global_order_counter ADD CONSTRAINT global_order_counter_tenant_pkey PRIMARY KEY (tenant_id);

-- 2. CREATE PER-TENANT ORDER NUMBER FUNCTION
CREATE OR REPLACE FUNCTION public.get_next_order_number(p_tenant_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  next_num INTEGER;
BEGIN
  -- Resolve tenant ID from parameter or current request header/JWT context
  v_tenant_id := COALESCE(p_tenant_id, public.current_tenant_id());
  
  -- Upsert order counter for the specific tenant_id starting at 100
  INSERT INTO public.global_order_counter (tenant_id, last_number, updated_at)
  VALUES (v_tenant_id, 100, NOW())
  ON CONFLICT (tenant_id) DO UPDATE 
    SET last_number = public.global_order_counter.last_number + 1,
        updated_at = NOW()
  RETURNING last_number INTO next_num;
  
  RETURN next_num::TEXT;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_next_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number() TO anon;

COMMIT;
