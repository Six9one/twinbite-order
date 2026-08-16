import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { getBusinessDateRange } from '@/lib/orderUtils';
export * from '@/lib/orderUtils';

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
  image_url?: string | null;
  display_order?: number;
}

export interface Dessert {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  image_url?: string | null;
  display_order?: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_type?: string;
  order_type?: string;
  delivery_address?: string;
  payment_method: string;
  payment_status?: string;
  payment_provider?: string;
  transaction_id?: string;
  payment_reference?: string;
  paid_at?: string;
  payment_amount?: number;
  payment_currency?: string;
  subtotal?: number;
  tva?: number;
  total: number;
  items: any[];
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

// Delivery Zones
export function useDeliveryZones() {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['delivery-zones', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['meat-options', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['sauce-options', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['garniture-options', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['supplement-options', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['drinks', tenant.id],
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
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['desserts', tenant.id],
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

// Orders with Business Day range (covers night shifts until 04:00 AM)
export function useOrders(dateFilter?: string) {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['orders', tenant.id, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        const { start, end } = getBusinessDateRange(dateFilter);
        query = query
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
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
      const { error } = await supabase
        .from('orders')
        .insert(order as any, { returning: 'minimal' } as any); // avoid SELECT to satisfy RLS policies
      if (error) throw error;
      return null;
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

// Generate order number using server-side continuous counter (never resets: 42, 43, 44...)
export async function generateOrderNumber(): Promise<string> {
  try {
    // Use server-side function that resets daily (001, 002, 003...)
    const { data, error } = await supabase.rpc('get_next_order_number');

    if (!error && data) {
      return data;
    }

    // Fallback: timestamp + random if server call fails
    console.warn('[generateOrderNumber] Server call failed, using fallback:', error);
  } catch (e) {
    console.warn('[generateOrderNumber] Exception, using fallback:', e);
  }

  // Fallback: HHMMSS + 3 random digits
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timeStr}-${random}`;
}
