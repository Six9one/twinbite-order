-- Migration: Fix opening_hours duplication and add UNIQUE constraint

-- 1. Identify and remove duplicate rows for the same day_of_week
-- We keep only the row with the largest (most recent) 'id' for each day_of_week
DELETE FROM public.opening_hours a
USING public.opening_hours b
WHERE a.id < b.id
  AND a.day_of_week = b.day_of_week;

-- 2. Add UNIQUE constraint to day_of_week to prevent future duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'opening_hours_day_of_week_key'
    ) THEN
        ALTER TABLE public.opening_hours ADD CONSTRAINT opening_hours_day_of_week_key UNIQUE (day_of_week);
    END IF;
END $$;

-- 3. Ensure we have exactly 7 rows (one for each day 0-6)
-- If any day is missing, it will be added by the existing logic in the app or default inserts
-- but here we just want to make sure the existing ones are correct.
