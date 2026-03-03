-- Spin Wheel entries for Google Review incentive
CREATE TABLE IF NOT EXISTS spin_wheel_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT,
  prize TEXT,  -- null means lost
  prize_code TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  redeemed BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for anti-cheat: lookup by device fingerprint in last 24h
CREATE INDEX idx_spin_wheel_fingerprint ON spin_wheel_entries (device_fingerprint, created_at DESC);

-- Index for prize code lookup
CREATE INDEX idx_spin_wheel_code ON spin_wheel_entries (prize_code);

-- RLS policies
ALTER TABLE spin_wheel_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (customers spinning the wheel)
CREATE POLICY "Allow anonymous insert" ON spin_wheel_entries
  FOR INSERT
  WITH CHECK (true);

-- Allow reading by prize_code (for prize display page)
CREATE POLICY "Allow read by prize_code" ON spin_wheel_entries
  FOR SELECT
  USING (true);

-- Allow update (for marking as redeemed/reviewed)
CREATE POLICY "Allow update" ON spin_wheel_entries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
