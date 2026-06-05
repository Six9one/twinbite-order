import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WizardProductType = 
    | 'soufflet' 
    | 'tacos' 
    | 'makloub' 
    | 'mlawi' 
    | 'panini' 
    | 'pizza_senior' 
    | 'pizza_mega'
    | 'option_frites'
    | 'option_boisson'
    | 'option_menu';

interface WizardImageSetting {
    setting_key: string;
    setting_value: { image_url?: string } | null;
}

/**
 * Hook to fetch wizard image for a specific product type
 */
const WIZARD_CACHE = {
    staleTime: 1000 * 60 * 60, // 1 hour — images never change during a shift
    gcTime:    1000 * 60 * 60 * 4,
};

export function useWizardImage(productType: WizardProductType) {
    return useQuery({
        queryKey: ['wizard_image', productType],
        ...WIZARD_CACHE,
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
 * Hook to fetch pizza format selection images (Senior & Mega)
 */
export function usePizzaFormatImages() {
    return useQuery({
        queryKey: ['wizard_images', 'pizza_format'],
        ...WIZARD_CACHE,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('admin_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['wizard_image_pizza_senior', 'wizard_image_pizza_mega']);

            if (error) throw error;

            const result = { senior: null as string | null, mega: null as string | null };
            if (data) {
                data.forEach((item: WizardImageSetting) => {
                    const value = item.setting_value as { image_url?: string } | null;
                    if (item.setting_key === 'wizard_image_pizza_senior') {
                        result.senior = value?.image_url || null;
                    } else if (item.setting_key === 'wizard_image_pizza_mega') {
                        result.mega = value?.image_url || null;
                    }
                });
            }
            return result;
        },
    });
}

/**
 * Hook to fetch menu option images (Frites, Boisson, Menu Complet)
 */
export function useMenuOptionImages() {
    return useQuery({
        queryKey: ['wizard_images', 'menu_options'],
        ...WIZARD_CACHE,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('admin_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['wizard_image_option_frites', 'wizard_image_option_boisson', 'wizard_image_option_menu']);

            if (error) throw error;

            const result = { frites: null as string | null, boisson: null as string | null, menu: null as string | null };
            if (data) {
                data.forEach((item: WizardImageSetting) => {
                    const value = item.setting_value as { image_url?: string } | null;
                    if (item.setting_key === 'wizard_image_option_frites') {
                        result.frites = value?.image_url || null;
                    } else if (item.setting_key === 'wizard_image_option_boisson') {
                        result.boisson = value?.image_url || null;
                    } else if (item.setting_key === 'wizard_image_option_menu') {
                        result.menu = value?.image_url || null;
                    }
                });
            }
            return result;
        },
    });
}

/**
 * Hook to fetch all wizard images (for admin panel)
 */
export function useAllWizardImages() {
    return useQuery({
        queryKey: ['wizard_images', 'all'],
        ...WIZARD_CACHE,
        queryFn: async () => {
            const productTypes: WizardProductType[] = [
                'soufflet', 'tacos', 'makloub', 'mlawi', 'panini', 'pizza_senior', 'pizza_mega',
                'option_frites', 'option_boisson', 'option_menu'
            ];
            const results: Record<WizardProductType, string | null> = {
                soufflet: null,
                tacos: null,
                makloub: null,
                mlawi: null,
                panini: null,
                pizza_senior: null,
                pizza_mega: null,
                option_frites: null,
                option_boisson: null,
                option_menu: null,
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
