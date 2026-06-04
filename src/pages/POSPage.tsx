import { useState, useEffect } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { useCategories, useProductsByCategory } from '@/hooks/useProducts';
import { usePizzasByBase } from '@/hooks/useProducts';
import { useMeatOptions, useSauceOptions, useSupplementOptions } from '@/hooks/useCustomizationOptions';
import { calculateTVA, applyPizzaPromotions } from '@/utils/promotions';
import { pizzaPrices, cheeseSupplementOptions, menuOptionPrices } from '@/data/menu';
import { crepes, gaufres, boissons, frites as staticFrites, croques as staticCroques } from '@/data/menu';
import { toast } from 'sonner';

type OrderType = 'surplace' | 'emporter' | 'livraison';
type PayMethod  = 'especes' | 'cb' | 'en_ligne';

const TYPE_LABELS: Record<OrderType, string> = { surplace:'🍽️ Sur Place', emporter:'🛍️ À Emporter', livraison:'🚗 Livraison' };
const PAY_LABELS:  Record<PayMethod, string>  = { especes:'💵 Espèces', cb:'💳 Carte', en_ligne:'🌐 En ligne' };
const CAT_ICON:    Record<string, string> = {
  pizzas:'🍕', tacos:'🌮', sandwiches:'🥖', texmex:'🌯',
  soufflets:'🥙', makloub:'🍛', mlawi:'🫓', panini:'🥪',
  milkshakes:'🥤', frites:'🍟', crepes:'🥞', gaufres:'🧇',
  boissons:'🧃', croques:'🧀', salades:'🥗',
};

const toItems = (products: any[] | undefined, fallback: any[]) =>
  products?.length ? products.filter((p:any) => p.is_active).map((p:any) => ({ id:p.id, name:p.name, price:p.base_price, imageUrl:p.image_url, description:p.description||'' })) : fallback;

// ── CSS vars ─────────────────────────────────────────────────────────────────
const S = {
  bg:     '#0d1117',
  card:   '#1a2234',
  border: '#1f2937',
  muted:  '#6b7280',
  text:   '#e5e7eb',
  accent: '#f59e0b',
  btn:    { background:'#1f2937', border:'1px solid #2d3748', borderRadius:8, cursor:'pointer', color:'#e5e7eb' } as React.CSSProperties,
  input:  { width:'100%', background:'#1f2937', border:'1px solid #2d3748', color:'#fff', padding:'8px 10px', borderRadius:8, fontSize:12 } as React.CSSProperties,
};

// ── Product tile ─────────────────────────────────────────────────────────────
function ProductTile({ item, selected, onClick, badge }: { item:any; selected:boolean; onClick:()=>void; badge?:string }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? '#f59e0b22' : S.card,
      border:     `${selected ? 2 : 1}px solid ${selected ? S.accent : '#2d3748'}`,
      borderRadius:10, padding:'10px 8px', cursor:'pointer', textAlign:'center',
      transition:'all .12s', position:'relative',
    }}>
      {badge && <span style={{ position:'absolute', top:4, left:4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99 }}>{badge}</span>}
      {selected && <span style={{ position:'absolute', top:4, right:4, background:S.accent, color:'#000', fontSize:10, fontWeight:800, width:18, height:18, borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
      {item.imageUrl
        ? <img src={item.imageUrl} alt={item.name} style={{ width:72, height:72, borderRadius:8, objectFit:'cover', display:'block', margin:'0 auto 6px' }} />
        : <div style={{ width:72, height:72, borderRadius:8, background:'#111827', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 6px' }}>{CAT_ICON[item.category||''] || '🍽️'}</div>
      }
      <div style={{ fontSize:11, fontWeight:700, color: selected ? S.accent : S.text, lineHeight:1.2, marginBottom:2 }}>{item.name}</div>
      {item.price > 0 && <div style={{ fontSize:11, color:'#f59e0b', fontWeight:800 }}>{item.price.toFixed(2)}€</div>}
    </button>
  );
}

// ── Sauce / supplement chip ───────────────────────────────────────────────────
function Chip({ label, active, onClick, extra }: { label:string; active:boolean; onClick:()=>void; extra?:string }) {
  return (
    <button onClick={onClick} style={{
      padding:'5px 12px', borderRadius:99, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, transition:'all .12s',
      background: active ? '#22c55e22' : '#1f2937',
      color:      active ? '#22c55e'   : S.muted,
      outline:    active ? '1px solid #22c55e44' : 'none',
    }}>
      {active ? '✓ ' : ''}{label}{extra ? ` ${extra}` : ''}
    </button>
  );
}

// ── Pizza panel ───────────────────────────────────────────────────────────────
function PizzaPanel({ orderType, onAdd }: { orderType:OrderType; onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: pizzasTomate = [] } = usePizzasByBase('tomate');
  const { data: pizzasCreme  = [] } = usePizzasByBase('creme');
  const [base, setBase]     = useState<'tomate'|'creme'>('tomate');
  const [size, setSize]     = useState<'senior'|'mega'>('senior');
  const [sel,  setSel]      = useState<any|null>(null);
  const [supps,setSupps]    = useState<string[]>([]);
  const [note, setNote]     = useState('');

  const basePrice = size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
  const suppTotal = supps.reduce((s,id) => { const x = cheeseSupplementOptions.find(c=>c.id===id); return s+(x?.price||0); }, 0);
  const price = basePrice + suppTotal;
  const pizzaList = base === 'tomate' ? pizzasTomate : pizzasCreme;
  const promoLabel = (orderType==='surplace'||orderType==='emporter') ? '1 achetée = 1 offerte' : orderType==='livraison' ? '2 achetées = 1 offerte' : '';

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez une pizza'); return; }
    onAdd({ id:sel.id, name:sel.name, price:basePrice, category:'pizzas', description:'' }, { size, base, supplements:supps, note, isMenuMidi:false }, price);
    setSel(null); setSupps([]); setNote('');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Controls */}
      <div style={{ display:'flex', gap:8, padding:'10px 14px', borderBottom:`1px solid ${S.border}`, background:'#111827', flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
        {(['senior','mega'] as const).map(s => (
          <button key={s} onClick={()=>setSize(s)} style={{
            ...S.btn, padding:'7px 16px', fontWeight:800, fontSize:12,
            background: size===s ? (s==='senior'?'#3b82f6':'#8b5cf6') : '#1f2937',
            color: size===s ? '#fff' : S.muted, border:'none',
          }}>
            {s==='senior'?`Senior · ${pizzaPrices.senior}€`:`Mega · ${pizzaPrices.mega}€`}
          </button>
        ))}
        <div style={{ width:1, height:24, background:S.border }} />
        {(['tomate','creme'] as const).map(b => (
          <button key={b} onClick={()=>{setBase(b);setSel(null);}} style={{
            ...S.btn, padding:'7px 14px', fontSize:12, fontWeight:700, border:'none',
            background: base===b ? (b==='tomate'?'#ef444422':'#f9a8d422') : '#1f2937',
            color:      base===b ? (b==='tomate'?'#ef4444':'#f9a8d4')     : S.muted,
            outline:    base===b ? `1px solid ${b==='tomate'?'#ef444444':'#f9a8d444'}` : 'none',
          }}>
            {b==='tomate'?'🍅 Sauce Tomate':'🥛 Crème Fraîche'}
          </button>
        ))}
        {promoLabel && <span style={{ marginLeft:'auto', background:'#f59e0b22', color:S.accent, border:`1px solid #f59e0b44`, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>🎁 {promoLabel}</span>}
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:8 }}>
          {pizzaList.map((p:any) => <ProductTile key={p.id} item={{...p, price:basePrice}} selected={sel?.id===p.id} onClick={()=>setSel(sel?.id===p.id?null:p)} />)}
        </div>
      </div>

      {/* Supplements + Add */}
      <div style={{ background:'#111827', borderTop:`1px solid ${S.border}`, padding:'10px 14px', flexShrink:0 }}>
        {sel && (
          <>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {cheeseSupplementOptions.map(s => (
                <Chip key={s.id} label={s.name} extra={`+${s.price}€`} active={supps.includes(s.id)} onClick={()=>setSupps(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} />
              ))}
            </div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." style={{...S.input, marginBottom:8}} />
          </>
        )}
        <button onClick={handleAdd} disabled={!sel} style={{
          width:'100%', padding:'12px', borderRadius:10, border:'none',
          background: sel ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: sel ? '#000' : '#374151', fontSize:14, fontWeight:800, cursor: sel?'pointer':'not-allowed',
        }}>
          {sel ? `➕ ${sel.name} ${size==='senior'?'Senior':'Mega'} — ${price.toFixed(2)}€` : 'Sélectionnez une pizza'}
        </button>
      </div>
    </div>
  );
}

// ── Tacos / Sandwich / TexMex / Unified panel ─────────────────────────────────
function CustomizablePanel({ categorySlug, title, onAdd }: { categorySlug:string; title:string; onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: products = [] } = useProductsByCategory(categorySlug);
  const { data: meats   = [] } = useMeatOptions();
  const { data: sauces  = [] } = useSauceOptions();
  const { data: supps   = [] } = useSupplementOptions();

  const [sel,   setSel]    = useState<any|null>(null);
  const [selMeats, setMeats]   = useState<string[]>([]);
  const [selSauces,setSauces]  = useState<string[]>([]);
  const [selSupps, setSelSupps] = useState<string[]>([]);
  const [menu,  setMenu]   = useState<'none'|'frites'|'boisson'>('none');
  const [note,  setNote]   = useState('');

  const menuAdd = menu !== 'none' ? (menuOptionPrices[menu] || 0) : 0;
  const price   = sel ? (sel.price + menuAdd) : 0;

  const toggle = (val:string, arr:string[], set:React.Dispatch<React.SetStateAction<string[]>>) =>
    set(prev => prev.includes(val) ? prev.filter(x=>x!==val) : [...prev, val]);

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez un produit'); return; }
    onAdd({ id:sel.id, name:sel.name, price:sel.price, category:categorySlug, description:'' },
      { meats:selMeats, sauces:selSauces, supplements:selSupps, menuOption:menu, note },
      price);
    setSel(null); setMeats([]); setSauces([]); setSelSupps([]); setMenu('none'); setNote('');
  };

  const active = products.filter((p:any) => p.is_active);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Product grid */}
      <div style={{ flex:'0 0 auto', padding:'12px 14px', borderBottom:`1px solid ${S.border}`, overflow:'auto', maxHeight:220 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))', gap:8 }}>
          {active.map((p:any) => <ProductTile key={p.id} item={{...p, price:p.base_price}} selected={sel?.id===p.id} onClick={()=>setSel(sel?.id===p.id?null:p)} />)}
        </div>
      </div>

      {/* Customization */}
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
        {sel && (
          <>
            {meats.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:S.muted, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Viandes</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {meats.map((m:any) => <Chip key={m.id||m.name} label={m.name} active={selMeats.includes(m.name)} onClick={()=>toggle(m.name,selMeats,setMeats)} />)}
                </div>
              </div>
            )}
            {sauces.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:S.muted, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Sauces</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {sauces.map((s:any) => <Chip key={s.id||s.name} label={s.name} active={selSauces.includes(s.name)} onClick={()=>toggle(s.name,selSauces,setSauces)} />)}
                </div>
              </div>
            )}
            {supps.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:S.muted, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Suppléments</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {supps.map((s:any) => <Chip key={s.id||s.name} label={s.name} active={selSupps.includes(s.name)} onClick={()=>toggle(s.name,selSupps,setSelSupps)} />)}
                </div>
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, color:S.muted, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Menu</div>
              <div style={{ display:'flex', gap:5 }}>
                {(['none','frites','boisson'] as const).map(m => (
                  <button key={m} onClick={()=>setMenu(m)} style={{
                    ...S.btn, padding:'5px 12px', fontSize:11, fontWeight:700,
                    background: menu===m ? '#3b82f622' : '#1f2937',
                    color:      menu===m ? '#3b82f6'   : S.muted,
                    outline:    menu===m ? '1px solid #3b82f644' : 'none',
                  }}>
                    {m==='none'?'Sans menu':m==='frites'?`+Frites +${menuOptionPrices.frites}€`:`+Boisson +${menuOptionPrices.boisson}€`}
                  </button>
                ))}
              </div>
            </div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." style={S.input} />
          </>
        )}
        {!sel && <div style={{ textAlign:'center', color:'#374151', fontSize:13, paddingTop:20 }}>Sélectionnez un produit ci-dessus</div>}
      </div>

      {/* Add button */}
      <div style={{ padding:'10px 14px', borderTop:`1px solid ${S.border}`, background:'#111827', flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!sel} style={{
          width:'100%', padding:'12px', borderRadius:10, border:'none',
          background: sel ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: sel?'#000':'#374151', fontSize:14, fontWeight:800, cursor:sel?'pointer':'not-allowed',
        }}>
          {sel ? `➕ ${sel.name} — ${price.toFixed(2)}€` : 'Sélectionnez un produit'}
        </button>
      </div>
    </div>
  );
}

// ── Simple panel (frites, crêpes, boissons, etc.) ────────────────────────────
function SimplePanel({ categorySlug, title, onAdd }: { categorySlug:string; title:string; onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: dbProducts = [] } = useProductsByCategory(categorySlug);
  const fallbacks: Record<string,any[]> = { frites:staticFrites, crepes:crepes, gaufres:gaufres, boissons:boissons, croques:staticCroques };
  const products = toItems(dbProducts.length ? dbProducts : undefined, fallbacks[categorySlug] || []);

  const [sel, setSel] = useState<any|null>(null);
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez un produit'); return; }
    onAdd({ id:sel.id, name:sel.name, price:sel.price, category:categorySlug, description:'' }, {}, sel.price * qty);
    setSel(null); setQty(1);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
          {products.map((p:any) => <ProductTile key={p.id} item={p} selected={sel?.id===p.id} onClick={()=>{setSel(sel?.id===p.id?null:p);setQty(1);}} />)}
        </div>
      </div>
      {sel && (
        <div style={{ padding:'8px 14px', borderTop:`1px solid ${S.border}`, background:'#111827', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:12, color:S.muted }}>Qté:</span>
          <button onClick={()=>setQty(Math.max(1,qty-1))} style={{...S.btn,padding:'4px 10px',fontWeight:800}}>−</button>
          <span style={{ fontSize:14, fontWeight:700, minWidth:24, textAlign:'center' }}>{qty}</span>
          <button onClick={()=>setQty(qty+1)} style={{...S.btn,padding:'4px 10px',fontWeight:800}}>+</button>
        </div>
      )}
      <div style={{ padding:'10px 14px', borderTop:`1px solid ${S.border}`, background:'#111827', flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!sel} style={{
          width:'100%', padding:'12px', borderRadius:10, border:'none',
          background: sel?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color:sel?'#000':'#374151', fontSize:14, fontWeight:800, cursor:sel?'pointer':'not-allowed',
        }}>
          {sel?`➕ ${qty}x ${sel.name} — ${(sel.price*qty).toFixed(2)}€`:'Sélectionnez un produit'}
        </button>
      </div>
    </div>
  );
}

// ── Main POS content ──────────────────────────────────────────────────────────
function POSContent() {
  const { cart, clearCart, getTotal, setOrderType: setCtxOrderType } = useOrder();
  const { data: categories = [] } = useCategories();
  const createOrder = useCreateOrder();

  const [orderType,  setOrderType]  = useState<OrderType>('surplace');
  const [payMethod,  setPayMethod]  = useState<PayMethod>('especes');
  const [activeCategory, setActiveCat] = useState<string | null>(null);
  const [phone,    setPhone]    = useState('');
  const [name,     setName]     = useState('');
  const [address,  setAddress]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder,  setLastOrder]  = useState<string | null>(null);

  const needsInfo = orderType === 'livraison';

  const handleOrderType = (t: OrderType) => { setOrderType(t); setCtxOrderType(t as any); };

  // Promos
  const pizzaItems = cart.filter(i => i.item.category === 'pizzas');
  const otherItems = cart.filter(i => i.item.category !== 'pizzas');
  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((s,i) => s + (i.calculatedPrice||i.item.price)*i.quantity, 0);
  const pizzaSaving = pizzaPromo.originalTotal - pizzaPromo.discountedTotal;
  const afterPromo  = pizzaPromo.discountedTotal + otherTotal;
  const discountAmt = Math.min(discount, afterPromo);
  const total       = afterPromo - discountAmt;
  const { ht, tva } = calculateTVA(total);

  // Add to cart handler (for all inline panels)
  const { addToCart } = useOrder();
  const handleAdd = (item: any, customization: any, calculatedPrice: number) => {
    addToCart(item, 1, customization, calculatedPrice);
    toast.success(`✅ ${item.name} ajouté`);
  };

  const handleSubmit = async () => {
    if (!cart.length) { toast.error('Panier vide'); return; }
    if (needsInfo && !name.trim()) { toast.error('Nom requis'); return; }
    if (needsInfo && !address.trim()) { toast.error('Adresse requise'); return; }
    setSubmitting(true);
    try {
      const orderNumber = await generateOrderNumber();
      const { ht: fHt, tva: fTva } = calculateTVA(total);
      await createOrder.mutateAsync({
        order_number: orderNumber, order_type: orderType, items: cart as any,
        customer_name:    needsInfo ? name.trim() : `[POS] ${TYPE_LABELS[orderType]}`,
        customer_phone:   phone.trim() || 'pos',
        customer_address: needsInfo ? address.trim() : null,
        customer_notes:   notes.trim() || null,
        payment_method:   payMethod as any,
        subtotal: fHt, tva: fTva, total, delivery_fee: 0,
        status: 'pending', is_scheduled: false, scheduled_for: null,
      });
      toast.success(`✅ Commande #${orderNumber}`);
      setLastOrder(orderNumber);
      clearCart(); setName(''); setPhone(''); setAddress(''); setNotes(''); setDiscount(0);
    } catch(e: any) { toast.error('Erreur: ' + e.message); }
    finally { setSubmitting(false); }
  };

  // Render the active category's inline panel
  const renderPanel = () => {
    if (!activeCategory) return (
      <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:'#374151' }}>
        <div style={{ fontSize:32 }}>☝️</div>
        <div style={{ fontSize:13 }}>Choisissez une catégorie ci-dessus</div>
      </div>
    );
    if (activeCategory === 'pizzas') return <PizzaPanel orderType={orderType} onAdd={handleAdd} />;
    const CUSTOMIZABLE = ['tacos','sandwiches','texmex','soufflets','makloub','mlawi','panini'];
    if (CUSTOMIZABLE.includes(activeCategory)) return <CustomizablePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
    return <SimplePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
  };

  return (
    <div style={{ display:'flex', height:'100vh', minHeight:0, background:S.bg, color:S.text, fontFamily:'Segoe UI,system-ui,sans-serif', overflow:'hidden' }}>

      {/* ── LEFT ── */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, borderRight:`1px solid ${S.border}`, overflow:'hidden' }}>

        {/* Order type bar */}
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#111827', borderBottom:`1px solid ${S.border}`, alignItems:'center', flexShrink:0 }}>
          {(['surplace','emporter','livraison'] as OrderType[]).map(t => (
            <button key={t} onClick={()=>handleOrderType(t)} style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
              background: orderType===t ? S.accent : '#1f2937',
              color:      orderType===t ? '#000'   : S.muted,
            }}>{TYPE_LABELS[t]}</button>
          ))}
          {lastOrder && <span style={{ marginLeft:'auto', background:'#22c55e11', color:'#22c55e', border:'1px solid #22c55e33', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>✅ #{lastOrder}</span>}
        </div>

        {/* Category tabs — ALWAYS VISIBLE */}
        <div style={{ display:'flex', gap:6, padding:'10px 14px', background:S.bg, borderBottom:`1px solid ${S.border}`, flexShrink:0, overflowX:'auto', flexWrap:'wrap' }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(activeCategory === cat.slug ? null : cat.slug)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 14px', borderRadius:99, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all .12s', whiteSpace:'nowrap',
              background: activeCategory===cat.slug ? S.accent+'22' : '#1a2234',
              color:      activeCategory===cat.slug ? S.accent     : '#9ca3af',
              outline:    activeCategory===cat.slug ? `1px solid ${S.accent}44` : 'none',
            }}>
              <span style={{ fontSize:16 }}>{CAT_ICON[cat.slug] || '🍽️'}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product area — fills remaining space */}
        <div style={{ flex:1, minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {renderPanel()}
        </div>
      </div>

      {/* ── RIGHT: Caisse — ALWAYS VISIBLE ── */}
      <div style={{ width:300, display:'flex', flexDirection:'column', background:'#111827', flexShrink:0 }}>
        <div style={{ padding:'12px 14px', borderBottom:`1px solid ${S.border}`, fontSize:14, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
          🛒 Caisse
          {cart.length > 0 && <span style={{ background:S.accent, color:'#000', borderRadius:99, fontSize:11, fontWeight:800, padding:'1px 8px' }}>{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
        </div>

        {/* Client info */}
        <div style={{ padding:'10px 14px', borderBottom:`1px solid ${S.border}` }}>
          {needsInfo && <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom *" style={{...S.input,marginBottom:6}} />}
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone" style={{...S.input,marginBottom:6}} />
          {needsInfo && <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Adresse *" style={{...S.input,marginBottom:6}} />}
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes..." style={S.input} />
        </div>

        {/* Cart items */}
        <div style={{ flex:1, overflow:'auto', padding:'8px 14px' }}>
          {cart.length === 0
            ? <div style={{ textAlign:'center', color:'#374151', fontSize:12, paddingTop:20 }}>Panier vide</div>
            : cart.map((item, idx) => {
                const price = (item.calculatedPrice||item.item.price)*item.quantity;
                const c = item.customization as any;
                const details = [c?.size, c?.meats?.join(', '), c?.sauces?.join(', ')].filter(Boolean).join(' · ');
                return (
                  <div key={idx} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${S.border}`, fontSize:12 }}>
                    <span style={{ fontWeight:700, color:S.accent }}>{item.quantity}x</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600 }}>{item.item.name}</div>
                      {details && <div style={{ fontSize:10, color:S.muted }}>{details}</div>}
                    </div>
                    <span style={{ fontWeight:700 }}>{price.toFixed(2)}€</span>
                  </div>
                );
              })
          }
        </div>

        {/* Totals + pay + submit */}
        <div style={{ padding:'12px 14px', borderTop:`1px solid ${S.border}` }}>
          {pizzaPromo.promoDescription && pizzaSaving > 0 && (
            <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:8, padding:'7px 10px', marginBottom:10, fontSize:11 }}>
              <div style={{ color:S.accent, fontWeight:700 }}>🎁 {pizzaPromo.promoDescription}</div>
              <div style={{ color:'#22c55e' }}>Économie: -{pizzaSaving.toFixed(2)}€</div>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:11, color:S.muted, flex:1 }}>Remise (€)</span>
            <input type="number" value={discount||''} onChange={e=>setDiscount(Math.max(0,parseFloat(e.target.value)||0))}
              placeholder="0" style={{...S.input, width:70, textAlign:'right', padding:'5px 8px'}} />
          </div>
          {pizzaSaving > 0 && <div style={{ fontSize:11, color:'#22c55e', display:'flex', justifyContent:'space-between', marginBottom:3 }}><span>🎁 Réduction pizza</span><span>-{pizzaSaving.toFixed(2)}€</span></div>}
          {discountAmt > 0 && <div style={{ fontSize:11, color:'#22c55e', display:'flex', justifyContent:'space-between', marginBottom:3 }}><span>Remise</span><span>-{discountAmt.toFixed(2)}€</span></div>}
          <div style={{ fontSize:11, color:S.muted, display:'flex', justifyContent:'space-between', marginBottom:2 }}><span>HT</span><span>{ht.toFixed(2)}€</span></div>
          <div style={{ fontSize:11, color:S.muted, display:'flex', justifyContent:'space-between', marginBottom:8 }}><span>TVA 10%</span><span>{tva.toFixed(2)}€</span></div>
          <div style={{ fontSize:20, fontWeight:800, color:S.accent, display:'flex', justifyContent:'space-between', marginBottom:10, paddingTop:8, borderTop:`1px solid ${S.border}` }}>
            <span>TOTAL</span><span>{total.toFixed(2)}€</span>
          </div>
          <div style={{ display:'flex', gap:5, marginBottom:10 }}>
            {(['especes','cb','en_ligne'] as PayMethod[]).map(m => (
              <button key={m} onClick={()=>setPayMethod(m)} style={{
                flex:1, padding:'6px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
                background: payMethod===m ? '#3b82f622' : '#1f2937',
                color:      payMethod===m ? '#3b82f6'   : S.muted,
                outline:    payMethod===m ? '1px solid #3b82f644' : 'none',
              }}>{PAY_LABELS[m]}</button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={submitting||cart.length===0} style={{
            width:'100%', padding:'13px', borderRadius:10, border:'none',
            background: cart.length ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
            color: cart.length?'#000':'#374151', fontSize:14, fontWeight:800,
            cursor:cart.length?'pointer':'not-allowed', opacity:submitting?.6:1,
          }}>
            {submitting ? '⏳...' : cart.length ? `✅ Valider — ${total.toFixed(2)}€` : 'Panier vide'}
          </button>
          <button onClick={()=>{clearCart();setDiscount(0);}} style={{width:'100%',marginTop:6,padding:'7px',borderRadius:8,border:`1px solid ${S.border}`,background:'none',color:S.muted,cursor:'pointer',fontSize:11}}>
            🗑️ Vider
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSPage() {
  return <OrderProvider><POSContent /></OrderProvider>;
}
