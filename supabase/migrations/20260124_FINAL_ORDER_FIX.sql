-- ========================================================
-- COMPREHENSIVE FIX V3: Force Reset Order System
-- This is a clean-slate approach to ensure all constraints are correct
-- ========================================================

-- 1. Drop EVERYTHING related to the old/conflicting system first
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_date_key;

-- 2. Ensure order_date exists and is correct
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
UPDATE orders SET order_date = created_at::DATE WHERE order_date IS NULL;
ALTER TABLE orders ALTER COLUMN order_date SET NOT NULL;

-- 3. Re-create the CORRECT daily unique constraint
ALTER TABLE orders ADD CONSTRAINT orders_order_number_date_key UNIQUE (order_number, order_date);

-- 4. Update the order number generation function
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_num INTEGER;
BEGIN
  INSERT INTO order_counters (counter_date, last_number)
  VALUES (today, 1)
  ON CONFLICT (counter_date)
  DO UPDATE SET 
    last_number = order_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_num;
  
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- 5. Synchronize the counter with today's actual orders
DO $$
DECLARE
  max_today_num INTEGER;
BEGIN
  -- Find the highest numeric order number from today that is LESS than 1000
  -- This ensures we ignore the timestamp-based fallback numbers (e.g. 214709123)
  -- and only continue from a clean sequence (001, 002, etc.)
  SELECT MAX(num)
  INTO max_today_num
  FROM (
    SELECT NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INTEGER as num
    FROM orders
    WHERE order_date = CURRENT_DATE
  ) s
  WHERE num < 1000;
  
  IF max_today_num IS NOT NULL THEN
    INSERT INTO order_counters (counter_date, last_number)
    VALUES (CURRENT_DATE, max_today_num)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_number = GREATEST(order_counters.last_number, max_today_num);
  ELSE
    -- If no clean sequence found today, reset to start from 001
    INSERT INTO order_counters (counter_date, last_number)
    VALUES (CURRENT_DATE, 0)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_number = 0;
  END IF;
END;
$$;

-- 6. Cleanup legacy counters
DELETE FROM order_counters WHERE counter_date = '1970-01-01'::DATE;

-- 7. Show status
SELECT 
  'SUCCESS' as status,
  (SELECT count(*) FROM pg_constraint WHERE conname = 'orders_order_number_date_key') as constraint_ok,
  (SELECT last_number FROM order_counters WHERE counter_date = CURRENT_DATE) as current_counter;
