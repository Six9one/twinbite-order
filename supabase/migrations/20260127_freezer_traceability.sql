-- ============================================
-- Freezer Traceability + Remove Duplicates
-- ============================================

-- 1. Remove duplicate haccp_products (keep first occurrence)
DELETE FROM public.haccp_products a
USING public.haccp_products b
WHERE a.id > b.id 
  AND a.name = b.name 
  AND a.category_id = b.category_id;

-- 2. Create freezer entries table
CREATE TABLE IF NOT EXISTS public.kitchen_freezer_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    original_dlc DATE,
    lot_number TEXT,
    weight TEXT,
    origin TEXT,
    original_label_photo_url TEXT,
    frozen_at TIMESTAMPTZ DEFAULT now(),
    frozen_by TEXT DEFAULT 'Staff',
    max_freeze_months INTEGER DEFAULT 3,
    expiry_date DATE,
    is_removed BOOLEAN DEFAULT false,
    removed_at TIMESTAMPTZ,
    removed_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kitchen_freezer_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Allow all freezer operations" ON public.kitchen_freezer_entries;
CREATE POLICY "Allow all freezer operations" ON public.kitchen_freezer_entries 
FOR ALL USING (true) WITH CHECK (true);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_kitchen_freezer_entries_date 
ON public.kitchen_freezer_entries(frozen_at DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_freezer_entries_expiry 
ON public.kitchen_freezer_entries(expiry_date);

-- Enable realtime
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_freezer_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
