-- ============================================================================
-- MIGRATION: 004_clean_legacy_rls_policies.sql
-- DESCRIPTION: Drop old single-tenant policies so RLS enforces STRICT tenant_id isolation
-- ============================================================================

BEGIN;

DO $$
DECLARE
  tbl_name TEXT;
  tbl_array TEXT[] := ARRAY[
    'admin_settings', 'carousel_images', 'categories', 'category_images',
    'crudites_options', 'delivery_zones', 'desserts', 'drinks',
    'garniture_options', 'haccp_categories', 'haccp_history', 'haccp_products',
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
  pol RECORD;
BEGIN
  FOREACH tbl_name IN ARRAY tbl_array LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      -- Drop ALL legacy policies on the table to prevent policy OR-ing across tenants
      FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = tbl_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl_name);
      END LOOP;

      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl_name);

      -- Create 1 Single Strict Multi-Tenant Policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());',
        tbl_name || '_tenant_strict_policy',
        tbl_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
