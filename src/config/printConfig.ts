// Print Server Configuration
// Used for direct thermal printing from admin panels via Supabase realtime

import { supabase } from '@/integrations/supabase/client';

// Print HACCP ticket by adding to print queue
// The print server listens for new entries via Supabase realtime
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

        if (error) {
            console.error('Failed to queue HACCP print:', error);
            return false;
        }

        return true;
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
    expiryDate: string;
    operator: string;
}): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('haccp_print_queue' as any)
            .insert({
                product_name: data.productName,
                category_name: 'Congélation',
                category_color: '#3b82f6', // blue
                action_date: data.frozenDate,
                dlc_date: data.expiryDate,
                storage_temp: '-18°C',
                operator: data.operator,
                dlc_hours: 2160, // 90 days = 3 months
                action_label: 'Mise en congélation',
                // Additional freezer-specific fields stored in notes
                notes: JSON.stringify({
                    type: 'freezer',
                    originalDlc: data.originalDlc,
                    lotNumber: data.lotNumber,
                    weight: data.weight,
                }),
            } as any);

        if (error) {
            console.error('Failed to queue freezer label print:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to queue freezer label print:', error);
        return false;
    }
}

// Print a simple date label ("Fait le / À consommer avant le")
// For sticking on sauces, bottles, and other kitchen items
export async function printDateLabel(data: {
    productName: string;
    madeDate: string;       // "Fait le" or "Ouvert le" date string
    useByDate: string;      // "À consommer avant le" date string
    actionType: 'fait' | 'ouvert'; // "Fait le" or "Ouvert le"
    operator: string;
    copies: number;
}): Promise<boolean> {
    try {
        // Insert one row per copy — each triggers a print via realtime
        const rows = Array.from({ length: data.copies }, () => ({
            product_name: data.productName,
            category_name: 'Étiquette Date',
            category_color: '#f59e0b', // amber
            action_date: data.madeDate,
            dlc_date: data.useByDate,
            storage_temp: '',
            operator: data.operator,
            dlc_hours: 0,
            action_label: data.actionType === 'fait' ? 'Fait le' : 'Ouvert le',
            notes: JSON.stringify({ type: 'date_label', actionType: data.actionType }),
        }));

        const { error } = await supabase
            .from('haccp_print_queue' as any)
            .insert(rows as any);

        if (error) {
            console.error('Failed to queue date label print:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to queue date label print:', error);
        return false;
    }
}
