import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SandwichType {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
}

export interface CruditeOption {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export function useSandwichTypes() {
  return useQuery({
    queryKey: ['sandwich_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sandwich_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as SandwichType[];
    },
  });
}

export function useAllSandwichTypes() {
  return useQuery({
    queryKey: ['sandwich_types_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sandwich_types')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as SandwichType[];
    },
  });
}

export function useCruditeOptions() {
  return useQuery({
    queryKey: ['crudites_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crudites_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CruditeOption[];
    },
  });
}

export function useAllCruditeOptions() {
  return useQuery({
    queryKey: ['crudites_options_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crudites_options')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as CruditeOption[];
    },
  });
}

export function useUpdateSandwichType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SandwichType> & { id: string }) => {
      const { data, error } = await supabase
        .from('sandwich_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sandwich_types'] });
      queryClient.invalidateQueries({ queryKey: ['sandwich_types_all'] });
    },
  });
}

export function useCreateSandwichType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newSandwich: Omit<SandwichType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sandwich_types')
        .insert(newSandwich)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sandwich_types'] });
      queryClient.invalidateQueries({ queryKey: ['sandwich_types_all'] });
    },
  });
}

export function useDeleteSandwichType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sandwich_types')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sandwich_types'] });
      queryClient.invalidateQueries({ queryKey: ['sandwich_types_all'] });
    },
  });
}
