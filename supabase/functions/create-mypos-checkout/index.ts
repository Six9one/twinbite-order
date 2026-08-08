import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate myPOS IPC Digital Signature (RSA-SHA256)
 * Protocol:
 * 1. Concatenate values of all parameters with '-' delimiter
 * 2. Base64 encode concatenated string
 * 3. Sign using RSA-SHA256 with Private Key
 * 4. Base64 encode resulting signature
 */
function cleanPem(pemStr: string): string {
  if (!pemStr) return "";
  let formatted = pemStr.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  if (!formatted.includes("-----BEGIN")) {
    const lines = formatted.replace(/\s+/g, "").match(/.{1,64}/g) || [formatted];
    formatted = `-----BEGIN RSA PRIVATE KEY-----\n${lines.join("\n")}\n-----END RSA PRIVATE KEY-----`;
  }
  return formatted;
}

function generateSignature(params: Record<string, string>, privateKeyPem: string): string {
  const concatenated = Object.values(params).join("-");
  const base64Data = Buffer.from(concatenated, "utf-8").toString("base64");
  
  const formattedPrivateKey = cleanPem(privateKeyPem);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(base64Data);
  const signatureBuffer = signer.sign(formattedPrivateKey);
  
  return signatureBuffer.toString("base64");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
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
      tva,
      redirectUrl
    } = body;

    console.log("[CREATE-MYPOS-CHECKOUT] Creating session for order:", orderNumber, "amount:", amount);

    // Retrieve environment variables
    const clientId = Deno.env.get("MYPOS_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("MYPOS_CLIENT_SECRET") || "";
    const storeId = Deno.env.get("MYPOS_STORE_ID") || Deno.env.get("MYPOS_SID") || clientId;
    const walletNumber = Deno.env.get("MYPOS_WALLET_NUMBER") || "0000000000";
    const keyIndex = Deno.env.get("MYPOS_KEY_INDEX") || "1";
    const privateKeyPem = Deno.env.get("MYPOS_PRIVATE_KEY") || clientSecret;
    const env = (Deno.env.get("MYPOS_ENV") || "sandbox").toLowerCase();

    // Check configuration availability
    if ((!storeId && !clientId) || (!privateKeyPem && !clientSecret)) {
      console.warn("[CREATE-MYPOS-CHECKOUT] myPOS configuration missing in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Paiement en ligne temporairement indisponible. Veuillez choisir un autre mode de paiement.",
          code: "MYPOS_CONFIG_MISSING"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 }
      );
    }

    const rawOrigin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:8080";
    const origin = rawOrigin.replace(/\/+$/, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    // Parse customer names
    const nameParts = (customerName || "Client").trim().split(" ");
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "TwinPizza";

    // Formatted amount (strictly 2 decimals)
    const formattedAmount = Number(amount).toFixed(2);

    // Build cart items parameters (Required by myPOS IPC Purchase Protocol)
    const cartParams: Record<string, string> = {};
    if (items && Array.isArray(items) && items.length > 0) {
      cartParams["CartItems"] = String(items.length);
      items.forEach((item: any, index: number) => {
        const i = index + 1;
        const qty = item.quantity || 1;
        const price = Number(item.price || 0).toFixed(2);
        const itemAmount = (qty * Number(item.price || 0)).toFixed(2);
        cartParams[`Article_${i}`] = String(item.name || "Article").substring(0, 100);
        cartParams[`Quantity_${i}`] = String(qty);
        cartParams[`Price_${i}`] = price;
        cartParams[`Amount_${i}`] = itemAmount;
        cartParams[`Currency_${i}`] = "EUR";
      });
    } else {
      cartParams["CartItems"] = "1";
      cartParams["Article_1"] = "Commande Twin Pizza";
      cartParams["Quantity_1"] = "1";
      cartParams["Price_1"] = formattedAmount;
      cartParams["Amount_1"] = formattedAmount;
      cartParams["Currency_1"] = "EUR";
    }

    // 1. Build parameters in exact myPOS IPC purchase protocol order
    const params: Record<string, string> = {
      IPCmethod: "IPCPurchase",
      IPCVersion: "1.4",
      IPCLanguage: "FR",
      SID: storeId,
      WalletNumber: walletNumber,
      KeyIndex: keyIndex,
      Amount: formattedAmount,
      Currency: "EUR",
      OrderID: String(orderNumber),
      URL_OK: redirectUrl || `${origin}/payment/success?order=${encodeURIComponent(orderNumber)}`,
      URL_Cancel: `${origin}/payment/cancel?order=${encodeURIComponent(orderNumber)}`,
      URL_Notify: `${supabaseUrl}/functions/v1/mypos-webhook`,
      ...cartParams,
      CardTokenRequest: "0",
      PaymentParametersRequired: "1",
      CustomerEmail: customerEmail || "client@twinpizza.fr",
      CustomerFirstNames: firstName,
      CustomerFamilyName: lastName,
      CustomerPhone: customerPhone || "",
    };

    // 2. Generate RSA-SHA256 signature
    const formattedPrivateKey = privateKeyPem.includes("-----BEGIN")
      ? privateKeyPem
      : `-----BEGIN PRIVATE KEY-----\n${privateKeyPem}\n-----END PRIVATE KEY-----`;

    const signature = generateSignature(params, formattedPrivateKey);

    // 3. Attach Signature to parameters
    const postData = {
      ...params,
      Signature: signature
    };

    // 4. Determine checkout endpoint URL
    const checkoutUrl = env === "production"
      ? (Deno.env.get("MYPOS_PROD_URL") || "https://www.mypos.com/vmp/checkout")
      : (Deno.env.get("MYPOS_SANDBOX_URL") || "https://dev-ipc.mypos-pas.com/v1/sub/ipc");

    console.log("[CREATE-MYPOS-CHECKOUT] Session created successfully", {
      orderNumber,
      checkoutUrl,
      env
    });

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        params: postData,
        orderNumber
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-MYPOS-CHECKOUT] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
