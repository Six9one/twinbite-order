// Web Push Notification Service for HACCP Kitchen
// Handles push subscription management and sending notifications

import { supabase } from '@/integrations/supabase/client';

// Your VAPID public key (generate with: npx web-push generate-vapid-keys)
// This is the public key - safe to expose in frontend
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Get server's VAPID public key
export function getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
}

// Convert VAPID key to Uint8Array for subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        console.error('Push notifications not supported');
        return null;
    }

    try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('Already subscribed to push');
            await saveSubscription(subscription);
            return subscription;
        }

        // Subscribe with VAPID key
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('Push subscription created:', subscription);

        // Save to database
        await saveSubscription(subscription);

        return subscription;
    } catch (error) {
        console.error('Error subscribing to push:', error);
        return null;
    }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Remove from database
            await removeSubscription(subscription.endpoint);

            // Unsubscribe
            await subscription.unsubscribe();
            console.log('Unsubscribed from push');
        }

        return true;
    } catch (error) {
        console.error('Error unsubscribing:', error);
        return false;
    }
}

// Save subscription to Supabase
async function saveSubscription(subscription: PushSubscription): Promise<void> {
    const subscriptionData = subscription.toJSON();

    const { error } = await supabase
        .from('push_subscriptions' as any)
        .upsert({
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscriptionData.keys?.p256dh,
                auth: subscriptionData.keys?.auth
            },
            user_agent: navigator.userAgent,
            device_name: getDeviceName(),
            last_used_at: new Date().toISOString()
        } as any, {
            onConflict: 'endpoint'
        });

    if (error) {
        console.error('Error saving subscription:', error);
    }
}

// Remove subscription from Supabase
async function removeSubscription(endpoint: string): Promise<void> {
    const { error } = await supabase
        .from('push_subscriptions' as any)
        .update({ is_active: false } as any)
        .eq('endpoint', endpoint);

    if (error) {
        console.error('Error removing subscription:', error);
    }
}

// Get a friendly device name
function getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows';
    return 'Unknown Device';
}

// Check if currently subscribed
export async function isSubscribed(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch {
        return false;
    }
}

export default {
    isPushSupported,
    subscribeToPush,
    unsubscribeFromPush,
    isSubscribed,
    getVapidPublicKey
};
