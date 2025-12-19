-- Add Salade category
INSERT INTO public.categories (slug, name, display_order) VALUES
('salades', 'Salades', 15)
ON CONFLICT (slug) DO NOTHING;

-- Add Salade category image/emoji
INSERT INTO public.category_images (category_slug, emoji_fallback, display_name, display_order) VALUES
('salades', '🥗', 'Salade', 15)
ON CONFLICT (category_slug) DO NOTHING;

-- Add some default salads to the products table
-- First get the category id
DO $$
DECLARE
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM public.categories WHERE slug = 'salades';
    
    IF cat_id IS NOT NULL THEN
        INSERT INTO public.products (category_id, name, description, base_price, display_order) VALUES
        (cat_id, 'Salade César', 'Salade, poulet grillé, croûtons, parmesan, sauce césar', 8.5, 1),
        (cat_id, 'Salade Niçoise', 'Salade, thon, œuf dur, tomates, olives, haricots verts', 8.0, 2),
        (cat_id, 'Salade Chèvre Chaud', 'Salade, toasts de chèvre chaud, miel, noix, tomates', 9.0, 3)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
