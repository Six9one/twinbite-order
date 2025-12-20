-- Create product size prices table for unified products (soufflet, makloub, mlawi, panini)
CREATE TABLE IF NOT EXISTS product_size_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL, -- 'soufflet', 'makloub', 'mlawi', 'panini'
  size_id TEXT NOT NULL, -- 'solo', 'double', 'triple', 'duo'
  size_label TEXT NOT NULL, -- 'Solo', 'Double', 'Triple', 'Duo'
  max_meats INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 6.00,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_type, size_id)
);

-- Insert default prices for Soufflet
INSERT INTO product_size_prices (product_type, size_id, size_label, max_meats, price, display_order) VALUES
  ('soufflet', 'solo', 'Solo', 1, 6.00, 1),
  ('soufflet', 'double', 'Double', 2, 8.00, 2),
  ('soufflet', 'triple', 'Triple', 3, 10.00, 3)
ON CONFLICT (product_type, size_id) DO NOTHING;

-- Insert default prices for Makloub
INSERT INTO product_size_prices (product_type, size_id, size_label, max_meats, price, display_order) VALUES
  ('makloub', 'solo', 'Solo', 1, 6.00, 1),
  ('makloub', 'double', 'Double', 2, 8.00, 2),
  ('makloub', 'triple', 'Triple', 3, 10.00, 3)
ON CONFLICT (product_type, size_id) DO NOTHING;

-- Insert default prices for Mlawi
INSERT INTO product_size_prices (product_type, size_id, size_label, max_meats, price, display_order) VALUES
  ('mlawi', 'solo', 'Solo', 1, 6.00, 1),
  ('mlawi', 'double', 'Double', 2, 8.00, 2),
  ('mlawi', 'triple', 'Triple', 3, 10.00, 3)
ON CONFLICT (product_type, size_id) DO NOTHING;

-- Insert default prices for Panini
INSERT INTO product_size_prices (product_type, size_id, size_label, max_meats, price, display_order) VALUES
  ('panini', 'solo', 'Solo', 2, 5.00, 1),
  ('panini', 'duo', 'Duo', 2, 7.00, 2)
ON CONFLICT (product_type, size_id) DO NOTHING;

-- Insert default prices for Tacos
INSERT INTO product_size_prices (product_type, size_id, size_label, max_meats, price, display_order) VALUES
  ('tacos', 'solo', 'Solo', 1, 6.00, 1),
  ('tacos', 'double', 'Double', 2, 8.00, 2),
  ('tacos', 'triple', 'Triple', 3, 10.00, 3)
ON CONFLICT (product_type, size_id) DO NOTHING;

-- Enable RLS
ALTER TABLE product_size_prices ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access to product_size_prices"
  ON product_size_prices FOR SELECT TO anon, authenticated
  USING (true);

-- Allow authenticated users to update prices
CREATE POLICY "Allow authenticated users to update product_size_prices"
  ON product_size_prices FOR UPDATE TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert product_size_prices"
  ON product_size_prices FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete product_size_prices"
  ON product_size_prices FOR DELETE TO authenticated
  USING (true);
