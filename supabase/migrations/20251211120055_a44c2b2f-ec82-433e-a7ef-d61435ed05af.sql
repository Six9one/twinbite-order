-- Add 'en_ligne' to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'en_ligne';