-- =====================================================
-- FIX SANDWICH TYPES RLS AND ADD DEFAULT DATA
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage sandwich types" ON public.sandwich_types;
DROP POLICY IF EXISTS "Anyone can view sandwich types" ON public.sandwich_types;
DROP POLICY IF EXISTS "sandwich_types_admin_all" ON public.sandwich_types;
DROP POLICY IF EXISTS "sandwich_types_public_select" ON public.sandwich_types;

-- Create proper RLS policies
-- Allow admins full access
CREATE POLICY "sandwich_types_admin_all" ON public.sandwich_types
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow anyone to view active sandwich types
CREATE POLICY "sandwich_types_public_select" ON public.sandwich_types
FOR SELECT USING (is_active = true);

-- Same fix for crudites_options table
DROP POLICY IF EXISTS "Admins can manage crudites options" ON public.crudites_options;
DROP POLICY IF EXISTS "Anyone can view crudites options" ON public.crudites_options;
DROP POLICY IF EXISTS "crudites_admin_all" ON public.crudites_options;
DROP POLICY IF EXISTS "crudites_public_select" ON public.crudites_options;

CREATE POLICY "crudites_admin_all" ON public.crudites_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "crudites_public_select" ON public.crudites_options
FOR SELECT USING (is_active = true);

-- Insert default sandwiches if table is empty
INSERT INTO public.sandwich_types (name, description, base_price, display_order, is_active)
SELECT * FROM (VALUES
  ('Merguez', 'Pain maison, merguez grillée', 6.50::numeric, 1, true),
  ('Escalope', 'Pain maison, escalope de poulet', 7.00::numeric, 2, true),
  ('Viande Hachée', 'Pain maison, viande hachée', 6.50::numeric, 3, true),
  ('Poulet', 'Pain maison, poulet grillé', 7.00::numeric, 4, true),
  ('Mixte', 'Pain maison, merguez + escalope', 8.00::numeric, 5, true)
) AS v(name, description, base_price, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.sandwich_types LIMIT 1);

-- Insert default crudités if table is empty  
INSERT INTO public.crudites_options (name, display_order, is_active)
SELECT * FROM (VALUES
  ('Salade', 1, true),
  ('Tomate', 2, true),
  ('Oignon', 3, true),
  ('Cornichons', 4, true),
  ('Harissa', 5, true)
) AS v(name, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.crudites_options LIMIT 1);

-- Grant permissions
GRANT SELECT ON public.sandwich_types TO anon, authenticated;
GRANT ALL ON public.sandwich_types TO authenticated;
GRANT SELECT ON public.crudites_options TO anon, authenticated;
GRANT ALL ON public.crudites_options TO authenticated;
