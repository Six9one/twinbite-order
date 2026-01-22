-- ============================================
-- Kitchen SCP (Sanitary Control Plan) Module
-- Digital traceability for twinpizza.fr/kitchen
-- ============================================

-- 1. Create shifts table (Morning/Night tracking)
CREATE TABLE IF NOT EXISTS public.kitchen_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type TEXT NOT NULL CHECK (shift_type IN ('Morning', 'Night')),
  staff_id UUID REFERENCES auth.users(id),
  staff_name TEXT NOT NULL DEFAULT 'Staff',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  shift_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure only one shift type per day
  UNIQUE(shift_type, shift_date)
);

-- 2. Create equipment table for temperature monitoring
CREATE TABLE IF NOT EXISTS public.kitchen_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fridge', 'freezer')),
  location TEXT,
  min_temp DECIMAL(4,1) NOT NULL,
  max_temp DECIMAL(4,1) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create temperature logs table with corrective actions
CREATE TABLE IF NOT EXISTS public.kitchen_temp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.kitchen_equipment(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  value DECIMAL(4,1) NOT NULL,
  is_compliant BOOLEAN NOT NULL,
  corrective_action TEXT,  -- Required if not compliant: "Adjusted thermostat", "Called technician", "Moved products"
  corrective_reason TEXT,  -- "Door left open", "Technical issue", "Power outage", "Other"
  shift_id UUID REFERENCES public.kitchen_shifts(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  logged_by TEXT,
  
  -- Ensure corrective action is required when not compliant
  CONSTRAINT require_corrective_action CHECK (
    is_compliant = true OR (corrective_action IS NOT NULL AND corrective_reason IS NOT NULL)
  )
);

-- 4. Create reception logs table (goods arrival)
CREATE TABLE IF NOT EXISTS public.kitchen_reception_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  invoice_photo_url TEXT,
  delivery_photo_url TEXT,
  temp_on_receipt DECIMAL(4,1),
  status TEXT DEFAULT 'received' CHECK (status IN ('pending', 'received', 'rejected', 'partial')),
  notes TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  received_by TEXT
);

-- 5. Create traceability table (product labels with secondary DLC)
CREATE TABLE IF NOT EXISTS public.kitchen_traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  batch_number TEXT,
  original_dlc DATE,
  label_photo_url TEXT,
  secondary_dlc TIMESTAMPTZ NOT NULL,  -- Calculated use-by date after opening
  dlc_hours INTEGER NOT NULL DEFAULT 72,  -- Hours until secondary DLC (default 3 days)
  opened_at TIMESTAMPTZ DEFAULT now(),
  opened_by TEXT,
  is_disposed BOOLEAN DEFAULT false,
  disposed_at TIMESTAMPTZ,
  disposed_reason TEXT
);

-- 6. Create cleaning zones table
CREATE TABLE IF NOT EXISTS public.kitchen_cleaning_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_high_risk BOOLEAN DEFAULT false,  -- Requires photo proof
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create cleaning tasks table (digital PND)
CREATE TABLE IF NOT EXISTS public.kitchen_cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.kitchen_cleaning_zones(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  scheduled_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  proof_photo_url TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  
  -- High-risk zones require photo proof
  UNIQUE(zone_id, scheduled_date)
);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.kitchen_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_temp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_reception_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_traceability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_cleaning_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_cleaning_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Allow authenticated users
-- ============================================

-- Shifts
DROP POLICY IF EXISTS "Allow all shifts operations" ON public.kitchen_shifts;
CREATE POLICY "Allow all shifts operations" ON public.kitchen_shifts FOR ALL USING (true) WITH CHECK (true);

-- Equipment
DROP POLICY IF EXISTS "Allow view equipment" ON public.kitchen_equipment;
DROP POLICY IF EXISTS "Allow manage equipment" ON public.kitchen_equipment;
CREATE POLICY "Allow view equipment" ON public.kitchen_equipment FOR SELECT USING (true);
CREATE POLICY "Allow manage equipment" ON public.kitchen_equipment FOR ALL USING (true) WITH CHECK (true);

-- Temperature logs
DROP POLICY IF EXISTS "Allow all temp_logs operations" ON public.kitchen_temp_logs;
CREATE POLICY "Allow all temp_logs operations" ON public.kitchen_temp_logs FOR ALL USING (true) WITH CHECK (true);

-- Reception logs
DROP POLICY IF EXISTS "Allow all reception_logs operations" ON public.kitchen_reception_logs;
CREATE POLICY "Allow all reception_logs operations" ON public.kitchen_reception_logs FOR ALL USING (true) WITH CHECK (true);

-- Traceability
DROP POLICY IF EXISTS "Allow all traceability operations" ON public.kitchen_traceability;
CREATE POLICY "Allow all traceability operations" ON public.kitchen_traceability FOR ALL USING (true) WITH CHECK (true);

-- Cleaning zones
DROP POLICY IF EXISTS "Allow view cleaning_zones" ON public.kitchen_cleaning_zones;
DROP POLICY IF EXISTS "Allow manage cleaning_zones" ON public.kitchen_cleaning_zones;
CREATE POLICY "Allow view cleaning_zones" ON public.kitchen_cleaning_zones FOR SELECT USING (true);
CREATE POLICY "Allow manage cleaning_zones" ON public.kitchen_cleaning_zones FOR ALL USING (true) WITH CHECK (true);

-- Cleaning tasks
DROP POLICY IF EXISTS "Allow all cleaning_tasks operations" ON public.kitchen_cleaning_tasks;
CREATE POLICY "Allow all cleaning_tasks operations" ON public.kitchen_cleaning_tasks FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_kitchen_shifts_date ON public.kitchen_shifts(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_temp_logs_date ON public.kitchen_temp_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_temp_logs_equipment ON public.kitchen_temp_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_reception_logs_date ON public.kitchen_reception_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_traceability_dlc ON public.kitchen_traceability(secondary_dlc);
CREATE INDEX IF NOT EXISTS idx_kitchen_cleaning_tasks_date ON public.kitchen_cleaning_tasks(scheduled_date DESC);

-- ============================================
-- Insert default equipment
-- ============================================

INSERT INTO public.kitchen_equipment (name, type, location, min_temp, max_temp, display_order) VALUES
  ('Frigo 1 - Légumes', 'fridge', 'Cuisine', 0, 4, 1),
  ('Frigo 2 - Viandes', 'fridge', 'Cuisine', 0, 4, 2),
  ('Frigo 3 - Boissons', 'fridge', 'Réserve', 0, 7, 3),
  ('Congélateur 1', 'freezer', 'Cuisine', -25, -18, 4),
  ('Congélateur 2', 'freezer', 'Réserve', -25, -18, 5)
ON CONFLICT DO NOTHING;

-- ============================================
-- Insert default cleaning zones
-- ============================================

INSERT INTO public.kitchen_cleaning_zones (name, description, is_high_risk, frequency, display_order) VALUES
  ('Plan de travail', 'Surfaces de préparation des aliments', true, 'daily', 1),
  ('Four', 'Nettoyage du four à pizza', true, 'daily', 2),
  ('Friteuse', 'Nettoyage et changement d''huile', true, 'daily', 3),
  ('Zone préparation', 'Postes de préparation', true, 'daily', 4),
  ('Sol cuisine', 'Sol de la cuisine', false, 'daily', 5),
  ('Bacs réfrigérés', 'Bacs de conservation au froid', true, 'daily', 6),
  ('Éviers', 'Lavabos et plonge', false, 'daily', 7),
  ('Poubelles', 'Vidage et désinfection', false, 'daily', 8),
  ('Hottes', 'Filtres et hottes aspirantes', false, 'weekly', 9),
  ('Murs et plafond', 'Nettoyage en profondeur', false, 'monthly', 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- Enable realtime for live updates
-- ============================================

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_shifts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_temp_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_cleaning_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
