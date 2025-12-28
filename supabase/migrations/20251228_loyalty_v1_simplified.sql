-- ============================================
-- MIGRATION: Simplified V1 Loyalty Points System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add first_order_done tracking to loyalty_customers
ALTER TABLE loyalty_customers ADD COLUMN IF NOT EXISTS first_order_done BOOLEAN DEFAULT false;

-- 2. Add points expiry tracking (12 months validity)
ALTER TABLE loyalty_customers ADD COLUMN IF NOT EXISTS points_expires_at TIMESTAMPTZ;

-- 3. Clear and recreate simplified rewards (V1: 4 rewards only)
DELETE FROM loyalty_rewards;

INSERT INTO loyalty_rewards (id, name, description, points_cost, type, value, is_active) VALUES
  ('free-drink', 'Boisson Gratuite', 'Une boisson au choix offerte', 50, 'free_item', 0, true),
  ('discount-10-percent', '-10% sur la commande', '10% de réduction (non cumulable avec codes promo)', 100, 'percentage', 10, true),
  ('free-side', 'Accompagnement Gratuit', 'Frites, pain à l''ail ou wings au choix', 150, 'free_item', 0, true),
  ('free-pizza', 'Pizza Gratuite', 'Une pizza classique offerte (sans extras)', 200, 'free_item', 0, true);

-- 4. Update add_loyalty_points function with online bonus and first-order bonus
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_customer_id UUID,
  p_points INTEGER,
  p_order_id TEXT,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS VOID AS $$
DECLARE
  v_is_first_order BOOLEAN;
  v_total_points INTEGER;
  v_online_bonus INTEGER := 10;
  v_first_order_bonus INTEGER := 30;
BEGIN
  -- Check if this is customer's first order
  SELECT NOT first_order_done INTO v_is_first_order 
  FROM loyalty_customers 
  WHERE id = p_customer_id;

  -- Calculate total points: base + online bonus + first order bonus (if applicable)
  v_total_points := p_points + v_online_bonus;
  IF v_is_first_order THEN
    v_total_points := v_total_points + v_first_order_bonus;
  END IF;

  -- Update customer points and stats
  UPDATE loyalty_customers
  SET 
    points = points + v_total_points,
    total_spent = total_spent + COALESCE(p_amount, 0),
    total_orders = total_orders + 1,
    first_order_done = true,
    points_expires_at = NOW() + INTERVAL '12 months',
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- Insert transaction record for base points
  INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id)
  VALUES (p_customer_id, 'earn', p_points, p_description || ' (1pt/€)', p_order_id);

  -- Insert transaction for online bonus
  INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id)
  VALUES (p_customer_id, 'earn', v_online_bonus, 'Bonus commande en ligne 🌐', p_order_id);

  -- Insert transaction for first order bonus if applicable
  IF v_is_first_order THEN
    INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id)
    VALUES (p_customer_id, 'earn', v_first_order_bonus, 'Bonus première commande 🎉', p_order_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check if reward can be applied (no promo code combination)
CREATE OR REPLACE FUNCTION can_apply_reward(
  p_customer_id UUID,
  p_reward_id TEXT,
  p_has_promo_code BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_customer_points INTEGER;
  v_reward_cost INTEGER;
  v_reward_type TEXT;
BEGIN
  -- Can't combine rewards with promo codes
  IF p_has_promo_code THEN
    RETURN false;
  END IF;

  -- Get customer points
  SELECT points INTO v_customer_points FROM loyalty_customers WHERE id = p_customer_id;
  
  -- Get reward info
  SELECT points_cost, type INTO v_reward_cost, v_reward_type 
  FROM loyalty_rewards 
  WHERE id = p_reward_id AND is_active = true;

  -- Check if customer has enough points
  IF v_customer_points IS NULL OR v_reward_cost IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_customer_points >= v_reward_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION add_loyalty_points(UUID, INTEGER, TEXT, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_apply_reward(UUID, TEXT, BOOLEAN) TO anon, authenticated;

-- 7. Add delete policy for admin (to manage rewards)
DROP POLICY IF EXISTS "Allow authenticated delete loyalty_rewards" ON loyalty_rewards;
CREATE POLICY "Allow authenticated delete loyalty_rewards"
  ON loyalty_rewards FOR DELETE TO authenticated
  USING (true);

-- Success message
DO $$ BEGIN RAISE NOTICE 'V1 Loyalty system migration complete!'; END $$;
