-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a properly permissive INSERT policy for anonymous customers
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Make sure the policy is PERMISSIVE (not RESTRICTIVE)
-- Recreate it with explicit PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);