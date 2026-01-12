-- Migration: Add stamp card system to loyalty_customers
-- This adds the stamp card tracking fields for the "buy 9, get 10th free" system

-- Add stamp fields to loyalty_customers table if they don't exist
DO $$
BEGIN
    -- Add stamps column (current progress, 0-9)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_customers' AND column_name = 'stamps'
    ) THEN
        ALTER TABLE loyalty_customers ADD COLUMN stamps INTEGER DEFAULT 0;
    END IF;

    -- Add total_stamps column (lifetime total stamps earned)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_customers' AND column_name = 'total_stamps'
    ) THEN
        ALTER TABLE loyalty_customers ADD COLUMN total_stamps INTEGER DEFAULT 0;
    END IF;

    -- Add free_items_available column (number of free items to claim)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_customers' AND column_name = 'free_items_available'
    ) THEN
        ALTER TABLE loyalty_customers ADD COLUMN free_items_available INTEGER DEFAULT 0;
    END IF;
END $$;
