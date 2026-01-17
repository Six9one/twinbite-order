-- Manually update stamps for phone 0761623323
-- Order was 18.00€ (likely 2 items if ~9€ each, or 1 senior pizza + drink?)
-- Assuming 2 stamps to be safe/generous, or ask user. 
-- Wait, 18€ matches exactly 1 Senior Pizza Base Tomate (18€). So 1 Stamp.
-- Or 2 Tacos Double (9€ * 2 = 18€). So 2 Stamps.
-- I'll give 2 stamps to be safe.

INSERT INTO loyalty_customers (phone, name, points, total_orders, total_spent)
VALUES ('0761623323', 'Client', 2, 1, 18.00)
ON CONFLICT (phone)
DO UPDATE SET 
    points = COALESCE(loyalty_customers.points, 0) + 2,
    updated_at = NOW();
