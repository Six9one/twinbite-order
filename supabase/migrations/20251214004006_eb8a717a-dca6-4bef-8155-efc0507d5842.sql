-- Create promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  promo_type TEXT NOT NULL DEFAULT 'discount',
  discount_percent INTEGER,
  buy_quantity INTEGER,
  get_quantity INTEGER,
  cart_min_amount NUMERIC,
  free_item_name TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create carousel_images table
CREATE TABLE public.carousel_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create opening_hours table with default values
CREATE TABLE public.opening_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL UNIQUE,
  day_name TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  morning_open TIME,
  morning_close TIME,
  evening_open TIME,
  evening_close TIME
);

-- Enable RLS on all tables
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotions
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage promotions" ON public.promotions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for carousel_images
CREATE POLICY "Anyone can view active carousel images" ON public.carousel_images FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage carousel images" ON public.carousel_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for opening_hours
CREATE POLICY "Anyone can view opening hours" ON public.opening_hours FOR SELECT USING (true);
CREATE POLICY "Admins can manage opening hours" ON public.opening_hours FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default opening hours (Lundi to Dimanche)
INSERT INTO public.opening_hours (day_of_week, day_name, is_open, morning_open, morning_close, evening_open, evening_close) VALUES
(1, 'Lundi', true, '11:00', '15:00', '17:30', '00:00'),
(2, 'Mardi', true, '11:00', '15:00', '17:30', '00:00'),
(3, 'Mercredi', true, '11:00', '15:00', '17:30', '00:00'),
(4, 'Jeudi', true, '11:00', '15:00', '17:30', '00:00'),
(5, 'Vendredi', true, '11:00', '15:00', '17:30', '00:00'),
(6, 'Samedi', true, '11:00', '15:00', '17:30', '00:00'),
(0, 'Dimanche', false, NULL, NULL, NULL, NULL);