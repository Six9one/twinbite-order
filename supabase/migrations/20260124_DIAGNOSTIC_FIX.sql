-- ========================================================
-- DIAGNOSTIC & FINAL RESET
-- Run this in your SQL Editor to identify and fix the issue
-- ========================================================

-- 1. SHOW ME: What constraints actually exist right now?
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass;

-- 2. SHOW ME: What are the latest orders today?
SELECT order_number, created_at, order_date
FROM orders
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;

-- 3. FORCE CLEANUP: Ensure NO old global constraints remain
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;

-- 4. ENSURE: The correct daily constraint exists
DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_date_key UNIQUE (order_number, order_date);
EXCEPTION
    WHEN duplicate_object THEN RAISE NOTICE 'Daily constraint already exists';
END $$;

-- 5. RESET COUNTER: Set it safely to the next sequential number
-- This intelligently finds the highest "small" number (001, 002...) 
-- and ignores the large timestamp ones.
UPDATE order_counters 
SET last_number = COALESCE((
    SELECT MAX(num)
    FROM (
        SELECT NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INTEGER as num
        FROM orders
        WHERE order_date = CURRENT_DATE
          AND length(order_number) <= 5 -- Only look at short numbers (001, 002...)
    ) s
), 0)
WHERE counter_date = CURRENT_DATE;

-- 6. FINAL CHECK: What is the next number going to be?
SELECT 
  'SUCCESS' as status,
  LPAD((last_number + 1)::TEXT, 3, '0') as next_order_number
FROM order_counters 
WHERE counter_date = CURRENT_DATE;
