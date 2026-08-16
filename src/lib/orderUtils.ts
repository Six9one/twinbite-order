import type { Order } from '@/hooks/useSupabaseData';

export type OrderSource = 'pos' | 'borne' | 'web';

export interface SourceStats {
  count: number;
  revenue: number;
  percentage: number;
}

export interface ItemSalesSummary {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

/**
 * Detect order source reliably across all creation channels:
 * - 'pos': Caisse physique (customer_phone === 'pos' or customer_name starts with '[POS]')
 * - 'borne': Borne tactile (customer_phone === 'borne' or customer_notes contains '[BORNE]')
 * - 'web': Commande en ligne / site web (standard client phone/name)
 */
export function detectOrderSource(order: {
  customer_phone?: string | null;
  customer_name?: string | null;
  customer_notes?: string | null;
}): OrderSource {
  const phone = (order.customer_phone || '').toLowerCase().trim();
  const name = (order.customer_name || '').toLowerCase().trim();
  const notes = (order.customer_notes || '').toLowerCase();

  if (phone === 'pos' || name.startsWith('[pos]')) return 'pos';
  if (phone === 'borne' || notes.includes('[borne]')) return 'borne';
  return 'web';
}

/**
 * Human-readable label for order source
 */
export function getSourceLabel(sourceOrOrder: OrderSource | { customer_phone?: string | null; customer_name?: string | null; customer_notes?: string | null }): string {
  const source: OrderSource = typeof sourceOrOrder === 'string' ? sourceOrOrder : detectOrderSource(sourceOrOrder);
  switch (source) {
    case 'pos':
      return 'Caisse (POS)';
    case 'borne':
      return 'Borne Tactile';
    case 'web':
      return 'Site Web (En Ligne)';
  }
}

/**
 * Styling and badge details for order source
 */
export function getSourceBadgeProps(sourceOrOrder: OrderSource | { customer_phone?: string | null; customer_name?: string | null; customer_notes?: string | null }): {
  source: OrderSource;
  label: string;
  shortLabel: string;
  badgeClass: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
} {
  const source: OrderSource = typeof sourceOrOrder === 'string' ? sourceOrOrder : detectOrderSource(sourceOrOrder);
  switch (source) {
    case 'pos':
      return {
        source,
        label: 'Caisse (POS)',
        shortLabel: 'POS',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10b98144',
        emoji: '💻',
      };
    case 'borne':
      return {
        source,
        label: 'Borne Tactile',
        shortLabel: 'BORNE',
        badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        color: '#a855f7',
        bgColor: 'rgba(168, 85, 247, 0.12)',
        borderColor: '#a855f744',
        emoji: '📲',
      };
    case 'web':
      return {
        source,
        label: 'Site Web',
        shortLabel: 'WEB',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.12)',
        borderColor: '#3b82f644',
        emoji: '🌐',
      };
  }
}

/**
 * Returns the logical business date as YYYY-MM-DD for restaurant operations.
 * If the current local hour is before cutoffHour (e.g. 04:00 AM), it belongs to the previous calendar day's shift.
 */
export function getBusinessDate(date: Date = new Date(), cutoffHour = 4): string {
  const d = new Date(date);
  if (d.getHours() < cutoffHour) {
    d.setDate(d.getDate() - 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the exact ISO timestamp range for a logical business day.
 * Starts at cutoffHour:00:00 on the date and ends at (cutoffHour - 1):59:59.999 the next calendar day.
 */
export function getBusinessDateRange(dateStr?: string, cutoffHour = 4): { start: Date; end: Date; businessDate: string } {
  const targetDateStr = dateStr || getBusinessDate(new Date(), cutoffHour);
  const [yearStr, monthStr, dayStr] = targetDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const start = new Date(year, month, day, cutoffHour, 0, 0, 0);
  const end = new Date(year, month, day + 1, cutoffHour - 1, 59, 59, 999);

  return { start, end, businessDate: targetDateStr };
}

/**
 * Formats a business date for display (e.g. "Dimanche 16 août 2026")
 */
export function formatBusinessDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Comprehensive calculation of business metrics, channel breakdowns, payments, and itemized sales
 */
export function calculateBusinessStats(orders: Order[] = []) {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrdersCount = validOrders.length;
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Breakdown by Source (Channel)
  const bySource: Record<OrderSource, { count: number; revenue: number; percentage: number }> = {
    web: { count: 0, revenue: 0, percentage: 0 },
    borne: { count: 0, revenue: 0, percentage: 0 },
    pos: { count: 0, revenue: 0, percentage: 0 },
  };

  validOrders.forEach((o) => {
    const src = detectOrderSource(o);
    const tot = Number(o.total) || 0;
    bySource[src].count += 1;
    bySource[src].revenue += tot;
  });

  if (totalRevenue > 0) {
    (Object.keys(bySource) as OrderSource[]).forEach((src) => {
      bySource[src].percentage = (bySource[src].revenue / totalRevenue) * 100;
    });
  }

  // Breakdown by Order Type (Sur Place, Emporter, Livraison)
  const byType: Record<string, { count: number; revenue: number }> = {
    surplace: { count: 0, revenue: 0 },
    emporter: { count: 0, revenue: 0 },
    livraison: { count: 0, revenue: 0 },
  };

  validOrders.forEach((o) => {
    const t = o.order_type || 'surplace';
    const tot = Number(o.total) || 0;
    if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
    byType[t].count += 1;
    byType[t].revenue += tot;
  });

  // Breakdown by Payment Method
  let especesTotal = 0;
  let cbTotal = 0;
  let enLigneTotal = 0;
  let especesCount = 0;
  let cbCount = 0;
  let enLigneCount = 0;

  validOrders.forEach((o) => {
    const pMethod = o.payment_method;
    const tot = Number(o.total) || 0;
    if (pMethod === 'especes') {
      especesTotal += tot;
      especesCount += 1;
    } else if (pMethod === 'cb') {
      cbTotal += tot;
      cbCount += 1;
    } else if (pMethod === 'en_ligne') {
      enLigneTotal += tot;
      enLigneCount += 1;
    } else if (pMethod === 'divise') {
      const details = (o as any).payment_details;
      if (details) {
        const esp = Number(details.especes) || 0;
        const cb = Number(details.cb) || 0;
        especesTotal += esp;
        cbTotal += cb;
        if (esp > 0) especesCount += 1;
        if (cb > 0) cbCount += 1;
      } else {
        especesTotal += tot;
        especesCount += 1;
      }
    } else {
      especesTotal += tot;
      especesCount += 1;
    }
  });

  // Taxes
  const totalTVA = validOrders.reduce((sum, o) => sum + (Number(o.tva) || 0), 0);
  const totalHT = totalRevenue - totalTVA;

  // Itemized Sales ("What we sold")
  const itemsMap: Record<string, ItemSalesSummary> = {};
  let totalItemsSold = 0;

  validOrders.forEach((order) => {
    const rawItems = Array.isArray(order.items) ? order.items : [];
    rawItems.forEach((ci: any) => {
      const itemName = ci.item?.name || ci.name || 'Article';
      const category = ci.item?.category || ci.category || 'Autres';
      const sizeLabel = ci.customization?.sizeLabel ? ` (${ci.customization.sizeLabel})` : '';
      const fullName = `${itemName}${sizeLabel}`;
      const qty = Number(ci.quantity) || 1;
      const unitPrice = Number(ci.calculatedPrice || ci.item?.price || ci.price || 0);
      const lineTotal = unitPrice * qty;

      totalItemsSold += qty;

      if (!itemsMap[fullName]) {
        itemsMap[fullName] = {
          name: fullName,
          category,
          quantity: 0,
          revenue: 0,
        };
      }
      itemsMap[fullName].quantity += qty;
      itemsMap[fullName].revenue += lineTotal;
    });
  });

  const itemSalesList = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  // Group items by category
  const salesByCategory: Record<string, { count: number; revenue: number; items: ItemSalesSummary[] }> = {};
  itemSalesList.forEach((item) => {
    const cat = item.category || 'Autres';
    if (!salesByCategory[cat]) {
      salesByCategory[cat] = { count: 0, revenue: 0, items: [] };
    }
    salesByCategory[cat].count += item.quantity;
    salesByCategory[cat].revenue += item.revenue;
    salesByCategory[cat].items.push(item);
  });

  return {
    validOrders,
    cancelledOrders,
    totalRevenue,
    totalOrdersCount,
    cancelledRevenue,
    cancelledOrdersCount: cancelledOrders.length,
    avgOrderValue,
    bySource,
    byType,
    payments: {
      especes: { total: especesTotal, count: especesCount },
      cb: { total: cbTotal, count: cbCount },
      enLigne: { total: enLigneTotal, count: enLigneCount },
    },
    taxes: {
      ht: totalHT,
      tva: totalTVA,
      ttc: totalRevenue,
    },
    items: {
      totalCount: totalItemsSold,
      list: itemSalesList,
      byCategory: salesByCategory,
    },
  };
}
