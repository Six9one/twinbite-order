-- ============================================
-- Waste Disposal Photos for Traceability
-- Photo proof before throwing expired products
-- ============================================

-- 1. Add disposed_photo_url to kitchen_traceability
ALTER TABLE public.kitchen_traceability
ADD COLUMN IF NOT EXISTS disposed_photo_url TEXT;

-- 2. Add disposed_photo_url to kitchen_freezer_entries
ALTER TABLE public.kitchen_freezer_entries
ADD COLUMN IF NOT EXISTS disposed_photo_url TEXT;

-- 3. Create storage bucket for waste disposal photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('waste-disposal-photos', 'waste-disposal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Allow public access to waste disposal photos
DROP POLICY IF EXISTS "Allow public read waste photos" ON storage.objects;
CREATE POLICY "Allow public read waste photos" ON storage.objects
FOR SELECT USING (bucket_id = 'waste-disposal-photos');

DROP POLICY IF EXISTS "Allow upload waste photos" ON storage.objects;
CREATE POLICY "Allow upload waste photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'waste-disposal-photos');

DROP POLICY IF EXISTS "Allow delete waste photos" ON storage.objects;
CREATE POLICY "Allow delete waste photos" ON storage.objects
FOR DELETE USING (bucket_id = 'waste-disposal-photos');

-- 5. Create waste log table for quick disposal entries
CREATE TABLE IF NOT EXISTS public.kitchen_waste_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    photo_url TEXT,
    reason TEXT,
    disposed_at TIMESTAMPTZ DEFAULT now(),
    disposed_by TEXT DEFAULT 'Staff',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kitchen_waste_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all waste_log operations" ON public.kitchen_waste_log;
CREATE POLICY "Allow all waste_log operations" ON public.kitchen_waste_log
FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_kitchen_waste_log_date
ON public.kitchen_waste_log(disposed_at DESC);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_waste_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
