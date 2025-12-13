import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export function useAdminSetting(key: string) {
  return useQuery({
    queryKey: ['admin_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', key)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAdminSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', key)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from('admin_settings')
          .update({ 
            setting_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('admin_settings')
          .insert([{ 
            setting_key: key, 
            setting_value: value,
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin_settings', variables.key] });
    },
  });
}

export function useTvShowPrices() {
  const { data, isLoading } = useAdminSetting('tv_show_prices');
  const value = data?.setting_value as { enabled?: boolean } | null;
  return {
    showPrices: value?.enabled ?? true,
    isLoading,
  };
}

export function usePizzaLayout() {
  const { data, isLoading } = useAdminSetting('pizza_layout');
  const value = data?.setting_value as { mode?: string; size?: string } | null;
  return {
    mode: value?.mode ?? 'grid',
    size: value?.size ?? 'medium',
    isLoading,
  };
}
