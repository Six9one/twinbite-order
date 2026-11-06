/**
 * NF525 / loi anti-fraude TVA : règles partagées par la caisse, l'admin et les stats.
 * La base applique les mêmes règles (trigger `orders_fiscal_guard`), ce fichier
 * sert seulement à ne pas proposer à l'écran ce que la base refusera.
 */

type OrderLike = {
  total?: number | string | null;
  payment_method?: string | null;
  payment_cash?: number | string | null;
  payment_card?: number | string | null;
  customer_notes?: string | null;
  customer_phone?: string | null;
  paid_at?: string | null;
};

/** Même règle que `order_is_fiscally_locked` en base. */
export function isFiscallyLocked(order: OrderLike): boolean {
  return !!order.paid_at
    || (order.customer_notes || '').startsWith('[POS]')
    || order.customer_phone === 'pos';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Répartition espèces / CB pour un paiement.
 * La part CB est plafonnée au total ; les espèces = le reste (la monnaie rendue n'est pas comptée).
 */
export function splitPayment(method: string, total: number, cashGiven = 0, cardGiven = 0): { cash: number; card: number } {
  if (method === 'cb') return { cash: 0, card: round2(total) };
  if (method === 'divise') {
    const card = round2(Math.min(Math.max(cardGiven, 0), total));
    return { cash: round2(total - card), card };
  }
  if (method === 'en_ligne') return { cash: 0, card: 0 };
  return { cash: round2(total), card: 0 };
}

const SPLIT_NOTE = /\[Divis[ée]:\s*Esp[èe]ces\s*([\d.,]+)\s*€\s*\/\s*CB\s*([\d.,]+)\s*€\]/i;

/**
 * Montants espèces / CB d'une commande enregistrée.
 * 1. colonnes payment_cash / payment_card (commandes depuis la migration NF525) ;
 * 2. sinon, pour un paiement divisé, la note « [Divisé: Espèces X€ / CB Y€] » (anciennes commandes) ;
 * 3. sinon, le moyen de paiement.
 */
export function getOrderPayment(order: OrderLike): { cash: number; card: number; online: number } {
  const total = Number(order.total) || 0;
  const method = order.payment_method || 'especes';
  if (method === 'en_ligne') return { cash: 0, card: 0, online: total };

  if (order.payment_cash != null || order.payment_card != null) {
    return { cash: Number(order.payment_cash) || 0, card: Number(order.payment_card) || 0, online: 0 };
  }

  if (method === 'divise') {
    const m = (order.customer_notes || '').match(SPLIT_NOTE);
    if (m) {
      const card = Number(m[2].replace(',', '.')) || 0;
      return { ...splitPayment('divise', total, 0, card), online: 0 };
    }
  }
  const { cash, card } = splitPayment(method, total);
  return { cash, card, online: 0 };
}
