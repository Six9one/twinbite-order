import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    // SECURITY: Always require webhook signature verification
    if (!webhookSecret || !signature) {
      console.error("[STRIPE-WEBHOOK] Missing webhook secret or signature");
      return new Response(JSON.stringify({ error: "Webhook signature verification required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[STRIPE-WEBHOOK] Signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("[STRIPE-WEBHOOK] Event received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("[STRIPE-WEBHOOK] Payment completed!", {
        orderNumber: session.metadata?.orderNumber,
        amount: session.amount_total,
        customerName: session.metadata?.customerName,
      });

      // Create order in database only after successful payment
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Generate order number server-side to prevent duplicates
      // The client's order number is just for display during checkout
      let orderNumber = session.metadata?.orderNumber || "";

      // Get a fresh server-side order number to avoid duplicates
      try {
        const { data: newOrderNum, error: numError } = await supabase.rpc('get_next_order_number');
        if (!numError && newOrderNum) {
          orderNumber = newOrderNum;
          console.log("[STRIPE-WEBHOOK] Generated server-side order number:", orderNumber);
        } else {
          // Fallback: generate unique order number with timestamp
          orderNumber = `${Date.now().toString().slice(-6)}`;
          console.log("[STRIPE-WEBHOOK] Fallback order number:", orderNumber);
        }
      } catch (e) {
        // Fallback: generate unique order number with timestamp
        orderNumber = `${Date.now().toString().slice(-6)}`;
        console.log("[STRIPE-WEBHOOK] Fallback order number (error):", orderNumber);
      }

      const customerName = session.metadata?.customerName || "";
      const customerPhone = session.metadata?.customerPhone || "";
      const customerAddress = session.metadata?.customerAddress || null;
      const customerNotes = session.metadata?.customerNotes || null;
      const orderType = session.metadata?.orderType || "emporter";
      const subtotal = parseFloat(session.metadata?.subtotal || "0");
      const tva = parseFloat(session.metadata?.tva || "0");
      const total = (session.amount_total || 0) / 100; // Convert from cents

      // Parse items from metadata
      let items = [];
      try {
        items = JSON.parse(session.metadata?.items || "[]");
      } catch (e) {
        console.error("[STRIPE-WEBHOOK] Error parsing items:", e);
        items = [];
      }

      console.log("[STRIPE-WEBHOOK] Creating order in database:", {
        orderNumber,
        customerName,
        orderType,
        total,
        itemsCount: items.length,
      });

      // Insert the order into database
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          order_type: orderType,
          items: items,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_notes: customerNotes,
          payment_method: 'en_ligne',
          subtotal: subtotal,
          tva: tva,
          total: total,
          delivery_fee: 0,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error("[STRIPE-WEBHOOK] Error creating order:", error);
      } else {
        console.log("[STRIPE-WEBHOOK] Order created successfully!", {
          orderId: data.id,
          orderNumber: data.order_number,
        });

        // Send Telegram notification to admin
        try {
          const telegramResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-telegram-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                orderNumber: data.order_number,
                customerName: data.customer_name,
                customerPhone: data.customer_phone,
                orderType: data.order_type,
                total: data.total,
                paymentMethod: data.payment_method,
                items: data.items,
                customerAddress: data.customer_address,
                customerNotes: data.customer_notes,
              }),
            }
          );

          if (telegramResponse.ok) {
            console.log("[STRIPE-WEBHOOK] Telegram notification sent successfully");
          } else {
            console.error("[STRIPE-WEBHOOK] Telegram notification failed:", await telegramResponse.text());
          }
        } catch (telegramError) {
          console.error("[STRIPE-WEBHOOK] Error sending Telegram notification:", telegramError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-WEBHOOK] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});