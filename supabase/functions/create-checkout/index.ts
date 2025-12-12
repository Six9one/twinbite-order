import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      amount, 
      customerName, 
      customerPhone, 
      customerEmail, 
      orderNumber, 
      items, 
      orderType, 
      customerAddress, 
      customerNotes,
      subtotal,
      tva 
    } = await req.json();
    
    console.log("[CREATE-CHECKOUT] Starting checkout session creation", { 
      amount, 
      orderNumber, 
      customerName,
      itemsCount: items?.length 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Stringify items for metadata (Stripe has 500 char limit per value)
    let itemsJson = "[]";
    try {
      itemsJson = JSON.stringify(items);
      // If too long, truncate but keep valid JSON
      if (itemsJson.length > 450) {
        itemsJson = JSON.stringify(items.slice(0, 10)); // Keep first 10 items
      }
    } catch (e) {
      console.error("[CREATE-CHECKOUT] Error stringifying items:", e);
    }

    // Get origin for logo URL
    const origin = req.headers.get("origin") || 'https://twin-pizza.lovable.app';
    
    // Create checkout session with all order data in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Commande Twin Pizza #${orderNumber}`,
              description: `${items?.length || 0} article(s) - ${orderType === 'livraison' ? 'Livraison' : orderType === 'emporter' ? 'À emporter' : 'Sur place'}`,
              images: [`${origin}/favicon.png`],
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&order=${orderNumber}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancel?order=${orderNumber}`,
      customer_email: customerEmail || undefined,
      metadata: {
        orderNumber,
        customerName,
        customerPhone,
        customerAddress: customerAddress || '',
        customerNotes: customerNotes || '',
        orderType,
        subtotal: String(subtotal || 0),
        tva: String(tva || 0),
        items: itemsJson,
      },
    });

    console.log("[CREATE-CHECKOUT] Checkout session created", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
