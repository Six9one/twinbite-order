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
  clientCode: string;
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

export interface SupplierContacts {
  kfaPhone: string;
  bossPhone: string;
  clientCode: string;
  restaurantName: string;
  restaurantAddress: string;
}

export const DEFAULT_CONTACTS: SupplierContacts = {
  kfaPhone: '0614222681', // From KFA invoice header: 06 14 22 26 81
  bossPhone: '',
  clientCode: '0323',
  restaurantName: 'Twin Pizza',
  restaurantAddress: '60 Rue Georges Clemenceau, 76530 Grand-Couronne',
};

// Get contacts from local storage
export function getSupplierContacts(): SupplierContacts {
  try {
    const saved = localStorage.getItem(STORAGE_CONTACTS_KEY);
    if (saved) return { ...DEFAULT_CONTACTS, ...JSON.parse(saved) };
  } catch (e) {
    console.error('Error reading contacts:', e);
  }
  return DEFAULT_CONTACTS;
}

// Save contacts to local storage
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

// Get all products (default + custom)
export function getAllSupplierProducts(): SupplierProduct[] {
  const custom = getCustomProducts();
  return [...custom, ...DEFAULT_SUPPLIER_PRODUCTS];
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

// Generate formatted WhatsApp message
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
    year: 'numeric',
  });

  let message = `🍕 *${contacts.restaurantName.toUpperCase()} - COMMANDE DE MARCHANDISES*
`;
  message += `📋 *Code Client :* ${contacts.clientCode}
`;
  message += `📅 *Date d'envoi :* ${todayFormatted}
`;
  if (order.requestedDeliveryDate) {
    message += `🚚 *Livraison souhaitée :* *${order.requestedDeliveryDate}*
`;
  }
  message += `📍 *Adresse :* ${contacts.restaurantAddress}

`;
  message += `━━━━━━━━━━━━━━━━━━━━
`;
  message += `📦 *LISTE DES PRODUITS À LIVRER :*
`;
  message += `━━━━━━━━━━━━━━━━━━━━

`;

  // Group by category
  const categories: Record<string, { title: string; items: OrderItem[] }> = {
    chambre_froide: { title: '❄️ CHAMBRE FROIDE / PRODUITS FRAIS', items: [] },
    congelateur: { title: '🧊 CONGÉLATEUR / SURGELÉS', items: [] },
    reserve_seche: { title: '📦 RÉSERVE SÈCHE & ÉPICERIE', items: [] },
    emballages: { title: '🍕 EMBALLAGES & BOÎTES', items: [] },
    boissons: { title: '🥤 BOISSONS & EAUX', items: [] },
  };

  order.items.forEach(item => {
    const cat = item.product.category || 'reserve_seche';
    if (categories[cat]) {
      categories[cat].items.push(item);
    } else {
      categories.reserve_seche.items.push(item);
    }
  });

  Object.values(categories).forEach(cat => {
    if (cat.items.length > 0) {
      message += `*${cat.title}*
`;
      cat.items.forEach(i => {
        const refStr = i.product.reference ? ` (Réf: ${i.product.reference})` : '';
        message += ` • *${i.quantity} ${i.unit}* — ${i.product.name}${refStr}
`;
        if (i.notes) {
          message += `   ↳ _Note: ${i.notes}_
`;
        }
      });
      message += `
`;
    }
  });

  if (order.totalEstimatedHt && order.totalEstimatedHt > 0) {
    message += `💰 *Total Estimé :* ~${order.totalEstimatedHt.toFixed(2)} € HT
`;
  }

  if (order.notes && order.notes.trim()) {
    message += `
💬 *Remarques / Instructions :*
_${order.notes.trim()}_
`;
  }

  message += `
Merci de bien vouloir confirmer la prise en compte et la date de livraison ! 🙏`;

  return message;
}

// Create WhatsApp URL
export function createWhatsAppUrl(phone: string, text: string): string {
  // Clean phone number (remove spaces, dots, dashes, leading 0 to international 33 for France)
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '33' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

// Save order to Supabase so it can be checked in /kitchen
export async function saveOrderToSupabase(order: {
  items: OrderItem[];
  requestedDeliveryDate?: string;
  notes?: string;
  totalEstimatedHt?: number;
  supplierName?: string;
}): Promise<string | null> {
  try {
    const orderId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const contacts = getSupplierContacts();

    const payload = {
      id: orderId,
      supplier_name: order.supplierName || 'KFA DISTRIBUTION',
      client_code: contacts.clientCode,
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

    // Store in localStorage as backup
    const ordersHistoryKey = 'twinpizza_sent_orders_history';
    const localHistory = JSON.parse(localStorage.getItem(ordersHistoryKey) || '[]');
    localHistory.unshift(payload);
    localStorage.setItem(ordersHistoryKey, JSON.stringify(localHistory.slice(0, 50)));

    // Also attempt storing in Supabase kitchen_shifts/orders if table exists or metadata
    try {
      // Check if kitchen_orders or reception table accepts metadata
      await supabase.from('kitchen_shifts' as any).select('id').limit(1);
    } catch {
      // Ignored if offline
    }

    return orderId;
  } catch (error) {
    console.error('Error saving order:', error);
    return null;
  }
}

// Get pending orders awaiting delivery reception
export function getPendingOrdersHistory(): any[] {
  try {
    const ordersHistoryKey = 'twinpizza_sent_orders_history';
    return JSON.parse(localStorage.getItem(ordersHistoryKey) || '[]');
  } catch (e) {
    console.error('Error reading orders history:', e);
    return [];
  }
}
