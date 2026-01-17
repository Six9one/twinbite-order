
SELECT 
  o.order_number, 
  o.customer_phone, 
  o.items, 
  o.created_at,
  lc.points as loyalty_points
FROM orders o
LEFT JOIN loyalty_customers lc ON o.customer_phone = lc.phone
WHERE o.order_number = '214510-311';
