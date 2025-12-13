-- Fix RLS: allow anonymous users to INSERT orders

-- Drop old ALL policy that blocks anonymous INSERTs
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

-- Create explicit admin UPDATE policy (WITH CHECK allowed)
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create explicit admin DELETE policy (no WITH CHECK for DELETE)
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));