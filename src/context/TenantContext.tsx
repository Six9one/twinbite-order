import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setSupabaseTenantHeader } from '@/integrations/supabase/client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  plan?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const DEFAULT_TENANT: Tenant = {
  id: DEFAULT_TENANT_ID,
  name: 'Twin Pizza',
  slug: 'twin-pizza',
  domain: 'twinpizza.fr',
  plan: 'pro',
  is_active: true,
};

interface TenantContextType {
  tenant: Tenant;
  setTenant: (tenant: Tenant) => void;
  isLoading: boolean;
  switchTenantBySlug: (slug: string) => Promise<boolean>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: DEFAULT_TENANT,
  setTenant: () => {},
  isLoading: false,
  switchTenantBySlug: async () => false,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant>(() => {
    const saved = localStorage.getItem('twinbite_tenant');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback if JSON parse fails
      }
    }
    return DEFAULT_TENANT;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper to persist tenant to storage & update Supabase client headers if applicable
  const handleSetTenant = (newTenant: Tenant) => {
    setTenant(newTenant);
    localStorage.setItem('twinbite_tenant', JSON.stringify(newTenant));
  };

  const switchTenantBySlug = async (slug: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.warn(`Tenant with slug "${slug}" not found, using default tenant.`, error);
        return false;
      }

      const foundTenant = data as Tenant;
      handleSetTenant(foundTenant);
      return true;
    } catch (err) {
      console.error('Error switching tenant by slug:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Keep Supabase postgrest headers synced with active tenant ID
    if (tenant?.id) {
      setSupabaseTenantHeader(tenant.id);
    }
  }, [tenant?.id]);

  const resolveTenantFromHostname = async (): Promise<boolean> => {
    try {
      const hostname = window.location.hostname;
      // Skip local IP/localhost defaults unless query param exists
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app')) {
        return false;
      }

      // Check full custom domain match
      const { data: domainData } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', hostname)
        .single();

      if (domainData) {
        handleSetTenant(domainData as Tenant);
        return true;
      }

      // Check subdomain match (e.g. mamma-mia.twinbite.fr -> mamma-mia)
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const subSlug = parts[0];
        const { data: subData } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', subSlug)
          .single();

        if (subData) {
          handleSetTenant(subData as Tenant);
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Error resolving tenant from hostname:', err);
      return false;
    }
  };

  useEffect(() => {
    // 1. URL Query param tenant override (e.g. ?tenant=mamma-mia)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantSlug = urlParams.get('tenant');
    if (tenantSlug) {
      switchTenantBySlug(tenantSlug);
    } else {
      // 2. Resolve from hostname or subdomain if on live environment
      resolveTenantFromHostname();
    }
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        setTenant: handleSetTenant,
        isLoading,
        switchTenantBySlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
