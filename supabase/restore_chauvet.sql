-- ==========================================
-- RESTORE DELETED CLIENT
-- Re-creates Chauvet Camille because she was accidentally deleted
-- due to a spelling mismatch ("chavet" vs "Chauvet").
-- ==========================================

INSERT INTO loyalty_customers (name, phone, points, total_orders, total_spent)
VALUES 
  ('Chauvet Camille', '0600000000', 10, 1, 10.00)
ON CONFLICT (phone) DO NOTHING;

-- NOTE: Since I don't know her real phone number or balance:
-- 1. Run this script.
-- 2. Go to Admin > Fidélité.
-- 3. Use the new EDIT (Pencil) button to set her correct Phone and Points.
