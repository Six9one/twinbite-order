-- Create gallery_images table (photo gallery: pizzas, soufflés, équipe, etc.)
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gallery images" ON public.gallery_images FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage gallery images" ON public.gallery_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
