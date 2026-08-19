import { supabase } from '@/integrations/supabase/client';
import { SupplierProduct, DEFAULT_SUPPLIER_PRODUCTS } from '@/data/supplierCatalog';

export interface OrderItem {
  product: SupplierProduct;
  quantity: number;
  unit: string;
  notes?: string;
  isCustom?: boolean;
}

export interface SupplierOrder {
  id: string;
  supplierName: string;
  createdAt: string;
  requestedDeliveryDate?: string;
  notes?: string;
  items: OrderItem[];
  totalEstimatedHt: number;
  status: 'draft' | 'sent' | 'partially_received' | 'received';
  receivedItems?: Record<string, boolean>;
  createdBy?: string;
}

const STORAGE_DRAFT_KEY = 'twinpizza_courses_draft_v1';
const STORAGE_CONTACTS_KEY = 'twinpizza_courses_contacts_v1';
const STORAGE_CUSTOM_PRODUCTS_KEY = 'twinpizza_courses_custom_products_v1';
const STORAGE_PRODUCT_OVERRIDES_KEY = 'twinpizza_courses_product_overrides_v1';

export interface SupplierContacts {
  kfaPhone: string;
  bossPhone: string;
  restaurantName: string;
  restaurantAddress: string;
}

export const DEFAULT_CONTACTS: SupplierContacts = {
  kfaPhone: '0614222681',
  bossPhone: '',
  restaurantName: 'Twin Pizza',
  restaurantAddress: '60 Rue Georges Clemenceau, 76530 Grand-Couronne',
};

// Get contacts
export function getSupplierContacts(): SupplierContacts {
  try {
    const saved = localStorage.getItem(STORAGE_CONTACTS_KEY);
    if (saved) return { ...DEFAULT_CONTACTS, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Error reading contacts:', e);
  }
  return DEFAULT_CONTACTS;
}

// Save contacts
export function saveSupplierContacts(contacts: Partial<SupplierContacts>) {
  try {
    const current = getSupplierContacts();
    const updated = { ...current, ...contacts };
    localStorage.setItem(STORAGE_CONTACTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving contacts:', e);
    return DEFAULT_CONTACTS;
  }
}

// Product overrides (custom images, names, etc.)
export function getProductOverrides(): Record<string, Partial<SupplierProduct>> {
  try {
    const saved = localStorage.getItem(STORAGE_PRODUCT_OVERRIDES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading product overrides:', e);
  }
  return {};
}

// Fetch remote overrides from Supabase
export async function syncOverridesFromCloud(): Promise<Record<string, Partial<SupplierProduct>>> {
  try {
    const { data, error } = await supabase
      .from('site_settings' as any)
      .select('value')
      .eq('key', 'courses_catalog_overrides')
      .maybeSingle();

    if (data && (data as any).value) {
      const remote = typeof (data as any).value === 'string' 
        ? JSON.parse((data as any).value) 
        : (data as any).value;
      const local = getProductOverrides();
      const merged = { ...remote, ...local };
      localStorage.setItem(STORAGE_PRODUCT_OVERRIDES_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn('Could not sync overrides from Supabase:', e);
  }
  return getProductOverrides();
}

// Save product override
export function updateProductOverride(productId: string, data: Partial<SupplierProduct>) {
  try {
    const current = getProductOverrides();
    current[productId] = { ...(current[productId] || {}), ...data };
    localStorage.setItem(STORAGE_PRODUCT_OVERRIDES_KEY, JSON.stringify(current));

    // Async push to Supabase site_settings for global synchronization
    (async () => {
      try {
        await supabase
          .from('site_settings' as any)
          .upsert({
            key: 'courses_catalog_overrides',
            value: current,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Failed pushing override to cloud:', err);
      }
    })();

    return current;
  } catch (e) {
    console.error('Error updating product override:', e);
    return {};
  }
}

// Reset all product overrides
export function resetProductOverrides() {
  localStorage.removeItem(STORAGE_PRODUCT_OVERRIDES_KEY);
  supabase
    .from('site_settings' as any)
    .delete()
    .eq('key', 'courses_catalog_overrides')
    .then(() => {});
}

// Get custom products added on the fly
export function getCustomProducts(): SupplierProduct[] {
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOM_PRODUCTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading custom products:', e);
  }
  return [];
}

// Save custom product
export function addCustomProduct(product: SupplierProduct): SupplierProduct[] {
  try {
    const current = getCustomProducts();
    const updated = [product, ...current];
    localStorage.setItem(STORAGE_CUSTOM_PRODUCTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving custom product:', e);
    return [];
  }
}

// Get all products with overrides applied
export function getAllSupplierProducts(): SupplierProduct[] {
  const custom = getCustomProducts();
  const overrides = getProductOverrides();
  
  const all = [...custom, ...DEFAULT_SUPPLIER_PRODUCTS];
  return all.map((prod) => {
    if (overrides[prod.id]) {
      return { ...prod, ...overrides[prod.id] };
    }
    return prod;
  });
}

// Load draft items
export function loadDraftOrder(): Record<string, number> {
  try {
    const saved = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading draft:', e);
  }
  return {};
}

// Save draft items
export function saveDraftOrder(items: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving draft:', e);
  }
}

// Clear draft
export function clearDraftOrder() {
  localStorage.removeItem(STORAGE_DRAFT_KEY);
}

// Clean, flat, simple WhatsApp message without categories or client codes
export function formatWhatsAppOrderMessage(
  order: {
    items: OrderItem[];
    requestedDeliveryDate?: string;
    notes?: string;
    totalEstimatedHt?: number;
  },
  contacts: SupplierContacts = getSupplierContacts()
): string {
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let message = `🍕 *${contacts.restaurantName.toUpperCase()} - COMMANDE*
`;
  message += `📅 Date : ${todayFormatted}
`;
  if (order.requestedDeliveryDate && order.requestedDeliveryDate.trim()) {
    message += `🚚 *Livraison souhaitée :* *${order.requestedDeliveryDate.trim()}*
`;
  }
  message += `
`;

  order.items.forEach(item => {
    message += `• *${item.quantity} ${item.unit}* - ${item.product.name}
`;
    if (item.notes && item.notes.trim()) {
      message += `   ↳ _${item.notes.trim()}_
`;
    }
  });

  if (order.notes && order.notes.trim()) {
    message += `
💬 *Notes :* ${order.notes.trim()}
`;
  }

  message += `
Merci ! 🙏`;

  return message;
}

// Create WhatsApp URL
export function createWhatsAppUrl(phone: string, text: string): string {
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '33' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

// Save order to history / Supabase
export async function saveOrderToSupabase(order: {
  items: OrderItem[];
  requestedDeliveryDate?: string;
  notes?: string;
  totalEstimatedHt?: number;
  supplierName?: string;
}): Promise<string | null> {
  try {
    const orderId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(7);

    const payload = {
      id: orderId,
      supplier_name: order.supplierName || 'KFA DISTRIBUTION',
      requested_delivery_date: order.requestedDeliveryDate || null,
      notes: order.notes || null,
      total_estimated_ht: order.totalEstimatedHt || null,
      items_json: order.items.map(i => ({
        id: i.product.id,
        name: i.product.name,
        reference: i.product.reference,
        quantity: i.quantity,
        unit: i.unit,
        unit_price_ht: i.product.unitPriceEstimate || null,
        received: false,
      })),
      status: 'pending_reception',
      created_at: new Date().toISOString(),
      created_by: 'Staff Cuisine',
    };

    const ordersHistoryKey = 'twinpizza_sent_orders_history';
    const localHistory = JSON.parse(localStorage.getItem(ordersHistoryKey) || '[]');
    localHistory.unshift(payload);
    localStorage.setItem(ordersHistoryKey, JSON.stringify(localHistory.slice(0, 50)));

    return orderId;
  } catch (error) {
    console.error('Error saving order:', error);
    return null;
  }
}

export function getPendingOrdersHistory(): any[] {
  try {
    const ordersHistoryKey = 'twinpizza_sent_orders_history';
    return JSON.parse(localStorage.getItem(ordersHistoryKey) || '[]');
  } catch (e) {
    console.error('Error reading orders history:', e);
    return [];
  }
}
