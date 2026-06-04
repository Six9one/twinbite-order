import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { usePizzasByBase } from '@/hooks/useProducts';
import { pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { toast } from 'sonner';

type PizzaSize = 'senior' | 'mega';
type PizzaBase = 'tomate' | 'creme';

interface Props {
  onBack: () => void;
}

export function POSPizzaPanel({ onBack }: Props) {
  const { addToCart, orderType } = useOrder();
  const { data: pizzasTomate  = [] } = usePizzasByBase('tomate');
  const { data: pizzasCreme   = [] } = usePizzasByBase('creme');

  const [base,        setBase]        = useState<PizzaBase>('tomate');
  const [size,        setSize]        = useState<PizzaSize>('senior');
  const [selected,    setSelected]    = useState<any | null>(null);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [note,        setNote]        = useState('');

  const basePrice = size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
  const suppTotal = supplements.reduce((s, id) => {
    const sup = cheeseSupplementOptions.find(x => x.id === id);
    return s + (sup?.price || 0);
  }, 0);
  const total = basePrice + suppTotal;

  const promoLabel = (orderType === 'surplace' || orderType === 'emporter')
    ? '1 achetée = 1 offerte'
    : orderType === 'livraison' ? '2 achetées = 1 offerte' : '';

  const toggleSupplement = (id: string) => {
    setSupplements(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (!selected) { toast.error('Choisissez une pizza'); return; }
    const item = {
      id: selected.id,
      name: selected.name,
      price: basePrice,
      category: 'pizzas',
      description: '',
    };
    const customization = {
      size, base,
      supplements,
      note,
      isMenuMidi: false,
    };
    addToCart(item, 1, customization as any, basePrice + suppTotal);
    toast.success(`✅ ${selected.name} ${size === 'senior' ? 'Senior' : 'Mega'} ajoutée`);
    setSelected(null);
    setSupplements([]);
    setNote('');
  };

  const pizzaList = base === 'tomate' ? pizzasTomate : pizzasCreme;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0d1117' }}>

      {/* ── Top bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#111827', borderBottom:'1px solid #1f2937', flexShrink:0 }}>
        <button onClick={onBack} style={{ background:'#1f2937', border:'1px solid #374151', color:'#9ca3af', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>
          ← Retour
        </button>
        <span style={{ fontSize:14, fontWeight:800, color:'#e5e7eb' }}>🍕 Pizzas</span>
        {promoLabel && (
          <span style={{ marginLeft:'auto', background:'#f59e0b22', color:'#f59e0b', border:'1px solid #f59e0b44', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
            🎁 {promoLabel}
          </span>
        )}
      </div>

      {/* ── Size + Base tabs ── */}
      <div style={{ display:'flex', gap:0, padding:'10px 14px', background:'#0d1117', borderBottom:'1px solid #1f2937', alignItems:'center', flexShrink:0 }}>
        {/* Size */}
        <div style={{ display:'flex', gap:6, marginRight:16 }}>
          {(['senior','mega'] as PizzaSize[]).map(s => (
            <button key={s} onClick={() => setSize(s)} style={{
              padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:800,
              background: size === s ? (s === 'senior' ? '#3b82f6' : '#8b5cf6') : '#1f2937',
              color: size === s ? '#fff' : '#6b7280',
              transition:'all .15s',
            }}>
              {s === 'senior' ? `Senior · ${pizzaPrices.senior}€` : `Mega · ${pizzaPrices.mega}€`}
            </button>
          ))}
        </div>
        {/* Base */}
        <div style={{ display:'flex', gap:6 }}>
          {(['tomate','creme'] as PizzaBase[]).map(b => (
            <button key={b} onClick={() => { setBase(b); setSelected(null); }} style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
              background: base === b ? (b === 'tomate' ? '#ef444422' : '#f9a8d422') : '#1f2937',
              color:      base === b ? (b === 'tomate' ? '#ef4444'   : '#f9a8d4')   : '#6b7280',
              outline:    base === b ? `1px solid ${b === 'tomate' ? '#ef444444' : '#f9a8d444'}` : 'none',
            }}>
              {b === 'tomate' ? '🍅 Sauce Tomate' : '🥛 Crème Fraîche'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pizza grid ── */}
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
          {pizzaList.map((pizza: any) => {
            const isSelected = selected?.id === pizza.id;
            return (
              <button key={pizza.id} onClick={() => setSelected(isSelected ? null : pizza)} style={{
                background:   isSelected ? '#3b82f622' : '#1a2234',
                border:       isSelected ? '2px solid #3b82f6' : '1px solid #2d3748',
                borderRadius: 10,
                padding:      '8px 6px',
                cursor:       'pointer',
                textAlign:    'center',
                transition:   'all .15s',
                position:     'relative',
              }}>
                {/* Image */}
                {pizza.image_url ? (
                  <img src={pizza.image_url} alt={pizza.name}
                    style={{ width:64, height:64, borderRadius:8, objectFit:'cover', marginBottom:6, display:'block', margin:'0 auto 6px' }} />
                ) : (
                  <div style={{ width:64, height:64, borderRadius:8, background:'#1f2937', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 6px' }}>🍕</div>
                )}
                <div style={{ fontSize:11, fontWeight:700, color: isSelected ? '#93c5fd' : '#e5e7eb', lineHeight:1.2 }}>{pizza.name}</div>
                {isSelected && (
                  <div style={{ position:'absolute', top:4, right:4, background:'#3b82f6', borderRadius:99, width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>✓</div>
                )}
              </button>
            );
          })}
          {pizzaList.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#374151', padding:32, fontSize:13 }}>Chargement...</div>
          )}
        </div>
      </div>

      {/* ── Supplements (when pizza selected) ── */}
      {selected && (
        <div style={{ padding:'10px 14px', borderTop:'1px solid #1f2937', background:'#111827', flexShrink:0 }}>
          <div style={{ fontSize:11, color:'#6b7280', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Suppléments</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {cheeseSupplementOptions.map(sup => {
              const on = supplements.includes(sup.id);
              return (
                <button key={sup.id} onClick={() => toggleSupplement(sup.id)} style={{
                  padding:'5px 12px', borderRadius:99, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                  background: on ? '#22c55e22' : '#1f2937',
                  color:      on ? '#22c55e'   : '#6b7280',
                  outline:    on ? '1px solid #22c55e44' : 'none',
                }}>
                  {on ? '✓ ' : ''}{sup.name} +{sup.price}€
                </button>
              );
            })}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note..." style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', color:'#fff', padding:'6px 10px', borderRadius:8, fontSize:11, marginBottom:8 }} />
        </div>
      )}

      {/* ── Add to cart button ── */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid #1f2937', background:'#111827', flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!selected} style={{
          width:'100%', padding:'12px', borderRadius:10, border:'none',
          cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: selected ? '#000' : '#374151', fontSize:14, fontWeight:800, transition:'all .15s',
        }}>
          {selected
            ? `➕ ${selected.name} — ${total.toFixed(2)}€ (${size === 'senior' ? 'Senior' : 'Mega'})`
            : 'Sélectionnez une pizza'}
        </button>
      </div>
    </div>
  );
}
