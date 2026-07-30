import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * Verify myPOS IPC Webhook Signature (RSA-SHA256)
 * Protocol:
 * 1. Collect all POST parameters excluding 'Signature'
 * 2. Join values in order with '-'
 * 3. Base64 encode concatenated string
 * 4. Verify signature using myPOS Public Key with RSA-SHA256
 */
function verifySignature(params: Record<string, string>, signature: string, publicKeyPem: string): boolean {
  try {
    const concatenated = Object.values(params).join("-");
    const base64Data = Buffer.from(concatenated, "utf-8").toString("base64");

    const formattedPublicKey = publicKeyPem.includes("-----BEGIN")
      ? publicKeyPem
      : `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(base64Data);

    return verifier.verify(formattedPublicKey, Buffer.from(signature, "base64"));
  } catch (err) {
    console.error("[MYPOS-WEBHOOK] Signature verification error:", err);
    return false;
  }
}

serve(async (req) => {
  console.log(`[MYPOS-WEBHOOK] Received ${req.method} request`);

  // myPOS requires exact body string "OK" with status 200
  if (req.method === "OPTIONS") {
    return new Response("OK", { status: 200 });
  }

  try {
    // 1. Parse body (myPOS sends application/x-www-form-urlencoded or multipart form)
    const contentType = req.headers.get("content-type") || "";
    const params: Record<string, string> = {};
    let rawSignature = "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === "Signature") {
          rawSignature = String(value);
        } else {
          params[key] = String(value);
        }
      }
    } else {
      // JSON or text fallback
      const bodyText = await req.text();
      const searchParams = new URLSearchParams(bodyText);
      for (const [key, value] of searchParams.entries()) {
        if (key === "Signature") {
          rawSignature = value;
        } else {
          params[key] = value;
        }
      }
    }

    console.log("[MYPOS-WEBHOOK] Parameters received:", {
      method: params.IPCmethod,
      orderId: params.OrderID,
      amount: params.Amount,
      currency: params.Currency,
      status: params.IPCStatus,
      trnId: params.IPC_Trn_ID || params.TransactionID || params.RequestID,
      hasSignature: Boolean(rawSignature)
    });

    const myposPublicKey = Deno.env.get("MYPOS_PUBLIC_KEY") || "";

    // Optional verification check: if public key is present, enforce signature check
    if (myposPublicKey && rawSignature) {
      const isValid = verifySignature(params, rawSignature, myposPublicKey);
      if (!isValid) {
        console.error("[MYPOS-WEBHOOK] Invalid signature detected for Order:", params.OrderID);
        return new Response("Invalid signature", { status: 400 });
      }
      console.log("[MYPOS-WEBHOOK] Signature verified successfully");
    } else {
      console.warn("[MYPOS-WEBHOOK] Signature verification skipped (MYPOS_PUBLIC_KEY not set)");
    }

    const orderNumber = params.OrderID;
    const ipcStatus = String(params.IPCStatus ?? "");
    const transactionId = params.IPC_Trn_ID || params.TransactionID || params.RequestID || `MYPOS-${Date.now()}`;
    const paymentAmount = params.Amount ? parseFloat(params.Amount) : null;
    const paymentCurrency = params.Currency || "EUR";
    const paymentMethodName = params.CardType ? `myPOS (${params.CardType})` : "myPOS";

    // 0 = Success in myPOS IPC protocol
    const isSuccess = ipcStatus === "0";

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (orderNumber) {
      if (isSuccess) {
        console.log(`[MYPOS-WEBHOOK] Payment SUCCESS for order #${orderNumber}`);

        // Update existing order status to Paid
        const { data: updatedOrder, error: updateErr } = await supabase
          .from("orders")
          .update({
            payment_status: "Paid",
            payment_provider: "myPOS",
            transaction_id: transactionId,
            payment_reference: params.AuthCode || transactionId,
            paid_at: new Date().toISOString(),
            payment_amount: paymentAmount,
            payment_currency: paymentCurrency,
            payment_method: "en_ligne",
            status: "pending", // Pending kitchen status
            updated_at: new Date().toISOString()
          })
          .eq("order_number", orderNumber)
          .select()
          .single();

        if (updateErr) {
          console.error("[MYPOS-WEBHOOK] Error updating order in database:", updateErr);
        } else {
          console.log("[MYPOS-WEBHOOK] Order updated successfully:", updatedOrder?.id);

          // Send Telegram Notification
          try {
            await supabase.functions.invoke("send-telegram-notification", {
              body: {
                orderNumber,
                customerName: updatedOrder.customer_name,
                customerPhone: updatedOrder.customer_phone,
                customerAddress: updatedOrder.customer_address,
                customerNotes: updatedOrder.customer_notes,
                orderType: updatedOrder.order_type,
                paymentMethod: "en_ligne (myPOS)",
                paymentStatus: "Paid",
                total: updatedOrder.total,
                subtotal: updatedOrder.subtotal,
                tva: updatedOrder.tva,
                items: updatedOrder.items,
              },
            });
          } catch (tErr) {
            console.error("[MYPOS-WEBHOOK] Telegram notification error:", tErr);
          }
        }
      } else {
        console.warn(`[MYPOS-WEBHOOK] Payment FAILED/CANCELLED for order #${orderNumber}, status: ${ipcStatus}`);

        await supabase
          .from("orders")
          .update({
            payment_status: "Failed",
            payment_provider: "myPOS",
            transaction_id: transactionId,
            updated_at: new Date().toISOString()
          })
          .eq("order_number", orderNumber);
      }
    }

    // Always respond with body "OK" and HTTP 200 as required by myPOS protocol
    return new Response("OK", {
      headers: { "Content-Type": "text/plain" },
      status: 200
    });
  } catch (error) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.error("[MYPOS-WEBHOOK] Error handling webhook:", errStr);
    // Still return OK 200 so myPOS doesn't retry endlessly if internal non-retryable error occurs
    return new Response("OK", { headers: { "Content-Type": "text/plain" }, status: 200 });
  }
});
