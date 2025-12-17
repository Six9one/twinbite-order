-- Clean up duplicate texmex_offers
DELETE FROM public.texmex_offers
WHERE id NOT IN (
  SELECT MIN(id) FROM public.texmex_offers GROUP BY quantity, price
);

-- Clean up duplicate texmex_products
DELETE FROM public.texmex_products
WHERE id NOT IN (
  SELECT MIN(id) FROM public.texmex_products GROUP BY name
);

-- Clean up duplicate category_images
DELETE FROM public.category_images
WHERE id NOT IN (
  SELECT MIN(id) FROM public.category_images GROUP BY category_slug
);

-- Clean up duplicate site_settings
DELETE FROM public.site_settings
WHERE id NOT IN (
  SELECT MIN(id) FROM public.site_settings GROUP BY key
);
