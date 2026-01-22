// Kitchen Notification Service
// Handles scheduled push notifications for temperature checks

const MORNING_HOUR = 11;
const MORNING_MINUTE = 30;
const NIGHT_HOUR = 23;
const NIGHT_MINUTE = 0;

export interface NotificationPermissionResult {
    granted: boolean;
    message: string;
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
    if (!isNotificationSupported()) {
        return { granted: false, message: 'Notifications not supported on this browser' };
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        return { granted: true, message: 'Notifications enabled!' };
    } else if (permission === 'denied') {
        return { granted: false, message: 'Notifications blocked. Please enable in browser settings.' };
    } else {
        return { granted: false, message: 'Notification permission not granted.' };
    }
}

// Check current permission status
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
}

// Show a notification immediately with click redirect
export function showNotification(title: string, options?: NotificationOptions & { data?: { url?: string } }): void {
    if (getNotificationPermission() !== 'granted') return;

    const redirectUrl = options?.data?.url;

    const notification = new Notification(title, {
        icon: '/pizza-icon.png',
        badge: '/pizza-icon.png',
        ...options,
    });

    notification.onclick = (event) => {
        event.preventDefault();
        notification.close();

        // Focus the window
        window.focus();

        // Redirect if URL provided
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    };
}

// Calculate ms until next notification time
function getMsUntil(hour: number, minute: number): number {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
}

// Schedule morning notification (11:30 AM)
export function scheduleMorningNotification(): void {
    const msUntil = getMsUntil(MORNING_HOUR, MORNING_MINUTE);

    setTimeout(() => {
        showNotification('☀️ Relevé Matin', {
            body: 'Il est temps de faire le relevé température du matin!',
            tag: 'morning-temp-check',
            requireInteraction: true,
            data: { url: '/kitchen?tab=temp-rounds&shift=Morning' },
        });

        // Reschedule for next day
        scheduleMorningNotification();
    }, msUntil);

    console.log(`Morning notification scheduled in ${Math.round(msUntil / 1000 / 60)} minutes`);
}

// Schedule night notification (11:00 PM)
export function scheduleNightNotification(): void {
    const msUntil = getMsUntil(NIGHT_HOUR, NIGHT_MINUTE);

    setTimeout(() => {
        showNotification('🌙 Relevé Soir', {
            body: 'Il est temps de faire le relevé température du soir!',
            tag: 'night-temp-check',
            requireInteraction: true,
            data: { url: '/kitchen?tab=temp-rounds&shift=Night' },
        });

        // Reschedule for next day
        scheduleNightNotification();
    }, msUntil);

    console.log(`Night notification scheduled in ${Math.round(msUntil / 1000 / 60)} minutes`);
}

// Initialize all scheduled notifications
export function initializeNotifications(): void {
    if (getNotificationPermission() !== 'granted') {
        console.log('Notifications not granted, skipping schedule');
        return;
    }

    scheduleMorningNotification();
    scheduleNightNotification();
    console.log('Kitchen notifications initialized');
}

// Check for expiring meat products (call periodically)
export async function checkExpiringMeat(supabase: any): Promise<void> {
    if (getNotificationPermission() !== 'granted') return;

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: expiringProducts } = await supabase
        .from('kitchen_traceability')
        .select('*')
        .eq('is_disposed', false)
        .lte('secondary_dlc', in24Hours.toISOString())
        .gte('secondary_dlc', now.toISOString());

    if (expiringProducts && expiringProducts.length > 0) {
        const productNames = expiringProducts.map((p: any) => p.product_name).join(', ');
        showNotification('⚠️ Produits à vérifier', {
            body: `${expiringProducts.length} produit(s) expirent bientôt: ${productNames}`,
            tag: 'expiring-products',
            requireInteraction: true,
            data: { url: '/kitchen?tab=traceability' },
        });
    }
}

export default {
    isNotificationSupported,
    requestNotificationPermission,
    getNotificationPermission,
    showNotification,
    initializeNotifications,
    checkExpiringMeat,
};
