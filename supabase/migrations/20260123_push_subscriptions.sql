-- Push Subscriptions for HACCP Kitchen Notifications
-- Store web push subscriptions to send background notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    user_agent TEXT,
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add is_active if it doesn't exist (fixing previous error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='is_active') THEN
        ALTER TABLE public.push_subscriptions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all push subscription operations" ON public.push_subscriptions
    FOR ALL USING (true) WITH CHECK (true);
