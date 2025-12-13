-- Create product_views table to track popularity and analytics
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_slug TEXT,
  view_count INTEGER DEFAULT 1,
  order_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_analytics for detailed tracking
CREATE TABLE IF NOT EXISTS public.product_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_slug TEXT,
  action_type TEXT NOT NULL, -- 'view', 'add_to_cart', 'order'
  session_id TEXT,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (for tracking)
CREATE POLICY "Anyone can insert product views"
ON public.product_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view product analytics"
ON public.product_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert analytics"
ON public.product_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view analytics"
ON public.product_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON public.product_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);