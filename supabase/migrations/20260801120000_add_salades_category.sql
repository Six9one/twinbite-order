-- Add Salades category so it's manageable from the admin panel (Menu Digital > Salades)
-- and appears in category_images with an emoji fallback + default salads.
-- Safe to re-run: every insert uses ON CONFLICT DO NOTHING.

-- 1. Register the category
INSERT INTO public.categories (slug, name, display_order) VALUES
('salades', 'Salades', 15)
ON CONFLICT (slug) DO NOTHING;

-- 2. Register the display image/emoji fallback for home + menu grids
INSERT INTO public.category_images (category_slug, emoji_fallback, display_name, display_order) VALUES
('salades', '🥗', 'Salade', 15)
ON CONFLICT (category_slug) DO NOTHING;

-- 3. Seed with the 3 default salads already used as the static fallback in src/data/menu.ts
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
