-- ========================================
-- COMPLETE LOYALTY SYSTEM FIX
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Create loyalty_customers table
CREATE TABLE IF NOT EXISTS loyalty_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  description TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('free_item', 'discount', 'percentage')),
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert default rewards (skip if exists)
INSERT INTO loyalty_rewards (id, name, description, points_cost, type, value, is_active) VALUES
  ('free-drink', 'Boisson Gratuite', 'Une boisson au choix offerte', 50, 'free_item', 0, true),
  ('free-frites', 'Frites Gratuites', 'Une portion de frites offerte', 75, 'free_item', 0, true),
  ('discount-5', 'Réduction 5€', '5€ de réduction sur votre commande', 100, 'discount', 5, true),
  ('discount-10', 'Réduction 10€', '10€ de réduction sur votre commande', 180, 'discount', 10, true),
  ('free-pizza', 'Pizza Gratuite', 'Une pizza Senior gratuite', 250, 'free_item', 0, true),
  ('percent-15', '-15% sur la commande', '15% de réduction sur toute la commande', 300, 'percentage', 15, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS on all tables
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for loyalty_customers
DROP POLICY IF EXISTS "Allow public read loyalty_customers" ON loyalty_customers;
DROP POLICY IF EXISTS "Allow public insert loyalty_customers" ON loyalty_customers;
DROP POLICY IF EXISTS "Allow public update loyalty_customers" ON loyalty_customers;

CREATE POLICY "Allow public read loyalty_customers"
  ON loyalty_customers FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert loyalty_customers"
  ON loyalty_customers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update loyalty_customers"
  ON loyalty_customers FOR UPDATE TO anon, authenticated
  USING (true);

-- 7. Create RLS policies for loyalty_transactions
DROP POLICY IF EXISTS "Allow public read loyalty_transactions" ON loyalty_transactions;
DROP POLICY IF EXISTS "Allow public insert loyalty_transactions" ON loyalty_transactions;

CREATE POLICY "Allow public read loyalty_transactions"
  ON loyalty_transactions FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert loyalty_transactions"
  ON loyalty_transactions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 8. Create RLS policies for loyalty_rewards
DROP POLICY IF EXISTS "Allow public read loyalty_rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Allow authenticated update loyalty_rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Allow authenticated insert loyalty_rewards" ON loyalty_rewards;

CREATE POLICY "Allow public read loyalty_rewards"
  ON loyalty_rewards FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated update loyalty_rewards"
  ON loyalty_rewards FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert loyalty_rewards"
  ON loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (true);

-- 9. Create function to add loyalty points
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_customer_id UUID,
  p_points INTEGER,
  p_order_id TEXT,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS VOID AS $$
BEGIN
  -- Update customer points and stats
  UPDATE loyalty_customers 
  SET 
    points = points + p_points,
    total_spent = total_spent + COALESCE(p_amount, 0),
    total_orders = total_orders + 1,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Record the transaction
  INSERT INTO loyalty_transactions (customer_id, type, points, order_id, description)
  VALUES (p_customer_id, 'earn', p_points, p_order_id, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to redeem reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_customer_id UUID,
  p_reward_id TEXT,
  p_points INTEGER
) RETURNS VOID AS $$
DECLARE
  current_points INTEGER;
BEGIN
  -- Get current points
  SELECT points INTO current_points FROM loyalty_customers WHERE id = p_customer_id;
  
  -- Check if enough points
  IF current_points < p_points THEN
    RAISE EXCEPTION 'Not enough points';
  END IF;

  -- Deduct points
  UPDATE loyalty_customers 
  SET 
    points = points - p_points,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Record the transaction
  INSERT INTO loyalty_transactions (customer_id, type, points, description)
  VALUES (p_customer_id, 'redeem', -p_points, (SELECT name FROM loyalty_rewards WHERE id = p_reward_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant execute permissions
GRANT EXECUTE ON FUNCTION add_loyalty_points(UUID, INTEGER, TEXT, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, TEXT, INTEGER) TO anon, authenticated;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON loyalty_customers(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);

-- Success message
DO $$ BEGIN RAISE NOTICE 'Loyalty system setup complete!'; END $$;
