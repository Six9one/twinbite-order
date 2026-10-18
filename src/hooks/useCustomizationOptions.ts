import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveImg } from '@/utils/resolveImg';

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

// The DB holds several rows with the same name (an active one + an old inactive copy,
// or even two active copies): keep ONE row per name, preferring the active one, so the
// wizards never show an option twice nor save it twice ("Pomme de terre, Pomme de terre").
// Inactive-only options are kept: the wizards display them as "Rupture".
export function dedupeOptionsByName<T extends { name: string; is_active?: boolean }>(options: T[]): T[] {
  const byName = new Map<string, T>();
  for (const opt of options) {
    const key = (opt.name || '').trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || (existing.is_active === false && opt.is_active !== false)) byName.set(key, opt);
  }
  // Preserve the original display order
  return options.filter(opt => byName.get((opt.name || '').trim().toLowerCase()) === opt);
}

function makeOptionHook(table: string) {
  return () => useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return dedupeOptionsByName(data as unknown as CustomizationOption[]).map(opt => ({
        ...opt,
        image_url: resolveImg(opt.image_url) || null
      }));
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
