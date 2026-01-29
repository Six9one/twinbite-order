-- ========================================================
-- CONTINUOUS ORDER NUMBER SYSTEM
-- Order numbers never reset, continue forever: 42, 43, 44...
-- ========================================================

-- 1. Create a single global counter table (replace daily counters)
CREATE TABLE IF NOT EXISTS global_order_counter (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Initialize the counter to 41 (next order will be 42)
INSERT INTO global_order_counter (id, last_number) 
VALUES (1, 41)
ON CONFLICT (id) DO UPDATE SET last_number = 41, updated_at = NOW();

-- 3. Update the order number function to use continuous numbering
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Increment and return the global counter
  UPDATE global_order_counter 
  SET last_number = last_number + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING last_number INTO next_num;
  
  -- If no row exists (shouldn't happen), create one starting at 42
  IF next_num IS NULL THEN
    INSERT INTO global_order_counter (id, last_number, updated_at)
    VALUES (1, 42, NOW())
    RETURNING last_number INTO next_num;
  END IF;
  
  -- Return just the number (no zero padding since it can grow large)
  RETURN next_num::TEXT;
END;
$$;

-- 4. Grant permissions
GRANT SELECT, UPDATE ON global_order_counter TO authenticated;
GRANT SELECT, UPDATE ON global_order_counter TO anon;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO anon;

-- 5. Keep the date-based constraint for historical orders (they have duplicates like "002" from different days)
-- New orders will have unique numbers like 42, 43, 44... so no conflicts going forward
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;

-- Ensure the date constraint exists for historical compatibility
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_date_key;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_date_key UNIQUE (order_number, order_date);

-- 6. Verification
SELECT 
  'SUCCESS' as status,
  (SELECT last_number FROM global_order_counter WHERE id = 1) as current_counter,
  (SELECT last_number + 1 FROM global_order_counter WHERE id = 1) as next_order_will_be;
