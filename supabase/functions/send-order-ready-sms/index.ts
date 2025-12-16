import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function sends SMS to customers when their order is ready
// Configure with your Twilio credentials in Supabase secrets:
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_PHONE_NUMBER

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { customerPhone, customerName, orderNumber, orderType } = await req.json()

        if (!customerPhone) {
            return new Response(
                JSON.stringify({ error: 'Customer phone is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get Twilio credentials from environment
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

        if (!accountSid || !authToken || !twilioPhone) {
            console.log('SMS not configured - Twilio credentials missing')
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'SMS not configured - Twilio credentials not set'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Format phone number for France
        let formattedPhone = customerPhone.replace(/\s/g, '')
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+33' + formattedPhone.substring(1)
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+33' + formattedPhone
        }

        // Compose message
        const orderTypeLabels: Record<string, string> = {
            livraison: 'livraison',
            emporter: 'à emporter',
            surplace: 'sur place'
        }

        const message = `🍕 TWIN PIZZA\n\nBonjour ${customerName},\nVotre commande N°${orderNumber} (${orderTypeLabels[orderType] || orderType}) est PRÊTE !\n\n${orderType === 'livraison' ? 'Le livreur arrive bientôt.' : 'Vous pouvez venir la récupérer.'}\n\nMerci et à bientôt !`

        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: formattedPhone,
                From: twilioPhone,
                Body: message,
            }),
        })

        const result = await response.json()

        if (response.ok) {
            console.log('SMS sent successfully to', formattedPhone)
            return new Response(
                JSON.stringify({ success: true, sid: result.sid }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.error('Twilio error:', result)
            return new Response(
                JSON.stringify({ success: false, error: result.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
