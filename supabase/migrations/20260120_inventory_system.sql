-- =====================================================
-- TWINCREW HUB - Inventory Management System
-- Migration: 20260120_inventory_system.sql
-- =====================================================

-- ===================
-- INVENTORY CATEGORIES
-- ===================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  color TEXT DEFAULT '#d97706',
  icon TEXT DEFAULT 'Package',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INVENTORY ITEMS
-- ===================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'pièce',
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  max_stock DECIMAL(10,2) DEFAULT 100,
  last_price DECIMAL(10,2),
  supplier_name TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- SUPPLIER ORDERS (Historique des commandes fournisseur)
-- ===================
CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  items JSONB NOT NULL DEFAULT '[]',
  supplier_name TEXT,
  supplier_phone TEXT,
  total_items INT DEFAULT 0,
  sent_via TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- STOCK MOVEMENTS (Pour traçabilité)
-- ===================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
  quantity DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);

-- ===================
-- RLS POLICIES
-- ===================
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow read inventory_categories" ON inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read inventory_items" ON inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read supplier_orders" ON supplier_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow insert inventory_categories" ON inventory_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update inventory_categories" ON inventory_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete inventory_categories" ON inventory_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow insert inventory_items" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update inventory_items" ON inventory_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete inventory_items" ON inventory_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow insert supplier_orders" ON supplier_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update supplier_orders" ON supplier_orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow insert stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- ===================
-- SEED DATA - Categories
-- ===================
INSERT INTO inventory_categories (name, slug, color, icon, display_order) VALUES
  ('Viandes', 'viandes', '#dc2626', 'Beef', 1),
  ('Fromages', 'fromages', '#f59e0b', 'Cheese', 2),
  ('Surgelés / Frites', 'surgeles', '#3b82f6', 'Snowflake', 3),
  ('Produits Frais', 'frais', '#10b981', 'Egg', 4),
  ('Desserts & Glaces', 'desserts', '#ec4899', 'IceCream', 5),
  ('Sauces', 'sauces', '#8b5cf6', 'Droplet', 6),
  ('Huiles & Ingrédients', 'ingredients', '#6366f1', 'FlaskConical', 7),
  ('Emballages', 'emballages', '#78716c', 'Package', 8),
  ('Boissons', 'boissons', '#06b6d4', 'Coffee', 9),
  ('Produits Nettoyage', 'nettoyage', '#22c55e', 'Sparkles', 10),
  ('Légumes', 'legumes', '#84cc16', 'Carrot', 11),
  ('Pains', 'pains', '#d97706', 'Sandwich', 12),
  ('Toppings Desserts', 'toppings', '#a855f7', 'Cherry', 13)
ON CONFLICT (slug) DO NOTHING;

-- ===================
-- SEED DATA - Items (Based on your Excel list)
-- ===================

-- Viandes
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Escalope', 'kg', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Viande hachée', 'sac', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Tenders', 'sac', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Kebab', 'sac', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Wings', 'sac', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Jambon', 'pièce', 6),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Lardons', 'sac', 7),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Merguez', 'kg', 8),
  ((SELECT id FROM inventory_categories WHERE slug = 'viandes'), 'Poulet', 'kg', 9);

-- Fromages
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Mozzarella', 'carton', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Chèvre', 'pièce', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Raclette', 'pièce', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Reblochon', 'pièce', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Cheddar', 'kg', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'fromages'), 'Emmental', 'kg', 6);

-- Surgelés
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Frites', 'carton', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Pomme de terre', 'sac', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Pomme de terre cubes', 'sac', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Mozza sticks', 'sac', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Poivrons', 'sac', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'surgeles'), 'Cordon Bleu', 'sac', 6);

-- Produits Frais
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'frais'), 'Oeufs', 'plateau', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'frais'), 'Levure', 'pièce', 2);

-- Desserts
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'desserts'), 'Tiramisu', 'pièce', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'desserts'), 'Tarte au Daim', 'pièce', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'desserts'), 'Glace vanille', 'bac', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'desserts'), 'Glace chocolat', 'bac', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'desserts'), 'Glace fraise', 'bac', 5);

-- Sauces
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Sauce piquante', 'bidon', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Ketchup', 'bidon', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Mayonnaise', 'bidon', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Algérienne', 'bidon', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Harissa', 'bidon', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Biggy burger', 'bidon', 6),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Barbecue', 'bidon', 7),
  ((SELECT id FROM inventory_categories WHERE slug = 'sauces'), 'Samourai', 'bidon', 8);

-- Huiles
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'ingredients'), 'Huile de tournesol 10L', 'bidon', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'ingredients'), 'Huile de friture', 'bidon', 2);

-- Emballages
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Boîtes sandwiches', 'carton', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Boîtes Senior 31cm', 'carton', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Boîtes Junior 26cm', 'carton', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Cup milkshake', 'carton', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Serviettes carrées', 'carton', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Sacs kraft', 'paquet', 6),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Papier aluminium', 'rouleau', 7),
  ((SELECT id FROM inventory_categories WHERE slug = 'emballages'), 'Film étirable', 'rouleau', 8);

-- Boissons
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Coca-Cola', 'pack', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Fanta', 'pack', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Sprite', 'pack', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Eau', 'pack', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Ice Tea', 'pack', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'boissons'), 'Oasis', 'pack', 6);

-- Nettoyage
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'nettoyage'), 'Liquide vaisselle', 'bidon', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'nettoyage'), 'Désinfectant', 'bidon', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'nettoyage'), 'Éponges', 'paquet', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'nettoyage'), 'Essuie-tout', 'carton', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'nettoyage'), 'Sacs poubelle', 'rouleau', 5);

-- Légumes
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'legumes'), 'Salade', 'pièce', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'legumes'), 'Tomates', 'kg', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'legumes'), 'Oignons', 'kg', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'legumes'), 'Cornichons', 'bocal', 4);

-- Pains
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'pains'), 'Pain tacos', 'carton', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'pains'), 'Pain panini', 'carton', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'pains'), 'Pain burger', 'carton', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'pains'), 'Pain hot-dog', 'carton', 4);

-- Toppings
INSERT INTO inventory_items (category_id, name, unit, display_order) VALUES
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'Sauce chocolat', 'bouteille', 1),
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'Sauce caramel', 'bouteille', 2),
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'Chantilly', 'bombe', 3),
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'M&Ms', 'sachet', 4),
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'Oreo', 'paquet', 5),
  ((SELECT id FROM inventory_categories WHERE slug = 'toppings'), 'Smarties', 'sachet', 6);

-- ===================
-- TRIGGER: Update timestamp
-- ===================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_categories_updated_at
    BEFORE UPDATE ON inventory_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
