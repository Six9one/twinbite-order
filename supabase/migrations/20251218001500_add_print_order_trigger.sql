-- Create a table to log print jobs for tracking and debugging
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);

-- Enable RLS on print_jobs table
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admins can view print jobs"
  ON public.print_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage print jobs"
  ON public.print_jobs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow the service role to insert print jobs (for the Edge Function)
CREATE POLICY "Service role can insert print jobs"
  ON public.print_jobs
  FOR INSERT
  WITH CHECK (true);

-- Add a printer_settings record to admin_settings if it doesn't exist
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('printer_settings', '{"enabled": true, "auto_print": true, "printer_ip": "", "printer_port": 9100}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Add ticket_settings if it doesn't exist
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('ticket_settings', '{"header": "TWIN PIZZA", "subheader": "Grand-Couronne", "phone": "02 32 11 26 13", "footer": "Merci de votre visite!"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a function to call the print-order edge function
-- This will be triggered when a new order is inserted
CREATE OR REPLACE FUNCTION public.trigger_print_order()
RETURNS TRIGGER AS $$
DECLARE
  print_settings jsonb;
  auto_print_enabled boolean;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get printer settings to check if auto-print is enabled
  SELECT setting_value INTO print_settings
  FROM public.admin_settings
  WHERE setting_key = 'printer_settings';
  
  -- Check if auto-print is enabled (default to true if not set)
  auto_print_enabled := COALESCE((print_settings->>'auto_print')::boolean, true);
  
  -- Only trigger print if auto-print is enabled
  IF auto_print_enabled THEN
    -- Log a pending print job
    INSERT INTO public.print_jobs (order_id, status, attempts)
    VALUES (NEW.id, 'pending', 0);
    
    -- Note: The actual HTTP call to the Edge Function must be done via pg_net extension
    -- or handled by Supabase's built-in webhook functionality
    -- For now, we just log the job and the TVDashboard's existing realtime
    -- subscription + auto-print feature will handle the actual printing
    
    RAISE NOTICE 'Print job queued for order: %', NEW.order_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS on_order_created_print ON public.orders;

CREATE TRIGGER on_order_created_print
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_print_order();

-- Grant necessary permissions
GRANT SELECT ON public.print_jobs TO authenticated;
GRANT INSERT ON public.print_jobs TO authenticated;
GRANT INSERT ON public.print_jobs TO anon;
