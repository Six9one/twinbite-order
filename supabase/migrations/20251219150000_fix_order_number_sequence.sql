-- Fix: Server-side order number generation to prevent duplicates
-- This replaces the client-side localStorage approach

-- Create a table to track daily order counters
CREATE TABLE IF NOT EXISTS order_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;

-- Allow the service role to manage counters
CREATE POLICY "Service role can manage order counters"
  ON order_counters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to get next order number (atomic, no race conditions)
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_num INTEGER;
BEGIN
  -- Insert today's counter if it doesn't exist, or increment if it does
  -- This is atomic and prevents race conditions
  INSERT INTO order_counters (counter_date, last_number)
  VALUES (today, 1)
  ON CONFLICT (counter_date)
  DO UPDATE SET 
    last_number = order_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_num;
  
  -- Return formatted order number (e.g., "001", "002", etc.)
  RETURN LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_order_number() TO anon;

-- Initialize today's counter based on existing orders (to continue from current number)
DO $$
DECLARE
  max_order_num INTEGER;
  today DATE := CURRENT_DATE;
BEGIN
  -- Find the highest order number from today's orders
  SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INTEGER)
  INTO max_order_num
  FROM orders
  WHERE DATE(created_at) = today;
  
  -- If we found orders today, set the counter to that value
  IF max_order_num IS NOT NULL AND max_order_num > 0 THEN
    INSERT INTO order_counters (counter_date, last_number)
    VALUES (today, max_order_num)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_number = GREATEST(order_counters.last_number, max_order_num);
  END IF;
END;
$$;
