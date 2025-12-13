import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentSettings {
  online_payments_enabled: boolean;
  stripe_configured: boolean;
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'payment_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment settings:', error);
        // Default to enabled if no setting found
        return { online_payments_enabled: true, stripe_configured: true };
      }

      if (!data) {
        return { online_payments_enabled: true, stripe_configured: true };
      }

      const value = data.setting_value as unknown as PaymentSettings;
      return {
        online_payments_enabled: value?.online_payments_enabled ?? true,
        stripe_configured: value?.stripe_configured ?? true,
      };
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}
