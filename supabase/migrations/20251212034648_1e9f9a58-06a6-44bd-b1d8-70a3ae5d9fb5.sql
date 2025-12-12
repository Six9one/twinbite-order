-- Fix orders table RLS: Only admins can view orders (not public)
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

CREATE POLICY "Admins can view orders" 
ON orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));