-- Create site_settings table for easy content editing
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.site_settings (key, value, category) VALUES
('restaurant_name', 'Twin Pizza', 'contact'),
('phone_number', '02 35 67 89 00', 'contact'),
('whatsapp_number', '33612345678', 'contact'),
('address', '60 Rue Georges Clemenceau, 76530 Grand-Couronne', 'contact'),
('email', 'contact@twinpizza.fr', 'contact'),
('facebook_url', '', 'social'),
('instagram_url', '', 'social'),
('google_maps_url', '', 'social'),
('hero_title', 'Les Meilleures Pizzas de Grand-Couronne', 'hero'),
('hero_subtitle', 'Pizzas artisanales, tacos, soufflés et bien plus encore. Livraison rapide et gratuite!', 'hero'),
('min_order_delivery', '12', 'delivery'),
('delivery_time', '20-35 min', 'delivery'),
('free_delivery_min', '15', 'delivery'),
('closed_message', 'Nous sommes actuellement fermés. Revenez pendant nos heures d''ouverture!', 'messages'),
('order_success_message', 'Merci pour votre commande! Nous vous contacterons bientôt.', 'messages'),
-- Store status settings
('store_is_open', 'true', 'store'),
('store_is_pause', 'false', 'store'),
('store_pause_message', 'Nous sommes en pause. Retour dans quelques minutes!', 'store'),
('store_is_temp_closed', 'false', 'store'),
('store_temp_closed_until', '', 'store'),
('store_temp_closed_message', 'Fermé exceptionnellement. Réouverture bientôt!', 'store'),
('store_show_banner', 'false', 'store'),
('store_banner_message', '', 'store'),
('store_banner_type', 'info', 'store')
ON CONFLICT (key) DO NOTHING;
