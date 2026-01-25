-- ==========================================================
-- AUTOMATIC WHATSAPP NOTIFICATIONS VIA SUPABASE TRIGGERS
-- ==========================================================

-- Enable pg_net if not already enabled (required for outgoing HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger the WhatsApp Edge Function
CREATE OR REPLACE FUNCTION public.handle_whatsapp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_type TEXT;
    payload JSONB;
BEGIN
    -- Determine the type of notification
    IF (TG_OP = 'INSERT') THEN
        notification_type := 'confirmation';
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'ready' AND OLD.status != 'ready') THEN
            notification_type := 'ready';
        ELSIF (NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
            notification_type := 'cancelled';
        ELSE
            -- No notification needed for this update
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    -- Build the JSON payload
    payload := jsonb_build_object(
        'type', notification_type,
        'customerPhone', NEW.customer_phone,
        'customerName', NEW.customer_name,
        'orderNumber', NEW.order_number,
        'orderType', NEW.order_type,
        'total', NEW.total
    );

    -- Call the Supabase Edge Function asynchronously
    -- IMPORTANT: Replace THE_URL with your actual project URL if needed, 
    -- but usually we can use the project-specific URL.
    PERFORM net.http_post(
        url := 'https://hsylnrzxeyqxczdalurj.functions.supabase.co/send-whatsapp-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_TOKEN' LIMIT 1) -- Use vault if available or hardcode anon/service key
        ),
        body := payload
    );

    RETURN NEW;
END;
$$;

-- Trigger for New Orders
DROP TRIGGER IF EXISTS tr_order_created_whatsapp ON public.orders;
CREATE TRIGGER tr_order_created_whatsapp
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_whatsapp_notification();

-- Trigger for Status Updates (Ready/Cancelled)
DROP TRIGGER IF EXISTS tr_order_status_whatsapp ON public.orders;
CREATE TRIGGER tr_order_status_whatsapp
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_whatsapp_notification();

COMMENT ON FUNCTION public.handle_whatsapp_notification() IS 'Automatically sends WhatsApp notifications via Edge Function on order changes.';
