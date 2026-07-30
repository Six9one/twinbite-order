import { useTenant } from '@/context/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface TenantBranding {
  name: string;
  slug: string;
  logoUrl: string;
  phone: string;
  address: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor?: string;
}

const DEFAULT_BRANDING: TenantBranding = {
  name: 'Twin Pizza',
  slug: 'twin-pizza',
  logoUrl: '/favicon.png',
  phone: '01 23 45 67 89',
  address: '123 Rue de la Pizza, Paris',
  heroTitle: 'TWIN PIZZA',
  heroSubtitle: 'Pizzas Artisanales au Feu de Bois',
};

export function useTenantSettings(): TenantBranding {
  const { tenant } = useTenant();

  const { data: siteSettings } = useQuery({
    queryKey: ['site_settings', tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings' as any)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Error fetching site_settings for tenant:', error);
        return null;
      }
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const branding: TenantBranding = {
    name: tenant.name || DEFAULT_BRANDING.name,
    slug: tenant.slug || DEFAULT_BRANDING.slug,
    logoUrl: (siteSettings as any)?.logo_url || DEFAULT_BRANDING.logoUrl,
    phone: (siteSettings as any)?.phone || DEFAULT_BRANDING.phone,
    address: (siteSettings as any)?.address || DEFAULT_BRANDING.address,
    heroTitle: tenant.name.toUpperCase(),
    heroSubtitle: (siteSettings as any)?.hero_subtitle || 'Commandez vos plats préférés en ligne',
  };

  // Synchronize document <title> tag with active tenant name
  useEffect(() => {
    if (tenant.name) {
      document.title = `${tenant.name} | Commande en ligne`;
    }
  }, [tenant.name]);

  return branding;
}
