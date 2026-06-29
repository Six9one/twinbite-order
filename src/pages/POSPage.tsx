import { useState, useEffect, useReducer, useRef } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useCreateOrder, generateOrderNumber, useOrders } from '@/hooks/useSupabaseData';
import { useCategories, useProductsByCategory } from '@/hooks/useProducts';
import { usePizzasByBase } from '@/hooks/useProducts';
import { useMeatOptions, useSauceOptions, useSupplementOptions, useGarnitureOptions, useCruditesOptions } from '@/hooks/useCustomizationOptions';
import { useSandwichTypes } from '@/hooks/useSandwiches';
import { calculateTVA, applyPizzaPromotions } from '@/utils/promotions';
import { pizzaPrices, cheeseSupplementOptions, menuOptionPrices } from '@/data/menu';
import { wizardSizePrices } from '@/data/pricing';
import { crepes, gaufres, boissons, frites as staticFrites, croques as staticCroques } from '@/data/menu';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

const PRINT_SERVER = 'http://localhost:3001';

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

// ── Theme palette (mutable + persisted) ──────────────────────────────────────
// Colors are plain hex strings so `S.accent + '22'` (alpha) keeps working.
const DEFAULT_THEME = {
  bg:     '#0d1117',
  panel:  '#111827',
  card:   '#1a2234',
  border: '#1f2937',
  muted:  '#6b7280',
  text:   '#e5e7eb',
  accent: '#f59e0b',
};
type ThemeKey = keyof typeof DEFAULT_THEME;
const THEME_LABELS: Record<ThemeKey,string> = {
  bg:'Fond', panel:'Barres', card:'Cartes', border:'Bordures', muted:'Texte gris', text:'Texte', accent:'Couleur principale',
};

const S = {
  ...DEFAULT_THEME,
  btn:    { background:'#1f2937', border:'1px solid #2d3748', borderRadius:8, cursor:'pointer', color:'#e5e7eb' } as React.CSSProperties,
  input:  { width:'100%', background:'#1f2937', border:'1px solid #2d3748', color:'#fff', padding:'8px 10px', borderRadius:8, fontSize:12 } as React.CSSProperties,
};

// Load saved theme at startup
try {
  const saved = JSON.parse(localStorage.getItem('pos-theme') || '{}');
  Object.assign(S, saved);
} catch {}

function saveTheme() {
  const out: Record<string,string> = {};
  (Object.keys(DEFAULT_THEME) as ThemeKey[]).forEach(k => { out[k] = (S as any)[k]; });
  localStorage.setItem('pos-theme', JSON.stringify(out));
}

// Simple global re-render bus so the settings panel repaints the whole POS
const themeListeners = new Set<() => void>();
function notifyTheme() { themeListeners.forEach(fn => fn()); }
function useThemeBump() {
  const [, bump] = useReducer((x:number) => x + 1, 0);
  useEffect(() => { themeListeners.add(bump); return () => { themeListeners.delete(bump); }; }, []);
  return bump;
}

// ── Local Pizza Images Fallback ──────────────────────────────────────────────
const LOCAL_PIZZA_IMAGES: Record<string, string> = {
  'margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80',
  'végétarienne': 'https://images.unsplash.com/photo-1571066811602-71683a3f680d?w=200&q=80',
  'fruits de mer': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80',
  'mexicaine': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&q=80',
  '4 saisons': 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=200&q=80',
  'reine': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80',
  'orientale': 'https://images.unsplash.com/photo-1594007654729-407ededc4963?w=200&q=80',
  'campione': 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=200&q=80',
  '4 fromages': 'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=200&q=80',
  'calzone': 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=200&q=80',
  'savoyarde': 'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=200&q=80',
  'pêcheur': 'https://images.unsplash.com/photo-1534080391025-097d02b173e9?w=200&q=80',
  'pimento': 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=200&q=80',
  'royale': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80',
  '3 jambons': 'https://images.unsplash.com/photo-1555072956-7758afb20a8f?w=200&q=80',
  'twinzienne': 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=200&q=80',
  'tartiflette': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=200&q=80',
  'kebab': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=200&q=80',
  'norvégienne': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80',
  'buffalo': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200&q=80',
  'raclette': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80',
  'antillaise': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80',
  'chèvre miel': 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80',
  'farmer': 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=200&q=80',
  'charcutière': 'https://images.unsplash.com/photo-1555072956-7758afb20a8f?w=200&q=80',
  'boursin': 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=200&q=80',
  'biggy': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80',
  'cheezy': 'https://images.unsplash.com/photo-1548369937-2751babf242d?w=200&q=80',
  'chicken': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=200&q=80',
  'indienne': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&q=80',
  'la hawaïe': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80',
};

// ── Product tile ─────────────────────────────────────────────────────────────
function ProductTile({ item, selected, onClick, badge, compact, tint }: { item:any; selected:boolean; onClick:()=>void; badge?:string; compact?:boolean; tint?:string }) {
  // Support both camelCase (imageUrl) and snake_case (image_url from DB), fallback to local images
  const normalizedName = (item.name || '').trim().toLowerCase();
  const img = item.imageUrl || item.image_url || LOCAL_PIZZA_IMAGES[normalizedName];
  const imgSize = compact ? 44 : 64;
  const borderColor = selected ? S.accent : (tint || '#2d3748');
  return (
    <button onClick={onClick} style={{
      background: selected ? '#f59e0b22' : (tint ? tint + '14' : S.card),
      border:     `${selected ? 2 : tint ? 2 : 1}px solid ${borderColor}`,
      borderRadius:8, padding: compact ? '4px 3px' : '8px 6px', cursor:'pointer', textAlign:'center',
      transition:'all .12s', position:'relative',
    }}>
      {badge && <span style={{ position:'absolute', top:4, left:4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99 }}>{badge}</span>}
      {selected && <span style={{ position:'absolute', top:4, right:4, background:S.accent, color:'#000', fontSize:10, fontWeight:800, width:18, height:18, borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
      {img
        ? <OptimizedImage src={img} alt={item.name} style={{ width:imgSize, height:imgSize, borderRadius:8, objectFit:'cover', display:'block', margin:`0 auto ${compact?4:6}px` }} containerClassName="mx-auto mb-1 rounded-lg overflow-hidden flex items-center justify-center bg-[#1f2937]" showSkeleton={true} />
        : <div style={{ width:imgSize, height:imgSize, borderRadius:8, background:'#111827', display:'flex', alignItems:'center', justifyContent:'center', fontSize:compact?22:28, margin:`0 auto ${compact?4:6}px` }}>{CAT_ICON[item.category||''] || '🍽️'}</div>
      }
      <div style={{ fontSize: compact?10:11, fontWeight:700, color: selected ? S.accent : S.text, lineHeight:1.15, marginBottom:2 }}>{item.name}</div>
      {item.price > 0 && <div style={{ fontSize: compact?10:11, color:'#f59e0b', fontWeight:800 }}>{item.price.toFixed(2)}€</div>}
    </button>
  );
}

// ── Draggable resize handle (between panels) ──────────────────────────────────
function ResizeBar({ vertical }: { vertical?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <PanelResizeHandle>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          ...(vertical
            ? { height: 8, width: '100%', cursor: 'row-resize' }
            : { width: 8, height: '100%', cursor: 'col-resize' }),
          background: hover ? S.accent + '55' : '#1f2937',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .12s', flexShrink: 0,
        }}
      >
        <div style={{
          ...(vertical ? { width: 28, height: 3 } : { width: 3, height: 28 }),
          borderRadius: 99, background: hover ? S.accent : '#4b5563',
        }} />
      </div>
    </PanelResizeHandle>
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

// ── Pizza sizes (Senior / Mega / Menu Midi Senior / Menu Midi Mega) ──────────
const PIZZA_SIZES = [
  { id:'senior',         label:'Senior',      price:pizzaPrices.senior,         color:'#3b82f6' },
  { id:'mega',           label:'Mega',        price:pizzaPrices.mega,           color:'#8b5cf6' },
  { id:'menu_midi',      label:'Midi Senior', price:pizzaPrices.menuMidiSenior, color:'#22c55e' },
  { id:'menu_midi_mega', label:'Midi Mega',   price:pizzaPrices.menuMidiMega,   color:'#16a34a' },
] as const;
type PizzaSizeId = typeof PIZZA_SIZES[number]['id'];

const BASE_TINT = { tomate:'#ef4444', creme:'#3b82f6' }; // red / blue

// ── Pizza panel ───────────────────────────────────────────────────────────────
function PizzaPanel({ orderType, onAdd, size, setSize }: { orderType:OrderType; onAdd:(item:any,custom:any,price:number)=>void; size:PizzaSizeId; setSize:(size:PizzaSizeId)=>void }) {
  const { data: pizzasTomate = [] } = usePizzasByBase('tomate');
  const { data: pizzasCreme  = [] } = usePizzasByBase('creme');
  const [sel,  setSel]      = useState<any|null>(null);
  const [supps,setSupps]    = useState<string[]>([]);
  const [note, setNote]     = useState('');

  const basePrice = PIZZA_SIZES.find(s => s.id === size)!.price;
  const suppTotal = supps.reduce((s,id) => { const x = cheeseSupplementOptions.find(c=>c.id===id); return s+(x?.price||0); }, 0);
  const price = basePrice + suppTotal;

  // ONE long list: tomate (red) first, then creme (blue)
  const allPizzas = [
    ...pizzasTomate.map((p:any) => ({ ...p, _base:'tomate' as const })),
    ...pizzasCreme.map((p:any)  => ({ ...p, _base:'creme'  as const })),
  ];

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez une pizza'); return; }
    const sizeLabel = PIZZA_SIZES.find(s => s.id === size)!.label;
    onAdd(
      { id:sel.id, name:sel.name, price:basePrice, category:'pizzas', description:'' },
      { size, sizeLabel, base:sel._base, supplements:supps, note, isMenuMidi: size==='menu_midi' || size==='menu_midi_mega' },
      price
    );
    setSel(null); setSupps([]); setNote('');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Grid — ONE page: tomate=red tiles, creme=blue tiles */}
      <div style={{ flex:1, overflow:'auto', padding:'8px 10px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:4 }}>
          {allPizzas.map((p:any) => (
            <ProductTile
              key={`${p._base}-${p.id}`}
              compact
              tint={BASE_TINT[p._base]}
              item={{ ...p, price:basePrice }}
              selected={sel?.id===p.id && sel?._base===p._base}
              onClick={()=>setSel((sel?.id===p.id && sel?._base===p._base) ? null : p)}
            />
          ))}
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
          width:'100%', padding:'9px', borderRadius:9, border:'none',
          background: sel ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: sel ? '#000' : '#374151', fontSize:13, fontWeight:800, cursor: sel?'pointer':'not-allowed',
        }}>
          {sel ? `➕ ${sel.name} ${PIZZA_SIZES.find(s=>s.id===size)!.label} — ${price.toFixed(2)}€` : 'Sélectionnez une pizza'}
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
          width:'100%', padding:'9px', borderRadius:9, border:'none',
          background: sel ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: sel?'#000':'#374151', fontSize:14, fontWeight:800, cursor:sel?'pointer':'not-allowed',
        }}>
          {sel ? `➕ ${sel.name} — ${price.toFixed(2)}€` : 'Sélectionnez un produit'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD WIZARD (Soufflet / Makloub / Mlawi / Tacos / Panini)
// Meat count → size & price (1=Solo, 2=Double, 3=Triple). Single fast scroll.
// ══════════════════════════════════════════════════════════════════════════════
type WizType = 'soufflet'|'makloub'|'mlawi'|'tacos'|'panini';
const WIZARD_MAP: Record<string, WizType> = {
  soufflets:'soufflet', makloub:'makloub', mlawi:'mlawi', tacos:'tacos', panini:'panini',
};
const WIZ_TITLE: Record<WizType,string> = { soufflet:'Soufflet', makloub:'Makloub', mlawi:'Mlawi', tacos:'Tacos', panini:'Panini' };
const WIZ_GARN_DEFAULTS: Record<WizType,string[]> = {
  soufflet:['pomme','oignon','olive'], makloub:['salade','tomate','oignon'],
  mlawi:['salade','tomate','oignon','olive'], tacos:['salade','tomate','oignon'], panini:[],
};
// Per-product flow rules
const WIZ_CFG: Record<WizType, { maxMeats:number; garniture:boolean; supplements:boolean; menu:boolean; crudite:boolean }> = {
  soufflet:{ maxMeats:3, garniture:true,  supplements:true,  menu:true,  crudite:false },
  makloub: { maxMeats:3, garniture:true,  supplements:true,  menu:true,  crudite:true  },
  mlawi:   { maxMeats:3, garniture:true,  supplements:true,  menu:true,  crudite:true  },
  tacos:   { maxMeats:3, garniture:false, supplements:true,  menu:true,  crudite:false }, // frites incluses, pas de garniture
  panini:  { maxMeats:1, garniture:false, supplements:true,  menu:true,  crudite:false }, // meat + sauce + suppléments + option frites/boisson
};
const FREE_SAUCES = 2, EXTRA_SAUCE = 0.30;

// Small option tile with image/emoji (compact, dark)
function OptTile({ name, img, emoji, selected, isDefaultRemovable, price, disabled, onClick }:
  { name:string; img?:string|null; emoji?:string; selected:boolean; isDefaultRemovable?:boolean; price?:number; disabled?:boolean; onClick:()=>void }) {
  const ring = selected ? (isDefaultRemovable ? '#22c55e' : S.accent) : '#2d3748';
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      background: selected ? (isDefaultRemovable ? '#22c55e18' : S.accent+'18') : S.card,
      border:`${selected?2:1}px solid ${ring}`, borderRadius:9, padding:'5px 4px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1,
      textAlign:'center', position:'relative',
    }}>
      {selected && <span style={{ position:'absolute', top:3, right:3, width:15, height:15, borderRadius:99,
        background: isDefaultRemovable ? '#ef4444' : S.accent, color:'#fff', fontSize:9, fontWeight:800,
        display:'flex', alignItems:'center', justifyContent:'center' }}>{isDefaultRemovable?'✕':'✓'}</span>}
      {img
        ? <img src={img} alt={name} loading="lazy" style={{ width:46, height:46, borderRadius:7, objectFit:'cover', display:'block', margin:'0 auto 3px', background:'#1f2937' }} />
        : <div style={{ width:46, height:46, borderRadius:7, background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, margin:'0 auto 3px' }}>{emoji||'•'}</div>}
      <div style={{ fontSize:10, fontWeight:700, color: selected?(isDefaultRemovable?'#22c55e':S.accent):S.text, lineHeight:1.1 }}>{name}</div>
      {price !== undefined && price > 0 && <div style={{ fontSize:9, color:S.accent, fontWeight:800 }}>+{price.toFixed(2)}€</div>}
    </button>
  );
}

function SectionTitle({ children, hint }: { children:React.ReactNode; hint?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:8, margin:'4px 0 6px' }}>
      <span style={{ fontSize:11, fontWeight:800, color:S.accent, textTransform:'uppercase', letterSpacing:1 }}>{children}</span>
      {hint && <span style={{ fontSize:10, color:S.muted }}>{hint}</span>}
    </div>
  );
}

function WizardPanel({ categorySlug, onAdd }: { categorySlug:string; onAdd:(item:any,custom:any,price:number)=>void }) {
  const type = WIZARD_MAP[categorySlug] || 'soufflet';
  const cfg = WIZ_CFG[type];
  const sizes = (wizardSizePrices as any)[type] as { id:string; label:string; maxMeats:number; price:number }[];
  const maxMeats = cfg.maxMeats;
  const hasGarniture = cfg.garniture;
  const isCrudite = cfg.crudite;

  const { data: dbMeats = [] }   = useMeatOptions();
  const { data: dbSauces = [] }  = useSauceOptions();
  const { data: dbSupps = [] }   = useSupplementOptions();
  const { data: dbGarn = [] }    = useGarnitureOptions();
  const { data: dbCrud = [] }    = useCruditesOptions();

  const meats  = dbMeats.map((m:any) => ({ id:m.id, name:m.name, img:m.image_url, price:Number(m.price)||0 }));
  const sauces = dbSauces.map((s:any) => ({ id:s.id, name:s.name, img:s.image_url }));
  const supps  = dbSupps.map((s:any) => ({ id:s.id, name:s.name, img:s.image_url, price:Number(s.price)||0 }));
  const garnSrc = (isCrudite ? dbCrud : dbGarn).map((g:any) => ({ id:g.id, name:g.name, img:g.image_url, price:Number(g.price)||0 }));

  const defaults = WIZ_GARN_DEFAULTS[type];
  const defaultGarn = garnSrc.filter(g => defaults.some(d => g.name.toLowerCase().includes(d)));
  const extraGarn   = garnSrc.filter(g => !defaults.some(d => g.name.toLowerCase().includes(d)));

  const [selMeats, setMeats] = useState<string[]>([]);
  const [selSauces, setSauces] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);   // default garnitures turned off
  const [selExtra, setExtra]  = useState<string[]>([]);
  const [selSupps, setSelSupps] = useState<string[]>([]);
  const [menu, setMenu] = useState<'none'|'frites'|'boisson'|'menu'>('none');
  const [note, setNote] = useState('');

  const meatCount = Math.max(1, selMeats.length);
  const sizeCfg = sizes.find(s => s.maxMeats === meatCount) || sizes[Math.min(meatCount,sizes.length)-1] || sizes[0];
  const sauceSurcharge = Math.max(0, selSauces.length - FREE_SAUCES) * EXTRA_SAUCE;
  const suppTotal = selSupps.reduce((t,id) => t + (supps.find(s=>s.id===id)?.price||0), 0);
  const extraGarnTotal = selExtra.reduce((t,id) => t + (extraGarn.find(g=>g.id===id)?.price||0), 0);
  const price = sizeCfg.price + menuOptionPrices[menu] + suppTotal + sauceSurcharge + extraGarnTotal;

  const toggle = (id:string, arr:string[], set:any, cap?:number) => {
    if (arr.includes(id)) set(arr.filter((x:string)=>x!==id));
    else if (!cap || arr.length < cap) set([...arr, id]);
  };

  const reset = () => { setMeats([]); setSauces([]); setRemoved([]); setExtra([]); setSelSupps([]); setMenu('none'); setNote(''); };

  const handleAdd = () => {
    if (!selMeats.length) { toast.error('Choisissez au moins une viande'); return; }
    if (!selSauces.length) { toast.error('Choisissez au moins une sauce'); return; }
    const meatNames = selMeats.map(id => meats.find(m=>m.id===id)?.name || '');
    const sauceNames = selSauces.map(id => sauces.find(s=>s.id===id)?.name || '');
    const garnNames = [
      ...defaultGarn.filter(g=>!removed.includes(g.id)).map(g=>g.name),
      ...extraGarn.filter(g=>selExtra.includes(g.id)).map(g=>g.name),
    ];
    const suppNames = selSupps.map(id => supps.find(s=>s.id===id)?.name || '');
    onAdd(
      { id:`${type}-${sizeCfg.id}`, name:`${WIZ_TITLE[type]} ${sizeCfg.label}`, price:sizeCfg.price, category:categorySlug, description:'' },
      { size:sizeCfg.id, sizeLabel:sizeCfg.label, meats:meatNames, sauces:sauceNames, garnitures:garnNames, supplements:suppNames, menuOption:menu, note },
      price
    );
    reset();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Live size badge */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:S.panel, borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:800, color:S.text }}>{WIZ_TITLE[type]}</span>
        <span style={{ background:S.accent, color:'#000', borderRadius:99, padding:'2px 12px', fontSize:12, fontWeight:800 }}>
          {maxMeats > 1 ? `${sizeCfg.label} · ` : ''}{sizeCfg.price.toFixed(2)}€
        </span>
        <span style={{ fontSize:11, color:S.muted }}>{selMeats.length}/{maxMeats} viande{maxMeats>1?'s':''}</span>
        <button onClick={reset} style={{ ...S.btn, marginLeft:'auto', padding:'4px 10px', fontSize:11 }}>↺ Réinit.</button>
      </div>

      {/* Single scroll — all sections */}
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
        {/* Meats */}
        <SectionTitle hint={`max ${maxMeats} — détermine la taille`}>Viandes</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:12 }}>
          {meats.map(m => (
            <OptTile key={m.id} name={m.name} img={m.img} emoji="🥩"
              selected={selMeats.includes(m.id)}
              disabled={selMeats.length >= maxMeats && !selMeats.includes(m.id)}
              onClick={()=>toggle(m.id, selMeats, setMeats, maxMeats)} />
          ))}
        </div>

        {/* Sauces */}
        <SectionTitle hint={`${FREE_SAUCES} gratuites, +${EXTRA_SAUCE.toFixed(2)}€ ensuite`}>Sauces</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:12 }}>
          {sauces.map(s => (
            <OptTile key={s.id} name={s.name} img={s.img} emoji="🥫"
              selected={selSauces.includes(s.id)}
              onClick={()=>toggle(s.id, selSauces, setSauces)} />
          ))}
        </div>

        {/* Garnitures */}
        {hasGarniture && (defaultGarn.length > 0 || extraGarn.length > 0) && (
          <>
            <SectionTitle hint="inclus — touchez pour retirer">{isCrudite?'Crudités':'Garnitures'}</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:8 }}>
              {defaultGarn.map(g => (
                <OptTile key={g.id} name={g.name} img={g.img} emoji="🥗"
                  selected={!removed.includes(g.id)} isDefaultRemovable
                  onClick={()=>toggle(g.id, removed, setRemoved)} />
              ))}
              {extraGarn.map(g => (
                <OptTile key={g.id} name={g.name} img={g.img} emoji="➕" price={g.price}
                  selected={selExtra.includes(g.id)}
                  onClick={()=>toggle(g.id, selExtra, setExtra)} />
              ))}
            </div>
          </>
        )}

        {/* Supplements */}
        {cfg.supplements && supps.length > 0 && (
          <>
            <SectionTitle hint="optionnel">Suppléments</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:12 }}>
              {supps.map(s => (
                <OptTile key={s.id} name={s.name} img={s.img} emoji="🧀" price={s.price}
                  selected={selSupps.includes(s.id)}
                  onClick={()=>toggle(s.id, selSupps, setSelSupps)} />
              ))}
            </div>
          </>
        )}

        {/* Menu */}
        {cfg.menu && (
          <>
            <SectionTitle>Menu</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
              {([
                { id:'none', label:'Sans', emoji:'🚫' },
                { id:'frites', label:`Frites +${menuOptionPrices.frites}€`, emoji:'🍟' },
                { id:'boisson', label:`Boisson +${menuOptionPrices.boisson}€`, emoji:'🥤' },
                { id:'menu', label:`Menu +${menuOptionPrices.menu}€`, emoji:'🍔' },
              ] as const).map(o => (
                <button key={o.id} onClick={()=>setMenu(o.id)} style={{
                  padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:10, fontWeight:700, lineHeight:1.2,
                  border:`1.5px solid ${menu===o.id?'#3b82f6':'#2d3748'}`,
                  background: menu===o.id?'#3b82f622':S.card, color: menu===o.id?'#3b82f6':S.muted,
                }}><div style={{ fontSize:16 }}>{o.emoji}</div>{o.label}</button>
              ))}
            </div>
          </>
        )}

        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (ex: bien cuit, sans oignon...)" style={S.input} />
      </div>

      {/* Sticky add */}
      <div style={{ padding:'10px 14px', borderTop:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!selMeats.length || !selSauces.length} style={{
          width:'100%', padding:'11px', borderRadius:9, border:'none',
          background:(selMeats.length && selSauces.length)?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color:(selMeats.length && selSauces.length)?'#000':'#374151', fontSize:14, fontWeight:800,
          cursor:(selMeats.length && selSauces.length)?'pointer':'not-allowed',
        }}>
          ➕ {WIZ_TITLE[type]} {maxMeats>1?sizeCfg.label:''} — {price.toFixed(2)}€
        </button>
      </div>
    </div>
  );
}

// Static sandwich fallback for when the DB table is empty
const FALLBACK_SANDWICHES_POS = [
  { id:'sw-vegetarien', name:'Végétarien',  base_price:6.50, image_url:null, is_active:true, description:'Œuf, champignons, galette de pomme de terre, crudités' },
  { id:'sw-steaky',     name:'Steaky',      base_price:8.50, image_url:null, is_active:true, description:'2 steaks hachés, mozzarella, galette de pommes de terre, crudités' },
  { id:'sw-special',    name:'Spécial',     base_price:8.50, image_url:null, is_active:true, description:'Escalope de poulet, 2 steaks hachés, cheddar, crudités' },
  { id:'sw-royal-bacon',name:'Royal Bacon', base_price:8.50, image_url:null, is_active:true, description:'2 steaks hachés, œuf, bacon, crudités' },
  { id:'sw-cowboy',     name:'Cow Boy',     base_price:8.50, image_url:null, is_active:true, description:'2 steaks hachés, cordon bleu, cheddar, crudités' },
  { id:'sw-chicken',    name:'Chicken',     base_price:7.50, image_url:null, is_active:true, description:'Escalope de poulet, cheddar, crudités' },
  { id:'sw-tenders',    name:'Tenders',     base_price:8.50, image_url:null, is_active:true, description:'Tenders de poulet (2 pièces), œuf, crudités' },
  { id:'sw-normand',    name:'Normand',     base_price:8.50, image_url:null, is_active:true, description:'Escalope de poulet, lardons, champignons, crudités' },
];

// ── Sandwich panel: pick sandwich → sauce + crudités (no meat) ───────────────
function SandwichPanel({ onAdd }: { onAdd:(item:any,custom:any,price:number)=>void }) {
  // Lit depuis sandwich_types (même table que le site web et la borne)
  const { data: dbProducts = [], isLoading: loadingSw } = useSandwichTypes();
  const products = (!loadingSw && dbProducts.length === 0) ? FALLBACK_SANDWICHES_POS : dbProducts;
  const { data: dbSauces = [] } = useSauceOptions();
  const { data: dbCrud = [] }   = useCruditesOptions();

  const sauces = dbSauces.map((s:any) => ({ id:s.id, name:s.name, img:s.image_url }));
  const crud   = dbCrud.map((g:any) => ({ id:g.id, name:g.name, img:g.image_url }));
  const defaults = ['salade','tomate','oignon'];
  const defCrud = crud.filter(g => defaults.some(d => g.name.toLowerCase().includes(d)));
  const extraCrud = crud.filter(g => !defaults.some(d => g.name.toLowerCase().includes(d)));

  const [sel, setSel] = useState<any|null>(null);
  const [selSauces, setSauces] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [selExtra, setExtra] = useState<string[]>([]);
  const [menu, setMenu] = useState<'none'|'frites'|'boisson'|'menu'>('none');
  const [note, setNote] = useState('');

  const sauceSurcharge = Math.max(0, selSauces.length - FREE_SAUCES) * EXTRA_SAUCE;
  const price = (sel?.base_price || 0) + menuOptionPrices[menu] + sauceSurcharge;

  const toggle = (id:string, arr:string[], set:any) => set(arr.includes(id) ? arr.filter((x:string)=>x!==id) : [...arr, id]);
  const reset = () => { setSel(null); setSauces([]); setRemoved([]); setExtra([]); setMenu('none'); setNote(''); };

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez un sandwich'); return; }
    const sauceNames = selSauces.map(id => sauces.find(s=>s.id===id)?.name || '');
    const crudNames = [
      ...defCrud.filter(g=>!removed.includes(g.id)).map(g=>g.name),
      ...extraCrud.filter(g=>selExtra.includes(g.id)).map(g=>g.name),
    ];
    onAdd(
      { id:sel.id, name:sel.name, price:sel.base_price, category:'sandwiches', description:'' },
      { sauces:sauceNames, garnitures:crudNames, menuOption:menu, note },
      price
    );
    reset();
  };

  const active = products.filter((p:any)=>p.is_active);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Sandwich products */}
      <div style={{ flex:'0 0 auto', maxHeight:200, overflow:'auto', padding:'10px 14px', borderBottom:`1px solid ${S.border}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(82px,1fr))', gap:6 }}>
          {active.map((p:any)=>(
            <ProductTile key={p.id} compact item={{...p, price:p.base_price}} selected={sel?.id===p.id}
              onClick={()=>setSel(sel?.id===p.id?null:p)} />
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
        {!sel && <div style={{ textAlign:'center', color:'#374151', fontSize:13, paddingTop:24 }}>Choisissez un sandwich ci-dessus</div>}
        {sel && (
          <>
            <SectionTitle hint={`${FREE_SAUCES} gratuites, +${EXTRA_SAUCE.toFixed(2)}€ ensuite`}>Sauces</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:12 }}>
              {sauces.map(s => (
                <OptTile key={s.id} name={s.name} img={s.img} emoji="🥫"
                  selected={selSauces.includes(s.id)} onClick={()=>toggle(s.id, selSauces, setSauces)} />
              ))}
            </div>

            <SectionTitle hint="inclus — touchez pour retirer">Crudités</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))', gap:6, marginBottom:12 }}>
              {defCrud.map(g => (
                <OptTile key={g.id} name={g.name} img={g.img} emoji="🥗" isDefaultRemovable
                  selected={!removed.includes(g.id)} onClick={()=>toggle(g.id, removed, setRemoved)} />
              ))}
              {extraCrud.map(g => (
                <OptTile key={g.id} name={g.name} img={g.img} emoji="➕"
                  selected={selExtra.includes(g.id)} onClick={()=>toggle(g.id, selExtra, setExtra)} />
              ))}
            </div>

            <SectionTitle>Menu</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
              {([
                { id:'none', label:'Sans', emoji:'🚫' },
                { id:'frites', label:`Frites +${menuOptionPrices.frites}€`, emoji:'🍟' },
                { id:'boisson', label:`Boisson +${menuOptionPrices.boisson}€`, emoji:'🥤' },
                { id:'menu', label:`Menu +${menuOptionPrices.menu}€`, emoji:'🍔' },
              ] as const).map(o => (
                <button key={o.id} onClick={()=>setMenu(o.id)} style={{
                  padding:'8px 4px', borderRadius:8, cursor:'pointer', fontSize:10, fontWeight:700, lineHeight:1.2,
                  border:`1.5px solid ${menu===o.id?'#3b82f6':'#2d3748'}`,
                  background: menu===o.id?'#3b82f622':S.card, color: menu===o.id?'#3b82f6':S.muted,
                }}><div style={{ fontSize:16 }}>{o.emoji}</div>{o.label}</button>
              ))}
            </div>

            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." style={S.input} />
          </>
        )}
      </div>

      <div style={{ padding:'10px 14px', borderTop:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!sel} style={{
          width:'100%', padding:'11px', borderRadius:9, border:'none',
          background: sel?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color: sel?'#000':'#374151', fontSize:14, fontWeight:800, cursor:sel?'pointer':'not-allowed',
        }}>{sel ? `➕ ${sel.name} — ${price.toFixed(2)}€` : 'Choisissez un sandwich'}</button>
      </div>
    </div>
  );
}

// ── TexMex panel — Snacks (dégressif) + Frites (fixe) + Croques (fixe) ───────
interface TxProduct { id:string; name:string; unit_price:number; image_url:string|null; category?:'snack'|'frites'|'croque'; }

const TX_SNACKS:TxProduct[] = [
  { id:'wings',      name:'Wings',        unit_price:1.40, image_url:null, category:'snack'  },
  { id:'tenders-tx', name:'Tenders',      unit_price:1.40, image_url:null, category:'snack'  },
  { id:'nuggets-tx', name:'Nuggets',      unit_price:1.40, image_url:null, category:'snack'  },
  { id:'mozzastick', name:'Mozza Stick',  unit_price:1.20, image_url:null, category:'snack'  },
  { id:'jalapenos',  name:'Jalapeños',    unit_price:1.20, image_url:null, category:'snack'  },
  { id:'onionrings', name:'Onion Rings',  unit_price:1.20, image_url:null, category:'snack'  },
];
const TX_FRITES:TxProduct[] = [
  { id:'petite-barquette', name:'Petite Barquette', unit_price:3.00, image_url:null, category:'frites' },
  { id:'grande-barquette', name:'Grande Barquette', unit_price:5.00, image_url:null, category:'frites' },
];
const TX_CROQUES:TxProduct[] = [
  { id:'croque-monsieur', name:'Croque Monsieur', unit_price:3.00, image_url:null, category:'croque' },
  { id:'croque-madame',   name:'Croque Madame',   unit_price:4.00, image_url:null, category:'croque' },
];

function txGroupOf(name:string):'A'|'B' {
  const n = name.toLowerCase().replace(/[^a-z]/g,'');
  return ['wings','tenders','nuggets'].includes(n) ? 'A' : 'B';
}
function txGroupPrice(qty:number, grp:'A'|'B'):number {
  if (qty <= 0) return 0;
  const [unit,p5,p10] = grp==='A' ? [1.40,7.00,13.00] : [1.20,6.00,10.00];
  const n10 = Math.floor(qty/10); let r = qty%10;
  const n5  = Math.floor(r/5);   r %= 5;
  return n10*p10 + n5*p5 + r*unit;
}

function TexMexPanel({ onAdd }:{ onAdd:(item:any,custom:any,price:number)=>void }) {
  const [products, setProducts] = useState<TxProduct[]>([]);
  const [qtys, setQtys] = useState<Record<string,number>>({});

  useEffect(()=>{
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.from('texmex_products' as any).select('*').eq('is_active',true).order('display_order')
        .then(({ data, error }) => {
          if (error || !data || !(data as any[]).length) {
            setProducts([...TX_SNACKS,...TX_FRITES,...TX_CROQUES]); return;
          }
          const raw = data as unknown as TxProduct[];
          const hasSnack  = raw.some(p=>(p.category??'snack')==='snack');
          const hasFrites = raw.some(p=>p.category==='frites');
          const hasCroque = raw.some(p=>p.category==='croque');
          setProducts([
            ...(hasSnack  ? raw.filter(p=>(p.category??'snack')==='snack') : TX_SNACKS),
            ...(hasFrites ? raw.filter(p=>p.category==='frites')           : TX_FRITES),
            ...(hasCroque ? raw.filter(p=>p.category==='croque')           : TX_CROQUES),
          ]);
        });
    });
  },[]);

  const change = (id:string, delta:number) =>
    setQtys(prev => { const n = Math.max(0,(prev[id]||0)+delta); const next={...prev}; if(n===0) delete next[id]; else next[id]=n; return next; });

  const snacks  = products.filter(p=>(p.category??'snack')==='snack');
  const frites  = products.filter(p=>p.category==='frites');
  const croques = products.filter(p=>p.category==='croque');

  const total = (()=>{
    let qA=0,qB=0,fixed=0;
    Object.entries(qtys).forEach(([id,qty])=>{
      const p = products.find(x=>x.id===id); if(!p||qty<=0) return;
      if(p.category==='frites'||p.category==='croque') fixed += p.unit_price*qty;
      else { const g = txGroupOf(p.name); if(g==='A') qA+=qty; else qB+=qty; }
    });
    return txGroupPrice(qA,'A')+txGroupPrice(qB,'B')+fixed;
  })();

  const hasItems = Object.values(qtys).some(q=>q>0);

  const handleAdd = () => {
    if (!hasItems) { toast.error('Sélectionnez au moins un article'); return; }
    const lines = Object.entries(qtys)
      .filter(([,q])=>q>0)
      .map(([id,q])=>{ const p=products.find(x=>x.id===id)!; return `${q}x ${p.name}`; });
    onAdd(
      { id:`texmex-${Date.now()}`, name:`Tex-Mex (${lines.length} article${lines.length>1?'s':''})`, price:total, category:'texmex', description:lines.join(', ') },
      { items:lines, note:'' },
      total
    );
    setQtys({});
  };

  const catEmoji = (cat?:string) => cat==='frites' ? '🍟' : cat==='croque' ? '🥪' : '🌶️';
  const catGrad  = (cat?:string) => cat==='frites' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
    : cat==='croque' ? 'linear-gradient(135deg,#a16207,#78350f)'
    : 'linear-gradient(135deg,#ef4444,#f97316)';

  // Single image tile
  const TxTile = ({ p }:{ p:TxProduct }) => {
    const q = qtys[p.id]||0;
    const isFixed = p.category==='frites'||p.category==='croque';
    return (
      <div style={{
        display:'flex', flexDirection:'column', borderRadius:10,
        border:`2px solid ${q>0 ? '#f59e0b' : S.border}`,
        background: q>0 ? 'rgba(245,158,11,0.10)' : S.card,
        overflow:'hidden', position:'relative',
        transition:'border-color 0.15s, background 0.15s',
      }}>
        {/* Image area — 4:3 ratio */}
        <div style={{ position:'relative', width:'100%', paddingTop:'75%', overflow:'hidden', flexShrink:0 }}>
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} style={{
              position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover',
            }} />
          ) : (
            <div style={{
              position:'absolute', top:0, left:0, width:'100%', height:'100%',
              background: catGrad(p.category),
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
            }}>{catEmoji(p.category)}</div>
          )}
          {/* Qty badge */}
          {q > 0 && (
            <div style={{
              position:'absolute', top:4, right:4,
              background:'#f59e0b', color:'#000', borderRadius:'50%',
              width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:900, lineHeight:1,
            }}>{q}</div>
          )}
        </div>
        {/* Name + price */}
        <div style={{ padding:'4px 5px 3px', flex:1 }}>
          <div style={{ fontSize:10, fontWeight:800, color:S.text, lineHeight:1.25, marginBottom:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize:9, color:S.accent, fontWeight:600 }}>
            {isFixed ? `${p.unit_price.toFixed(2)}€` : `${p.unit_price.toFixed(2)}€/p.`}
          </div>
        </div>
        {/* +/- controls */}
        <div style={{ display:'flex', borderTop:`1px solid ${S.border}`, flexShrink:0 }}>
          <button
            onClick={(e)=>{ e.stopPropagation(); change(p.id,-1); }}
            disabled={q===0}
            style={{ flex:1, padding:'4px 0', border:'none', background:'transparent',
              color: q ? '#ef4444' : '#374151', cursor: q ? 'pointer' : 'not-allowed',
              fontSize:15, fontWeight:900, borderRight:`1px solid ${S.border}`,
            }}>−</button>
          <button
            onClick={(e)=>{ e.stopPropagation(); change(p.id,+1); }}
            style={{ flex:1, padding:'4px 0', border:'none', background:'transparent',
              color:'#22c55e', cursor:'pointer', fontSize:15, fontWeight:900,
            }}>+</button>
        </div>
      </div>
    );
  };

  // Section label spanning full grid width + tiles
  const renderSection = (emoji:string, title:string, items:TxProduct[]) => items.length===0 ? null : (
    <>
      <div style={{
        gridColumn:'1 / -1', fontSize:10, fontWeight:900, color:S.accent,
        textTransform:'uppercase', letterSpacing:1.2, marginTop:4,
      }}>{emoji} {title}</div>
      {items.map(p=><TxTile key={p.id} p={p} />)}
    </>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflow:'auto', padding:'6px 8px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:5 }}>
          {renderSection('🌶️','Snacks', snacks)}
          {renderSection('🍟','Frites', frites)}
          {renderSection('🥪','Croques',croques)}
        </div>
      </div>
      {/* Dégressif info + Add button */}
      <div style={{ padding:'7px 8px', borderTop:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        {hasItems && (
          <div style={{ fontSize:9, color:S.muted, marginBottom:4, textAlign:'center' }}>
            Snacks: A (Wings/Tenders/Nuggets) 1.40€ · 5=7€ · 10=13€ &nbsp;|&nbsp; B (autres) 1.20€ · 5=6€ · 10=10€
          </div>
        )}
        <button onClick={handleAdd} disabled={!hasItems} style={{
          width:'100%', padding:'10px', borderRadius:9, border:'none',
          background:hasItems?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color:hasItems?'#000':'#374151', fontSize:14, fontWeight:800, cursor:hasItems?'pointer':'not-allowed',
        }}>➕ Ajouter au panier — {total.toFixed(2)}€</button>
      </div>
    </div>
  );
}

// ── Boissons panel — canette/bouteille avec note + quantité ──────────────────
const BOISSON_ITEMS = [
  { id:'canette',   name:'Canette au choix',   price:1.50, hasNote:true  },
  { id:'bouteille', name:'Grande Bouteille',   price:3.50, hasNote:true  },
  { id:'eau-mini',  name:'Eau Mini (50cl)',     price:1.00, hasNote:false },
  { id:'eau-grand', name:'Eau Grand (1.5L)',    price:1.50, hasNote:false },
];
function BoissonPanel({ onAdd }:{ onAdd:(item:any,custom:any,price:number)=>void }) {
  const [qtys,  setQtys]  = useState<Record<string,number>>({});
  const [notes, setNotes] = useState<Record<string,string>>({});

  const changeQty = (id:string, d:number) =>
    setQtys(p => { const n=Math.max(0,(p[id]||0)+d); const r={...p}; if(n===0) delete r[id]; else r[id]=n; return r; });

  const total = BOISSON_ITEMS.reduce((s,b)=>s+(qtys[b.id]||0)*b.price, 0);
  const hasItems = Object.values(qtys).some(q=>q>0);

  const handleAdd = () => {
    if (!hasItems) { toast.error('Sélectionnez au moins une boisson'); return; }
    const lines = BOISSON_ITEMS
      .filter(b=>(qtys[b.id]||0)>0)
      .map(b=>{ const n=notes[b.id]; return `${qtys[b.id]}x ${b.name}${n?` (${n})`:''}`; });
    // Add each boisson as separate cart item for clarity
    BOISSON_ITEMS.filter(b=>(qtys[b.id]||0)>0).forEach(b=>{
      const q = qtys[b.id]; const n = notes[b.id];
      onAdd(
        { id:`boisson-${b.id}-${Date.now()}`, name:b.name+(n?` (${n})`:''), price:b.price, category:'boissons', description:'' },
        { note:n||'' },
        b.price * q
      );
    });
    setQtys({}); setNotes({});
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
        {BOISSON_ITEMS.map(b=>{
          const q = qtys[b.id]||0;
          return (
            <div key={b.id} style={{ background:S.card, borderRadius:9, padding:'8px 12px', marginBottom:8, border:`1px solid ${q>0?S.accent:S.border}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: b.hasNote?6:0 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:S.text }}>{b.name}</div>
                  <div style={{ fontSize:11, color:S.accent, fontWeight:800 }}>{b.price.toFixed(2)}€</div>
                </div>
                <button onClick={()=>changeQty(b.id,-1)} disabled={q===0} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${S.border}`,background:S.panel,color:q?S.text:'#374151',cursor:q?'pointer':'not-allowed',fontSize:16,fontWeight:800 }}>−</button>
                <span style={{ width:24, textAlign:'center', fontSize:13, fontWeight:800, color:q?S.accent:S.muted }}>{q||'·'}</span>
                <button onClick={()=>changeQty(b.id,+1)} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${q?S.accent:S.border}`,background:q?S.accent+'22':S.panel,color:S.accent,cursor:'pointer',fontSize:16,fontWeight:800 }}>+</button>
              </div>
              {b.hasNote && (
                <input
                  value={notes[b.id]||''}
                  onChange={e=>setNotes(p=>({...p,[b.id]:e.target.value}))}
                  placeholder={b.id==='canette'?'Ex: Coca-Cola, Fanta, Sprite…':'Ex: Coca 1.5L, eau gazeuse…'}
                  style={{ ...S.input, fontSize:11, padding:'5px 8px', marginTop:2 }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding:'10px 14px', borderTop:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        <button onClick={handleAdd} disabled={!hasItems} style={{
          width:'100%', padding:'11px', borderRadius:9, border:'none',
          background:hasItems?'linear-gradient(135deg,#3b82f6,#06b6d4)':'#1f2937',
          color:hasItems?'#fff':'#374151', fontSize:14, fontWeight:800, cursor:hasItems?'pointer':'not-allowed',
        }}>🥤 Ajouter — {total.toFixed(2)}€</button>
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
          width:'100%', padding:'9px', borderRadius:9, border:'none',
          background: sel?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color:sel?'#000':'#374151', fontSize:13, fontWeight:800, cursor:sel?'pointer':'not-allowed',
        }}>
          {sel?`➕ ${qty}x ${sel.name} — ${(sel.price*qty).toFixed(2)}€`:'Sélectionnez un produit'}
        </button>
      </div>
    </div>
  );
}

// ── History & Stats panel (past orders today) ──────────────────────────────────
function HistoryPanel({ onClose }: { onClose:()=>void }) {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const { data: orders = [], isLoading, refetch } = useOrders(todayStr);

  const [loadingActions, setLoadingActions] = useState<Record<string, 'reprint' | 'facture' | null>>({});

  const handleReprint = async (orderNumber: string) => {
    setLoadingActions(prev => ({ ...prev, [orderNumber]: 'reprint' }));
    try {
      const res = await fetch(`${PRINT_SERVER}/reprint/${orderNumber}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`✅ Ticket #${orderNumber} réimprimé`);
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      toast.error(e.message?.includes('fetch') ? '❌ Serveur impression hors ligne' : '❌ ' + e.message);
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderNumber]: null }));
    }
  };

  const handleFacture = async (orderNumber: string) => {
    setLoadingActions(prev => ({ ...prev, [orderNumber]: 'facture' }));
    try {
      const res = await fetch(`${PRINT_SERVER}/print-invoice/${orderNumber}`);
      if (res.ok) {
        toast.success(`✅ Facture imprimée pour #${orderNumber}`);
      } else {
        toast.error(`❌ Erreur d'impression de facture`);
      }
    } catch (e: any) {
      toast.error('❌ Serveur impression hors ligne');
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderNumber]: null }));
    }
  };

  const formatItemsSummary = (items: any[]) => {
    if (!items || !Array.isArray(items)) return '';
    return items.map(ci => {
      const name = ci.item?.name || 'Article';
      const qty = ci.quantity || 1;
      const size = ci.customization?.sizeLabel ? ` (${ci.customization.sizeLabel})` : '';
      return `${qty}x ${name}${size}`;
    }).join(', ');
  };

  // Calculations
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const totalSales = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCount = validOrders.length;

  const byType = validOrders.reduce((acc, o) => {
    acc[o.order_type] = (acc[o.order_type] || 0) + (o.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const countByType = validOrders.reduce((acc, o) => {
    acc[o.order_type] = (acc[o.order_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byPay = validOrders.reduce((acc, o) => {
    acc[o.payment_method] = (acc[o.payment_method] || 0) + (o.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const countByPay = validOrders.reduce((acc, o) => {
    acc[o.payment_method] = (acc[o.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ En attente',
      preparing: '🍳 En prép.',
      ready: '✅ Prêt',
      completed: '🎉 Terminé',
      cancelled: '❌ Annulé'
    };
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      preparing: '#3b82f6',
      ready: '#10b981',
      completed: '#10b981',
      cancelled: '#ef4444'
    };
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: (colors[status] || '#6b7280') + '22', color: colors[status] || '#6b7280' }}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:480, maxWidth:'90%', height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:S.text }}>📊 Historique & Stats</div>
            <div style={{ fontSize:11, color:S.muted, marginTop:2 }}>
              Journée du {d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <button onClick={onClose} style={{ ...S.btn, padding:'5px 12px' }}>✕</button>
        </div>

        {/* Content Area */}
        <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
          {isLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40, color:S.muted }}>⏳ Chargement des données...</div>
          ) : (
            <>
              {/* Stats Section */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:S.muted, fontWeight:700 }}>CHIFFRE D'AFFAIRES</div>
                  <div style={{ fontSize:22, fontWeight:800, color:S.accent, marginTop:4 }}>{totalSales.toFixed(2)}€</div>
                </div>
                <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:S.muted, fontWeight:700 }}>COMMANDES TOTALES</div>
                  <div style={{ fontSize:22, fontWeight:800, color:S.text, marginTop:4 }}>{totalCount}</div>
                </div>
              </div>

              {/* Stats Details Grid */}
              <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
                <div style={{ fontSize:11, color:S.text, fontWeight:800, borderBottom:`1px solid ${S.border}`, paddingBottom:6, marginBottom:8 }}>
                  Détail par Type & Paiement
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, fontSize:12 }}>
                  {/* Types */}
                  <div>
                    <div style={{ color:S.muted, fontWeight:700, fontSize:10, textTransform:'uppercase', marginBottom:4 }}>Type de commande</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>🍽️ Sur place</span>
                        <span style={{ fontWeight:700 }}>{countByType['surplace']||0} ({ (byType['surplace']||0).toFixed(1) }€)</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>🛍️ À emporter</span>
                        <span style={{ fontWeight:700 }}>{countByType['emporter']||0} ({ (byType['emporter']||0).toFixed(1) }€)</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>🚗 Livraison</span>
                        <span style={{ fontWeight:700 }}>{countByType['livraison']||0} ({ (byType['livraison']||0).toFixed(1) }€)</span>
                      </div>
                    </div>
                  </div>
                  {/* Payments */}
                  <div>
                    <div style={{ color:S.muted, fontWeight:700, fontSize:10, textTransform:'uppercase', marginBottom:4 }}>Moyens de paiement</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>💵 Espèces</span>
                        <span style={{ fontWeight:700 }}>{countByPay['especes']||0} ({ (byPay['especes']||0).toFixed(1) }€)</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>💳 Carte bancaire</span>
                        <span style={{ fontWeight:700 }}>{countByPay['cb']||0} ({ (byPay['cb']||0).toFixed(1) }€)</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span>🌐 En ligne</span>
                        <span style={{ fontWeight:700 }}>{countByPay['en_ligne']||0} ({ (byPay['en_ligne']||0).toFixed(1) }€)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders List Section */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:12, fontWeight:800, color:S.muted, textTransform:'uppercase', letterSpacing:1 }}>
                  Historique des commandes ({orders.length})
                </span>
                <button onClick={() => refetch()} style={{ ...S.btn, padding:'3px 8px', fontSize:10 }}>🔄 Rafraîchir</button>
              </div>

              {orders.length === 0 ? (
                <div style={{ textAlign:'center', color:S.muted, padding:'30px 0', fontSize:12 }}>
                  Aucune commande enregistrée aujourd'hui.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {orders.map(order => {
                    const actionState = loadingActions[order.order_number];
                    const isCancelled = order.status === 'cancelled';
                    return (
                      <div key={order.id} style={{
                        background: S.card,
                        border: `1px solid ${isCancelled ? '#ef444433' : S.border}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        opacity: isCancelled ? 0.6 : 1,
                      }}>
                        {/* Row 1: Order Num + Client + Time */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:13, fontWeight:800, color:S.text }}>
                            #{order.order_number}
                          </span>
                          <span style={{ fontSize:12, fontWeight:700, color:S.text, marginLeft:8, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {order.customer_name}
                          </span>
                          <span style={{ fontSize:11, color:S.muted, marginLeft:8 }}>
                            {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>

                        {/* Row 2: Badges */}
                        <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
                          {getStatusBadge(order.status)}
                          <span style={{ fontSize:10, background:'#1f2937', color:'#e5e7eb', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
                            {TYPE_LABELS[order.order_type as OrderType] || order.order_type}
                          </span>
                          <span style={{ fontSize:10, background:'#1f2937', color:'#e5e7eb', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>
                            {PAY_LABELS[order.payment_method as PayMethod] || order.payment_method}
                          </span>
                        </div>

                        {/* Row 3: Items summary */}
                        <div style={{ fontSize:11, color:S.muted, lineHeight:1.3 }}>
                          {formatItemsSummary(order.items)}
                        </div>

                        {/* Row 4: Total + actions */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${S.border}44`, paddingTop:6, marginTop:2 }}>
                          <span style={{ fontSize:14, fontWeight:800, color:S.accent }}>
                            {order.total?.toFixed(2)}€
                          </span>
                          <div style={{ display:'flex', gap:6 }}>
                            <button
                              onClick={() => handleReprint(order.order_number)}
                              disabled={actionState !== null && actionState !== undefined}
                              style={{
                                ...S.btn,
                                padding: '4px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: actionState === 'reprint' ? '#1f2937' : undefined,
                                cursor: actionState ? 'wait' : 'pointer'
                              }}
                            >
                              {actionState === 'reprint' ? '⏳...' : '🖨️ Imprimer'}
                            </button>
                            <button
                              onClick={() => handleFacture(order.order_number)}
                              disabled={actionState !== null && actionState !== undefined}
                              style={{
                                ...S.btn,
                                padding: '4px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                borderColor: S.accent + '44',
                                color: S.accent,
                                background: actionState === 'facture' ? '#1f2937' : S.accent + '0a',
                                cursor: actionState ? 'wait' : 'pointer'
                              }}
                            >
                              {actionState === 'facture' ? '⏳...' : '🧾 Facture'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Settings panel (theme / colors) ──────────────────────────────────────────
function SettingsPanel({ onClose }: { onClose:()=>void }) {
  useThemeBump();
  const setColor = (k:ThemeKey, v:string) => { (S as any)[k] = v; saveTheme(); notifyTheme(); };
  const resetAll = () => { Object.assign(S, DEFAULT_THEME); saveTheme(); notifyTheme(); };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:340, height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, padding:'18px 20px', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:800, color:S.text }}>⚙️ Personnalisation</div>
          <button onClick={onClose} style={{ ...S.btn, padding:'5px 12px' }}>✕</button>
        </div>
        <div style={{ fontSize:12, color:S.muted, marginBottom:14 }}>Changez les couleurs de l'application. Sauvegarde automatique.</div>
        {(Object.keys(DEFAULT_THEME) as ThemeKey[]).map(k => (
          <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${S.border}` }}>
            <span style={{ fontSize:13, color:S.text }}>{THEME_LABELS[k]}</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:S.muted, fontFamily:'monospace' }}>{(S as any)[k]}</span>
              <input type="color" value={(S as any)[k]} onChange={e=>setColor(k, e.target.value)}
                style={{ width:38, height:28, border:'none', background:'none', cursor:'pointer', borderRadius:6 }} />
            </div>
          </div>
        ))}
        <button onClick={resetAll} style={{ ...S.btn, width:'100%', marginTop:18, padding:'10px', fontWeight:700 }}>
          ↺ Réinitialiser les couleurs
        </button>
      </div>
    </div>
  );
}

// ── Update Panel (git pull, npm install, npm run build, relaunch) ─────────────
function UpdatePanel({ onClose }: { onClose:()=>void }) {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    if (typeof window === 'undefined' || !('twinHub' in window)) return;
    setChecking(true);
    setError('');
    try {
      const res = await (window as any).twinHub.checkForUpdates();
      if (res.success) {
        setUpdateInfo(res);
      } else {
        setError(res.error || 'Erreur lors de la vérification');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de communication avec le serveur local');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();

    if (typeof window !== 'undefined' && 'twinHub' in window) {
      const cleanup = (window as any).twinHub.onUpdateStatus((data: any) => {
        if (data.status === 'progress') {
          setStatusMessage(data.message);
        } else if (data.status === 'error') {
          setError(data.message);
          setUpdating(false);
        }
      });
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, []);

  const triggerUpdate = async () => {
    if (typeof window === 'undefined' || !('twinHub' in window)) return;
    setUpdating(true);
    setError('');
    setStatusMessage('Démarrage de la mise à jour...');
    try {
      const res = await (window as any).twinHub.triggerUpdate();
      if (!res.success) {
        setError(res.error || 'La mise à jour a échoué');
        setUpdating(false);
      }
    } catch (e: any) {
      setError(e.message || 'La mise à jour a échoué');
      setUpdating(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:360, height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, padding:'18px 20px', overflow:'auto', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:S.text }}>🔄 Mise à jour</div>
          <button onClick={onClose} disabled={updating} style={{ ...S.btn, padding:'5px 12px' }}>✕</button>
        </div>

        {updating ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, textAlign:'center' }}>
            <div style={{ width:40, height:40, border:'4px solid #f59e0b22', borderTop:'4px solid #f59e0b', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
            <div style={{ fontSize:14, fontWeight:700, color:S.text }}>Mise à jour en cours...</div>
            <div style={{ fontSize:12, color:S.muted, padding:'0 10px' }}>{statusMessage}</div>
            <div style={{ fontSize:11, color: '#ef4444' }}>Ne fermez pas l'application.</div>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
            {error && (
              <div style={{ background:'#ef444415', border:'1px solid #ef444433', color:'#ef4444', padding:10, borderRadius:8, fontSize:12 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ background:S.card, border:`1px solid ${S.border}`, padding:12, borderRadius:8 }}>
              <div style={{ fontSize:11, color:S.muted, textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>Version Actuelle</div>
              {updateInfo ? (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:S.text }}>Branche: {updateInfo.branch}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:S.accent, marginTop:2 }}>Commit: {updateInfo.current?.hash}</div>
                  <div style={{ fontSize:12, color:S.text, marginTop:4 }}>"{updateInfo.current?.msg}"</div>
                  <div style={{ fontSize:11, color:S.muted, marginTop:4 }}>Par: {updateInfo.current?.author} ({updateInfo.current?.date})</div>
                </div>
              ) : checking ? (
                <div style={{ fontSize:12, color:S.muted }}>Vérification...</div>
              ) : (
                <div style={{ fontSize:12, color:S.muted }}>Version locale non disponible</div>
              )}
            </div>

            {updateInfo?.updateAvailable ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1, minHeight:0 }}>
                <div style={{ background:'#22c55e15', border:'1px solid #22c55e33', color:'#22c55e', padding:10, borderRadius:8, fontSize:12, fontWeight:700 }}>
                  🎉 Nouvelle mise à jour disponible !
                </div>
                
                <div style={{ fontSize:11, color:S.muted, textTransform:'uppercase', fontWeight:700 }}>Détails des modifications</div>
                <div style={{ flex:1, overflow:'auto', border:`1px solid ${S.border}`, borderRadius:8, background:'#0d1117' }}>
                  {updateInfo.aheadCommits.map((c: any) => (
                    <div key={c.hash} style={{ padding:'8px 10px', borderBottom:`1px solid ${S.border}`, fontSize:11 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', color:S.accent, fontWeight:700 }}>
                        <span>Commit: {c.hash}</span>
                        <span style={{ color:S.muted }}>{c.date}</span>
                      </div>
                      <div style={{ color:S.text, marginTop:2, fontWeight:500 }}>{c.msg}</div>
                      <div style={{ color:S.muted, fontSize:10, marginTop:1 }}>Par: {c.author}</div>
                    </div>
                  ))}
                </div>

                <button onClick={triggerUpdate} style={{ ...S.btn, width:'100%', background:'linear-gradient(135deg,#f59e0b,#ef4444)', border:'none', color:'#000', padding:'12px', fontWeight:800, fontSize:13, borderRadius:9, cursor:'pointer', marginTop:'auto' }}>
                  🚀 Installer la mise à jour
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center', justifyContent:'center', padding:'30px 10px', textAlign:'center', flex:1 }}>
                <div style={{ fontSize:32 }}>✨</div>
                <div style={{ fontSize:13, fontWeight:700, color:S.text }}>Votre application est à jour !</div>
                <div style={{ fontSize:12, color:S.muted }}>Aucune nouvelle modification disponible sur la branche {updateInfo?.branch || 'principale'}.</div>
                <button onClick={check} disabled={checking} style={{ ...S.btn, padding:'6px 14px', marginTop:10, fontSize:11 }}>
                  {checking ? 'Vérification...' : '🔄 Re-vérifier'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Facture modal (custom invoice → ethernet printer) ─────────────────────────
function FactureModal({ initialTotal, onClose }: { initialTotal:number; onClose:()=>void }) {
  const [repas,   setRepas]   = useState(1);
  const [unit,    setUnit]    = useState(initialTotal > 0 ? initialTotal : 0);
  const [label,   setLabel]   = useState('Repas');
  const [tvaRate, setTvaRate] = useState(10);
  const [client,  setClient]  = useState('');
  const [printing, setPrinting] = useState(false);

  const totalTTC = repas * unit;
  const totalHT  = totalTTC / (1 + tvaRate / 100);
  const tvaAmt   = totalTTC - totalHT;

  const print = async () => {
    if (totalTTC <= 0) { toast.error('Montant invalide'); return; }
    setPrinting(true);
    try {
      const d = new Date();
      const invoiceNumber = `FA-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*900)+100)}`;
      const res = await fetch(`${PRINT_SERVER}/print-custom-invoice`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          invoiceNumber, invoiceDate: d.toISOString().slice(0,10),
          clientName: client.trim() || undefined,
          items: [{ description: label.trim() || 'Repas', quantity: repas, unitPrice: unit }],
          tvaRate,
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data.success) { toast.success(`✅ Facture ${invoiceNumber} imprimée`); onClose(); }
      else throw new Error(data.error || `HTTP ${res.status}`);
    } catch (e:any) {
      toast.error(e.message?.includes('fetch') ? '❌ Serveur impression hors ligne' : '❌ ' + e.message);
    } finally { setPrinting(false); }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:380, background:S.panel, border:`1px solid ${S.border}`, borderRadius:14, padding:'20px 22px' }}>
        <div style={{ fontSize:17, fontWeight:800, color:S.accent, marginBottom:4 }}>🧾 Facture client</div>
        <div style={{ fontSize:12, color:S.muted, marginBottom:16 }}>SIRET 942 617 358 00018 · TVA FR28942617358</div>

        <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Désignation</label>
        <input value={label} onChange={e=>setLabel(e.target.value)} style={{ ...S.input, margin:'4px 0 12px' }} />

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Nb repas</label>
            <input type="number" min={1} value={repas} onChange={e=>setRepas(Math.max(1,parseInt(e.target.value)||1))} style={{ ...S.input, marginTop:4 }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Prix unit. (€)</label>
            <input type="number" min={0} step={0.5} value={unit||''} onChange={e=>setUnit(parseFloat(e.target.value)||0)} style={{ ...S.input, marginTop:4 }} />
          </div>
          <div style={{ width:80 }}>
            <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>TVA %</label>
            <input type="number" min={0} value={tvaRate} onChange={e=>setTvaRate(parseFloat(e.target.value)||0)} style={{ ...S.input, marginTop:4 }} />
          </div>
        </div>

        <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Client (optionnel)</label>
        <input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nom / Société" style={{ ...S.input, margin:'4px 0 14px' }} />

        <div style={{ background:S.card, borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:S.muted }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Total HT</span><span>{totalHT.toFixed(2)} €</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>TVA {tvaRate}%</span><span>{tvaAmt.toFixed(2)} €</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', color:S.accent, fontWeight:800, fontSize:15, marginTop:4 }}><span>TOTAL TTC</span><span>{totalTTC.toFixed(2)} €</span></div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} style={{ ...S.btn, flex:1, padding:'11px', fontWeight:700 }}>Annuler</button>
          <button onClick={print} disabled={printing} style={{
            flex:2, padding:'11px', borderRadius:8, border:'none', fontWeight:800, cursor:printing?'wait':'pointer',
            background: printing ? '#374151' : 'linear-gradient(135deg,#f59e0b,#ef4444)', color: printing?'#6b7280':'#000',
          }}>{printing ? '⏳ Impression...' : '🖨️ Imprimer la facture'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Editable cart item row ────────────────────────────────────────────────────
function CartItemRow({ ci, onUpdate, onRemove }: { ci:any; onUpdate:(u:any)=>void; onRemove:()=>void }) {
  const [open, setOpen] = useState(false);
  const c = ci.customization as any;
  const unitPrice = ci.calculatedPrice || ci.item.price;
  const totalPrice = unitPrice * ci.quantity;

  // Toggle a string in a customization array field
  const toggleField = (field: string, val: string) => {
    const arr: string[] = (c?.[field] || []).filter(Boolean);
    const updated = arr.includes(val) ? arr.filter((x:string)=>x!==val) : [...arr, val];
    onUpdate({ customization: { ...c, [field]: updated } });
  };

  const ChipEdit = ({ val, field }: { val:string; field:string }) => (
    <button onClick={()=>toggleField(field, val)} title="Retirer" style={{
      display:'inline-flex', alignItems:'center', gap:3,
      padding:'2px 7px', borderRadius:99, border:`1px solid ${S.border}`,
      background:'#22c55e18', color:'#22c55e', fontSize:10, fontWeight:700, cursor:'pointer',
    }}>{val} <span style={{ color:'#ef4444', fontSize:10 }}>✕</span></button>
  );

  // Summary line for closed state
  const summary = c ? [
    c.sizeLabel || c.size,
    c.base,
    c.meats?.slice(0,2).join('+'),
    c.sauces?.slice(0,2).join('+'),
    c.note,
  ].filter(Boolean).join(' · ') : ci.item.description || '';

  return (
    <div style={{ borderBottom:`1px solid ${S.border}11` }}>
      {/* Collapsed row — click to expand/collapse */}
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 0', cursor:'pointer', userSelect:'none' }}>
        <span style={{ fontSize:11, fontWeight:800, color:S.accent, minWidth:18 }}>{ci.quantity}×</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ci.item.name}</div>
          {summary && <div style={{ fontSize:9, color:S.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{summary}</div>}
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:S.text, flexShrink:0 }}>{totalPrice.toFixed(2)}€</span>
        <span style={{ fontSize:9, color:S.muted, flexShrink:0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded edit panel */}
      {open && (
        <div style={{ background:'#111827', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>

          {/* Quantity + delete */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:10, color:S.muted, flex:1 }}>Quantité</span>
            <button onClick={()=>onUpdate({quantity:ci.quantity-1})} style={{ width:24,height:24,borderRadius:6,border:`1px solid ${S.border}`,background:S.card,color:S.text,cursor:'pointer',fontSize:14,fontWeight:800,lineHeight:1 }}>−</button>
            <span style={{ fontSize:12,fontWeight:800,color:S.accent,minWidth:18,textAlign:'center' }}>{ci.quantity}</span>
            <button onClick={()=>onUpdate({quantity:ci.quantity+1})} style={{ width:24,height:24,borderRadius:6,border:`1px solid ${S.accent}`,background:S.accent+'22',color:S.accent,cursor:'pointer',fontSize:14,fontWeight:800,lineHeight:1 }}>+</button>
            <button onClick={onRemove} title="Supprimer" style={{ marginLeft:'auto',padding:'3px 8px',borderRadius:6,border:`1px solid #ef444444`,background:'#ef444411',color:'#ef4444',cursor:'pointer',fontSize:11,fontWeight:700 }}>🗑️</button>
          </div>

          {/* Meats */}
          {c?.meats?.filter(Boolean).length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Viandes</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                {c.meats.filter(Boolean).map((m:string)=><ChipEdit key={m} val={m} field="meats" />)}
              </div>
            </div>
          )}

          {/* Sauces */}
          {c?.sauces?.filter(Boolean).length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Sauces</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                {c.sauces.filter(Boolean).map((s:string)=><ChipEdit key={s} val={s} field="sauces" />)}
              </div>
            </div>
          )}

          {/* Garnitures */}
          {c?.garnitures?.filter(Boolean).length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Garnitures</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                {c.garnitures.filter(Boolean).map((g:string)=><ChipEdit key={g} val={g} field="garnitures" />)}
              </div>
            </div>
          )}

          {/* Supplements */}
          {c?.supplements?.filter(Boolean).length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Suppléments</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                {c.supplements.filter(Boolean).map((s:string)=><ChipEdit key={s} val={s} field="supplements" />)}
              </div>
            </div>
          )}

          {/* Menu option */}
          {c?.menuOption !== undefined && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Option menu</div>
              <div style={{ display:'flex',gap:4 }}>
                {(['none','frites','boisson','menu'] as const).map(opt=>(
                  <button key={opt} onClick={()=>onUpdate({customization:{...c,menuOption:opt}})} style={{
                    padding:'2px 7px',borderRadius:99,border:`1px solid ${c.menuOption===opt?S.accent:S.border}`,
                    background:c.menuOption===opt?S.accent+'22':'transparent',
                    color:c.menuOption===opt?S.accent:S.muted,fontSize:9,fontWeight:700,cursor:'pointer',
                  }}>{opt==='none'?'Sans':opt==='frites'?'🍟 Frites':opt==='boisson'?'🥤 Boisson':'🍔 Menu'}</button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <div style={{ fontSize:9,color:S.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:3 }}>Note</div>
            <input
              value={c?.note || ''}
              onChange={e=>onUpdate({customization:{...c,note:e.target.value}})}
              placeholder="Note, instruction spéciale..."
              style={{ ...S.input, fontSize:10, padding:'4px 8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Caisse side panel ─────────────────────────────────────────────────────────
function CaissePanel({ leftCollapsed, toggleLeft, cart, needsInfo, name, setName, phone, setPhone, address, setAddress, notes, setNotes, discount, setDiscount, payMethod, setPayMethod, pizzaPromo, pizzaSaving, discountAmt, ht, tva, total, submitting, handleSubmit, clearCart, setShowFacture }: any) {
  const { updateCartItem, removeFromCart } = useOrder();

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:S.panel }}>
      {/* Header — compact */}
      <div style={{ padding:'7px 12px', borderBottom:`1px solid ${S.border}`, fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        {leftCollapsed && <button onClick={toggleLeft} style={{ ...S.btn, padding:'3px 7px', fontSize:13 }}>⟩</button>}
        🛒 Caisse
        {cart.length > 0 && <span style={{ background:S.accent, color:'#000', borderRadius:99, fontSize:10, fontWeight:800, padding:'1px 7px' }}>{cart.reduce((s:number,i:any)=>s+i.quantity,0)}</span>}
      </div>

      {/* Client info — compact */}
      <div style={{ padding:'6px 12px', borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        {needsInfo && <input value={name} onChange={(e:any)=>setName(e.target.value)} placeholder="Nom *" style={{...S.input,marginBottom:4,padding:'4px 8px',fontSize:11}} />}
        <input value={phone} onChange={(e:any)=>setPhone(e.target.value)} placeholder="Téléphone" style={{...S.input,marginBottom:needsInfo?4:0,padding:'4px 8px',fontSize:11}} />
        {needsInfo && <input value={address} onChange={(e:any)=>setAddress(e.target.value)} placeholder="Adresse *" style={{...S.input,marginBottom:4,padding:'4px 8px',fontSize:11}} />}
        {needsInfo && <input value={notes} onChange={(e:any)=>setNotes(e.target.value)} placeholder="Notes livraison..." style={{...S.input,padding:'4px 8px',fontSize:11}} />}
      </div>

      {/* Cart items — editable */}
      <div style={{ flex:1, overflow:'auto', padding:'4px 12px' }}>
        {cart.length === 0
          ? <div style={{ textAlign:'center', color:'#374151', fontSize:11, paddingTop:16 }}>Panier vide</div>
          : cart.map((ci:any) => (
              <CartItemRow
                key={ci.id}
                ci={ci}
                onUpdate={(upd:any) => updateCartItem(ci.id, upd)}
                onRemove={() => removeFromCart(ci.id)}
              />
            ))
        }
      </div>

      {/* Totals + actions — compact */}
      <div style={{ padding:'8px 12px', borderTop:`1px solid ${S.border}`, flexShrink:0 }}>
        {pizzaPromo?.promoDescription && pizzaSaving > 0 && (
          <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:6, padding:'4px 8px', marginBottom:6, fontSize:10 }}>
            <span style={{ color:S.accent, fontWeight:700 }}>🎁 {pizzaPromo.promoDescription} </span>
            <span style={{ color:'#22c55e' }}>-{pizzaSaving.toFixed(2)}€</span>
          </div>
        )}
        {/* Remise */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:10, color:S.muted, flex:1 }}>Remise (€)</span>
          <input type="number" value={discount||''} onChange={(e:any)=>setDiscount(Math.max(0,parseFloat(e.target.value)||0))}
            placeholder="0" style={{...S.input, width:56, textAlign:'right', padding:'3px 6px', fontSize:10}} />
        </div>
        {/* HT / TVA */}
        <div style={{ fontSize:10, color:S.muted, display:'flex', justifyContent:'space-between', marginBottom:1 }}><span>HT</span><span>{ht.toFixed(2)}€</span></div>
        <div style={{ fontSize:10, color:S.muted, display:'flex', justifyContent:'space-between', marginBottom:5 }}><span>TVA 10%</span><span>{tva.toFixed(2)}€</span></div>
        {/* TOTAL */}
        <div style={{ fontSize:18, fontWeight:800, color:S.accent, display:'flex', justifyContent:'space-between', marginBottom:7, paddingTop:5, borderTop:`1px solid ${S.border}` }}>
          <span>TOTAL</span><span>{total.toFixed(2)}€</span>
        </div>
        {/* Payment methods */}
        <div style={{ display:'flex', gap:4, marginBottom:7 }}>
          {(['especes','cb'] as PayMethod[]).map((m:PayMethod) => (
            <button key={m} onClick={()=>setPayMethod(m)} style={{
              flex:1, padding:'5px 4px', borderRadius:7, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
              background: payMethod===m ? '#3b82f622' : '#1f2937',
              color:      payMethod===m ? '#3b82f6'   : S.muted,
              outline:    payMethod===m ? '1px solid #3b82f644' : 'none',
            }}>{PAY_LABELS[m]}</button>
          ))}
        </div>
        {/* Valider */}
        <button onClick={handleSubmit} disabled={submitting||cart.length===0} style={{
          width:'100%', padding:'9px', borderRadius:8, border:'none',
          background: cart.length ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
          color: cart.length?'#000':'#374151', fontSize:12, fontWeight:800,
          cursor:cart.length?'pointer':'not-allowed', opacity:submitting?0.6:1,
        }}>
          {submitting ? '⏳...' : cart.length ? `✅ Valider — ${total.toFixed(2)}€` : 'Panier vide'}
        </button>
        {/* Facture + Vider */}
        <div style={{ display:'flex', gap:4, marginTop:5 }}>
          <button onClick={()=>setShowFacture(true)} style={{ flex:2, padding:'6px', borderRadius:7, border:`1px solid ${S.accent}44`, background:S.accent+'14', color:S.accent, fontSize:10, fontWeight:800, cursor:'pointer' }}>
            🧾 Facture
          </button>
          <button onClick={()=>{clearCart();setDiscount(0);}} style={{ flex:1, padding:'6px', borderRadius:7, border:`1px solid ${S.border}`, background:'none', color:S.muted, cursor:'pointer', fontSize:10 }}>
            🗑️ Vider
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main POS content ──────────────────────────────────────────────────────────
function POSContent() {
  useThemeBump();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFacture,  setShowFacture]  = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [pizzaSize, setPizzaSize] = useState<PizzaSizeId>('senior');
  const leftRef = useRef<ImperativePanelHandle>(null);

  const toggleLeft = () => {
    const p = leftRef.current;
    if (!p) return;
    if (p.isCollapsed()) { p.expand(); setLeftCollapsed(false); }
    else { p.collapse(); setLeftCollapsed(true); }
  };

  const needsInfo = orderType === 'livraison';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'twinHub' in window) {
      (window as any).twinHub.checkForUpdates().then((res: any) => {
        if (res && res.success && res.updateAvailable) {
          setUpdateAvailable(true);
        }
      }).catch((e: any) => console.error('Auto update check failed:', e));
    }
  }, []);

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
    // No toast on add — the cart on the right already shows it instantly
  };

  // Render the active category's inline panel
  const renderPanel = () => {
    if (!activeCategory) return (
      <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, color:'#374151' }}>
        <div style={{ fontSize:32 }}>☝️</div>
        <div style={{ fontSize:13 }}>Choisissez une catégorie à gauche</div>
      </div>
    );
    if (activeCategory === 'pizzas') return <PizzaPanel orderType={orderType} onAdd={handleAdd} size={pizzaSize} setSize={setPizzaSize} />;
    // Build-it wizards (meat → size): Soufflet, Makloub, Mlawi, Tacos, Panini
    if (WIZARD_MAP[activeCategory]) return <WizardPanel categorySlug={activeCategory} onAdd={handleAdd} />;
    // Sandwich: pick sandwich → sauce + crudités (no meat)
    if (activeCategory === 'sandwiches') return <SandwichPanel onAdd={handleAdd} />;
    // Tex-Mex: dedicated panel with Snacks/Frites/Croques sections
    if (activeCategory === 'texmex')   return <TexMexPanel  onAdd={handleAdd} />;
    // Boissons: canette/bouteille avec note + quantité
    if (activeCategory === 'boissons') return <BoissonPanel onAdd={handleAdd} />;
    // Product-based customizable (Croques): pick product then customize
    const CUSTOMIZABLE = ['croques'];
    if (CUSTOMIZABLE.includes(activeCategory)) return <CustomizablePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
    return <SimplePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
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

  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId="pos-layout-h"
      className="pos-root"
      style={{ height:'100vh', background:S.bg, color:S.text, fontFamily:'Segoe UI,system-ui,sans-serif' }}
    >
      {/* Hide scrollbars (touch screen) — swipe still works */}
      <style>{`
        .pos-root *::-webkit-scrollbar { width:0 !important; height:0 !important; display:none !important; }
        .pos-root * { scrollbar-width:none !important; -ms-overflow-style:none !important; }
      `}</style>

      {/* ── LEFT (resizable + collapsible) ── */}
      <Panel ref={leftRef} collapsible collapsedSize={0} defaultSize={72} minSize={35}
        onCollapse={()=>setLeftCollapsed(true)} onExpand={()=>setLeftCollapsed(false)}>
      <div style={{ display:'flex', flexDirection:'row', height:'100%', minHeight:0, overflow:'hidden' }}>

        {/* ── Vertical Left Sidebar (Order Type, Categories, Pizza Sizes, System Controls) ── */}
        <div style={{
          width: 200,
          background: S.panel,
          borderRight: `1px solid ${S.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '12px 10px',
          flexShrink: 0,
          overflowY: 'auto'
        }}>
          {/* Order Type Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['surplace','emporter','livraison'] as OrderType[]).map(t => (
              <button key={t} onClick={()=>handleOrderType(t)} style={{
                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: orderType===t ? S.accent : '#1f2937',
                color:      orderType===t ? '#000'   : S.muted,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all .12s'
              }}>{TYPE_LABELS[t]} <span>{t === 'surplace' ? '🍽️' : t === 'emporter' ? '🛍️' : '🛵'}</span></button>
            ))}
          </div>

          {lastOrder && (
            <div style={{ background:'#22c55e11', color:'#22c55e', border:'1px solid #22c55e33', padding:'6px 8px', borderRadius:8, fontSize:10, fontWeight:700, textAlign:'center' }}>
              ✅ Dernier: #{lastOrder}
            </div>
          )}

          <hr style={{ border:'none', borderTop:`1px solid ${S.border}`, margin:'2px 0' }} />

          {/* Categories Section */}
          <div style={{ fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
            Catégories
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {categories.filter(cat => cat.slug !== 'salades').map(cat => {
              const active = activeCategory === cat.slug;
              return (
                <button key={cat.id} onClick={() => setActiveCat(active ? null : cat.slug)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all .12s',
                  background: active ? S.accent + '22' : S.card,
                  color:      active ? S.accent     : '#9ca3af',
                  outline:    active ? `1px solid ${S.accent}44` : 'none',
                  textAlign: 'left',
                }}>
                  <span style={{ fontSize: 15 }}>{CAT_ICON[cat.slug] || '🍽️'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Size Selector Section (only visible when pizzas is active) */}
          {activeCategory === 'pizzas' && (
            <>
              <hr style={{ border:'none', borderTop:`1px solid ${S.border}`, margin:'2px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
                Tailles Pizza
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PIZZA_SIZES.map((s) => {
                  const active = pizzaSize === s.id;
                  return (
                    <button key={s.id} onClick={()=>setPizzaSize(s.id)} style={{
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 11,
                      textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      lineHeight: 1.2, transition: 'all .12s',
                      border: `1.5px solid ${s.color}`,
                      background: active ? s.color : s.color + '1e',
                      color: active ? '#fff' : s.color,
                      boxShadow: active ? `0 0 0 2px ${s.color}44` : 'none',
                    }}>
                      <span>{s.label}</span>
                      <span>{s.price}€</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <hr style={{ border:'none', borderTop:`1px solid ${S.border}`, margin:'2px 0' }} />

          {/* System/Bottom Buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              title="Historique & Statistiques"
              onClick={() => setShowHistory(true)}
              style={{
                ...S.btn,
                flex: 1,
                padding: '8px 4px',
                fontSize: 12,
                fontWeight: 800,
                color: S.accent,
                borderColor: S.accent + '33',
                background: S.accent + '11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              📊 Stats
            </button>
            
            {typeof window !== 'undefined' && 'twinHub' in window && (
              <button
                title="Mise à jour"
                onClick={() => { setShowUpdateModal(true); setUpdateAvailable(false); }}
                style={{
                  ...S.btn,
                  padding: '8px 10px',
                  fontSize: 14,
                  position: 'relative',
                  border: updateAvailable ? `1px solid ${S.accent}` : S.btn.border,
                }}
              >
                🔄
                {updateAvailable && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#ef4444',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    border: '1px solid #111827'
                  }} />
                )}
              </button>
            )}
            <button title="Personnaliser" onClick={()=>setShowSettings(true)} style={{ ...S.btn, padding:'8px 10px', fontSize:14 }}>⚙️</button>
            <button title="Replier" onClick={toggleLeft} style={{ ...S.btn, padding:'8px 10px', fontSize:14 }}>⟨</button>
          </div>
        </div>

        {/* Products area — takes all remaining space */}
        <div style={{ flex:1, minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {renderPanel()}
        </div>

      </div>
      </Panel>

      {/* ── Draggable divider ── */}
      <ResizeBar />

      {/* ── RIGHT: Caisse (resizable, always visible) ── */}
      <Panel defaultSize={28} minSize={20} maxSize={50}>
      <CaissePanel
        leftCollapsed={leftCollapsed} toggleLeft={toggleLeft}
        cart={cart} needsInfo={needsInfo}
        name={name} setName={setName}
        phone={phone} setPhone={setPhone}
        address={address} setAddress={setAddress}
        notes={notes} setNotes={setNotes}
        discount={discount} setDiscount={setDiscount}
        payMethod={payMethod} setPayMethod={setPayMethod}
        pizzaPromo={pizzaPromo} pizzaSaving={pizzaSaving}
        discountAmt={discountAmt} ht={ht} tva={tva} total={total}
        submitting={submitting} handleSubmit={handleSubmit}
        clearCart={clearCart}
        setShowFacture={setShowFacture}
      />
      </Panel>

      {/* ── Overlays ── */}
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)} />}
      {showHistory && <HistoryPanel onClose={()=>setShowHistory(false)} />}
      {showFacture && <FactureModal initialTotal={total} onClose={()=>setShowFacture(false)} />}
      {showUpdateModal && <UpdatePanel onClose={()=>setShowUpdateModal(false)} />}
    </PanelGroup>
  );
}

export default function POSPage() {
  return <OrderProvider><POSContent /></OrderProvider>;
}
