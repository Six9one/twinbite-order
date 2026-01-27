-- ============================================
-- Allow NULL zone_id for flexible cleaning logs
-- This enables log-based cleaning entries without predefined zones
-- ============================================

-- Make zone_id nullable to support manual cleaning entries
ALTER TABLE public.kitchen_cleaning_tasks 
ALTER COLUMN zone_id DROP NOT NULL;

-- Remove the unique constraint that requires zone_id + scheduled_date
-- (since zone_id can now be null for manual entries)
ALTER TABLE public.kitchen_cleaning_tasks 
DROP CONSTRAINT IF EXISTS kitchen_cleaning_tasks_zone_id_scheduled_date_key;

-- Add index for querying by date for the new log-based system
CREATE INDEX IF NOT EXISTS idx_kitchen_cleaning_tasks_status_date 
ON public.kitchen_cleaning_tasks(status, scheduled_date DESC);
