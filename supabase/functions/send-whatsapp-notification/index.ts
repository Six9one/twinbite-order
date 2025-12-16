import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp Business API (Meta Cloud API)
// FREE for first 1000 conversations/month
// 
// Required Supabase secrets:
// - WHATSAPP_ACCESS_TOKEN (from Meta Developer Console)
// - WHATSAPP_PHONE_NUMBER_ID (from Meta Developer Console)

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

        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

        if (!accessToken || !phoneNumberId) {
            console.log('WhatsApp not configured - credentials missing')
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'WhatsApp not configured'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Format phone number (remove spaces, add country code if needed)
        let formattedPhone = customerPhone.replace(/[\s\-\.]/g, '')
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '33' + formattedPhone.substring(1) // France
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1)
        }

        // Order type labels
        const orderTypeLabels: Record<string, string> = {
            livraison: 'livraison 🚗',
            emporter: 'à emporter 🥡',
            surplace: 'sur place 🍽️'
        }

        // Send WhatsApp message
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: `🍕 *TWIN PIZZA*\n\nBonjour ${customerName} !\n\n✅ Votre commande *N°${orderNumber}* (${orderTypeLabels[orderType] || orderType}) est *PRÊTE* !\n\n${orderType === 'livraison' ? '🚗 Le livreur arrive bientôt.' : '👋 Vous pouvez venir la récupérer.'}\n\nMerci et à bientôt ! 🙏`
                    }
                }),
            }
        )

        const result = await response.json()

        if (response.ok) {
            console.log('WhatsApp message sent to', formattedPhone)
            return new Response(
                JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.error('WhatsApp API error:', result)
            return new Response(
                JSON.stringify({ success: false, error: result.error?.message || 'Failed to send' }),
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
