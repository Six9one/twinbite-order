import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WizardProductType = 'soufflet' | 'tacos' | 'makloub' | 'mlawi' | 'panini';

interface WizardImageSetting {
    setting_key: string;
    setting_value: { image_url?: string } | null;
}

/**
 * Hook to fetch wizard image for a specific product type
 */
export function useWizardImage(productType: WizardProductType) {
    return useQuery({
        queryKey: ['wizard_image', productType],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('admin_settings')
                .select('setting_value')
                .eq('setting_key', `wizard_image_${productType}`)
                .maybeSingle();

            if (error) throw error;

            const value = data?.setting_value as { image_url?: string } | null;
            return value?.image_url || null;
        },
    });
}

/**
 * Hook to fetch all wizard images (for admin panel)
 */
export function useAllWizardImages() {
    return useQuery({
        queryKey: ['wizard_images', 'all'],
        queryFn: async () => {
            const productTypes: WizardProductType[] = ['soufflet', 'tacos', 'makloub', 'mlawi', 'panini'];
            const results: Record<WizardProductType, string | null> = {
                soufflet: null,
                tacos: null,
                makloub: null,
                mlawi: null,
                panini: null,
            };

            const { data, error } = await supabase
                .from('admin_settings')
                .select('setting_key, setting_value')
                .like('setting_key', 'wizard_image_%');

            if (error) throw error;

            if (data) {
                data.forEach((item: WizardImageSetting) => {
                    const productType = item.setting_key.replace('wizard_image_', '') as WizardProductType;
                    if (productTypes.includes(productType)) {
                        const value = item.setting_value as { image_url?: string } | null;
                        results[productType] = value?.image_url || null;
                    }
                });
            }

            return results;
        },
    });
}
