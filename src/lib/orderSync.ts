import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Colonnes ajoutées par la migration NF525 (20261106000000). Si la base n'est pas
// encore migrée, on renvoie la commande sans elles plutôt que de la bloquer.
const NF525_COLUMNS = ['payment_cash', 'payment_card', 'discount_amount', 'promo_discount', 'paid_at'];

/**
 * Insère une commande caisse. Ne modifie JAMAIS une commande existante :
 * une commande encaissée est verrouillée (NF525).
 * - doublon (déjà envoyée par l'autre mécanisme) → considéré comme envoyé ;
 * - colonne inconnue (base pas encore migrée) → renvoi sans les colonnes NF525.
 */
export async function insertPOSOrder(payload: any): Promise<{ ok: boolean; error?: any }> {
  const { _savedAt, payment_details, ...cleanPayload } = payload;
  let { error } = await (supabase as any).from('orders').insert(cleanPayload, { returning: 'minimal' });

  const missingColumn = error && (error.code === 'PGRST204' || error.code === '42703');
  if (missingColumn) {
    console.warn('[orderSync] Base pas encore migrée NF525, envoi sans les nouvelles colonnes');
    const legacy = { ...cleanPayload };
    NF525_COLUMNS.forEach((c) => delete legacy[c]);
    ({ error } = await (supabase as any).from('orders').insert(legacy, { returning: 'minimal' }));
  }

  if (!error) return { ok: true };
  if (error.code === '23505') return { ok: true }; // déjà en base
  return { ok: false, error };
}

export function removeFromPendingQueue(orderNumber: string) {
  try {
    const pending = JSON.parse(localStorage.getItem('pos-pending-orders') || '[]');
    const filtered = pending.filter((o: any) => o.order_number !== orderNumber);
    localStorage.setItem('pos-pending-orders', JSON.stringify(filtered));
  } catch {}
}

/**
 * Flush and synchronize all offline/pending orders stored in localStorage to Supabase.
 * Une commande déjà en base n'est jamais réécrite (verrouillage NF525).
 */
let syncRunning = false;

export async function syncPendingPOSOrders(): Promise<{ synced: number; failed: number }> {
  // Un seul passage à la fois (sinon deux passages envoient la même commande)
  if (syncRunning) return { synced: 0, failed: 0 };
  syncRunning = true;
  try {
    return await syncPendingPOSOrdersOnce();
  } finally {
    syncRunning = false;
  }
}

async function syncPendingPOSOrdersOnce(): Promise<{ synced: number; failed: number }> {
  let raw = '';
  try {
    raw = localStorage.getItem('pos-pending-orders') || '';
  } catch {
    return { synced: 0, failed: 0 };
  }

  if (!raw) return { synced: 0, failed: 0 };

  let pending: any[] = [];
  try {
    pending = JSON.parse(raw);
  } catch {
    return { synced: 0, failed: 0 };
  }

  if (!Array.isArray(pending) || pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const order of [...pending]) {
    try {
      const { ok, error } = await insertPOSOrder(order);
      if (!ok) {
        console.error(`[orderSync] Failed to insert #${order.order_number}:`, error);
        failed++;
        continue;
      }
      synced++;
      removeFromPendingQueue(order.order_number);
    } catch (err) {
      console.error(`[orderSync] Error syncing order:`, err);
      failed++;
    }
  }

  if (synced > 0) {
    console.log(`[orderSync] Successfully synchronized ${synced} POS order(s) to Supabase!`);
    toast.success(`🔄 ${synced} commande(s) caisse synchronisée(s) vers la base de données !`);
  }

  return { synced, failed };
}
