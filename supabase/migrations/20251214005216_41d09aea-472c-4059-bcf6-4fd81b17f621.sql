-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- Create new policy: public can view active products, admins can view all
CREATE POLICY "Anyone can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Same fix for categories - admins should see all categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

CREATE POLICY "Anyone can view categories" 
ON public.categories 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));