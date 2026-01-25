-- Create table for remote orchestration of local servers
CREATE TABLE IF NOT EXISTS public.system_remote_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_name TEXT NOT NULL, -- 'whatsapp', 'printer'
    command TEXT NOT NULL,     -- 'start', 'stop', 'restart'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_remote_commands ENABLE ROW LEVEL SECURITY;

-- Allow admins to insert and view commands
CREATE POLICY "Admins can manage remote commands" ON public.system_remote_commands
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ));

-- Allow the local bridge (using service role or anon key with specific policy if needed)
-- For now, we'll allow anon if they have the right key, but better to keep it authenticated.
-- Assuming the local bridge uses a service role or a specific admin session.

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_remote_commands;
