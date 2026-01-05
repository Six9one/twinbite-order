-- ============================================
-- HACCP Module - Food Safety Traceability
-- ============================================

-- 1. Create HACCP Categories table
CREATE TABLE IF NOT EXISTS public.haccp_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#ef4444', -- red default
  dlc_hours INTEGER NOT NULL DEFAULT 72,
  storage_temp_min DECIMAL(4,1) DEFAULT 0,
  storage_temp_max DECIMAL(4,1) DEFAULT 3,
  rules_description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create HACCP Products table
CREATE TABLE IF NOT EXISTS public.haccp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.haccp_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dlc_hours_override INTEGER, -- NULL = use category default
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create HACCP History table (audit log)
CREATE TABLE IF NOT EXISTS public.haccp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.haccp_products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.haccp_categories(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL, -- Denormalized for history integrity
  category_name TEXT NOT NULL, -- Denormalized for history integrity
  action_type TEXT NOT NULL DEFAULT 'defrost', -- 'defrost', 'open', 'prepare'
  action_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dlc_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  storage_temp TEXT,
  notes TEXT,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  printed_by TEXT, -- User who printed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.haccp_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for haccp_categories
DROP POLICY IF EXISTS "Anyone can view haccp categories" ON public.haccp_categories;
DROP POLICY IF EXISTS "Admins can manage haccp categories" ON public.haccp_categories;
CREATE POLICY "Anyone can view haccp categories" ON public.haccp_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage haccp categories" ON public.haccp_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for haccp_products
DROP POLICY IF EXISTS "Anyone can view haccp products" ON public.haccp_products;
DROP POLICY IF EXISTS "Admins can manage haccp products" ON public.haccp_products;
CREATE POLICY "Anyone can view haccp products" ON public.haccp_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage haccp products" ON public.haccp_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for haccp_history
DROP POLICY IF EXISTS "Anyone can view haccp history" ON public.haccp_history;
DROP POLICY IF EXISTS "Admins can manage haccp history" ON public.haccp_history;
DROP POLICY IF EXISTS "Anyone can insert haccp history" ON public.haccp_history;
CREATE POLICY "Anyone can view haccp history" ON public.haccp_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert haccp history" ON public.haccp_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage haccp history" ON public.haccp_history FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_haccp_products_category ON public.haccp_products(category_id);
CREATE INDEX IF NOT EXISTS idx_haccp_history_product ON public.haccp_history(product_id);
CREATE INDEX IF NOT EXISTS idx_haccp_history_datetime ON public.haccp_history(action_datetime DESC);

-- ============================================
-- Insert Default Categories
-- ============================================

INSERT INTO public.haccp_categories (name, slug, color, dlc_hours, storage_temp_min, storage_temp_max, rules_description, display_order) VALUES
(
  'Congelé → Décongelé',
  'congele-decongele',
  '#ef4444', -- red
  72, -- 72 hours = 3 days
  0,
  3,
  'Décongélation au frigo (0 à +3°C). Ne jamais recongeler un produit décongelé. Consommer dans les 72 heures.',
  1
),
(
  'Produits Frais',
  'produits-frais',
  '#22c55e', -- green
  48, -- 48 hours default, can be overridden per product
  0,
  3,
  'Conservation au frigo (0 à +3°C). Étiqueter à l''ouverture. Respecter la DLC indiquée.',
  2
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Insert Default Products - Congelé → Décongelé
-- ============================================

INSERT INTO public.haccp_products (category_id, name, display_order) 
SELECT c.id, p.name, p.display_order
FROM public.haccp_categories c
CROSS JOIN (VALUES
  ('Viande hachée', 1),
  ('Steak haché', 2),
  ('Nuggets', 3),
  ('Wings', 4),
  ('Tenders', 5),
  ('Cordon bleu', 6),
  ('Kebab', 7),
  ('Lardons', 8),
  ('Chorizo', 9),
  ('Merguez', 10)
) AS p(name, display_order)
WHERE c.slug = 'congele-decongele'
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert Default Products - Produits Frais
-- ============================================

INSERT INTO public.haccp_products (category_id, name, dlc_hours_override, display_order) 
SELECT c.id, p.name, p.dlc_hours, p.display_order
FROM public.haccp_categories c
CROSS JOIN (VALUES
  ('Escalope', 48, 1),
  ('Jambon', 72, 2),
  ('Œuf', 24, 3),
  ('Saumon', 24, 4),
  ('Poivrons', 72, 5),
  ('Pommes de terre', 72, 6),
  ('Champignons', 48, 7),
  ('Crème fraîche', 48, 8),
  ('Sauce tomate', 72, 9),
  ('Mozzarella', 48, 10)
) AS p(name, dlc_hours, display_order)
WHERE c.slug = 'produits-frais'
ON CONFLICT DO NOTHING;

-- Enable realtime for haccp_history
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.haccp_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
