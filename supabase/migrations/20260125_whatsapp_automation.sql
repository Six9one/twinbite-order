-- ==========================================================
-- AUTOMATIC WHATSAPP NOTIFICATIONS: ORDER CONFIRMATION ONLY
-- ==========================================================

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger the WhatsApp Edge Function (Confirmation Only)
CREATE OR REPLACE FUNCTION public.handle_whatsapp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload JSONB;
BEGIN
    -- We ONLY send for new orders (INSERT)
    IF (TG_OP = 'INSERT') THEN
        payload := jsonb_build_object(
            'type', 'confirmation',
            'customerPhone', NEW.customer_phone,
            'customerName', NEW.customer_name,
            'orderNumber', NEW.order_number,
            'orderType', NEW.order_type,
            'total', NEW.total
        );

        -- Call the Supabase Edge Function asynchronously
        PERFORM net.http_post(
            url := 'https://hsylnrzxeyqxczdalurj.functions.supabase.co/send-whatsapp-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_TOKEN' LIMIT 1) -- Use vault or hardcode service key
            ),
            body := payload
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger ONLY for New Orders
DROP TRIGGER IF EXISTS tr_order_created_whatsapp ON public.orders;
CREATE TRIGGER tr_order_created_whatsapp
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_whatsapp_notification();

-- CLEANUP: Remove status update trigger if it was previously created
DROP TRIGGER IF EXISTS tr_order_status_whatsapp ON public.orders;

COMMENT ON FUNCTION public.handle_whatsapp_notification() IS 'Sends WhatsApp order confirmation via Edge Function on new order creation.';
