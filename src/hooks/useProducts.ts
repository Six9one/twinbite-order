import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveImg } from '@/utils/resolveImg';
import { pizzasTomate, pizzasCreme, menuItems } from '@/data/menu';

// Menu data changes rarely — cache hard for instant POS loading.
const MENU_CACHE = {
  staleTime: 1000 * 60 * 10,
  gcTime:    1000 * 60 * 60,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

export interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  pizza_base: string | null;
  pizza_base_special?: string | null;
  category_id: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_top_picked?: boolean;
  image_fit?: string;
  image_zoom?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Pizzas', slug: 'pizzas', display_order: 1, is_active: true },
  { id: '2', name: 'Tacos', slug: 'tacos', display_order: 2, is_active: true },
  { id: '3', name: 'Soufflets', slug: 'soufflets', display_order: 3, is_active: true },
  { id: '4', name: 'Makloub', slug: 'makloub', display_order: 4, is_active: true },
  { id: '5', name: 'Mlawi', slug: 'mlawi', display_order: 5, is_active: true },
  { id: '6', name: 'Panini', slug: 'panini', display_order: 6, is_active: true },
  { id: '7', name: 'Croques', slug: 'croques', display_order: 7, is_active: true },
  { id: '8', name: 'Tex-Mex', slug: 'texmex', display_order: 8, is_active: true },
  { id: '9', name: 'Frites', slug: 'frites', display_order: 9, is_active: true },
  { id: '10', name: 'Milkshakes', slug: 'milkshakes', display_order: 10, is_active: true },
  { id: '11', name: 'Crêpes', slug: 'crepes', display_order: 11, is_active: true },
  { id: '12', name: 'Gaufres', slug: 'gaufres', display_order: 12, is_active: true },
  { id: '13', name: 'Boissons', slug: 'boissons', display_order: 13, is_active: true },
];

// Fetch all categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (error || !data || data.length === 0) return DEFAULT_CATEGORIES;
        return data as Category[];
      } catch (e) {
        return DEFAULT_CATEGORIES;
      }
    },
    ...MENU_CACHE,
  });
}

// Fetch products by category slug
export function useProductsByCategory(categorySlug: string) {
  return useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async () => {
      const fallback = menuItems.filter((i: any) => i.category === categorySlug).map((i: any) => ({
        id: i.id,
        name: i.name,
        description: i.description || null,
        base_price: i.price,
        pizza_base: i.base || null,
        category_id: i.category,
        image_url: i.imageUrl || i.image_url || null,
        display_order: 1,
        is_active: true,
      }));

      try {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();

        if (!category) return fallback as Product[];

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error || !data || data.length === 0) return fallback as Product[];
        return (data as Product[]).map(p => ({
          ...p,
          image_url: resolveImg(p.image_url) || null
        }));
      } catch (e) {
        return fallback as Product[];
      }
    },
    enabled: !!categorySlug,
    ...MENU_CACHE,
  });
}

// Fetch pizzas by base (tomate or creme)
export function usePizzasByBase(base: 'tomate' | 'creme') {
  const fallbackList = base === 'tomate' ? pizzasTomate : pizzasCreme;
  const fallbackProducts: Product[] = fallbackList.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    base_price: p.price || 18,
    pizza_base: base,
    category_id: 'pizzas',
    image_url: p.imageUrl || p.image_url || null,
    display_order: 1,
    is_active: true,
  }));

  return useQuery({
    queryKey: ['pizzas', base],
    queryFn: async () => {
      try {
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', 'pizzas')
          .single();

        if (!category) return fallbackProducts;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', category.id)
          .eq('pizza_base', base)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error || !data || data.length === 0) return fallbackProducts;
        return (data as Product[]).map(p => ({
          ...p,
          image_url: resolveImg(p.image_url) || null
        }));
      } catch (e) {
        return fallbackProducts;
      }
    },
    ...MENU_CACHE,
  });
}

// Fetch all products for admin
export function useAllProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        image_url: resolveImg(p.image_url) || null
      }));
    }
  });
}

import { compressImage } from '@/utils/imageCompressor';

// Upload product image
export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  const compressedFile = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
  const fileExt = compressedFile.name.split('.').pop();
  const fileName = `${productId}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, compressedFile, { cacheControl: '31536000', upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Update product
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['all-products'] });
    }
  });
}

// Create product
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['all-products'] });
    }
  });
}

// Delete product (soft delete)
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['all-products'] });
    }
  });
}
