-- Create enum types
CREATE TYPE public.order_type AS ENUM ('emporter', 'livraison', 'surplace');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cb', 'especes');
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Delivery zones table (editable by admin)
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_order DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_time TEXT NOT NULL DEFAULT '30-45 min',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products table (editable by admin)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  pizza_base TEXT, -- 'tomate' or 'creme' for pizzas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Meat options (editable by admin)
CREATE TABLE public.meat_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sauce options (editable by admin)
CREATE TABLE public.sauce_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Garniture options (editable by admin)
CREATE TABLE public.garniture_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supplement options (chèvre, raclette, etc. - 1€ each)
CREATE TABLE public.supplement_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Drinks for suggestions
CREATE TABLE public.drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Desserts for suggestions
CREATE TABLE public.desserts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  order_type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  customer_notes TEXT,
  delivery_zone_id UUID REFERENCES public.delivery_zones(id),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tva DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meat_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sauce_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garniture_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desserts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Public read policies (everyone can see menu items, zones, etc.)
CREATE POLICY "Anyone can view delivery zones" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view meat options" ON public.meat_options FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view sauce options" ON public.sauce_options FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view garniture options" ON public.garniture_options FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view supplement options" ON public.supplement_options FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view drinks" ON public.drinks FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view desserts" ON public.desserts FOR SELECT USING (is_active = true);

-- Anyone can create orders
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Admin policies for full CRUD
CREATE POLICY "Admins can manage delivery zones" ON public.delivery_zones FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage meat options" ON public.meat_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sauce options" ON public.sauce_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage garniture options" ON public.garniture_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage supplement options" ON public.supplement_options FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage drinks" ON public.drinks FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage desserts" ON public.desserts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Insert default data
INSERT INTO public.delivery_zones (name, min_order, delivery_fee, estimated_time) VALUES
('Grand-Couronne Centre', 15, 0, '20-30 min'),
('Petit-Couronne', 18, 2.50, '25-35 min'),
('Moulineaux', 20, 3.00, '30-40 min'),
('Saint-Étienne-du-Rouvray', 22, 3.50, '35-45 min'),
('Rouen Sud', 25, 4.00, '40-50 min');

INSERT INTO public.categories (slug, name, display_order) VALUES
('pizzas', 'Pizzas', 1),
('tacos', 'Tacos', 2),
('soufflets', 'Soufflets', 3),
('makloub', 'Makloub', 4),
('mlawi', 'Mlawi', 5),
('panini', 'Panini', 6),
('croques', 'Croques', 7),
('frites', 'Frites', 8),
('milkshakes', 'Milkshakes', 9),
('crepes', 'Crêpes', 10),
('gaufres', 'Gaufres', 11),
('boissons', 'Boissons', 12);

-- Insert meat options (without kebab as requested)
INSERT INTO public.meat_options (name, price, display_order) VALUES
('Poulet', 0, 1),
('Viande hachée', 0, 2),
('Escalope', 0, 3),
('Mixte', 0, 4),
('Merguez', 0, 5),
('Thon', 0, 6),
('Cordon bleu', 0, 7);

-- Insert sauce options
INSERT INTO public.sauce_options (name, price, display_order) VALUES
('Ketchup', 0, 1),
('Mayonnaise', 0, 2),
('Algérienne', 0, 3),
('Samouraï', 0, 4),
('Biggy', 0, 5),
('Barbecue', 0, 6),
('Blanche', 0, 7),
('Harissa', 0, 8);

-- Insert garniture options (basic ones - no supplement)
INSERT INTO public.garniture_options (name, price, display_order) VALUES
('Pomme de terre', 0, 1),
('Oignon', 0, 2),
('Olive', 0, 3),
('Salade', 0, 4),
('Tomate', 0, 5);

-- Insert supplement options (1€ each as requested)
INSERT INTO public.supplement_options (name, price, display_order) VALUES
('Chèvre', 1.00, 1),
('Raclette', 1.00, 2),
('Reblochon', 1.00, 3),
('Mozzarella', 1.00, 4);

-- Insert drinks
INSERT INTO public.drinks (name, price, display_order) VALUES
('Coca-Cola', 0.00, 1),
('Coca-Cola Zero', 2.00, 2),
('Fanta Orange', 2.00, 3),
('Sprite', 2.00, 4),
('Ice Tea', 2.00, 5),
('Oasis', 2.00, 6),
('Eau', 1.50, 7);

-- Insert desserts
INSERT INTO public.desserts (name, price, display_order) VALUES
('Tiramisu', 4.00, 1),
('Fondant chocolat', 4.50, 2),
('Crème brûlée', 4.00, 3),
('Glace 2 boules', 3.50, 4);