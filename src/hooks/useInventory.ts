import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface InventoryCategory {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon: string;
    display_order: number;
    is_active: boolean;
}

export interface InventoryItem {
    id: string;
    category_id: string;
    name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    max_stock: number;
    last_price: number | null;
    supplier_name: string | null;
    is_active: boolean;
    display_order: number;
    notes: string | null;
    // Computed
    category?: InventoryCategory;
    is_low_stock?: boolean;
}

export interface SupplierOrder {
    id: string;
    items: SupplierOrderItem[];
    supplier_name: string | null;
    supplier_phone: string | null;
    total_items: number;
    sent_via: string;
    status: 'draft' | 'sent' | 'received';
    sent_at: string | null;
    created_by: string | null;
    notes: string | null;
    created_at: string;
}

export interface SupplierOrderItem {
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
}

// =====================================
// FETCH CATEGORIES
// =====================================
export function useInventoryCategories() {
    return useQuery({
        queryKey: ['inventory-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_categories' as any)
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;
            return data as unknown as InventoryCategory[];
        },
    });
}

// =====================================
// FETCH ITEMS (with category info)
// =====================================
export function useInventoryItems(categorySlug?: string) {
    return useQuery({
        queryKey: ['inventory-items', categorySlug],
        queryFn: async () => {
            let query = supabase
                .from('inventory_items' as any)
                .select(`
          *,
          category:inventory_categories(*)
        `)
                .eq('is_active', true)
                .order('display_order');

            if (categorySlug) {
                // First get category id
                const { data: catData } = await supabase
                    .from('inventory_categories' as any)
                    .select('id')
                    .eq('slug', categorySlug)
                    .single();

                if (catData) {
                    query = query.eq('category_id', (catData as any).id);
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            // Add computed fields
            return (data as unknown as InventoryItem[]).map(item => ({
                ...item,
                is_low_stock: item.current_stock <= item.min_stock,
            }));
        },
    });
}

// =====================================
// UPDATE STOCK QUANTITY
// =====================================
export function useUpdateStock() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ itemId, newStock }: { itemId: string; newStock: number }) => {
            const { error } = await supabase
                .from('inventory_items' as any)
                .update({ current_stock: newStock } as any)
                .eq('id', itemId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        },
    });
}

// =====================================
// ADD ITEM TO INVENTORY
// =====================================
export function useAddInventoryItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: Partial<InventoryItem>) => {
            const { error } = await supabase
                .from('inventory_items' as any)
                .insert(item as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        },
    });
}

// =====================================
// CREATE SUPPLIER ORDER
// =====================================
export function useCreateSupplierOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<SupplierOrder>) => {
            const { data, error } = await supabase
                .from('supplier_orders' as any)
                .insert({
                    ...order,
                    total_items: order.items?.length || 0,
                } as any)
                .select()
                .single();

            if (error) throw error;
            return data as unknown as SupplierOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
        },
    });
}

// =====================================
// GET SUPPLIER ORDERS HISTORY
// =====================================
export function useSupplierOrders() {
    return useQuery({
        queryKey: ['supplier-orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('supplier_orders' as any)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as unknown as SupplierOrder[];
        },
    });
}

// =====================================
// GET LOW STOCK ALERTS
// =====================================
export function useLowStockAlerts() {
    return useQuery({
        queryKey: ['low-stock-alerts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_items' as any)
                .select(`
          *,
          category:inventory_categories(name, color)
        `)
                .eq('is_active', true)
                .lte('current_stock', supabase.rpc ? 0 : 0); // Will need raw SQL for this

            if (error) throw error;

            // Filter in JS for now (current_stock <= min_stock)
            return (data as unknown as InventoryItem[]).filter(
                item => item.current_stock <= item.min_stock
            );
        },
    });
}

// =====================================
// GENERATE WHATSAPP MESSAGE
// =====================================
export function generateSupplierMessage(items: SupplierOrderItem[]): string {
    const date = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    let message = `📦 *Commande Twin Pizza*\n`;
    message += `📅 ${date}\n\n`;

    items.forEach((item, index) => {
        message += `${index + 1}. ${item.quantity} ${item.unit} ${item.item_name}\n`;
    });

    message += `\n✅ Total: ${items.length} produits`;
    message += `\n\nMerci! 🍕`;

    return message;
}
