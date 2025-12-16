-- ============================================
-- MIGRATION: Tex-Mex, Reviews, Enhanced Loyalty
-- ============================================

-- 1. Add Tex-Mex category
INSERT INTO public.categories (slug, name, display_order) 
VALUES ('texmex', 'Tex-Mex', 8)
ON CONFLICT (slug) DO NOTHING;

-- 2. Add Base Spéciale for pizzas
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pizza_base_special TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_top_picked BOOLEAN DEFAULT false;

-- 3. Create Tex-Mex products table with special offer logic
CREATE TABLE IF NOT EXISTS public.texmex_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.texmex_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for texmex_products (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view texmex products" ON public.texmex_products;
DROP POLICY IF EXISTS "Admins can manage texmex products" ON public.texmex_products;
CREATE POLICY "Anyone can view texmex products" ON public.texmex_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage texmex products" ON public.texmex_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default Tex-Mex items
INSERT INTO public.texmex_products (name, description, unit_price, display_order) VALUES
('Wings', 'Ailes de poulet croustillantes', 1.00, 1),
('Tenders', 'Tendres de poulet marinés', 1.00, 2),
('Nuggets', 'Nuggets de poulet dorés', 1.00, 3),
('Mozzastick', 'Bâtonnets de mozzarella fondante', 1.00, 4),
('Jalapeños', 'Piments jalapeños farcis au fromage', 1.00, 5)
ON CONFLICT DO NOTHING;

-- 4. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_published BOOLEAN DEFAULT false,
  is_google_review BOOLEAN DEFAULT false,
  google_review_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Anyone can view published reviews" ON public.reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create loyalty_points table if not exists (enhanced)
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  total_points INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  soufflet_count INTEGER DEFAULT 0,
  pizza_count INTEGER DEFAULT 0,
  texmex_count INTEGER DEFAULT 0,
  free_items_redeemed INTEGER DEFAULT 0,
  pending_rewards JSONB DEFAULT '[]'::jsonb,
  last_order_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_points (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view own loyalty" ON public.loyalty_points;
DROP POLICY IF EXISTS "Anyone can insert loyalty" ON public.loyalty_points;
DROP POLICY IF EXISTS "Admins can manage loyalty" ON public.loyalty_points;
CREATE POLICY "Anyone can view own loyalty" ON public.loyalty_points FOR SELECT USING (true);
CREATE POLICY "Anyone can insert loyalty" ON public.loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage loyalty" ON public.loyalty_points FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Create loyalty_rules table for admin-adjustable rules
CREATE TABLE IF NOT EXISTS public.loyalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL, -- 'pizza', 'soufflet', 'texmex', 'general'
  points_required INTEGER NOT NULL DEFAULT 10,
  reward_type TEXT NOT NULL DEFAULT 'free_item', -- 'free_item', 'discount_percent', 'discount_amount'
  reward_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_rules (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view loyalty rules" ON public.loyalty_rules;
DROP POLICY IF EXISTS "Admins can manage loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Anyone can view loyalty rules" ON public.loyalty_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage loyalty rules" ON public.loyalty_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default loyalty rules
INSERT INTO public.loyalty_rules (rule_name, product_type, points_required, reward_type, reward_value, description) VALUES
('10 Soufflés = 1 Gratuit', 'soufflet', 10, 'free_item', 1, 'Après 10 soufflés achetés, recevez 1 soufflet gratuit'),
('10 Pizzas = 1 Gratuite', 'pizza', 10, 'free_item', 1, 'Après 10 pizzas achetées, recevez 1 pizza gratuite'),
('Points Généraux', 'general', 100, 'discount_amount', 5, 'Pour 100 points, obtenez 5€ de réduction')
ON CONFLICT (rule_name) DO NOTHING;

-- 7. Add texmex_offers table for special pricing
CREATE TABLE IF NOT EXISTS public.texmex_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.texmex_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view texmex offers" ON public.texmex_offers;
DROP POLICY IF EXISTS "Admins can manage texmex offers" ON public.texmex_offers;
CREATE POLICY "Anyone can view texmex offers" ON public.texmex_offers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage texmex offers" ON public.texmex_offers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default offers (5 items = 5€, 10 items = 9€)
INSERT INTO public.texmex_offers (quantity, price) VALUES
(5, 5.00),
(10, 9.00)
ON CONFLICT DO NOTHING;

-- 8. Add image settings for resizing/zoom
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'cover';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_zoom DECIMAL(3,2) DEFAULT 1.00;

-- Enable realtime for new tables (ignore if already added)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_points;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.texmex_products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Create opening_hours table if not exists
CREATE TABLE IF NOT EXISTS public.opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '11:00',
  close_time TIME NOT NULL DEFAULT '14:00',
  open_time_evening TIME DEFAULT '18:00',
  close_time_evening TIME DEFAULT '22:00',
  is_continuous BOOLEAN DEFAULT false, -- if true, use only open_time and close_time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for opening_hours (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view opening hours" ON public.opening_hours;
DROP POLICY IF EXISTS "Admins can manage opening hours" ON public.opening_hours;
CREATE POLICY "Anyone can view opening hours" ON public.opening_hours FOR SELECT USING (true);
CREATE POLICY "Admins can manage opening hours" ON public.opening_hours FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default opening hours (Mon-Sun)
INSERT INTO public.opening_hours (day_of_week, is_open, open_time, close_time, open_time_evening, close_time_evening) VALUES
(0, false, '11:00', '14:00', '18:00', '22:00'), -- Sunday closed
(1, true, '11:00', '14:00', '18:00', '22:00'),  -- Monday
(2, true, '11:00', '14:00', '18:00', '22:00'),  -- Tuesday
(3, true, '11:00', '14:00', '18:00', '22:00'),  -- Wednesday
(4, true, '11:00', '14:00', '18:00', '22:00'),  -- Thursday
(5, true, '11:00', '14:00', '18:00', '23:00'),  -- Friday
(6, true, '11:00', '14:00', '18:00', '23:00')   -- Saturday
ON CONFLICT DO NOTHING;

