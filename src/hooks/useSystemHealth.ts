import { useState, useEffect, useCallback } from 'react';

interface ServiceStatus {
    isOnline: boolean;
    lastChecked: Date | null;
    error: string | null;
}

interface SystemHealth {
    printer: ServiceStatus;
    whatsappBot: ServiceStatus;
    supabase: ServiceStatus;
}

const DEFAULT_STATUS: ServiceStatus = {
    isOnline: false,
    lastChecked: null,
    error: null,
};

/**
 * Hook pour surveiller la santé des services du système
 * - Printer: vérifie si le navigateur peut accéder à l'API d'impression
 * - WhatsApp Bot: ping le processus Python
 * - Supabase: vérifie la connexion à la base de données
 */
export function useSystemHealth(pollInterval: number = 30000) {
    const [health, setHealth] = useState<SystemHealth>({
        printer: DEFAULT_STATUS,
        whatsappBot: DEFAULT_STATUS,
        supabase: { ...DEFAULT_STATUS, isOnline: true }, // Start optimistic
    });

    // Check if printer is available
    const checkPrinter = useCallback(async (): Promise<ServiceStatus> => {
        try {
            // Check if the browser supports printing
            const canPrint = typeof window !== 'undefined' && 'print' in window;

            // Check if there's USB printer access (needs HTTPS in production)
            let hasUSBAccess = false;
            if ('usb' in navigator) {
                try {
                    const devices = await (navigator as any).usb.getDevices();
                    hasUSBAccess = devices.length > 0;
                } catch {
                    // USB access might be denied
                }
            }

            return {
                isOnline: canPrint,
                lastChecked: new Date(),
                error: null,
            };
        } catch (error: any) {
            return {
                isOnline: false,
                lastChecked: new Date(),
                error: error.message || 'Printer check failed',
            };
        }
    }, []);

    // Check if WhatsApp bot is running by checking if its port is open
    const checkWhatsAppBot = useCallback(async (): Promise<ServiceStatus> => {
        try {
            // The WhatsApp bot uses Chrome with remote debugging on port 9222
            // We can't directly ping localhost from browser due to CORS
            // Instead, we check localStorage for last bot activity

            const lastBotPing = localStorage.getItem('whatsapp_bot_last_ping');
            const lastPingTime = lastBotPing ? new Date(lastBotPing) : null;

            // Consider online if pinged within last 2 minutes
            const isRecent = lastPingTime &&
                (new Date().getTime() - lastPingTime.getTime()) < 120000;

            // For now, we'll assume it's running if user confirmed
            // In production, the bot would ping an endpoint periodically
            const botStatus = localStorage.getItem('whatsapp_bot_status');

            return {
                isOnline: botStatus === 'online' || isRecent || false,
                lastChecked: new Date(),
                error: null,
            };
        } catch (error: any) {
            return {
                isOnline: false,
                lastChecked: new Date(),
                error: error.message || 'WhatsApp bot check failed',
            };
        }
    }, []);

    // Check Supabase connection
    const checkSupabase = useCallback(async (): Promise<ServiceStatus> => {
        try {
            // Simple health check - try to fetch from Supabase
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL || 'https://hsylnrzxeyqxczdalurj.supabase.co'}/rest/v1/`,
                {
                    method: 'HEAD',
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                    },
                }
            );

            return {
                isOnline: response.ok || response.status === 400, // 400 is fine, means API is responding
                lastChecked: new Date(),
                error: null,
            };
        } catch (error: any) {
            return {
                isOnline: false,
                lastChecked: new Date(),
                error: error.message || 'Supabase check failed',
            };
        }
    }, []);

    // Manual refresh function
    const refresh = useCallback(async () => {
        const [printer, whatsappBot, supabase] = await Promise.all([
            checkPrinter(),
            checkWhatsAppBot(),
            checkSupabase(),
        ]);

        setHealth({ printer, whatsappBot, supabase });
    }, [checkPrinter, checkWhatsAppBot, checkSupabase]);

    // Toggle WhatsApp bot status manually (for user to confirm bot is running)
    const setWhatsAppBotOnline = useCallback((isOnline: boolean) => {
        localStorage.setItem('whatsapp_bot_status', isOnline ? 'online' : 'offline');
        localStorage.setItem('whatsapp_bot_last_ping', new Date().toISOString());

        setHealth(prev => ({
            ...prev,
            whatsappBot: {
                isOnline,
                lastChecked: new Date(),
                error: null,
            },
        }));
    }, []);

    // Initial check and polling
    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, pollInterval);
        return () => clearInterval(interval);
    }, [refresh, pollInterval]);

    return {
        health,
        refresh,
        setWhatsAppBotOnline,
        isAllHealthy: health.printer.isOnline && health.whatsappBot.isOnline && health.supabase.isOnline,
    };
}

/**
 * Format time since last check
 */
export function formatLastChecked(date: Date | null): string {
    if (!date) return 'Jamais';

    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'À l\'instant';
    if (seconds < 120) return 'Il y a 1 min';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;

    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
