import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp Business API (Meta Cloud API v22.0)
// Using Template 'order_confirmation' for guaranteed delivery

interface WhatsAppPayload {
    type: 'confirmation'; // Only confirmation for now
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderType: string;
    total: number;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload: WhatsAppPayload = await req.json()
        const { type, customerPhone, customerName, orderNumber, orderType, total } = payload

        if (!customerPhone) {
            return new Response(
                JSON.stringify({ error: 'Customer phone is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

        if (!accessToken || !phoneNumberId) {
            console.error('❌ WhatsApp credentials missing!')
            return new Response(
                JSON.stringify({ success: false, message: 'WhatsApp not configured' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Format phone number
        let formattedPhone = customerPhone.replace(/[\s\-\+\.]/g, '')
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '33' + formattedPhone.substring(1)
        }

        const orderTypeLabels: Record<string, string> = {
            livraison: 'Livraison 🚗',
            emporter: 'À emporter 🥡',
            surplace: 'Sur place 🍽️'
        }

        // Send WhatsApp message via Meta Cloud API using the 'order_confirmation' TEMPLATE
        const response = await fetch(
            `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'template',
                    template: {
                        name: 'order_confirmation',
                        language: {
                            code: 'fr'
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: customerName },     // {{1}}
                                    { type: 'text', text: orderNumber },      // {{2}}
                                    { type: 'text', text: `${total?.toFixed(2)} €` }, // {{3}}
                                    { type: 'text', text: orderTypeLabels[orderType] || orderType } // {{4}}
                                ]
                            }
                        ]
                    }
                }),
            }
        )

        const result = await response.json()

        if (response.ok) {
            console.log(`✅ Template sent to ${formattedPhone}`)
            return new Response(
                JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.error('❌ Meta API Error:', result)
            return new Response(
                JSON.stringify({ success: false, error: result.error?.message || 'Meta API failed' }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (error) {
        console.error('❌ Server Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
