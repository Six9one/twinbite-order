-- Create category_images table for customizable category icons
CREATE TABLE IF NOT EXISTS public.category_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  emoji_fallback TEXT DEFAULT '📦',
  display_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_images ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view category images" ON public.category_images;
DROP POLICY IF EXISTS "Admins can manage category images" ON public.category_images;
CREATE POLICY "Anyone can view category images" ON public.category_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage category images" ON public.category_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default category images with emojis
INSERT INTO public.category_images (category_slug, emoji_fallback, display_name, display_order) VALUES
('pizzas', '🍕', 'Pizzas', 1),
('soufflets', '🥙', 'Soufflet', 2),
('makloub', '🌯', 'Makloub', 3),
('mlawi', '🫓', 'Mlawi', 4),
('sandwiches', '🥖', 'Sandwich (Pain Maison)', 5),
('tacos', '🌮', 'Tacos', 6),
('panini', '🥪', 'Panini', 7),
('croques', '🧀', 'Croques', 8),
('texmex', '🌶️', 'Tex-Mex', 9),
('frites', '🍟', 'Frites', 10),
('milkshakes', '🥤', 'Milkshakes', 11),
('crepes', '🥞', 'Crêpes', 12),
('gaufres', '🧇', 'Gaufres', 13),
('boissons', '🥤', 'Boissons', 14)
ON CONFLICT (category_slug) DO NOTHING;
