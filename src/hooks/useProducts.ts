import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  pizza_base: string | null;
  category_id: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

// Fetch all categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    }
  });
}

// Fetch products by category slug
export function useProductsByCategory(categorySlug: string) {
  return useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async () => {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
      
      if (!category) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!categorySlug
  });
}

// Fetch pizzas by base (tomate or creme)
export function usePizzasByBase(base: 'tomate' | 'creme') {
  return useQuery({
    queryKey: ['pizzas', base],
    queryFn: async () => {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'pizzas')
        .single();
      
      if (!category) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', category.id)
        .eq('pizza_base', base)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Product[];
    }
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
      return data;
    }
  });
}

// Upload product image
export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { upsert: true });

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
