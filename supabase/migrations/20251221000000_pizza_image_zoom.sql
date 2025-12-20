-- Add image_zoom column to products table for adjustable pizza image display
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_zoom NUMERIC(3,2) DEFAULT 1.0;

-- Set default zoom to 1.0 for better display
UPDATE products SET image_zoom = 1.0 WHERE image_zoom IS NULL;
