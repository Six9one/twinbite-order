import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductSizePrice {
    id: string;
    product_type: string;
    size_id: string;
    size_label: string;
    max_meats: number;
    price: number;
    display_order: number;
    is_active: boolean;
}

export function useProductSizePrices(productType?: string) {
    return useQuery({
        queryKey: ['product_size_prices', productType],
        queryFn: async () => {
            let query = supabase
                .from('product_size_prices')
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (productType) {
                query = query.eq('product_type', productType);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching product size prices:', error);
                return [];
            }

            return data as ProductSizePrice[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
