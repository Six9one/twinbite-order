-- Pizza Credits System Migration
-- Allows customers to defer their free pizza from the 1+1 deal

-- Create pizza_credits table
CREATE TABLE IF NOT EXISTS public.pizza_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    source_order_id UUID REFERENCES public.orders(id),
    redeemed_order_id UUID REFERENCES public.orders(id)
);

-- Index for fast lookup by phone
CREATE INDEX IF NOT EXISTS idx_pizza_credits_phone ON public.pizza_credits(customer_phone);
CREATE INDEX IF NOT EXISTS idx_pizza_credits_available ON public.pizza_credits(customer_phone) WHERE redeemed_at IS NULL;

-- Add pizza_credits_available column to loyalty_customers
ALTER TABLE public.loyalty_customers 
ADD COLUMN IF NOT EXISTS pizza_credits_available INTEGER DEFAULT 0;

-- RLS policies
ALTER TABLE public.pizza_credits ENABLE ROW LEVEL SECURITY;

-- Allow read for all (customers check their own credits)
CREATE POLICY "Allow read pizza_credits" ON public.pizza_credits
    FOR SELECT USING (true);

-- Allow insert from authenticated and anon (for order flow)
CREATE POLICY "Allow insert pizza_credits" ON public.pizza_credits
    FOR INSERT WITH CHECK (true);

-- Allow update for redemption
CREATE POLICY "Allow update pizza_credits" ON public.pizza_credits
    FOR UPDATE USING (true);

-- Function to add a pizza credit
CREATE OR REPLACE FUNCTION add_pizza_credit(
    p_phone TEXT,
    p_order_id UUID
) RETURNS UUID AS $$
DECLARE
    v_credit_id UUID;
    v_normalized_phone TEXT;
BEGIN
    -- Normalize phone
    v_normalized_phone := regexp_replace(p_phone, '\s+', '', 'g');
    v_normalized_phone := regexp_replace(v_normalized_phone, '^(\+33|0033)', '0');
    
    -- Insert credit
    INSERT INTO pizza_credits (customer_phone, source_order_id)
    VALUES (v_normalized_phone, p_order_id)
    RETURNING id INTO v_credit_id;
    
    -- Update loyalty_customers count
    UPDATE loyalty_customers
    SET pizza_credits_available = COALESCE(pizza_credits_available, 0) + 1
    WHERE phone = v_normalized_phone;
    
    RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem a pizza credit
CREATE OR REPLACE FUNCTION redeem_pizza_credit(
    p_phone TEXT,
    p_order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_credit_id UUID;
    v_normalized_phone TEXT;
BEGIN
    -- Normalize phone
    v_normalized_phone := regexp_replace(p_phone, '\s+', '', 'g');
    v_normalized_phone := regexp_replace(v_normalized_phone, '^(\+33|0033)', '0');
    
    -- Find oldest unredeemed credit
    SELECT id INTO v_credit_id
    FROM pizza_credits
    WHERE customer_phone = v_normalized_phone
      AND redeemed_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_credit_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as redeemed
    UPDATE pizza_credits
    SET redeemed_at = NOW(),
        redeemed_order_id = p_order_id
    WHERE id = v_credit_id;
    
    -- Update loyalty_customers count
    UPDATE loyalty_customers
    SET pizza_credits_available = GREATEST(COALESCE(pizza_credits_available, 0) - 1, 0)
    WHERE phone = v_normalized_phone;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pizza credits count for a customer
CREATE OR REPLACE FUNCTION get_pizza_credits_count(p_phone TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_normalized_phone TEXT;
BEGIN
    v_normalized_phone := regexp_replace(p_phone, '\s+', '', 'g');
    v_normalized_phone := regexp_replace(v_normalized_phone, '^(\+33|0033)', '0');
    
    SELECT COUNT(*) INTO v_count
    FROM pizza_credits
    WHERE customer_phone = v_normalized_phone
      AND redeemed_at IS NULL;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
