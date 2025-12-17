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

-- Delete all existing meats first (clean slate)
DELETE FROM public.meat_options;

-- Insert the 6 meats in the correct order
-- 1. Escalope marinée
-- 2. Tenders
-- 3. Viande hachée
-- 4. Merguez
-- 5. Cordon bleu
-- 6. Nuggets

INSERT INTO public.meat_options (name, price, display_order, is_active) VALUES
('Escalope marinée', 0, 1, true),
('Tenders', 0, 2, true),
('Viande hachée', 0, 3, true),
('Merguez', 0, 4, true),
('Cordon bleu', 0, 5, true),
('Nuggets', 0, 6, true);

-- Show results
SELECT id, name, price, display_order, is_active FROM public.meat_options ORDER BY display_order;
