// Twilio SMS Edge Function
// Envoie des SMS via l'API Twilio

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
    to: string;           // Numéro du destinataire (ex: +33612345678)
    message: string;      // Message à envoyer
    type?: string;        // 'order_notification' | 'supplier_order' | 'custom'
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get Twilio credentials from environment
        const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (!accountSid || !authToken || !twilioNumber) {
            console.error("❌ Missing Twilio credentials");
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Twilio credentials not configured"
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        // Parse request body
        const { to, message, type = "custom" }: SMSRequest = await req.json();

        if (!to || !message) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Missing 'to' or 'message' in request body"
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        // Format phone number (ensure it starts with +)
        const formattedTo = to.startsWith("+") ? to : `+${to}`;

        console.log(`📱 Sending SMS to ${formattedTo}`);
        console.log(`📝 Message type: ${type}`);
        console.log(`📄 Message length: ${message.length} chars`);

        // Send SMS via Twilio API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        const response = await fetch(twilioUrl, {
            method: "POST",
            headers: {
                "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                From: twilioNumber,
                To: formattedTo,
                Body: message,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("❌ Twilio API Error:", result);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: result.message || "Failed to send SMS",
                    code: result.code
                }),
                {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        console.log(`✅ SMS sent successfully! SID: ${result.sid}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "SMS sent successfully",
                sid: result.sid,
                status: result.status,
                to: formattedTo,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );

    } catch (error) {
        console.error("❌ Error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || "Internal server error"
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
