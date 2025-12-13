-- Add scheduled_for column to orders table for preorder/scheduled orders
ALTER TABLE public.orders 
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add is_scheduled column to easily identify scheduled orders
ALTER TABLE public.orders 
ADD COLUMN is_scheduled BOOLEAN NOT NULL DEFAULT false;

-- Create an index for better query performance on scheduled orders
CREATE INDEX idx_orders_scheduled ON public.orders(is_scheduled, scheduled_for) WHERE is_scheduled = true;