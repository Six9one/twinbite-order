import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp Business API (Meta Cloud API v22.0)
// Free for first 1000 service conversations per month

interface WhatsAppPayload {
    type: 'confirmation' | 'ready' | 'cancelled';
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderType: string;
    total?: number;
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

        let messageBody = ''

        if (type === 'confirmation') {
            messageBody = `🍕 *TWIN PIZZA*\n\nBonjour ${customerName} !\n\n✅ Votre commande *N°${orderNumber}* est confirmée !\n\n💰 Total: ${total?.toFixed(2)} €\n🏃 Mode: ${orderTypeLabels[orderType] || orderType}\n🕒 Délai estimé: 20-30 min\n\nMerci pour votre confiance ! 🙏`
        } else if (type === 'ready') {
            messageBody = `🍕 *TWIN PIZZA*\n\nBonjour ${customerName} !\n\n✅ Votre commande *N°${orderNumber}* est *PRÊTE* !\n\n${orderType === 'livraison' ? '🚗 Notre livreur est en route.' : '👋 Vous pouvez passer la récupérer.'}\n\nÀ très vite ! 🍕`
        } else if (type === 'cancelled') {
            messageBody = `🍕 *TWIN PIZZA*\n\nBonjour ${customerName} !\n\n⚠️ Désolé, votre commande *N°${orderNumber}* a été annulée.\n\nN'hésitez pas à nous appeler pour plus d'infos. 🙏`
        }

        // Send WhatsApp message via Meta Cloud API
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
                    recipient_type: 'individual',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: messageBody
                    }
                }),
            }
        )

        const result = await response.json()

        if (response.ok) {
            console.log(`✅ Message (${type}) sent to ${formattedPhone}`)
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
