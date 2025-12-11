-- Add SELECT policy for orders table to allow insert with return
CREATE POLICY "Anyone can view orders" 
ON public.orders 
FOR SELECT 
USING (true);