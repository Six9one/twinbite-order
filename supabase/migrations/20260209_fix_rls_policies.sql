-- Fix RLS policies to allow admin INSERT operations
-- The issue: "FOR ALL USING(...)" doesn't include WITH CHECK for INSERT
-- Run this in Supabase SQL Editor

-- Drop existing admin policies and recreate with WITH CHECK clause

-- DRINKS
DROP POLICY IF EXISTS "Admins can manage drinks" ON public.drinks;
CREATE POLICY "Admins can manage drinks" ON public.drinks 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DESSERTS
DROP POLICY IF EXISTS "Admins can manage desserts" ON public.desserts;
CREATE POLICY "Admins can manage desserts" ON public.desserts 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PRODUCTS
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- MEAT OPTIONS
DROP POLICY IF EXISTS "Admins can manage meat options" ON public.meat_options;
CREATE POLICY "Admins can manage meat options" ON public.meat_options 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SAUCE OPTIONS
DROP POLICY IF EXISTS "Admins can manage sauce options" ON public.sauce_options;
CREATE POLICY "Admins can manage sauce options" ON public.sauce_options 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- GARNITURE OPTIONS
DROP POLICY IF EXISTS "Admins can manage garniture options" ON public.garniture_options;
CREATE POLICY "Admins can manage garniture options" ON public.garniture_options 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SUPPLEMENT OPTIONS
DROP POLICY IF EXISTS "Admins can manage supplement options" ON public.supplement_options;
CREATE POLICY "Admins can manage supplement options" ON public.supplement_options 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DELIVERY ZONES
DROP POLICY IF EXISTS "Admins can manage delivery zones" ON public.delivery_zones;
CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORDERS
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TEXMEX PRODUCTS (if exists)
DROP POLICY IF EXISTS "Admins can manage texmex products" ON public.texmex_products;
CREATE POLICY "Admins can manage texmex products" ON public.texmex_products 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- OPENING HOURS (if exists)
DROP POLICY IF EXISTS "Admins can manage opening hours" ON public.opening_hours;
CREATE POLICY "Admins can manage opening hours" ON public.opening_hours 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- REVIEWS (if exists)
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews" ON public.reviews 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LOYALTY POINTS (if exists)
DROP POLICY IF EXISTS "Admins can manage loyalty" ON public.loyalty_points;
CREATE POLICY "Admins can manage loyalty" ON public.loyalty_points 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LOYALTY RULES (if exists)
DROP POLICY IF EXISTS "Admins can manage loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Admins can manage loyalty rules" ON public.loyalty_rules 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TEXMEX OFFERS (if exists)
DROP POLICY IF EXISTS "Admins can manage texmex offers" ON public.texmex_offers;
CREATE POLICY "Admins can manage texmex offers" ON public.texmex_offers 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
