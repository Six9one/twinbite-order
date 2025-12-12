-- Fix RLS so that non-admin customers can insert orders while admins gardent tous les droits

-- 1) Supprimer l’ancienne politique restrictive
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

-- 2) Recréer une politique PERMISSIVE pour les admins sur toutes les actions
CREATE POLICY "Admins can manage orders"
ON public.orders
AS PERMISSIVE
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));