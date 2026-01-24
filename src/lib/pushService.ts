// Web Push Notification Service for HACCP Kitchen
// Handles push subscription management and sending notifications

import { supabase } from '@/integrations/supabase/client';

// Your VAPID public key (generate with: npx web-push generate-vapid-keys)
// This is the public key - safe to expose in frontend
const VAPID_PUBLIC_KEY = 'BDcrHvu2wZYL0ZkWkf9pszrKVTudXJCypKHcjCxWNwewJwfBxKir1VkrJU2RldVwv8yyZ5S8ChkpzR5pjoaR4vo';

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
    // Trim any spaces or newlines that might have come from copy-paste
    const cleanedString = base64String.trim();
    const padding = '='.repeat((4 - (cleanedString.length % 4)) % 4);
    const base64 = (cleanedString + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    try {
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (e) {
        console.error('Failed to decode VAPID key:', base64);
        throw new Error('La clé de sécurité (VAPID) est mal formatée.');
    }
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        throw new Error('Push notifications not supported on this browser');
    }

    try {
        // Wait for service worker to be ready
        console.log('Waiting for Service Worker to be ready...');
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker ready:', registration.scope);

        if (!registration.pushManager) {
            throw new Error('PushManager not available on registration. Check if you are using HTTPS.');
        }

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('Already subscribed to push');
            await saveSubscription(subscription);
            return subscription;
        }

        // Subscribe with VAPID key
        console.log('Creating new subscription with VAPID key...');
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any
        });

        console.log('Push subscription created successfully');

        // Save to database
        await saveSubscription(subscription);

        return subscription;
    } catch (error: any) {
        console.error('Detailed push subscription error:', error);
        // Throw the error instead of returning null to catch it in the UI
        throw error;
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
