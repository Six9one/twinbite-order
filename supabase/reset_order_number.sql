-- ============================================
-- RESET ORDER COUNTER TO 0 (START FROM 001)
-- Run this in Supabase SQL Editor
-- ============================================

-- Delete all existing counter records
-- This will make the next order start from 001
DELETE FROM order_counters;

-- Optionally insert today with counter 0 so next call returns 001
INSERT INTO order_counters (counter_date, last_number)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (counter_date) DO UPDATE SET last_number = 0;

-- Verify: This shows the current state
SELECT * FROM order_counters;

-- NOTE: The next order will now be "001"
-- The format depends on your generateOrderNumber function in the code
