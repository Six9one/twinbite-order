import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SETTING_KEY = 'disabled_categories';

/**
 * Hook to manage which product categories are temporarily disabled (unavailable).
 * Stores a JSON array of disabled category slugs in the site_settings table.
 * 
 * Categories that are disabled will NOT appear on the client-facing menu.
 * Admins can toggle them on/off from the admin panel.
 */
export function useDisabledCategories() {
    const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDisabled = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings' as any)
                .select('value')
                .eq('key', SETTING_KEY)
                .maybeSingle();

            if (error) {
                console.error('Error fetching disabled categories:', error);
                return;
            }

            if (data) {
                try {
                    const parsed = JSON.parse((data as any).value || '[]');
                    setDisabledCategories(Array.isArray(parsed) ? parsed : []);
                } catch {
                    setDisabledCategories([]);
                }
            } else {
                setDisabledCategories([]);
            }
        } catch (error) {
            console.error('Error fetching disabled categories:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDisabled();

        // Subscribe to realtime changes so the client menu updates live
        const channel = supabase
            .channel('disabled-categories-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'site_settings' },
                (payload: any) => {
                    if (payload.new?.key === SETTING_KEY || payload.old?.key === SETTING_KEY) {
                        fetchDisabled();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDisabled]);

    /**
     * Toggle a category's availability. If currently disabled, enable it. Vice versa.
     */
    const toggleCategory = async (categorySlug: string) => {
        const isCurrentlyDisabled = disabledCategories.includes(categorySlug);
        const newDisabled = isCurrentlyDisabled
            ? disabledCategories.filter(c => c !== categorySlug)
            : [...disabledCategories, categorySlug];

        // Optimistic update
        setDisabledCategories(newDisabled);

        try {
            // Upsert the setting
            const { error } = await supabase
                .from('site_settings' as any)
                .upsert(
                    { key: SETTING_KEY, value: JSON.stringify(newDisabled) } as any,
                    { onConflict: 'key' }
                );

            if (error) {
                console.error('Error updating disabled categories:', error);
                // Revert on error
                setDisabledCategories(disabledCategories);
                throw error;
            }
        } catch (error) {
            // Revert on error
            setDisabledCategories(disabledCategories);
            throw error;
        }
    };

    /**
     * Check if a specific category is currently disabled.
     */
    const isCategoryDisabled = (categorySlug: string) => {
        return disabledCategories.includes(categorySlug);
    };

    return {
        disabledCategories,
        loading,
        toggleCategory,
        isCategoryDisabled,
        refetch: fetchDisabled,
    };
}
