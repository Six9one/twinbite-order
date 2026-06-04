import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Printer, RotateCcw, FileText } from 'lucide-react';

const PRINT_SERVER = 'http://localhost:3001';
const TVA_RATE_DEFAULT = 10;

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

let itemIdCounter = 1;
const newItem = (): LineItem => ({
  id: itemIdCounter++,
  description: '',
  quantity: 1,
  unitPrice: 0,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextInvoiceNumber() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `FA-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const seq  = String(Math.floor(Math.random() * 900) + 100); // random 3-digit suffix
  return `${base}-${seq}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  input: {
    width: '100%',
    background: '#1f2937',
    border: '1px solid #374151',
    color: '#f3f4f6',
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 4,
    display: 'block',
  },
  card: {
    background: '#1a2234',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: '20px 22px',
    marginBottom: 16,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#f59e0b',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

export function FactureManager() {
  // Invoice metadata
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [invoiceDate,   setInvoiceDate]   = useState(todayISO);
  const [tvaRate,       setTvaRate]       = useState(TVA_RATE_DEFAULT);
  const [notes,         setNotes]         = useState('');

  // Client
  const [clientName,    setClientName]    = useState('');
  const [clientSiret,   setClientSiret]   = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone,   setClientPhone]   = useState('');
  const [clientEmail,   setClientEmail]   = useState('');

  // Line items
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  const [printing, setPrinting] = useState(false);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalTTC = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalHT  = totalTTC / (1 + tvaRate / 100);
  const tvaAmt   = totalTTC - totalHT;

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const addItem = () => setItems(p => [...p, newItem()]);
  const removeItem = (id: number) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = useCallback(<K extends keyof LineItem>(id: number, key: K, val: LineItem[K]) => {
    setItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i));
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setInvoiceNumber(nextInvoiceNumber());
    setInvoiceDate(todayISO());
    setTvaRate(TVA_RATE_DEFAULT);
    setNotes('');
    setClientName(''); setClientSiret(''); setClientAddress('');
    setClientPhone(''); setClientEmail('');
    setItems([newItem()]);
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    const filled = items.filter(i => i.description.trim() && i.unitPrice > 0);
    if (!filled.length) {
      toast.error('Ajoutez au moins un article avec description et prix');
      return;
    }

    setPrinting(true);
    try {
      const res = await fetch(`${PRINT_SERVER}/print-custom-invoice`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          invoiceDate,
          clientName:    clientName.trim()    || undefined,
          clientSiret:   clientSiret.trim()   || undefined,
          clientAddress: clientAddress.trim() || undefined,
          clientPhone:   clientPhone.trim()   || undefined,
          clientEmail:   clientEmail.trim()   || undefined,
          items: filled.map(i => ({
            description: i.description.trim(),
            quantity:    i.quantity,
            unitPrice:   i.unitPrice,
          })),
          tvaRate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`✅ Facture ${invoiceNumber} imprimée !`);
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        toast.error('❌ Serveur impression hors ligne — lancez START_ALL_SERVERS.bat');
      } else {
        toast.error('❌ Erreur impression: ' + err.message);
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>

      {/* ── Page title ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={22} color="#f59e0b" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Factures</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Créez et imprimez des factures directement sur l'imprimante thermique</p>
          </div>
        </div>
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#1f2937', border: '1px solid #374151',
          color: '#9ca3af', borderRadius: 8, padding: '7px 14px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          <RotateCcw size={14} /> Nouvelle facture
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Invoice reference */}
          <div style={S.card}>
            <div style={S.sectionTitle}><FileText size={14} />📋 Référence facture</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="N° Facture">
                <input style={S.input} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </Field>
              <Field label="Date">
                <input style={S.input} type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </Field>
              <Field label="TVA (%)">
                <input style={{ ...S.input, width: '100%' }} type="number" min={0} max={100} step={0.1}
                  value={tvaRate} onChange={e => setTvaRate(parseFloat(e.target.value) || 0)} />
              </Field>
            </div>
          </div>

          {/* Client */}
          <div style={S.card}>
            <div style={S.sectionTitle}>👤 Client (optionnel)</div>
            <Field label="Nom / Société">
              <input style={S.input} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jean Dupont / SARL Exemple" />
            </Field>
            <Field label="SIRET client">
              <input style={S.input} value={clientSiret} onChange={e => setClientSiret(e.target.value)} placeholder="123 456 789 00012" />
            </Field>
            <Field label="Adresse">
              <input style={S.input} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="12 Rue des Fleurs, 76000 Rouen" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Téléphone">
                <input style={S.input} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="06 xx xx xx xx" />
              </Field>
              <Field label="Email">
                <input style={S.input} value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="contact@email.fr" />
              </Field>
            </div>
          </div>

          {/* Notes */}
          <div style={S.card}>
            <div style={S.sectionTitle}>📝 Notes (optionnel)</div>
            <textarea
              style={{ ...S.input, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Conditions de paiement, référence commande..."
            />
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>

          {/* Line items */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={S.sectionTitle}>🧾 Articles / Repas</div>
              <button onClick={addItem} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#22c55e22', border: '1px solid #22c55e44',
                color: '#22c55e', borderRadius: 8, padding: '5px 12px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                <Plus size={13} /> Ajouter
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 64px 80px 28px',
              gap: 6, marginBottom: 6,
            }}>
              {['Description', 'Qté', 'Prix U. (€)', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
              ))}
            </div>

            {items.map(item => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 64px 80px 28px',
                gap: 6, marginBottom: 6, alignItems: 'center',
              }}>
                <input
                  style={{ ...S.input, padding: '6px 8px', fontSize: 12 }}
                  value={item.description}
                  onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Repas midi, Menu, Pizza..."
                />
                <input
                  style={{ ...S.input, padding: '6px 8px', fontSize: 12, textAlign: 'center' }}
                  type="number" min={1} step={1}
                  value={item.quantity}
                  onChange={e => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                />
                <input
                  style={{ ...S.input, padding: '6px 8px', fontSize: 12, textAlign: 'right' }}
                  type="number" min={0} step={0.01}
                  value={item.unitPrice || ''}
                  onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <button onClick={() => removeItem(item.id)} disabled={items.length === 1} style={{
                  background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                  color: items.length > 1 ? '#ef4444' : '#374151', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Subtotal per row */}
            {items.some(i => i.unitPrice > 0) && (
              <div style={{ borderTop: '1px solid #1f2937', marginTop: 10, paddingTop: 10 }}>
                {items.filter(i => i.unitPrice > 0).map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                    <span>{i.quantity}x {i.description || '—'}</span>
                    <span>{(i.quantity * i.unitPrice).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals summary */}
          <div style={{ ...S.card, background: '#111827' }}>
            <div style={S.sectionTitle}>💰 Récapitulatif</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
              <span>Sous-total HT</span>
              <span>{totalHT.toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
              <span>TVA {tvaRate}%</span>
              <span>{tvaAmt.toFixed(2)} €</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 22, fontWeight: 900, color: '#f59e0b',
              borderTop: '1px solid #1f2937', paddingTop: 10,
            }}>
              <span>TOTAL TTC</span>
              <span>{totalTTC.toFixed(2)} €</span>
            </div>

            {/* TVA breakdown */}
            <div style={{
              marginTop: 12, background: '#1f2937', borderRadius: 8, padding: '10px 12px',
              fontSize: 11, color: '#6b7280',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#9ca3af' }}>
                SIRET émetteur: 942 617 358 00018 — TVA: FR28942617358
              </div>
              <div>Taux TVA {tvaRate}% — Base HT: {totalHT.toFixed(2)} € — TVA: {tvaAmt.toFixed(2)} €</div>
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={printing}
            style={{
              width: '100%', padding: 16, borderRadius: 12, border: 'none',
              background: printing ? '#374151' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: printing ? '#6b7280' : '#000',
              fontSize: 16, fontWeight: 900, cursor: printing ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all .15s',
            }}
          >
            <Printer size={20} />
            {printing ? 'Impression en cours...' : `🖨️ Imprimer Facture ${invoiceNumber}`}
          </button>

          <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', marginTop: 8 }}>
            Impression directe sur l'imprimante thermique du restaurant
          </p>
        </div>
      </div>
    </div>
  );
}
