-- ============================================
-- HACCP Module - Add Product Descriptions (Fully Corrected)
-- ============================================

-- Add description column if not exists
ALTER TABLE public.haccp_products 
ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- FROZEN PRODUCTS
-- ============================================

UPDATE public.haccp_products SET description = 
'Viande hachée. Décongélation lente au frigo (0-4°C) 12-24h selon quantité. Ne jamais recongeler. Cuire immédiatement après décongélation. Produit très sensible aux bactéries.' 
WHERE name = 'Viande hachée';

UPDATE public.haccp_products SET description = 
'Steak haché. Décongélation lente au frigo (0-4°C) 12-24h. Ne jamais recongeler. Cuire immédiatement après décongélation. Produit sensible aux bactéries.' 
WHERE name = 'Steak haché';

UPDATE public.haccp_products SET description = 
'Nuggets de poulet pané congelé. Décongélation frigo 12-24h avant cuisson. Ne jamais recongeler. Risque de salmonelles si chaîne du froid rompue.' 
WHERE name = 'Nuggets';

UPDATE public.haccp_products SET description = 
'Ailes de poulet (Wings) congelées. Décongélation au frigo 12-24h selon quantité. Ne jamais recongeler. Risque de contamination croisée si mal conservées.' 
WHERE name = 'Wings';

UPDATE public.haccp_products SET description = 
'Tenders de poulet. Décongélation lente au frigo 12-24h. Ne jamais recongeler. Cuire immédiatement après décongélation.' 
WHERE name = 'Tenders';

UPDATE public.haccp_products SET description = 
'Cordon bleu surgelé (poulet + fromage). Décongélation frigo 12-24h. Ne jamais recongeler. Cuire immédiatement après décongélation. Double risque : viande + produit laitier.' 
WHERE name = 'Cordon bleu';

UPDATE public.haccp_products SET description = 
'Kebab congelé. Décongélation frigo 12-24h selon quantité. Ne jamais recongeler. Produit très sensible, cuire immédiatement après décongélation.' 
WHERE name = 'Kebab';

UPDATE public.haccp_products SET description = 
'Lardons fumés surgelés. Décongélation frigo 12-24h. Ne jamais recongeler. À consommer dans les 1-2 jours après décongélation ou ouverture.' 
WHERE name = 'Lardons';

UPDATE public.haccp_products SET description = 
'Chorizo surgelé/charcuterie. Décongélation frigo 12-24h. Ne jamais recongeler. À consommer dans les 2-3 jours après ouverture.' 
WHERE name = 'Chorizo';

UPDATE public.haccp_products SET description = 
'Saucisses merguez surgelées. Décongélation lente au frigo 12-24h selon quantité. Ne jamais recongeler. Respecter la DLC.' 
WHERE name = 'Merguez';

-- ============================================
-- FRESH PRODUCTS
-- ============================================

UPDATE public.haccp_products SET description = 
'Escalope de volaille fraîche. Stockage ≤4°C. À consommer dans les 48h après ouverture. Risque de salmonelle élevé si mal conservé.' 
WHERE name = 'Escalope';

UPDATE public.haccp_products SET description = 
'Jambon cuit frais. Stockage ≤4°C. À consommer dans les 3-5 jours après ouverture. Conservation prolongée grâce au traitement thermique.' 
WHERE name = 'Jambon';

-- Update the original "Œuf" entry and add new specific entries
UPDATE public.haccp_products SET 
  name = 'Œuf Non cassé',
  dlc_hours_override = 672, -- 28 days = 672 hours
  description = 'Œufs frais non cassés. Stockage ≤4°C. Conservation jusqu''à 28 jours après réception. Manipuler avec hygiène pour éviter contamination. Ne jamais laisser à température ambiante >2h.' 
WHERE name = 'Œuf';

-- Insert "Œuf Cassé" as a new product
INSERT INTO public.haccp_products (category_id, name, dlc_hours_override, description, display_order)
SELECT c.id, 'Œuf Cassé', 24, 
'Œufs cassés ou préparés. Stockage ≤4°C. À utiliser dans les 24h maximum après cassage. Risque élevé de salmonelle. Pour préparations crues (mayonnaise, mousse), utiliser uniquement œufs pasteurisés.',
4
FROM public.haccp_categories c
WHERE c.slug = 'produits-frais'
ON CONFLICT DO NOTHING;

UPDATE public.haccp_products SET description = 
'Saumon frais. Stockage ≤4°C. Très périssable, consommer dans les 24h après ouverture.' 
WHERE name = 'Saumon';

UPDATE public.haccp_products SET description = 
'Poivrons frais découpés. Stockage ≤4°C. À consommer dans les 3-5 jours après découpe si bien emballés.' 
WHERE name = 'Poivrons';

UPDATE public.haccp_products SET description = 
'Pommes de terre crues : à conserver dans un endroit frais et sec, pas au frigo. Si cuites et coupées : ≤4°C, 3-4 jours maximum.' 
WHERE name = 'Pommes de terre';

UPDATE public.haccp_products SET description = 
'Champignons frais. Stockage ≤4°C. Très sensibles à l''humidité. Consommer dans les 1-2 jours après découpe.' 
WHERE name = 'Champignons';

UPDATE public.haccp_products SET description = 
'Crème fraîche. Stockage ≤4°C. Sensible aux bactéries après ouverture. Consommer dans les 3-5 jours après ouverture.' 
WHERE name = 'Crème fraîche';

UPDATE public.haccp_products SET description = 
'Sauce tomate. Stockage ≤4°C après ouverture. Acidité permet conservation prolongée. Consommer dans les 5-7 jours après ouverture.' 
WHERE name = 'Sauce tomate';

UPDATE public.haccp_products SET description = 
'Mozzarella fraîche. Stockage ≤4°C. Produit laitier sensible. Consommer dans les 5-7 jours après ouverture. Surveiller l''humidité.' 
WHERE name = 'Mozzarella';
