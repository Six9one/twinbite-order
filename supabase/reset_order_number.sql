-- Reset order number sequence to start from 1
-- Run this in Supabase SQL Editor

-- Reset the sequence to start from 1
ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1;

-- If the sequence doesn't exist, this will do nothing
-- The next order will be TW-2025-0001

-- To verify, you can run:
-- SELECT nextval('order_number_seq');
-- But this will increment it, so only do this for testing
