-- HACCP Print Queue for direct thermal printing
-- The print server listens for new entries via realtime

CREATE TABLE IF NOT EXISTS haccp_print_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    category_name TEXT NOT NULL,
    category_color TEXT,
    action_date TEXT NOT NULL,
    dlc_date TEXT NOT NULL,
    storage_temp TEXT NOT NULL,
    operator TEXT NOT NULL,
    dlc_hours INTEGER NOT NULL,
    action_label TEXT NOT NULL,
    printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE haccp_print_queue;

-- Allow insert from anon users (the frontend)
ALTER TABLE haccp_print_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for all" ON haccp_print_queue
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow select for all" ON haccp_print_queue
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Allow update for all" ON haccp_print_queue
    FOR UPDATE TO anon, authenticated
    USING (true);
