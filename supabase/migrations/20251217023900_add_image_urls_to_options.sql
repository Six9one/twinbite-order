-- Add image_url column to all option tables if not exists

-- Meat options
DO $$ BEGIN
  ALTER TABLE public.meat_options ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Sauce options
DO $$ BEGIN
  ALTER TABLE public.sauce_options ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Garniture options
DO $$ BEGIN
  ALTER TABLE public.garniture_options ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Supplement options
DO $$ BEGIN
  ALTER TABLE public.supplement_options ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Drinks table
DO $$ BEGIN
  ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Desserts table
DO $$ BEGIN
  ALTER TABLE public.desserts ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Tex-Mex products (already has it, but ensure it exists)
DO $$ BEGIN
  ALTER TABLE public.texmex_products ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
