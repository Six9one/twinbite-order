-- Add coordinates to delivery_zones for map management
ALTER TABLE public.delivery_zones 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS zone_type TEXT DEFAULT 'main';

-- Update existing zones with approximate coordinates for Grand-Couronne area
UPDATE public.delivery_zones SET 
  latitude = 49.3555,
  longitude = 1.0032,
  zone_type = 'main'
WHERE name ILIKE '%grand-couronne%' OR name ILIKE '%centre%';

UPDATE public.delivery_zones SET 
  latitude = 49.3450,
  longitude = 1.0100,
  zone_type = 'near'
WHERE name ILIKE '%petit-couronne%';

UPDATE public.delivery_zones SET 
  latitude = 49.3600,
  longitude = 1.0200,
  zone_type = 'near'
WHERE name ILIKE '%moulineaux%';