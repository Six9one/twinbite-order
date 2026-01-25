import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppPayload {
    type: 'confirmation';
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderType: string;
    total: number;
    items?: any[];
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload: WhatsAppPayload = await req.json()
        const { customerPhone, customerName, orderNumber, orderType, total, items } = payload

        if (!customerPhone) {
            return new Response(JSON.stringify({ error: 'Customer phone is required' }), { status: 400, headers: corsHeaders })
        }

        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

        if (!accessToken || !phoneNumberId) {
            console.error('❌ WhatsApp credentials missing!')
            return new Response(JSON.stringify({ success: false, message: 'WhatsApp not configured' }), { headers: corsHeaders })
        }

        // 1. Format order items into a readable list
        let itemsText = '';
        if (Array.isArray(items) && items.length > 0) {
            itemsText = items.map((item: any) => {
                const name = item.item?.name || item.name || 'Article';
                const qty = item.quantity || 1;
                return `${qty}x ${name}`;
            }).join(', ');
        } else {
            itemsText = '(détails sur votre ticket)';
        }

        const orderTypeLabels: Record<string, string> = {
            livraison: 'Livraison',
            emporter: 'A emporter',
            surplace: 'Sur place'
        }

        // 2. Format tracking link for THE BUTTON
        // We remove characters like + and spaces to ensure a clean URL
        const cleanPhone = customerPhone.replace(/[\s\-\+\.]/g, '')
        const urlSuffix = `?phone=${cleanPhone}`

        // Send WhatsApp message via Meta Cloud API
        // This version maps {{1}} to the dynamic button's URL suffix
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
                    to: cleanPhone,
                    type: 'template',
                    template: {
                        name: 'order_management_6',
                        language: { code: 'fr' },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: customerName },       // {{1}} Body
                                    { type: 'text', text: orderNumber },        // {{2}} Body
                                    { type: 'text', text: itemsText },  // {{3}} Body - now shows item names
                                    { type: 'text', text: `${total.toFixed(2)}` }, // {{4}} Body
                                    { type: 'text', text: orderTypeLabels[orderType] || orderType }, // {{5}} Body
                                    { type: 'text', text: '15 à 25 min' }       // {{6}} Body
                                ]
                            },
                            {
                                type: 'button',
                                sub_type: 'url',
                                index: '0',
                                parameters: [
                                    { type: 'text', text: urlSuffix } // {{1}} matches the dynamic suffix on Meta
                                ]
                            }
                        ]
                    }
                }),
            }
        )

        const result = await response.json()

        if (response.ok) {
            console.log(`✅ Personalized button sent to ${cleanPhone}: ${urlSuffix}`)
            return new Response(JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }), { headers: corsHeaders })
        } else {
            console.error('❌ Meta API Error:', result)
            return new Response(JSON.stringify({ success: false, error: result.error?.message || 'Meta API failed' }), { status: response.status, headers: corsHeaders })
        }

    } catch (error) {
        console.error('❌ Server Error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }
})
