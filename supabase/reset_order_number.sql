-- ============================================
-- RESET ORDER COUNTER (START FROM 001)
-- Run this in Supabase SQL Editor
-- ============================================

-- Option 1: Reset just today's counter to start from 001
UPDATE order_counters 
SET last_number = 0 
WHERE counter_date = CURRENT_DATE;

-- If no counter exists for today, insert one
INSERT INTO order_counters (counter_date, last_number)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (counter_date) DO UPDATE SET last_number = 0;

-- ============================================
-- HOW IT WORKS:
-- ============================================
-- The get_next_order_number() function automatically:
-- 1. Creates a new counter for each day (using CURRENT_DATE)
-- 2. Each day starts fresh at 001, 002, 003...
-- 3. No continuation from previous days
--
-- Example:
-- - Day 1: Orders are 001, 002, 003
-- - Day 2: Orders reset to 001, 002, 003 (new day!)
--
-- The counter is stored in the order_counters table:
-- - counter_date: The date (unique per day)
-- - last_number: The last used number for that day
-- ============================================

-- Verify current state:
SELECT 
  counter_date,
  last_number,
  'Next order will be: ' || LPAD((last_number + 1)::TEXT, 3, '0') as next_order
FROM order_counters 
ORDER BY counter_date DESC 
LIMIT 5;

-- ============================================
-- NOTE: Run this script if you want the very
-- next order to be 001 instead of continuing
-- ============================================
