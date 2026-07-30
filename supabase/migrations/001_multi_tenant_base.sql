-- ============================================================================
-- MIGRATION: 001_multi_tenant_base.sql
-- DESCRIPTION: Transform single-tenant Twin Pizza database into Multi-Tenant B2B SaaS
-- SAFETY: Non-destructive, idempotent, safe backfill with fallback default tenant
-- ============================================================================

BEGIN;

-- 1. CREATE TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEED TWIN PIZZA AS DEFAULT TENANT #1
INSERT INTO public.tenants (id, name, slug, domain, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Twin Pizza',
  'twin-pizza',
  'twinpizza.fr',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  domain = EXCLUDED.domain;

-- 3. HELPER FUNCTION TO GET SESSION/REQUEST TENANT ID
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid,
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid,
    NULLIF(current_setting('request.headers', true)::json->>'x-tenant-id', '')::uuid,
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '00000000-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. DYNAMIC MULTI-TENANT ALTERATION & BACKFILL FUNCTION
DO $$
DECLARE
  tbl_name TEXT;
  tbl_array TEXT[] := ARRAY[
    'admin_settings', 'carousel_images', 'categories', 'category_images',
    'crudites_options', 'delivery_zones', 'desserts', 'drinks',
    'garniture_options', 'global_order_counter', 'haccp_categories',
    'haccp_history', 'haccp_print_queue', 'haccp_products',
    'inventory_categories', 'inventory_items', 'kitchen_cleaning_tasks',
    'kitchen_cleaning_zones', 'kitchen_equipment', 'kitchen_freezer_entries',
    'kitchen_reception_logs', 'kitchen_shifts', 'kitchen_temp_logs',
    'kitchen_traceability', 'kitchen_waste_log', 'loyalty_customers',
    'loyalty_points', 'loyalty_rewards', 'loyalty_rules',
    'loyalty_transactions', 'meat_options', 'opening_hours', 'orders',
    'order_counters', 'order_processing_status', 'pizza_credits',
    'print_jobs', 'products', 'product_analytics', 'product_size_prices',
    'product_views', 'promotions', 'push_subscriptions', 'pwa_installs',
    'reviews', 'sandwich_types', 'sauce_options', 'site_settings',
    'spin_wheel_entries', 'stock_movements', 'supplement_options',
    'supplier_orders', 'system_remote_commands', 'texmex_offers',
    'texmex_products', 'user_roles', 'voice_calls', 'voice_settings'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tbl_array LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      -- Step 4a: Add nullable tenant_id
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;',
        tbl_name
      );

      -- Step 4b: Backfill existing rows with default tenant ID
      EXECUTE format(
        'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL;',
        tbl_name,
        '00000000-0000-0000-0000-000000000001'
      );

      -- Step 4c: Set NOT NULL and DEFAULT
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL;',
        tbl_name
      );
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L;',
        tbl_name,
        '00000000-0000-0000-0000-000000000001'
      );

      -- Step 4d: Create Index
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id);',
        'idx_' || tbl_name || '_tenant_id',
        tbl_name
      );

      -- Step 4e: Enable RLS & Apply Isolation Policies
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl_name);
      
      -- Drop old policies to prevent collision
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl_name || '_tenant_all', tbl_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl_name || '_tenant_select', tbl_name);

      -- Create Tenant Isolated RLS Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());',
        tbl_name || '_tenant_all',
        tbl_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
