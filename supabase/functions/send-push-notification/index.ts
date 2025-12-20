// @ts-ignore - Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = 'mailto:contact@twinpizza.fr';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    icon?: string;
}

interface Subscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Helper to create JWT for VAPID
async function createVapidJWT(audience: string): Promise<string> {
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: audience,
        exp: now + 12 * 60 * 60, // 12 hours
        sub: VAPID_SUBJECT,
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import the private key
    const privateKeyData = VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (privateKeyData.length % 4)) % 4);
    const keyBytes = Uint8Array.from(atob(privateKeyData + padding), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        encoder.encode(unsignedToken)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${unsignedToken}.${signatureB64}`;
}

// Send push notification to a subscription
async function sendPushNotification(
    subscription: Subscription,
    payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const url = new URL(subscription.endpoint);
        const audience = `${url.protocol}//${url.host}`;

        const jwt = await createVapidJWT(audience);

        const body = JSON.stringify(payload);

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'TTL': '86400',
                'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
            },
            body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[PUSH] Failed:', response.status, errorText);

            // If subscription expired, we should remove it
            if (response.status === 410 || response.status === 404) {
                return { success: false, error: 'subscription_expired' };
            }

            return { success: false, error: `HTTP ${response.status}` };
        }

        console.log('[PUSH] Notification sent successfully');
        return { success: true };
    } catch (error) {
        console.error('[PUSH] Error:', error);
        return { success: false, error: String(error) };
    }
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { subscription, payload, subscriptions } = await req.json();

        // Check VAPID keys
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            console.error('[PUSH] VAPID keys not configured');
            return new Response(
                JSON.stringify({ error: 'VAPID keys not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Single subscription
        if (subscription) {
            const result = await sendPushNotification(subscription, payload);
            return new Response(
                JSON.stringify(result),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Multiple subscriptions (broadcast)
        if (subscriptions && Array.isArray(subscriptions)) {
            const results = await Promise.all(
                subscriptions.map((sub: Subscription) => sendPushNotification(sub, payload))
            );

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            return new Response(
                JSON.stringify({ successful, failed, total: subscriptions.length }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'No subscription provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('[PUSH] Error:', error);
        return new Response(
            JSON.stringify({ error: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
