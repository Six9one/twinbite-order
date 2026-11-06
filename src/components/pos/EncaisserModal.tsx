import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { splitPayment } from '@/lib/fiscal';
import { detectOrderSource, getSourceLabel } from '@/lib/orderUtils';

/**
 * « À encaisser » : commandes borne et site payées au comptoir.
 * La borne enregistre ses commandes sans paiement ; ici le caissier choisit
 * Espèces, Carte ou Divisé, ce qui remplit payment_cash / payment_card / paid_at.
 * Une fois encaissée, la commande est verrouillée par la base (NF525).
 */
export default function EncaisserModal({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [splitFor, setSplitFor] = useState<string | null>(null);
  const [splitCard, setSplitCard] = useState<number>(0);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from('orders')
      .select('*')
      .gte('created_at', since)
      .is('paid_at', null)
      .neq('status', 'cancelled')
      .neq('payment_method', 'en_ligne')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.code === '42703' || error.code === 'PGRST204'
        ? 'Base pas encore mise à jour (migration NF525 à appliquer)'
        : 'Impossible de charger les commandes à encaisser');
      setOrders([]);
    } else {
      setOrders((data || []).filter((o: any) => detectOrderSource(o) !== 'pos'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const encaisser = async (order: any, method: 'especes' | 'cb' | 'divise', card = 0) => {
    const total = Number(order.total) || 0;
    if (method === 'divise' && (card <= 0 || card >= total)) {
      toast.error('Part carte entre 0 et le total');
      return;
    }
    setBusyId(order.id);
    const paid = splitPayment(method, total, 0, card);
    const { error } = await (supabase as any)
      .from('orders')
      .update({
        payment_method: method,
        payment_cash: paid.cash,
        payment_card: paid.card,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .is('paid_at', null);
    setBusyId(null);
    if (error) {
      toast.error(`Échec de l'encaissement #${order.order_number}`);
      return;
    }
    toast.success(`#${order.order_number} encaissée (${method === 'cb' ? 'Carte' : method === 'divise' ? 'Divisé' : 'Espèces'})`);
    setSplitFor(null);
    setSplitCard(0);
    load();
  };

  const btn: React.CSSProperties = { height: 52, padding: '0 16px', borderRadius: 8, border: '1px solid #d6dae0', fontSize: 16, fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#1a1d23' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#f6f7f9', color: '#1a1d23', width: 'min(760px, 96vw)', maxHeight: '90vh', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #dfe3e8', background: '#fff' }}>
          <div style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>À encaisser (borne et site)</div>
          <button onClick={load} style={{ ...btn, height: 40, marginRight: 8 }}>Actualiser</button>
          <button onClick={onClose} style={{ ...btn, height: 40 }}>Fermer</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ fontSize: 16, padding: 20, textAlign: 'center' }}>Chargement…</div>}
          {!loading && orders.length === 0 && (
            <div style={{ fontSize: 16, padding: 20, textAlign: 'center' }}>Aucune commande à encaisser sur les dernières 24 h.</div>
          )}
          {orders.map((o) => (
            <div key={o.id} style={{ background: '#fff', border: '1px solid #dfe3e8', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>#{o.order_number}</div>
                <div style={{ fontSize: 15 }}>{getSourceLabel(o)} · {o.customer_name}</div>
                <div style={{ fontSize: 14, color: '#545b66' }}>{new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 22, fontWeight: 800 }}>{Number(o.total).toFixed(2)} €</div>
              </div>
              {splitFor === o.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 16 }}>Part carte (€)</label>
                  <input type="number" step="0.01" autoFocus value={splitCard || ''} onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    style={{ height: 52, width: 120, fontSize: 18, padding: '0 10px', borderRadius: 8, border: '1px solid #c9ced6' }} />
                  <span style={{ fontSize: 16 }}>Espèces : {Math.max(0, (Number(o.total) || 0) - (splitCard || 0)).toFixed(2)} €</span>
                  <div style={{ flex: 1 }} />
                  <button style={btn} onClick={() => { setSplitFor(null); setSplitCard(0); }}>Retour</button>
                  <button disabled={busyId === o.id} style={{ ...btn, background: '#16a34a', borderColor: '#16a34a', color: '#fff' }} onClick={() => encaisser(o, 'divise', splitCard)}>Valider</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busyId === o.id} style={{ ...btn, flex: 1 }} onClick={() => encaisser(o, 'especes')}>Espèces</button>
                  <button disabled={busyId === o.id} style={{ ...btn, flex: 1 }} onClick={() => encaisser(o, 'cb')}>Carte</button>
                  <button disabled={busyId === o.id} style={{ ...btn, flex: 1 }} onClick={() => { setSplitFor(o.id); setSplitCard(0); }}>Divisé</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
