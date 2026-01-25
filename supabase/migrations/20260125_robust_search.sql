-- Function to search orders and loyalty data by normalized phone number
-- usage: SELECT * FROM get_client_data_normalized('0612345678');

CREATE OR REPLACE FUNCTION public.get_client_data_normalized(phone_input text)
RETURNS TABLE (
    result_type text, -- 'order' or 'loyalty'
    data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    normalized_input text;
    search_pattern text;
BEGIN
    -- 1. Normalize input: remove all non-digits
    normalized_input := regexp_replace(phone_input, '\D', '', 'g');
    
    -- 2. Create search pattern: match last 9 digits to handle 06 vs 336 vs 6...
    -- If input is short (e.g. 0612), use it as is, otherwise take last 9
    IF length(normalized_input) >= 9 THEN
        search_pattern := right(normalized_input, 9);
    ELSE
        search_pattern := normalized_input;
    END IF;

    -- 3. Return Matching Orders
    RETURN QUERY
    SELECT 
        'order'::text,
        to_jsonb(o)
    FROM public.orders o
    WHERE regexp_replace(o.customer_phone, '\D', '', 'g') LIKE '%' || search_pattern
    ORDER BY o.created_at DESC
    LIMIT 20;

    -- 4. Return Matching Loyalty Info
    RETURN QUERY
    SELECT 
        'loyalty'::text,
        to_jsonb(l)
    FROM public.loyalty_customers l
    WHERE regexp_replace(l.phone, '\D', '', 'g') LIKE '%' || search_pattern
    LIMIT 1;

END;
$$;
