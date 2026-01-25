import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
 * Version 2.0: Lit les statuts depuis la table system_status dans Supabase
 */
export function useSystemHealth(pollInterval: number = 30000) {
    const [health, setHealth] = useState<SystemHealth>({
        printer: DEFAULT_STATUS,
        whatsappBot: DEFAULT_STATUS,
        supabase: { ...DEFAULT_STATUS, isOnline: true }, // Start optimistic
    });

    // Check remote status from Supabase system_status table
    const checkRemoteStatus = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('system_status' as any)
                .select('*');

            if (error) throw error;

            const now = new Date();
            const newHealth: Partial<SystemHealth> = {};

            if (data) {
                data.forEach((row: any) => {
                    const lastHeartbeat = new Date(row.last_heartbeat);
                    // Consider offline if no heartbeat for more than 45 seconds
                    const isRecentlyActive = (now.getTime() - lastHeartbeat.getTime()) < 45000;
                    const isOnline = row.is_online && isRecentlyActive;

                    if (row.server_name === 'whatsapp') {
                        newHealth.whatsappBot = {
                            isOnline,
                            lastChecked: lastHeartbeat,
                            error: isOnline ? null : 'Serveur inactif ou hors ligne',
                        };
                    } else if (row.server_name === 'printer') {
                        newHealth.printer = {
                            isOnline,
                            lastChecked: lastHeartbeat,
                            error: isOnline ? null : 'Serveur d\'impression hors ligne',
                        };
                    }
                });
            }

            // Also check Supabase itself
            const sbStatus = {
                isOnline: true,
                lastChecked: new Date(),
                error: null,
            };

            setHealth(prev => ({
                ...prev,
                ...newHealth,
                supabase: sbStatus,
            }));
        } catch (error: any) {
            console.error('Failed to fetch system status:', error);
            setHealth(prev => ({
                ...prev,
                supabase: { isOnline: false, lastChecked: new Date(), error: error.message },
            }));
        }
    }, []);

    // Initial check and polling
    useEffect(() => {
        checkRemoteStatus();
        const interval = setInterval(checkRemoteStatus, pollInterval);
        return () => clearInterval(interval);
    }, [checkRemoteStatus, pollInterval]);

    return {
        health,
        refresh: checkRemoteStatus,
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
