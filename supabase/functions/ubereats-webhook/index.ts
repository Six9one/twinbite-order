import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    // Simple query token verification for security
    if (token !== 'twinpizza-uber-secret') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('Incoming Parseur/Parsio webhook payload:', JSON.stringify(body, null, 2));

    // Extract basic fields with fallbacks for Parseur/Parsio formats
    const orderId = body.order_id || body.order_number || body.id || Math.floor(Math.random() * 100000).toString();
    const customerName = body.customer_name || body.client_name || "Client Uber Eats";
    const customerPhone = body.customer_phone || body.client_phone || "0000000000";
    const customerAddress = body.customer_address || body.client_address || null;
    const customerNotes = body.customer_notes || body.notes || body.comment || "";
    
    const total = Number(body.total || body.total_price || body.amount || 0);
    const deliveryFee = Number(body.delivery_fee || body.shipping || 0);
    const subtotal = Number(body.subtotal || (total - deliveryFee));

    // TVA calculations (10% standard catering/takeaway TVA in France)
    const tvaRate = 10;
    const subtotalHT = subtotal / (1 + tvaRate / 100);
    const tvaAmount = subtotal - subtotalHT;

    // Normalize items to fit CartItem structure (specifically for print formatting and kitchen tv display)
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.map((it: any, index: number) => {
      // Parse quantity and price
      const qty = Number(it.quantity || 1);
      const itemPrice = Number(it.price || it.unit_price || 0);
      const calculatedPrice = itemPrice * qty;

      return {
        id: `uber-item-${index}-${Date.now()}`,
        quantity: qty,
        calculatedPrice: calculatedPrice,
        item: {
          id: `uber-${index}`,
          name: it.name || "Article Uber Eats",
          description: it.description || it.options || "",
          price: itemPrice,
          category: "pizzas" // fallback to "pizzas" category to ensure it passes layout grouping in the print-server
        },
        customization: (it.description || it.options) ? {
          note: it.description || it.options
        } : undefined
      };
    });

    // Create Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing database credentials in environment");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Build the final order payload
    const payload = {
      order_number: `UBER-${orderId}`,
      order_type: (body.delivery_type === 'delivery' || body.order_type === 'delivery') ? 'livraison' : 'emporter',
      items,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_notes: `[UBER EATS] ${customerNotes}`.trim(),
      payment_method: 'en_ligne',
      subtotal: Number(subtotalHT.toFixed(2)),
      tva: Number(tvaAmount.toFixed(2)),
      total: total,
      delivery_fee: deliveryFee,
      status: 'pending',
      is_scheduled: false,
      scheduled_for: null
    };

    // Insert order in Supabase table
    const { data, error } = await supabaseClient
      .from('orders')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting order in DB:', error);
      throw error;
    }

    console.log('Order successfully created in Supabase:', data.id);

    return new Response(JSON.stringify({ success: true, order_id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
