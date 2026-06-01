-- Rename "Ouef" or "ouef" to "Oeuf" in options tables to fix spelling
UPDATE public.supplement_options SET name = 'Oeuf' WHERE LOWER(name) = 'ouef';
UPDATE public.garniture_options SET name = 'Oeuf' WHERE LOWER(name) = 'ouef';
UPDATE public.crudites_options SET name = 'Oeuf' WHERE LOWER(name) = 'ouef';
UPDATE public.sauce_options SET name = 'Oeuf' WHERE LOWER(name) = 'ouef';
UPDATE public.meat_options SET name = 'Oeuf' WHERE LOWER(name) = 'ouef';
