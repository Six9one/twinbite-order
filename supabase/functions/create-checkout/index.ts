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
    const { amount, customerName, customerPhone, customerEmail, orderNumber, items, orderType, customerAddress, customerNotes } = await req.json();
    
    console.log("[CREATE-CHECKOUT] Starting checkout session creation", { amount, orderNumber, customerName });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Commande Twin Pizza #${orderNumber}`,
              description: `${items.length} article(s) - ${orderType === 'livraison' ? 'Livraison' : orderType === 'emporter' ? 'À emporter' : 'Sur place'}`,
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
        items: JSON.stringify(items).substring(0, 500), // Stripe has metadata limits
      },
    });

    console.log("[CREATE-CHECKOUT] Checkout session created", { sessionId: session.id, url: session.url });

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
