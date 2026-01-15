-- Migration: Add loyalty card image URL to orders table
-- This stores the captured loyalty card image for WhatsApp sending

DO $$
BEGIN
    -- Add loyalty_card_image_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'loyalty_card_image_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN loyalty_card_image_url TEXT;
    END IF;
END $$;
