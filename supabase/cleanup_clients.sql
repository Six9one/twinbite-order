-- ==========================================
-- CLEANUP LOYALTY CUSTOMERS
-- Deletes all clients EXCEPT specified ones
-- ==========================================

DELETE FROM loyalty_transactions;

DELETE FROM loyalty_customers
WHERE name NOT ILIKE '%18 rue j j%' 
  AND name NOT ILIKE '%Chauvet Camille%' -- Corrected spelling
  AND name NOT ILIKE '%chavet camille%'; -- Kept just in case


-- Optional: Verify what's left
-- SELECT * FROM loyalty_customers;
