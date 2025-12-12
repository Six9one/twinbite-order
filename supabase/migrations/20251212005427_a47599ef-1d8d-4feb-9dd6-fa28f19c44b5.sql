-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Allow anyone to view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow admins to upload product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- Allow admins to update product images
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- Allow admins to delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- Add image_url column to meat_options if not exists
ALTER TABLE meat_options ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to sauce_options if not exists  
ALTER TABLE sauce_options ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to garniture_options if not exists
ALTER TABLE garniture_options ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to supplement_options if not exists
ALTER TABLE supplement_options ADD COLUMN IF NOT EXISTS image_url TEXT;