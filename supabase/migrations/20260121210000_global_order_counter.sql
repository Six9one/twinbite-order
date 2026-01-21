-- ============================================
-- GLOBAL ORDER COUNTER (NO DAILY RESET)
-- Run this in Supabase SQL Editor
-- ============================================

-- Update the function to use a GLOBAL counter (no daily reset)
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Use a fixed date key 'global' to keep one counter forever
  -- This ensures numbering continues: 001, 002, 003... forever
  INSERT INTO order_counters (counter_date, last_number)
  VALUES ('1970-01-01'::DATE, 1)  -- Use epoch date as global key
  ON CONFLICT (counter_date)
  DO UPDATE SET 
    last_number = order_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_num;
  
  -- Return formatted order number (e.g., "001", "002", etc.)
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Initialize the global counter based on the highest existing order number
DO $$
DECLARE
  max_order_num INTEGER;
BEGIN
  -- Find the highest order number from ALL orders ever
  SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INTEGER)
  INTO max_order_num
  FROM orders;
  
  -- If we found orders, set the global counter to that value
  IF max_order_num IS NOT NULL AND max_order_num > 0 THEN
    INSERT INTO order_counters (counter_date, last_number)
    VALUES ('1970-01-01'::DATE, max_order_num)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_number = GREATEST(order_counters.last_number, max_order_num);
    
    RAISE NOTICE 'Global counter initialized to: %', max_order_num;
  ELSE
    -- Start from 0 if no orders exist
    INSERT INTO order_counters (counter_date, last_number)
    VALUES ('1970-01-01'::DATE, 0)
    ON CONFLICT (counter_date) DO NOTHING;
    
    RAISE NOTICE 'Global counter starting from 0';
  END IF;
END;
$$;

-- Clean up any daily counters (keep only global)
DELETE FROM order_counters WHERE counter_date != '1970-01-01'::DATE;

-- Verify: Show current state
SELECT 
  'Global Counter' as type,
  last_number,
  'Next order will be: ' || LPAD((last_number + 1)::TEXT, 3, '0') as next_order
FROM order_counters 
WHERE counter_date = '1970-01-01'::DATE;

-- ============================================
-- RESULT: Orders will now count forever:
-- 001, 002, 003... 999, 1000, 1001...
-- NO RESET each day!
-- ============================================
