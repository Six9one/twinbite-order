import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Flush and synchronize all offline/pending orders stored in localStorage to Supabase.
 * Strips unsupported fields like `payment_details` and `_savedAt`.
 */
export async function syncPendingPOSOrders(): Promise<{ synced: number; failed: number }> {
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
      const { _savedAt, payment_details, ...cleanPayload } = order;

      // Check if order already exists in Supabase to avoid duplicate conflict
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', String(cleanPayload.order_number))
        .maybeSingle();

      if (!existing) {
        const { error } = await (supabase as any)
          .from('orders')
          .insert(cleanPayload, { returning: 'minimal' });

        if (error) {
          console.error(`[orderSync] Failed to insert #${cleanPayload.order_number}:`, error);
          failed++;
          continue;
        }
      }

      // Successfully inserted or already exists: remove from localStorage
      synced++;
      try {
        const currentPending = JSON.parse(localStorage.getItem('pos-pending-orders') || '[]');
        const filtered = currentPending.filter((o: any) => o.order_number !== cleanPayload.order_number);
        localStorage.setItem('pos-pending-orders', JSON.stringify(filtered));
      } catch {}
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
