-- Add latitude, longitude, and radius columns to delivery_zones if they don't exist
ALTER TABLE delivery_zones 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS radius INTEGER DEFAULT 800;

-- Update coordinates for existing zones
UPDATE delivery_zones 
SET latitude = 49.3569, longitude = 1.0024, radius = 1000 
WHERE name ILIKE '%Grand-Couronne%';

UPDATE delivery_zones 
SET latitude = 49.3815, longitude = 1.0265, radius = 800 
WHERE name ILIKE '%Petit-Couronne%';

UPDATE delivery_zones 
SET latitude = 49.3419, longitude = 0.9798, radius = 600 
WHERE name ILIKE '%Moulineaux%';
