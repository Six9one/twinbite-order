import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Get device type
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track product view
export async function trackProductView(productId: string, productName: string, categorySlug: string) {
  try {
    await supabase.from('product_analytics').insert({
      product_id: productId,
      product_name: productName,
      category_slug: categorySlug,
      action_type: 'view',
      session_id: getSessionId(),
      device_type: getDeviceType()
    });
  } catch (error) {
    console.error('Error tracking product view:', error);
  }
}

// Track add to cart
export async function trackAddToCart(productId: string, productName: string, categorySlug: string) {
  try {
    await supabase.from('product_analytics').insert({
      product_id: productId,
      product_name: productName,
      category_slug: categorySlug,
      action_type: 'add_to_cart',
      session_id: getSessionId(),
      device_type: getDeviceType()
    });
  } catch (error) {
    console.error('Error tracking add to cart:', error);
  }
}

// Track order
export async function trackProductOrder(productId: string, productName: string, categorySlug: string) {
  try {
    await supabase.from('product_analytics').insert({
      product_id: productId,
      product_name: productName,
      category_slug: categorySlug,
      action_type: 'order',
      session_id: getSessionId(),
      device_type: getDeviceType()
    });
  } catch (error) {
    console.error('Error tracking order:', error);
  }
}

// Hook to get product popularity stats (admin only)
export function useProductPopularity(days = 30) {
  return useQuery({
    queryKey: ['product-popularity', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('product_analytics')
        .select('product_name, category_slug, action_type')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      // Aggregate data
      const stats: Record<string, { views: number; carts: number; orders: number; name: string; category: string }> = {};
      
      data?.forEach((item: any) => {
        const key = item.product_name;
        if (!stats[key]) {
          stats[key] = { views: 0, carts: 0, orders: 0, name: item.product_name, category: item.category_slug };
        }
        if (item.action_type === 'view') stats[key].views++;
        if (item.action_type === 'add_to_cart') stats[key].carts++;
        if (item.action_type === 'order') stats[key].orders++;
      });
      
      // Sort by orders, then carts, then views
      return Object.values(stats).sort((a, b) => {
        if (b.orders !== a.orders) return b.orders - a.orders;
        if (b.carts !== a.carts) return b.carts - a.carts;
        return b.views - a.views;
      });
    }
  });
}

// Hook to get category popularity
export function useCategoryPopularity(days = 30) {
  return useQuery({
    queryKey: ['category-popularity', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('product_analytics')
        .select('category_slug, action_type')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      // Aggregate data
      const stats: Record<string, { views: number; carts: number; orders: number }> = {};
      
      data?.forEach((item: any) => {
        const key = item.category_slug || 'unknown';
        if (!stats[key]) {
          stats[key] = { views: 0, carts: 0, orders: 0 };
        }
        if (item.action_type === 'view') stats[key].views++;
        if (item.action_type === 'add_to_cart') stats[key].carts++;
        if (item.action_type === 'order') stats[key].orders++;
      });
      
      return stats;
    }
  });
}
