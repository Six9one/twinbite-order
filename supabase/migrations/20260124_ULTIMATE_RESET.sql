-- ========================================================
-- THE ULTIMATE RESET SCRIPT
-- RUN THIS IF ALL ELSE FAILS
-- ========================================================

-- 1. DROP ALL POTENTIAL CONFLICTING CONSTRAINTS
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_date_key;

-- 2. ENSURE DATE COLUMN
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
UPDATE orders SET order_date = created_at::DATE WHERE order_date IS NULL;
ALTER TABLE orders ALTER COLUMN order_date SET NOT NULL;

-- 3. CREATE THE CORRECT DAILY UNIQUE CONSTRAINT
ALTER TABLE orders ADD CONSTRAINT orders_order_number_date_key UNIQUE (order_number, order_date);

-- 4. RESET YOUR COUNTER COMPLETELY
-- This clears today's counter to start from 001
DELETE FROM order_counters WHERE counter_date = CURRENT_DATE;
INSERT INTO order_counters (counter_date, last_number) VALUES (CURRENT_DATE, 0);

-- 5. UPDATE THE ORDER GENERATOR FUNCTION
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

-- 6. VERIFICATION - Look at the results table
SELECT 
  'SUCCESS' as status,
  (SELECT count(*) FROM pg_constraint WHERE conrelid = 'orders'::regclass AND conname = 'orders_order_number_date_key') as daily_constraint_ready,
  (SELECT count(*) FROM pg_constraint WHERE conrelid = 'orders'::regclass AND conname = 'orders_order_number_key') as old_constraint_removed,
  (SELECT last_number + 1 FROM order_counters WHERE counter_date = CURRENT_DATE) as next_number_will_be;
