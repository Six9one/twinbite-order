-- Create crudites_options table for sandwich crudités
CREATE TABLE public.crudites_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crudites_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage crudites options" ON public.crudites_options
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view crudites options" ON public.crudites_options
FOR SELECT USING (is_active = true);

-- Insert default crudités
INSERT INTO public.crudites_options (name, display_order) VALUES
('Salade', 1),
('Tomate', 2),
('Oignon', 3);

-- Create sandwich_types table for admin-editable sandwich types
CREATE TABLE public.sandwich_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC NOT NULL DEFAULT 6.50,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sandwich_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage sandwich types" ON public.sandwich_types
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view sandwich types" ON public.sandwich_types
FOR SELECT USING (is_active = true);

-- Insert default sandwiches
INSERT INTO public.sandwich_types (name, description, base_price, display_order) VALUES
('Merguez', 'Pain maison, merguez grillée', 6.50, 1),
('Escalope', 'Pain maison, escalope de poulet', 7.00, 2),
('Viande Hachée', 'Pain maison, viande hachée', 6.50, 3),
('Poulet', 'Pain maison, poulet grillé', 7.00, 4),
('Mixte', 'Pain maison, merguez + escalope', 8.00, 5);

-- Create admin_settings table for global settings
CREATE TABLE public.admin_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage settings" ON public.admin_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings" ON public.admin_settings
FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value) VALUES
('tv_show_prices', '{"enabled": true}'::jsonb),
('pizza_layout', '{"mode": "grid", "size": "medium"}'::jsonb),
('category_order', '[]'::jsonb);

-- Add display_order to categories if not exists (for drag & drop ordering)
ALTER TABLE public.categories ALTER COLUMN display_order SET DEFAULT 0;