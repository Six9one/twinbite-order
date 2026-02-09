-- Migration: Add order processing status tracking for print & WhatsApp recovery
-- This enables recovering missed prints/messages when servers restart after downtime

-- Create order_processing_status table to track print and WhatsApp status
CREATE TABLE IF NOT EXISTS order_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Print tracking
    printed BOOLEAN DEFAULT FALSE,
    print_attempts INTEGER DEFAULT 0,
    last_print_attempt TIMESTAMPTZ,
    print_error TEXT,
    
    -- WhatsApp tracking  
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_attempts INTEGER DEFAULT 0,
    last_whatsapp_attempt TIMESTAMPTZ,
    whatsapp_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient recovery queries
CREATE INDEX IF NOT EXISTS idx_order_processing_status_printed 
    ON order_processing_status(printed) WHERE printed = FALSE;
    
CREATE INDEX IF NOT EXISTS idx_order_processing_status_whatsapp 
    ON order_processing_status(whatsapp_sent) WHERE whatsapp_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_order_processing_status_order_id 
    ON order_processing_status(order_id);

-- Enable RLS
ALTER TABLE order_processing_status ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on order_processing_status"
    ON order_processing_status
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read order_processing_status"
    ON order_processing_status
    FOR SELECT
    TO authenticated
    USING (true);

-- Trigger to auto-create processing status when order is created
CREATE OR REPLACE FUNCTION create_order_processing_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_processing_status (order_id)
    VALUES (NEW.id)
    ON CONFLICT (order_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_order_created_processing_status ON orders;

CREATE TRIGGER on_order_created_processing_status
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_processing_status();

-- Backfill: Create processing status for existing orders from last 7 days
INSERT INTO order_processing_status (order_id, printed, whatsapp_sent)
SELECT 
    id,
    TRUE,  -- Assume already printed (historical orders)
    TRUE   -- Assume already sent (historical orders)
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days'
ON CONFLICT (order_id) DO NOTHING;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_order_processing_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_processing_status_timestamp ON order_processing_status;

CREATE TRIGGER update_order_processing_status_timestamp
    BEFORE UPDATE ON order_processing_status
    FOR EACH ROW
    EXECUTE FUNCTION update_order_processing_status_timestamp();

-- Grant permissions
GRANT ALL ON order_processing_status TO authenticated;
GRANT ALL ON order_processing_status TO anon;
