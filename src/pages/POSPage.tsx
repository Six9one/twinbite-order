import { useState, useEffect, useReducer, useRef } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { useCategories, useProductsByCategory } from '@/hooks/useProducts';
import { usePizzasByBase } from '@/hooks/useProducts';
import { useMeatOptions, useSauceOptions, useSupplementOptions, useGarnitureOptions, useCruditesOptions } from '@/hooks/useCustomizationOptions';
import { calculateTVA, applyPizzaPromotions } from '@/utils/promotions';
import { pizzaPrices, cheeseSupplementOptions, menuOptionPrices } from '@/data/menu';
import { wizardSizePrices } from '@/data/pricing';
import { crepes, gaufres, boissons, frites as staticFrites, croques as staticCroques } from '@/data/menu';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { toast } from 'sonner';

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

// ── Product tile ─────────────────────────────────────────────────────────────
function ProductTile({ item, selected, onClick, badge, compact, tint }: { item:any; selected:boolean; onClick:()=>void; badge?:string; compact?:boolean; tint?:string }) {
  // Support both camelCase (imageUrl) and snake_case (image_url from DB)
  const img = item.imageUrl || item.image_url;
  const imgSize = compact ? 52 : 72;
  const borderColor = selected ? S.accent : (tint || '#2d3748');
  return (
    <button onClick={onClick} style={{
      background: selected ? '#f59e0b22' : (tint ? tint + '14' : S.card),
      border:     `${selected ? 2 : tint ? 2 : 1}px solid ${borderColor}`,
      borderRadius:10, padding: compact ? '6px 5px' : '10px 8px', cursor:'pointer', textAlign:'center',
      transition:'all .12s', position:'relative',
    }}>
      {badge && <span style={{ position:'absolute', top:4, left:4, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99 }}>{badge}</span>}
      {selected && <span style={{ position:'absolute', top:4, right:4, background:S.accent, color:'#000', fontSize:10, fontWeight:800, width:18, height:18, borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
      {img
        ? <img src={img} alt={item.name} style={{ width:imgSize, height:imgSize, borderRadius:8, objectFit:'cover', display:'block', margin:`0 auto ${compact?4:6}px` }} />
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

// ── Pizza sizes (Senior / Mega / Menu Midi) ──────────────────────────────────
const PIZZA_SIZES = [
  { id:'senior',    label:'Senior',    price:pizzaPrices.senior,         color:'#3b82f6' },
  { id:'mega',      label:'Mega',      price:pizzaPrices.mega,           color:'#8b5cf6' },
  { id:'menu_midi', label:'Menu Midi', price:pizzaPrices.menuMidiSenior, color:'#22c55e' },
] as const;
type PizzaSizeId = typeof PIZZA_SIZES[number]['id'];

const BASE_TINT = { tomate:'#ef4444', creme:'#3b82f6' }; // red / blue

// ── Pizza panel ───────────────────────────────────────────────────────────────
function PizzaPanel({ orderType, onAdd }: { orderType:OrderType; onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: pizzasTomate = [] } = usePizzasByBase('tomate');
  const { data: pizzasCreme  = [] } = usePizzasByBase('creme');
  const [size, setSize]     = useState<PizzaSizeId>('senior');
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
      { size, sizeLabel, base:sel._base, supplements:supps, note, isMenuMidi: size==='menu_midi' },
      price
    );
    setSel(null); setSupps([]); setNote('');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Size selector — single compact row, colour-coded per size */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', borderBottom:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        {PIZZA_SIZES.map((s) => {
          const active = size === s.id;
          return (
            <button key={s.id} onClick={()=>setSize(s.id)} style={{
              flex:1, padding:'7px 6px', borderRadius:8, cursor:'pointer', fontWeight:800, fontSize:12,
              lineHeight:1.2, transition:'all .12s',
              border:`1.5px solid ${s.color}`,
              background: active ? s.color : s.color + '1e',
              color: active ? '#fff' : s.color,
              boxShadow: active ? `0 0 0 2px ${s.color}44` : 'none',
            }}>
              {s.label}<br/><span style={{ fontSize:11, opacity:.95 }}>{s.price}€</span>
            </button>
          );
        })}
      </div>

      {/* Grid — ONE page: tomate=red tiles, creme=blue tiles */}
      <div style={{ flex:1, overflow:'auto', padding:'10px 12px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(82px,1fr))', gap:6 }}>
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
  tacos:   { maxMeats:3, garniture:true,  supplements:true,  menu:true,  crudite:true  },
  panini:  { maxMeats:1, garniture:false, supplements:false, menu:false, crudite:false }, // just meat + sauce, 5€
};
const FREE_SAUCES = 2, EXTRA_SAUCE = 0.30;

// Small option tile with image/emoji (compact, dark)
function OptTile({ name, img, emoji, selected, isDefaultRemovable, price, onClick }:
  { name:string; img?:string|null; emoji?:string; selected:boolean; isDefaultRemovable?:boolean; price?:number; onClick:()=>void }) {
  const ring = selected ? (isDefaultRemovable ? '#22c55e' : S.accent) : '#2d3748';
  return (
    <button onClick={onClick} style={{
      background: selected ? (isDefaultRemovable ? '#22c55e18' : S.accent+'18') : S.card,
      border:`${selected?2:1}px solid ${ring}`, borderRadius:9, padding:'5px 4px', cursor:'pointer',
      textAlign:'center', position:'relative',
    }}>
      {selected && <span style={{ position:'absolute', top:3, right:3, width:15, height:15, borderRadius:99,
        background: isDefaultRemovable ? '#ef4444' : S.accent, color:'#fff', fontSize:9, fontWeight:800,
        display:'flex', alignItems:'center', justifyContent:'center' }}>{isDefaultRemovable?'✕':'✓'}</span>}
      {img
        ? <img src={img} alt={name} style={{ width:46, height:46, borderRadius:7, objectFit:'cover', display:'block', margin:'0 auto 3px' }} />
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

// ── Sandwich panel: pick sandwich → sauce + crudités (no meat) ───────────────
function SandwichPanel({ onAdd }: { onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: products = [] } = useProductsByCategory('sandwiches');
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
  const [showFacture,  setShowFacture]  = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const leftRef = useRef<ImperativePanelHandle>(null);

  const toggleLeft = () => {
    const p = leftRef.current;
    if (!p) return;
    if (p.isCollapsed()) { p.expand(); setLeftCollapsed(false); }
    else { p.collapse(); setLeftCollapsed(true); }
  };

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
    // Build-it wizards (meat → size): Soufflet, Makloub, Mlawi, Tacos, Panini
    if (WIZARD_MAP[activeCategory]) return <WizardPanel categorySlug={activeCategory} onAdd={handleAdd} />;
    // Sandwich: pick sandwich → sauce + crudités (no meat)
    if (activeCategory === 'sandwiches') return <SandwichPanel onAdd={handleAdd} />;
    // Product-based customizable (Tex-Mex, Croques): pick product then customize
    const CUSTOMIZABLE = ['texmex','croques'];
    if (CUSTOMIZABLE.includes(activeCategory)) return <CustomizablePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
    return <SimplePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
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
      <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, overflow:'hidden' }}>

        {/* Order type bar + settings + collapse */}
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:S.panel, borderBottom:`1px solid ${S.border}`, alignItems:'center', flexShrink:0 }}>
          {(['surplace','emporter','livraison'] as OrderType[]).map(t => (
            <button key={t} onClick={()=>handleOrderType(t)} style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
              background: orderType===t ? S.accent : '#1f2937',
              color:      orderType===t ? '#000'   : S.muted,
            }}>{TYPE_LABELS[t]}</button>
          ))}
          {lastOrder && <span style={{ background:'#22c55e11', color:'#22c55e', border:'1px solid #22c55e33', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>✅ #{lastOrder}</span>}
          <button title="Personnaliser" onClick={()=>setShowSettings(true)} style={{ ...S.btn, marginLeft:'auto', padding:'6px 10px', fontSize:14 }}>⚙️</button>
          <button title="Replier le panneau" onClick={toggleLeft} style={{ ...S.btn, padding:'6px 10px', fontSize:14 }}>⟨</button>
        </div>

        {/* Vertical resizable: upper (categories) | lower (products) */}
        <PanelGroup direction="vertical" autoSaveId="pos-left-v" style={{ flex:1, minHeight:0 }}>
          <Panel defaultSize={20} minSize={10} maxSize={65}>
            <div style={{ display:'flex', gap:6, padding:'10px 14px', background:S.bg, height:'100%', overflow:'auto', flexWrap:'wrap', alignContent:'flex-start' }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(activeCategory === cat.slug ? null : cat.slug)} style={{
                  display:'flex', alignItems:'center', gap:6, height:'fit-content',
                  padding:'8px 14px', borderRadius:99, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all .12s', whiteSpace:'nowrap',
                  background: activeCategory===cat.slug ? S.accent+'22' : S.card,
                  color:      activeCategory===cat.slug ? S.accent     : '#9ca3af',
                  outline:    activeCategory===cat.slug ? `1px solid ${S.accent}44` : 'none',
                }}>
                  <span style={{ fontSize:16 }}>{CAT_ICON[cat.slug] || '🍽️'}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </Panel>
          <ResizeBar vertical />
          <Panel minSize={20}>
            <div style={{ height:'100%', minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column', borderTop:`1px solid ${S.border}` }}>
              {renderPanel()}
            </div>
          </Panel>
        </PanelGroup>
      </div>
      </Panel>

      {/* ── Draggable divider ── */}
      <ResizeBar />

      {/* ── RIGHT: Caisse (resizable, always visible) ── */}
      <Panel defaultSize={28} minSize={20} maxSize={50}>
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:S.panel }}>
        <div style={{ padding:'12px 14px', borderBottom:`1px solid ${S.border}`, fontSize:14, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
          {leftCollapsed && <button title="Ouvrir le panneau produits" onClick={toggleLeft} style={{ ...S.btn, padding:'4px 9px', fontSize:14 }}>⟩</button>}
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
                const details = [c?.sizeLabel || c?.size, c?.base, c?.meats?.join(', '), c?.sauces?.join(', ')].filter(Boolean).join(' · ');
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
            {(['especes','cb'] as PayMethod[]).map(m => (
              <button key={m} onClick={()=>setPayMethod(m)} style={{
                flex:1, padding:'6px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
                background: payMethod===m ? '#3b82f622' : '#1f2937',
                color:      payMethod===m ? '#3b82f6'   : S.muted,
                outline:    payMethod===m ? '1px solid #3b82f644' : 'none',
              }}>{PAY_LABELS[m]}</button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={submitting||cart.length===0} style={{
            width:'100%', padding:'10px', borderRadius:9, border:'none',
            background: cart.length ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : '#1f2937',
            color: cart.length?'#000':'#374151', fontSize:13, fontWeight:800,
            cursor:cart.length?'pointer':'not-allowed', opacity:submitting?.6:1,
          }}>
            {submitting ? '⏳...' : cart.length ? `✅ Valider — ${total.toFixed(2)}€` : 'Panier vide'}
          </button>
          {/* Facture — print invoice to ethernet printer */}
          <button onClick={()=>setShowFacture(true)} style={{
            width:'100%', marginTop:6, padding:'8px', borderRadius:9, border:`1px solid ${S.accent}55`,
            background:S.accent+'18', color:S.accent, fontSize:12, fontWeight:800, cursor:'pointer',
          }}>
            🧾 Facture client
          </button>
          <button onClick={()=>{clearCart();setDiscount(0);}} style={{width:'100%',marginTop:6,padding:'7px',borderRadius:8,border:`1px solid ${S.border}`,background:'none',color:S.muted,cursor:'pointer',fontSize:11}}>
            🗑️ Vider
          </button>
        </div>
      </div>
      </Panel>

      {/* ── Overlays ── */}
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)} />}
      {showFacture && <FactureModal initialTotal={total} onClose={()=>setShowFacture(false)} />}
    </PanelGroup>
  );
}

export default function POSPage() {
  return <OrderProvider><POSContent /></OrderProvider>;
}
