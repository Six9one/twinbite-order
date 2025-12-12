-- Add radius (in meters) and color columns to delivery_zones
ALTER TABLE public.delivery_zones 
ADD COLUMN IF NOT EXISTS radius integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#f59e0b';