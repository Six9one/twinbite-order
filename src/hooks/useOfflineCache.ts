import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CachedOperation {
    id: string;
    table: string;
    type: 'insert' | 'update' | 'delete';
    data: Record<string, unknown>;
    timestamp: number;
}

const CACHE_KEY = 'kitchen_offline_cache';

export function useOfflineCache() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingOperations, setPendingOperations] = useState<CachedOperation[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try { setPendingOperations(JSON.parse(cached)); } catch { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(CACHE_KEY, JSON.stringify(pendingOperations));
    }, [pendingOperations]);

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); toast.success('📶 Connexion rétablie'); };
        const handleOffline = () => { setIsOnline(false); toast.warning('📴 Mode hors-ligne activé'); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isOnline && pendingOperations.length > 0 && !isSyncing) syncPendingOperations();
    }, [isOnline, pendingOperations.length]);

    const syncPendingOperations = async () => {
        if (pendingOperations.length === 0) return;
        setIsSyncing(true);
        const successIds: string[] = [];
        for (const op of pendingOperations) {
            try {
                if (op.type === 'insert') {
                    const { error } = await supabase.from(op.table as any).insert(op.data as any);
                    if (!error) successIds.push(op.id);
                } else if (op.type === 'update') {
                    const { id, ...updateData } = op.data;
                    const { error } = await supabase.from(op.table as any).update(updateData as any).eq('id', id);
                    if (!error) successIds.push(op.id);
                }
            } catch { }
        }
        if (successIds.length > 0) {
            setPendingOperations(prev => prev.filter(op => !successIds.includes(op.id)));
            toast.success(`✅ ${successIds.length} opération(s) synchronisée(s)`);
        }
        setIsSyncing(false);
    };

    const addOperation = useCallback((table: string, type: 'insert' | 'update' | 'delete', data: Record<string, unknown>) => {
        const operation: CachedOperation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            table, type, data, timestamp: Date.now(),
        };
        setPendingOperations(prev => [...prev, operation]);
        if (isOnline) syncPendingOperations();
        return operation.id;
    }, [isOnline]);

    const clearCache = useCallback(() => {
        setPendingOperations([]);
        localStorage.removeItem(CACHE_KEY);
    }, []);

    return { isOnline, pendingCount: pendingOperations.length, isSyncing, addOperation, syncNow: syncPendingOperations, clearCache };
}

export default useOfflineCache;
