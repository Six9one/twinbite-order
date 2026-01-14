import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface PWAState {
    isInstallable: boolean;
    isInstalled: boolean;
    isOnline: boolean;
    isUpdateAvailable: boolean;
}

interface UsePWAReturn extends PWAState {
    installApp: () => Promise<boolean>;
    updateApp: () => void;
    subscribeToPush: () => Promise<PushSubscription | null>;
    unsubscribeFromPush: () => Promise<boolean>;
    isPushSupported: boolean;
    isPushSubscribed: boolean;
}

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BNXh6DW1hgLf3i4_Lt_vvFAn7L_dtYOWy0zGvTbtP48sa338IA5cuEdVF07hXas60c2OjmCv65aVBROTM4QPyFs';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePWA(): UsePWAReturn {
    const [state, setState] = useState<PWAState>({
        isInstallable: false,
        isInstalled: false,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isUpdateAvailable: false
    });

    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    const isPushSupported = 'PushManager' in window && 'serviceWorker' in navigator;

    // Register service worker
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    console.log('[PWA] Service Worker registered');
                    setRegistration(reg);

                    // Check for updates immediately
                    reg.update();

                    // Check for updates periodically (every 5 minutes)
                    const updateInterval = setInterval(() => {
                        console.log('[PWA] Checking for service worker updates...');
                        reg.update();
                    }, 5 * 60 * 1000);

                    // Check for updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        console.log('[PWA] New service worker found, installing...');

                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[PWA] New version ready! Prompting for update...');
                                    setState(prev => ({ ...prev, isUpdateAvailable: true }));

                                    // Auto-reload after 3 seconds if user doesn't interact
                                    setTimeout(() => {
                                        if (newWorker.state === 'installed') {
                                            console.log('[PWA] Auto-activating new version...');
                                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                                        }
                                    }, 3000);
                                }
                            });
                        }
                    });

                    // Listen for SW messages
                    navigator.serviceWorker.addEventListener('message', (event) => {
                        if (event.data && event.data.type === 'SW_UPDATED') {
                            console.log('[PWA] Service worker updated to version:', event.data.version);
                            // Reload to get fresh content
                            window.location.reload();
                        }
                    });

                    // Check push subscription status
                    if (reg.pushManager) {
                        reg.pushManager.getSubscription().then((sub) => {
                            setIsPushSubscribed(!!sub);
                        });
                    }

                    // Cleanup interval on unmount
                    return () => clearInterval(updateInterval);
                })
                .catch((err) => {
                    console.error('[PWA] Service Worker registration failed:', err);
                });

            // Handle controller change (when new SW takes over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[PWA] New service worker activated, reloading...');
                window.location.reload();
            });
        }
    }, []);

    // Listen for install prompt
    useEffect(() => {
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setState(prev => ({ ...prev, isInstallable: true }));
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Check if already installed (iOS Safari or standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) {
            setState(prev => ({ ...prev, isInstalled: true }));
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Online/offline status
    useEffect(() => {
        const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
        const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const installApp = useCallback(async (): Promise<boolean> => {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;

            if (result.outcome === 'accepted') {
                console.log('[PWA] App installed');
                setDeferredPrompt(null);
                setState(prev => ({ ...prev, isInstallable: false, isInstalled: true }));

                // Track PWA install in Supabase
                try {
                    await (supabase.from as any)('pwa_installs').insert({
                        user_agent: navigator.userAgent,
                        platform: result.platform || 'unknown',
                        screen_width: window.screen.width,
                        screen_height: window.screen.height,
                        language: navigator.language,
                        installed_at: new Date().toISOString()
                    });
                    console.log('[PWA] Install tracked in database');
                } catch (e) {
                    console.error('[PWA] Failed to track install:', e);
                }

                return true;
            }

            return false;
        } catch (err) {
            console.error('[PWA] Install failed:', err);
            return false;
        }
    }, [deferredPrompt]);

    const updateApp = useCallback(() => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, [registration]);

    const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
        if (!registration || !isPushSupported) {
            console.error('[PWA] Push not supported or no registration');
            return null;
        }

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[PWA] Notification permission denied');
                return null;
            }

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            console.log('[PWA] Push subscribed:', subscription);
            setIsPushSubscribed(true);

            // Save subscription to Supabase
            const subscriptionJson = subscription.toJSON();
            try {
                // Using 'as any' because push_subscriptions table is created by migration
                const { error } = await (supabase.from as any)('push_subscriptions').upsert({
                    endpoint: subscription.endpoint,
                    keys: subscriptionJson.keys,
                    user_agent: navigator.userAgent,
                }, {
                    onConflict: 'endpoint'
                });

                if (error) {
                    console.error('[PWA] Failed to save subscription:', error);
                } else {
                    console.log('[PWA] Subscription saved to database');
                }
            } catch (e) {
                console.error('[PWA] Database error:', e);
            }

            return subscription;
        } catch (err) {
            console.error('[PWA] Push subscription failed:', err);
            return null;
        }
    }, [registration, isPushSupported]);

    const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
        if (!registration) return false;

        try {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                setIsPushSubscribed(false);
                console.log('[PWA] Push unsubscribed');
                return true;
            }
            return false;
        } catch (err) {
            console.error('[PWA] Unsubscribe failed:', err);
            return false;
        }
    }, [registration]);

    return {
        ...state,
        installApp,
        updateApp,
        subscribeToPush,
        unsubscribeFromPush,
        isPushSupported,
        isPushSubscribed
    };
}
