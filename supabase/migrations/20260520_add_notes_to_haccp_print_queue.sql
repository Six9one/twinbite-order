-- Add notes column to haccp_print_queue for storing extra data (freezer label info etc.)
ALTER TABLE haccp_print_queue ADD COLUMN IF NOT EXISTS notes TEXT;
