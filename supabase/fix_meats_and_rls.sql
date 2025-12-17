-- =====================================================
-- FIX MEAT OPTIONS - Add all 6 meats and fix RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, fix RLS policies for meat_options
DROP POLICY IF EXISTS "Anyone can view meat options" ON public.meat_options;
DROP POLICY IF EXISTS "Admins can manage meat options" ON public.meat_options;

CREATE POLICY "Anyone can view meat options" 
ON public.meat_options FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage meat options" 
ON public.meat_options FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Same for sauce_options
DROP POLICY IF EXISTS "Anyone can view sauce options" ON public.sauce_options;
DROP POLICY IF EXISTS "Admins can manage sauce options" ON public.sauce_options;

CREATE POLICY "Anyone can view sauce options" 
ON public.sauce_options FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage sauce options" 
ON public.sauce_options FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Same for supplement_options
DROP POLICY IF EXISTS "Anyone can view supplement options" ON public.supplement_options;
DROP POLICY IF EXISTS "Admins can manage supplement options" ON public.supplement_options;

CREATE POLICY "Anyone can view supplement options" 
ON public.supplement_options FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage supplement options" 
ON public.supplement_options FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Same for garniture_options
DROP POLICY IF EXISTS "Anyone can view garniture options" ON public.garniture_options;
DROP POLICY IF EXISTS "Admins can manage garniture options" ON public.garniture_options;

CREATE POLICY "Anyone can view garniture options" 
ON public.garniture_options FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage garniture options" 
ON public.garniture_options FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add image_url column if not exists
ALTER TABLE public.meat_options ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.sauce_options ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.supplement_options ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.garniture_options ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Insert the 6 meats if they don't exist
INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Escalope marinée', 0, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%escalope%');

INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Tenders', 0, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%tenders%');

INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Viande hachée', 0, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%hachée%' OR name ILIKE '%hachee%');

INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Merguez', 0, 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%merguez%');

INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Cordon bleu', 0, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%cordon%');

INSERT INTO public.meat_options (name, price, display_order, is_active)
SELECT 'Nuggets', 0, 6, true
WHERE NOT EXISTS (SELECT 1 FROM public.meat_options WHERE name ILIKE '%nuggets%');

-- Verify all meats are active
UPDATE public.meat_options SET is_active = true WHERE is_active = false;

-- Show results
SELECT id, name, price, display_order, is_active FROM public.meat_options ORDER BY display_order;
