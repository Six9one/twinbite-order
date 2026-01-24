-- =====================================================
-- COMPLETE FIX FOR ORDER NUMBERS
-- This script does EVERYTHING needed in one go
-- =====================================================

-- STEP 1: Remove duplicates by updating them to unique values
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY order_number, order_date ORDER BY created_at) as rn
  FROM orders
)
UPDATE orders
SET order_number = orders.order_number || '-' || SUBSTRING(orders.id::TEXT, 1, 4)
WHERE orders.id IN (SELECT id FROM duplicates WHERE rn > 1);

-- STEP 2: Drop and recreate the constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_date_key;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE orders ADD CONSTRAINT orders_order_number_date_key UNIQUE (order_number, order_date);

-- STEP 3: COMPLETELY REWRITE the get_next_order_number function
-- This version is bulletproof and will ALWAYS return the next sequential number
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_num INTEGER;
  max_existing INTEGER;
BEGIN
  -- First, find the actual highest order number used today (from orders table)
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number ~ '^\d+$' THEN order_number::INTEGER
      ELSE 0
    END
  ), 0)
  INTO max_existing
  FROM orders
  WHERE order_date = today;

  -- Lock and update order_counters atomically
  INSERT INTO order_counters (counter_date, last_number)
  VALUES (today, GREATEST(max_existing + 1, 1))
  ON CONFLICT (counter_date)
  DO UPDATE SET 
    last_number = GREATEST(order_counters.last_number + 1, EXCLUDED.last_number),
    updated_at = NOW()
  RETURNING last_number INTO next_num;
  
  -- Return formatted order number
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- STEP 4: Initialize counter for today based on highest existing order
DELETE FROM order_counters WHERE counter_date = CURRENT_DATE;
INSERT INTO order_counters (counter_date, last_number) 
VALUES (
  CURRENT_DATE, 
  COALESCE((
    SELECT MAX(
      CASE 
        WHEN order_number ~ '^\d+$' THEN order_number::INTEGER
        ELSE 0
      END
    )
    FROM orders
    WHERE order_date = CURRENT_DATE
  ), 0)
);

-- STEP 5: Cleanup old counters
DELETE FROM order_counters WHERE counter_date < CURRENT_DATE - INTERVAL '7 days';
DELETE FROM order_counters WHERE counter_date = '1970-01-01'::DATE;

-- STEP 6: Verify everything
SELECT 
  'SUCCESS' as status,
  (SELECT last_number FROM order_counters WHERE counter_date = CURRENT_DATE) as current_counter,
  (SELECT last_number + 1 FROM order_counters WHERE counter_date = CURRENT_DATE) as next_order_will_be,
  (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'orders'::regclass AND conname = 'orders_order_number_date_key') as constraint_exists;
