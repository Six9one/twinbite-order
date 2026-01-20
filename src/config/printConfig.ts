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
