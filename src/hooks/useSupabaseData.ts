import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types based on database schema
export interface DeliveryZone {
  id: string;
  name: string;
  min_order: number;
  delivery_fee: number;
  estimated_time: string;
  is_active: boolean;
}

export interface MeatOption {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

export interface SauceOption {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

export interface GarnitureOption {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

export interface SupplementOption {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export interface Dessert {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: 'emporter' | 'livraison' | 'surplace';
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_notes?: string;
  delivery_zone_id?: string;
  items: any;
  subtotal: number;
  tva: number;
  delivery_fee: number;
  total: number;
  payment_method: 'cb' | 'especes' | 'en_ligne';
  created_at: string;
  updated_at: string;
}

// Delivery Zones
export function useDeliveryZones() {
  return useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('min_order', { ascending: true });
      if (error) throw error;
      return data as DeliveryZone[];
    }
  });
}

// Meat Options
export function useMeatOptions() {
  return useQuery({
    queryKey: ['meat-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meat_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as MeatOption[];
    }
  });
}

// Sauce Options
export function useSauceOptions() {
  return useQuery({
    queryKey: ['sauce-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sauce_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as SauceOption[];
    }
  });
}

// Garniture Options
export function useGarnitureOptions() {
  return useQuery({
    queryKey: ['garniture-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('garniture_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as GarnitureOption[];
    }
  });
}

// Supplement Options
export function useSupplementOptions() {
  return useQuery({
    queryKey: ['supplement-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as SupplementOption[];
    }
  });
}

// Drinks
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
      return data as Drink[];
    }
  });
}

// Desserts
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
      return data as Dessert[];
    }
  });
}

// Orders
export function useOrders(dateFilter?: string) {
  return useQuery({
    queryKey: ['orders', dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    }
  });
}

// Create Order
export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

// Update Order Status
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order['status'] }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

// Generate order number with customizable prefix
export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-4);
  
  // Get custom prefix from localStorage, default to 'TW'
  const prefix = typeof window !== 'undefined' 
    ? (localStorage.getItem('orderPrefix') || 'TW')
    : 'TW';
  
  return `${prefix}${dateStr}-${timeStr}`;
}
