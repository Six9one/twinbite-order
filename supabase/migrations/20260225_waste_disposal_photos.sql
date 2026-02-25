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
