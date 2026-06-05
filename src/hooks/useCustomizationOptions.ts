import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

// Options (meats, sauces…) change very rarely — cache hard so the wizards
// open INSTANTLY from cache and never re-flicker when switching categories.
const QUERY_OPTS = {
  staleTime: 1000 * 60 * 15,   // 15 min: serve from cache, no refetch
  gcTime:    1000 * 60 * 60,   // keep in memory 1 h
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

function makeOptionHook(table: string) {
  return () => useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as CustomizationOption[];
    },
    ...QUERY_OPTS,
  });
}

export const useMeatOptions       = makeOptionHook('meat_options');
export const useSauceOptions      = makeOptionHook('sauce_options');
export const useGarnitureOptions  = makeOptionHook('garniture_options');
export const useSupplementOptions = makeOptionHook('supplement_options');
export const useCruditesOptions   = makeOptionHook('crudites_options');
export const useDrinks            = makeOptionHook('drinks');
export const useDesserts          = makeOptionHook('desserts');
