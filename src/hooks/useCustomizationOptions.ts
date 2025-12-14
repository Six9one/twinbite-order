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

export function useMeatOptions() {
  return useQuery({
    queryKey: ['meat_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meat_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useSauceOptions() {
  return useQuery({
    queryKey: ['sauce_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sauce_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useGarnitureOptions() {
  return useQuery({
    queryKey: ['garniture_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garniture_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useSupplementOptions() {
  return useQuery({
    queryKey: ['supplement_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useCruditesOptions() {
  return useQuery({
    queryKey: ['crudites_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crudites_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useDrinks() {
  return useQuery({
    queryKey: ['drinks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}

export function useDesserts() {
  return useQuery({
    queryKey: ['desserts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('desserts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CustomizationOption[];
    },
  });
}
