// Print Server Configuration
// Used for direct thermal printing from admin/kitchen panels via local HTTP fast-path or Supabase realtime queue

import { supabase } from '@/integrations/supabase/client';

const LOCAL_PRINT_SERVER = 'http://localhost:3001';

async function sendDirectHTTPHACCP(payload: Record<string, any>): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${LOCAL_PRINT_SERVER}/print-haccp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            return !!data.success;
        }
    } catch {
        // Direct HTTP print server not available on localhost or timed out
    }
    return false;
}

// Print HACCP ticket by direct HTTP fast path, or fallback to Supabase queue if server is remote/cloud
export async function printHACCPDirect(data: {
    productName: string;
    categoryName: string;
    categoryColor: string;
    actionDate: string;
    dlcDate: string;
    storageTemp: string;
    operator: string;
    dlcHours: number;
    actionLabel: string;
}): Promise<boolean> {
    // 1. Direct local HTTP fast-path (prevents double-printing)
    const httpSuccess = await sendDirectHTTPHACCP(data);
    if (httpSuccess) return true;

    // 2. Fallback to Supabase queue for remote/cloud client
    try {
        const { error } = await supabase
            .from('haccp_print_queue' as any)
            .insert({
                product_name: data.productName,
                category_name: data.categoryName,
                category_color: data.categoryColor,
                action_date: data.actionDate,
                dlc_date: data.dlcDate,
                storage_temp: data.storageTemp,
                operator: data.operator,
                dlc_hours: data.dlcHours,
                action_label: data.actionLabel,
            } as any);

        return !error;
    } catch (error) {
        console.error('Failed to queue HACCP print:', error);
        return false;
    }
}

// Print Freezer/Congélation ticket
export async function printFreezerLabel(data: {
    productName: string;
    frozenDate: string;
    originalDlc: string;
    lotNumber: string;
    weight: string;
    origin: string;
    expiryDate: string;
    operator: string;
}): Promise<boolean> {
    const payload = {
        productName: data.productName,
        categoryName: 'Congélation',
        actionDate: data.frozenDate,
        dlcDate: data.expiryDate,
        operator: data.operator,
        notes: JSON.stringify({
            originalDlc: data.originalDlc,
            lotNumber: data.lotNumber,
            weight: data.weight,
            origin: data.origin,
        }),
    };

    // 1. Direct local HTTP fast-path
    const httpSuccess = await sendDirectHTTPHACCP(payload);
    if (httpSuccess) return true;

    // 2. Fallback to Supabase queue
    try {
        const { error } = await supabase
            .from('haccp_print_queue' as any)
            .insert({
                product_name: data.productName,
                category_name: 'Congélation',
                category_color: '#3b82f6',
                action_date: data.frozenDate,
                dlc_date: data.expiryDate,
                storage_temp: '-18°C',
                operator: data.operator,
                dlc_hours: 2160,
                action_label: 'Mise en congélation',
                notes: payload.notes,
            } as any);

        return !error;
    } catch (error) {
        console.error('Failed to queue freezer label print:', error);
        return false;
    }
}

// Print a simple date label ("Fait le / À consommer avant le")
export async function printDateLabel(data: {
    productName: string;
    madeDate: string;
    useByDate?: string;
    actionType: 'fait' | 'ouvert';
    operator: string;
    copies: number;
}): Promise<boolean> {
    let httpSuccess = false;
    for (let i = 0; i < (data.copies || 1); i++) {
        const ok = await sendDirectHTTPHACCP({
            productName: data.productName,
            categoryName: 'ETIQUETTE_DATE',
            actionDate: data.madeDate,
            dlcDate: data.useByDate || data.madeDate,
            actionLabel: data.actionType === 'fait' ? 'Fait le' : 'Ouvert le',
            operator: data.operator,
        });
        if (ok) httpSuccess = true;
    }

    if (httpSuccess) return true;

    // Fallback to Supabase queue only if HTTP fast-path failed
    try {
        const rows = Array.from({ length: data.copies || 1 }, () => ({
            product_name: data.productName,
            category_name: 'ETIQUETTE_DATE',
            category_color: '#f59e0b',
            action_date: data.madeDate,
            dlc_date: data.useByDate || data.madeDate,
            storage_temp: '-',
            operator: data.operator,
            dlc_hours: 0,
            action_label: data.actionType === 'fait' ? 'Fait le' : 'Ouvert le',
        }));

        const { error } = await supabase
            .from('haccp_print_queue' as any)
            .insert(rows as any);

        return !error;
    } catch (error) {
        console.error('Failed to queue date label print:', error);
        return false;
    }
}
