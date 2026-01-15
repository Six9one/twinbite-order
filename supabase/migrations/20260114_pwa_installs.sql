-- Create table to track PWA installs
CREATE TABLE IF NOT EXISTS pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_agent TEXT,
    platform TEXT DEFAULT 'unknown',
    screen_width INTEGER,
    screen_height INTEGER,
    language TEXT,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow anonymous inserts (for tracking)
ALTER TABLE pwa_installs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking installs)
CREATE POLICY "Allow anonymous inserts" ON pwa_installs
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Only allow admin to read
CREATE POLICY "Admin can read all" ON pwa_installs
    FOR SELECT TO authenticated
    USING (true);

-- Create index for faster queries
CREATE INDEX idx_pwa_installs_date ON pwa_installs(installed_at DESC);
