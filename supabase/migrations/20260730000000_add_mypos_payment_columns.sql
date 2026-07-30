-- Add myPOS payment tracking columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'EUR';

-- Add index on payment_status and transaction_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON public.orders(transaction_id);

COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: Pending, Paid, Failed, Refunded';
COMMENT ON COLUMN public.orders.payment_provider IS 'Payment provider: myPOS, cash, cb, stripe';
COMMENT ON COLUMN public.orders.transaction_id IS 'Transaction ID from payment gateway';
COMMENT ON COLUMN public.orders.payment_reference IS 'Payment reference / auth code from gateway';
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was successfully processed';
COMMENT ON COLUMN public.orders.payment_amount IS 'Amount paid via payment gateway';
COMMENT ON COLUMN public.orders.payment_currency IS 'Currency of the payment (ISO code, e.g. EUR)';
