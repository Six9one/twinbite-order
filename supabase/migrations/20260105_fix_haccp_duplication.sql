-- ============================================
-- Fix HACCP Products Duplication
-- ============================================

-- Delete duplicate haccp_products (keep only the first one for each name per category)
DELETE FROM public.haccp_products a
USING public.haccp_products b
WHERE a.id > b.id
  AND a.name = b.name
  AND a.category_id = b.category_id;

-- Add unique constraint to prevent future duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'haccp_products_name_category_unique'
    ) THEN
        ALTER TABLE public.haccp_products 
        ADD CONSTRAINT haccp_products_name_category_unique UNIQUE (name, category_id);
    END IF;
END $$;
