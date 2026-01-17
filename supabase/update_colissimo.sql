-- Manually update Colissimo's stamps
-- The order was 25.50€, assuming ~3 stamps (3 paninis/items)
-- Normalized phone: 0783307542

INSERT INTO loyalty_customers (phone, name, points, total_orders, total_spent)
VALUES ('0783307542', 'Colissimo', 3, 1, 25.50)
ON CONFLICT (phone)
DO UPDATE SET 
    points = 3,
    updated_at = NOW();
