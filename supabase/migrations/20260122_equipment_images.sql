-- Add image_url column to kitchen_equipment
ALTER TABLE public.kitchen_equipment 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update equipment with better names (you can customize these later in Supabase dashboard)
UPDATE public.kitchen_equipment SET name = 'Frigo Préparation', location = 'Cuisine ligne' WHERE name = 'Frigo 1 - Légumes';
UPDATE public.kitchen_equipment SET name = 'Frigo Viandes/Fromages', location = 'Cuisine arrière' WHERE name = 'Frigo 2 - Viandes';
UPDATE public.kitchen_equipment SET name = 'Frigo Boissons', location = 'Réserve' WHERE name = 'Frigo 3 - Boissons';
UPDATE public.kitchen_equipment SET name = 'Congélateur Principal', location = 'Cuisine' WHERE name = 'Congélateur 1';
UPDATE public.kitchen_equipment SET name = 'Congélateur Réserve', location = 'Réserve' WHERE name = 'Congélateur 2';
