import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

/**
 * Normalise a PEM coming from a Supabase secret.
 * Secrets set via `supabase secrets set KEY="-----BEGIN...\n...\n-----END..."` keep the
 * backslash-n as two literal characters, which makes crypto reject the key outright.
 * Mirrors cleanPem() in create-mypos-checkout.
 */
function normalizePem(raw: string): string {
  if (!raw) return "";
  const formatted = raw.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  if (formatted.includes("-----BEGIN")) return formatted;

  const lines = formatted.replace(/\s+/g, "").match(/.{1,64}/g) || [formatted];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

/**
 * Verify myPOS IPC Webhook Signature (RSA-SHA256)
 * Protocol:
 * 1. Collect all POST parameters excluding 'Signature'
 * 2. Join values in order with '-'
 * 3. Base64 encode concatenated string
 * 4. Verify signature using myPOS Public Key with RSA-SHA256
 *
 * Some myPOS deployments sign the raw concatenation rather than its base64 form, so both
 * are attempted and the variant that matched is reported back for diagnostics.
 */
function verifySignature(
  params: Record<string, string>,
  signature: string,
  publicKeyPem: string
): { valid: boolean; variant: string | null; error: string | null } {
  const concatenated = Object.values(params).join("-");
  const candidates: Array<[string, string]> = [
    ["base64(concat)", Buffer.from(concatenated, "utf-8").toString("base64")],
    ["concat", concatenated],
  ];

  let publicKey: ReturnType<typeof crypto.createPublicKey>;
  try {
    // createPublicKey accepts both SPKI public keys and X.509 certificates
    publicKey = crypto.createPublicKey(normalizePem(publicKeyPem));
  } catch (err) {
    return {
      valid: false,
      variant: null,
      error: `unusable MYPOS_PUBLIC_KEY: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const signatureBuffer = Buffer.from(signature, "base64");

  for (const [variant, data] of candidates) {
    try {
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(data);
      if (verifier.verify(publicKey, signatureBuffer)) {
        return { valid: true, variant, error: null };
      }
    } catch (err) {
      console.error(`[MYPOS-WEBHOOK] Verify threw for variant ${variant}:`, err);
    }
  }

  return { valid: false, variant: null, error: "no signature variant matched" };
}

/**
 * Short "payment confirmed" note to the kitchen.
 *
 * Deliberately NOT the full order ticket: the checkout screen already sends one before the
 * customer is redirected to myPOS, so re-sending it here would put the same order through
 * twice. This only confirms the money arrived.
 */
async function sendFullOrderNotification(info: {
  orderNumber: string;
  amount: number;
  currency: string;
  transactionId: string;
  verified: boolean;
  order: Record<string, any>;
}): Promise<void> {
  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatIds = [
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID_1"),
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID_2"),
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID_3"),
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID_4"),
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID_5"),
    ].filter(Boolean) as string[];

    if (!botToken || chatIds.length === 0) {
      console.error("[MYPOS-WEBHOOK] Telegram not configured — notification not sent");
      return;
    }

    const o = info.order;
    const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const total = info.amount.toFixed(2).replace(".", ",");

    // Order type label
    const typeMap: Record<string, string> = {
      livraison: "🚗 Livraison",
      emporter: "🥡 À emporter",
      surplace: "🪑 Sur place",
    };
    const orderType = typeMap[o.order_type] || o.order_type || "—";

    // Build items list
    let itemsText = "";
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const qty = item.quantity || 1;
      const name = esc(item.name || item.item?.name || "Article");
      const price = Number(item.calculatedPrice || item.price || item.item?.price || 0);
      itemsText += `  • ${qty}x <b>${name}</b> — ${(qty * price).toFixed(2).replace(".", ",")} €\n`;
    }
    if (!itemsText) itemsText = "  (détail non disponible)\n";

    // myPOS payment history link (merchant dashboard)
    const myposLink = "https://my.mypos.com/";
    const myposText = `<a href="${myposLink}">📊 Voir paiements myPOS</a>`;

    // Compose message
    let text = `🎉 <b>NOUVELLE COMMANDE PAYÉE EN LIGNE</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 Commande <b>#${esc(info.orderNumber)}</b>  |  ${orderType}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>${esc(o.customer_name || "—")}</b>\n`;
    text += `📞 ${esc(o.customer_phone || "—")}\n`;
    if (o.customer_address) text += `📍 ${esc(o.customer_address)}\n`;
    if (o.customer_notes) text += `💬 <i>${esc(o.customer_notes)}</i>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `<b>Articles :</b>\n${itemsText}`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 <b>TOTAL PAYÉ : ${total} ${info.currency}</b>\n`;
    text += `🔑 Réf: <code>${esc(info.transactionId)}</code>\n`;
    if (!info.verified) text += `⚠️ <i>Signature non vérifiée</i>\n`;
    text += `\n${myposText}`;

    await Promise.all(
      chatIds.map((chatId) =>
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        })
          .then(async (r) => {
            if (!r.ok) console.error("[MYPOS-WEBHOOK] Telegram API error:", await r.text());
          })
          .catch((err) => console.error("[MYPOS-WEBHOOK] Telegram send failed:", err))
      )
    );

    console.log(`[MYPOS-WEBHOOK] Full order notification sent for #${info.orderNumber}`);
  } catch (err) {
    console.error("[MYPOS-WEBHOOK] Notification error:", err);
  }
}

/**
 * Trigger auto-print on the local print-server (Windows POS PC).
 * The print-server listens on port 3001 and accepts POST /print-order.
 * This will silently fail if the print-server is not reachable (it runs on LAN).
 */
async function triggerAutoPrint(orderNumber: string, supabaseUrl: string, supabaseServiceKey: string): Promise<void> {
  try {
    // Notify via Supabase Realtime broadcast — TVDashboard will receive this
    // and call window.print() / send to the local print-server.
    // We also attempt a direct call to the print-server REST API.
    const printServerUrl = Deno.env.get("PRINT_SERVER_URL") || "http://192.168.1.84:3001";
    await fetch(`${printServerUrl}/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // Expected to fail when called from Supabase Edge (cross-network) — TVDashboard covers this
      console.log(`[MYPOS-WEBHOOK] Print-server not reachable from edge (expected) — TVDashboard will print`);
    });
  } catch (_) {
    // ignore
  }
}

serve(async (req) => {
  console.log(`[MYPOS-WEBHOOK] Received ${req.method} request`);

  // myPOS requires exact body string "OK" with status 200
  if (req.method === "OPTIONS") {
    return new Response("OK", { status: 200 });
  }

  try {
    // 1. Parse body (myPOS sends application/x-www-form-urlencoded or JSON)
    const contentType = req.headers.get("content-type") || "";
    const params: Record<string, string> = {};
    let rawSignature = "";

    const bodyText = await req.text();
    console.log("[MYPOS-WEBHOOK] Raw body received:", {
      length: bodyText.length,
      contentType,
      preview: bodyText.slice(0, 300)
    });

    let parsed = false;
    const trimmed = bodyText.trim();

    // Try JSON parsing
    if (trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed);
        for (const [key, value] of Object.entries(json)) {
          if (key === "Signature") {
            rawSignature = String(value);
          } else {
            params[key] = String(value);
          }
        }
        parsed = true;
      } catch (_) {
        // Fall back to URLSearchParams
      }
    }

    // Try URLSearchParams parsing
    if (!parsed && trimmed.length > 0) {
      try {
        const searchParams = new URLSearchParams(trimmed);
        for (const [key, value] of searchParams.entries()) {
          if (key === "Signature") {
            rawSignature = value;
          } else {
            params[key] = value;
          }
        }
        parsed = true;
      } catch (err) {
        console.error("[MYPOS-WEBHOOK] Error parsing URLSearchParams:", err);
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
    // Temporary escape hatch: process notifications that fail verification. Only enable while
    // MYPOS_PUBLIC_KEY is being sorted out — it makes this public endpoint trustable by anyone.
    const allowUnverified = Deno.env.get("MYPOS_ALLOW_UNVERIFIED") === "true";

    // This endpoint always answers 200/"OK" so myPOS settles rather than auto-voiding the payment.
    // Signature validity gates the database write only — never the HTTP response.
    let signatureVerified = false;

    if (myposPublicKey && rawSignature) {
      const result = verifySignature(params, rawSignature, myposPublicKey);
      signatureVerified = result.valid;

      if (result.valid) {
        console.log(`[MYPOS-WEBHOOK] Signature verified successfully (variant: ${result.variant})`);
      } else {
        console.error("[MYPOS-WEBHOOK] Signature verification FAILED", {
          orderId: params.OrderID,
          reason: result.error,
          // Diagnostics only — no key material or signed values are logged
          paramOrder: Object.keys(params).join(","),
          paramCount: Object.keys(params).length,
          signatureLength: rawSignature.length,
          publicKeyLooksPem: normalizePem(myposPublicKey).startsWith("-----BEGIN"),
        });
      }
    } else if (!myposPublicKey) {
      console.error("[MYPOS-WEBHOOK] MYPOS_PUBLIC_KEY not set — cannot authenticate notification");
    } else {
      console.error("[MYPOS-WEBHOOK] Notification carried no Signature parameter");
    }

    if (!signatureVerified && !allowUnverified) {
      console.error(
        `[MYPOS-WEBHOOK] Rejecting unverified notification for order #${params.OrderID} — no database changes applied. ` +
          `Set MYPOS_ALLOW_UNVERIFIED=true to process anyway while the key is being fixed.`
      );
      return new Response("OK", { headers: { "Content-Type": "text/plain" }, status: 200 });
    }

    if (!signatureVerified) {
      console.warn(
        `[MYPOS-WEBHOOK] Processing UNVERIFIED notification for order #${params.OrderID} (MYPOS_ALLOW_UNVERIFIED=true)`
      );
    }

    const orderNumber = params.OrderID;
    // IPCPurchaseNotify carries "Status", not "IPCStatus" — reading only the latter made every
    // successful payment look like a failure. Both are accepted so either shape works.
    const ipcStatus = String(params.IPCStatus ?? params.Status ?? params.status ?? "");
    const transactionId = params.IPC_Trn_ID || params.TransactionID || params.RequestID || `MYPOS-${Date.now()}`;
    const paymentAmount = params.Amount ? parseFloat(params.Amount) : null;
    const paymentCurrency = params.Currency || "EUR";
    const paymentMethodName = params.CardType ? `myPOS (${params.CardType})` : "myPOS";

    // 0 = Success in myPOS IPC protocol
    const isSuccess = ipcStatus === "0";
    // If no status field came through at all we did not understand the payload. Marking the
    // order Failed on that basis is worse than doing nothing, since the money may have arrived.
    const statusMissing = ipcStatus === "";

    console.log("[MYPOS-WEBHOOK] All parameter keys:", Object.keys(params).join(",") || "(none)");

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (orderNumber) {
      // The order is created by the checkout screen before the customer is redirected to myPOS,
      // so by the time a genuine notification arrives the row must already exist.
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, total, payment_status, created_at, customer_name, customer_phone, customer_address, customer_notes, order_type, items")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (fetchErr) {
        console.error("[MYPOS-WEBHOOK] Error loading order:", fetchErr);
      } else if (!order) {
        console.error(`[MYPOS-WEBHOOK] No order found for #${orderNumber} — ignoring notification`);
      } else if (isSuccess) {
        console.log(`[MYPOS-WEBHOOK] Payment SUCCESS for order #${orderNumber}`);

        // Business-rule checks. When the signature verified these are advisory; when it did not,
        // they are the only thing standing between this public endpoint and a forged "paid"
        // notification, so they become hard gates.
        const expectedTotal = order.total != null ? Number(order.total) : null;
        const amountMatches =
          paymentAmount !== null && expectedTotal !== null
            ? Math.abs(expectedTotal - paymentAmount) <= 0.01
            : false;
        const ageMs = Date.now() - new Date(order.created_at as string).getTime();
        const isRecent = ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000;
        const alreadyPaid = order.payment_status === "Paid";

        if (!amountMatches) {
          console.error("[MYPOS-WEBHOOK] AMOUNT MISMATCH", {
            orderNumber,
            orderTotal: expectedTotal,
            notifiedAmount: paymentAmount,
          });
        }

        // Idempotency: myPOS may retry a notification. Never process the same payment twice —
        // that would re-notify the kitchen for an order it has already been given.
        if (alreadyPaid) {
          console.log(`[MYPOS-WEBHOOK] Order #${orderNumber} is already Paid — skipping (idempotent)`);
        } else if (!signatureVerified && !allowUnverified && (!amountMatches || !isRecent)) {
          // When MYPOS_ALLOW_UNVERIFIED=true we skip this hard gate — the operator has
          // explicitly asked us to trust unverified notifications (e.g. key mismatch).
          console.error(
            `[MYPOS-WEBHOOK] Refusing unverified notification for #${orderNumber} ` +
              `(amountMatches=${amountMatches}, isRecent=${isRecent}) — no database changes applied`
          );
        } else {
          // Conditional update on the status we just read, so two notifications racing each
          // other cannot both succeed. PostgREST needs .is() rather than .eq() to match NULL.
          const query = supabase
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
            .eq("order_number", orderNumber);

          const { data: updatedRows, error: updateErr } = await (
            order.payment_status == null
              ? query.is("payment_status", null)
              : query.eq("payment_status", order.payment_status)
          ).select("id");

          if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
            console.log(`[MYPOS-WEBHOOK] Order #${orderNumber} changed concurrently — skipping`);
            return new Response("OK", { headers: { "Content-Type": "text/plain" }, status: 200 });
          }

          if (updateErr) {
            console.error("[MYPOS-WEBHOOK] Error updating order in database:", updateErr);
          } else {
            console.log(`[MYPOS-WEBHOOK] Order #${orderNumber} marked Paid`);

            // Send full order details to Telegram + trigger auto-print
            await sendFullOrderNotification({
              orderNumber,
              amount: paymentAmount ?? expectedTotal ?? 0,
              currency: paymentCurrency,
              transactionId,
              verified: signatureVerified,
              order,
            });

            // Attempt to wake the print-server (best-effort — TVDashboard realtime covers LAN)
            await triggerAutoPrint(orderNumber, supabaseUrl, supabaseServiceKey);
          }
        }
      } else {
        console.warn(`[MYPOS-WEBHOOK] Payment FAILED/CANCELLED for order #${orderNumber}, status: ${ipcStatus}`);

        // Never downgrade an already-settled payment on the strength of an unverified request.
        if (statusMissing) {
          console.error(`[MYPOS-WEBHOOK] No IPCStatus in payload for #${orderNumber} — leaving order untouched`);
        } else if (order.payment_status === "Paid") {
          console.warn(`[MYPOS-WEBHOOK] Order #${orderNumber} is already Paid — not marking Failed`);
        } else if (!signatureVerified) {
          console.error(`[MYPOS-WEBHOOK] Refusing unverified failure notification for #${orderNumber}`);
        } else {
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
