-- Loyalty Program Tables

-- Loyalty Customers
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

-- Loyalty Transactions (earn/redeem history)
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem')),
  points INTEGER NOT NULL,
  description TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Rewards (available rewards)
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

-- Insert default rewards
INSERT INTO loyalty_rewards (id, name, description, points_cost, type, value, is_active) VALUES
  ('free-drink', 'Boisson Gratuite', 'Une boisson au choix offerte', 50, 'free_item', 0, true),
  ('free-frites', 'Frites Gratuites', 'Une portion de frites offerte', 75, 'free_item', 0, true),
  ('discount-5', 'Réduction 5€', '5€ de réduction sur votre commande', 100, 'discount', 5, true),
  ('discount-10', 'Réduction 10€', '10€ de réduction sur votre commande', 180, 'discount', 10, true),
  ('free-pizza', 'Pizza Gratuite', 'Une pizza Senior gratuite', 250, 'free_item', 0, true),
  ('percent-15', '-15% sur la commande', '15% de réduction sur toute la commande', 300, 'percentage', 15, true)
ON CONFLICT (id) DO NOTHING;

-- Group Orders Table
CREATE TABLE IF NOT EXISTS group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  order_type TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'submitted')),
  data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  customer_phone TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to add loyalty points (with tier multiplier in app)
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
    total_spent = total_spent + p_amount,
    total_orders = total_orders + 1,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Insert transaction
  INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id)
  VALUES (p_customer_id, 'earn', p_points, p_description, p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem loyalty reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_customer_id UUID,
  p_reward_id TEXT,
  p_points INTEGER
) RETURNS VOID AS $$
DECLARE
  v_reward_name TEXT;
BEGIN
  -- Get reward name
  SELECT name INTO v_reward_name FROM loyalty_rewards WHERE id = p_reward_id;
  
  -- Deduct points
  UPDATE loyalty_customers
  SET 
    points = points - p_points,
    updated_at = NOW()
  WHERE id = p_customer_id AND points >= p_points;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient points or customer not found';
  END IF;

  -- Insert transaction
  INSERT INTO loyalty_transactions (customer_id, type, points, description)
  VALUES (p_customer_id, 'redeem', -p_points, 'Récompense: ' || v_reward_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_customers
CREATE POLICY "Allow public read loyalty_customers by phone"
  ON loyalty_customers FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert loyalty_customers"
  ON loyalty_customers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update loyalty_customers"
  ON loyalty_customers FOR UPDATE TO anon, authenticated
  USING (true);

-- RLS Policies for loyalty_transactions
CREATE POLICY "Allow public read loyalty_transactions"
  ON loyalty_transactions FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert loyalty_transactions"
  ON loyalty_transactions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for loyalty_rewards
CREATE POLICY "Allow public read loyalty_rewards"
  ON loyalty_rewards FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated update loyalty_rewards"
  ON loyalty_rewards FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert loyalty_rewards"
  ON loyalty_rewards FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS Policies for group_orders
CREATE POLICY "Allow public access group_orders"
  ON group_orders FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for push_subscriptions
CREATE POLICY "Allow public access push_subscriptions"
  ON push_subscriptions FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON loyalty_customers(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_group_orders_code ON group_orders(code);
CREATE INDEX IF NOT EXISTS idx_group_orders_expires ON group_orders(expires_at);
