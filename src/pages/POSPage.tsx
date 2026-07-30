import { useState, useEffect, useReducer, useRef, memo, useMemo, useCallback } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useCreateOrder, generateOrderNumber, useOrders, useDrinks } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useCategories, useProductsByCategory } from '@/hooks/useProducts';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import { usePizzasByBase } from '@/hooks/useProducts';
import { PizzaIngredientCustomizer, PizzaExtra } from '@/components/wizards/PizzaIngredientCustomizer';
import { useMeatOptions, useSauceOptions, useSupplementOptions, useGarnitureOptions, useCruditesOptions } from '@/hooks/useCustomizationOptions';
import { useSandwichTypes } from '@/hooks/useSandwiches';
import { useProductSizePrices } from '@/hooks/useProductSizePrices';
import { PizzaManager } from '@/components/admin/PizzaManager';
import { TexMexManager } from '@/components/admin/TexMexManager';
import { SandwichManager } from '@/components/admin/SandwichManager';
import { ProductCategoryManager } from '@/components/admin/ProductCategoryManager';
import { PriceManager } from '@/components/admin/PriceManager';
import { AvailabilityManager } from '@/components/admin/AvailabilityManager';
import { ImageUploadTable } from '@/components/admin/ImageUploadTable';
import { calculateTVA, applyPizzaPromotions } from '@/utils/promotions';
import { pizzaPrices, cheeseSupplementOptions, menuOptionPrices } from '@/data/menu';
import { wizardSizePrices, supplementPrices } from '@/data/pricing';
import { crepes, gaufres, boissons, frites as staticFrites, croques as staticCroques, milkshakes } from '@/data/menu';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { toast } from 'sonner';
import { resolveImg } from '@/utils/resolveImg';
import { useVirtualKeyboard } from '@/context/VirtualKeyboardContext';
import { printDateLabel } from '@/config/printConfig';

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
  bg:     '#070a13',
  panel:  '#0f172a',
  card:   '#1e293b',
  border: '#334155',
  muted:  '#64748b',
  text:   '#f8fafc',
  accent: '#f97316',
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

let currentThemeMode = 'classic';
try {
  currentThemeMode = localStorage.getItem('pos-theme-preset') || 'classic';
} catch {}

function applyThemePreset(mode: 'classic' | 'glassy') {
  currentThemeMode = mode;
  try {
    localStorage.setItem('pos-theme-preset', mode);
  } catch {}

  if (mode === 'glassy') {
    S.bg = 'transparent'; // Let the animated mesh gradient show through
    S.panel = 'rgba(15, 23, 42, 0.45)';
    S.card = 'rgba(30, 41, 59, 0.35)';
    S.border = 'rgba(255, 255, 255, 0.08)';
    S.muted = '#94a3b8';
    S.text = '#f8fafc';
    S.accent = '#0a84ff'; // Apple Blue
    
    if (S.btn) {
      S.btn.background = 'rgba(255, 255, 255, 0.05)';
      S.btn.border = '1px solid rgba(255, 255, 255, 0.08)';
      S.btn.color = '#f8fafc';
    }
    if (S.input) {
      S.input.background = 'rgba(255, 255, 255, 0.04)';
      S.input.border = '1px solid rgba(255, 255, 255, 0.08)';
      S.input.color = '#fff';
    }
  } else {
    // Reset to classic (load saved colors or default colors)
    let saved: any = {};
    try {
      saved = JSON.parse(localStorage.getItem('pos-theme') || '{}');
    } catch {}
    
    const merged = { ...DEFAULT_THEME, ...saved };
    (Object.keys(DEFAULT_THEME) as ThemeKey[]).forEach(k => {
      (S as any)[k] = merged[k];
    });

    if (S.btn) {
      S.btn.background = '#1f2937';
      S.btn.border = '1px solid #2d3748';
      S.btn.color = '#e5e7eb';
    }
    if (S.input) {
      S.input.background = '#1f2937';
      S.input.border = '1px solid #2d3748';
      S.input.color = '#fff';
    }
  }
}

// Initial apply
applyThemePreset(currentThemeMode as 'classic' | 'glassy');

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
const ProductTile = memo(function ProductTile({
  item,
  price,
  selected,
  onClick,
  badge,
  compact,
  tint,
  zoom = 100,
  onCustomize,
  count = 0,
  onDecrement,
  onIncrement,
}: {
  item: any;
  price?: number;
  selected: boolean;
  onClick: (item: any) => void;
  badge?: string;
  compact?: boolean;
  tint?: string;
  zoom?: number;
  onCustomize?: (item: any) => void;
  count?: number;
  onDecrement?: (item: any) => void;
  onIncrement?: (item: any) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const normalizedName = (item.name || '').trim().toLowerCase();
  const img = resolveImg(item.imageUrl || item.image_url || LOCAL_PIZZA_IMAGES[normalizedName]);

  useEffect(() => {
    setImgError(false);
  }, [img]);

  // Scale parameters based on zoom factor
  const scale = zoom / 100;
  const imgSize = Math.round((compact ? 44 : 64) * scale);
  const padV = Math.round((compact ? 6 : 10) * scale);
  const padH = Math.round((compact ? 4 : 8) * scale);
  const fontSize = Math.round((compact ? 10 : 11) * scale);
  const borderRadius = Math.round(10 * scale);
  const displayPrice = price !== undefined ? price : item.price;

  const baseTint = tint || '#2d3748';
  const borderColor = selected ? baseTint : '#2d3748';

  const cardBg = selected 
    ? `linear-gradient(135deg, ${S.card}, ${baseTint}33)` 
    : `linear-gradient(135deg, ${S.card}, #111827)`;

  return (
    <div
      onClick={() => onClick(item)}
      onContextMenu={(e) => {
        if (onDecrement && count > 0) {
          e.preventDefault();
          onDecrement(item);
        }
      }}
      style={{
        background: cardBg,
        border: `${selected ? 2 : 1}px solid ${borderColor}`,
        borderRadius: borderRadius,
        padding: `${padV}px ${padH}px`,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        width: '100%',
        boxShadow: selected ? `0 0 12px ${baseTint}44` : 'none',
        outline: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className={`pizza-card-hover pos-btn-interactive ${selected ? 'selected' : ''}`}
    >
      {badge && !onDecrement && (
        <span style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: '#ef4444',
          color: '#fff',
          fontSize: Math.max(8, Math.round(9 * scale)),
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: 99
        }}>
          {badge}
        </span>
      )}
      {count > 0 && onDecrement ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: '#0f172a',
            borderRadius: 99,
            padding: '2px 4px',
            border: `1.5px solid ${baseTint}`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
            zIndex: 15
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDecrement(item); }}
            style={{
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: 99,
              width: Math.max(18, Math.round(20 * scale)), height: Math.max(18, Math.round(20 * scale)),
              fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
            }}
            title="Diminuer la quantité (−1)"
          >
            −
          </button>
          <span style={{ fontSize: Math.max(10, Math.round(11 * scale)), fontWeight: 900, color: '#fff', padding: '0 4px' }}>{count}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onIncrement ? onIncrement(item) : onClick(item); }}
            style={{
              background: '#22c55e', color: '#fff', border: 'none', borderRadius: 99,
              width: Math.max(18, Math.round(20 * scale)), height: Math.max(18, Math.round(20 * scale)),
              fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
            }}
            title="Augmenter la quantité (+1)"
          >
            +
          </button>
        </div>
      ) : selected ? (
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: baseTint,
          color: '#fff',
          fontSize: Math.max(9, Math.round(10 * scale)),
          fontWeight: 800,
          width: Math.max(14, Math.round(18 * scale)),
          height: Math.max(14, Math.round(18 * scale)),
          borderRadius: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          ✓
        </span>
      ) : null}
      <div style={{
        width: imgSize,
        height: imgSize,
        borderRadius: borderRadius - 2,
        overflow: 'hidden',
        background: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Math.max(4, Math.round(6 * scale)),
      }}
      className="pizza-card-img-container"
      >
        {img && !imgError ? (
          <img
            src={img}
            alt={item.name}
            loading="eager"
            decoding="async"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ fontSize: Math.round((compact ? 22 : 28) * scale) }}>
            {CAT_ICON[item.category || ''] || '🍕'}
          </div>
        )}
      </div>
      <div style={{
        fontSize: fontSize,
        fontWeight: 700,
        color: selected ? '#fff' : (tint === '#ef4444' ? '#ff6b6b' : tint === '#3b82f6' ? '#60a5fa' : S.text),
        lineHeight: 1.15,
        marginBottom: 2,
        wordBreak: 'normal',
        overflowWrap: 'break-word',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {item.name}
      </div>
      {displayPrice !== undefined && displayPrice > 0 && (
        <div style={{
          fontSize: fontSize,
          color: S.accent,
          fontWeight: 800,
          marginTop: 'auto'
        }}>
          {displayPrice.toFixed(2)}€
        </div>
      )}
      {onCustomize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCustomize(item);
          }}
          className="pos-btn-interactive"
          style={{
            marginTop: 6,
            width: '100%',
            padding: '4px 0',
            borderRadius: 6,
            background: selected ? 'rgba(255,255,255,0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: S.accent,
            fontSize: Math.max(9, Math.round(9 * scale)),
            fontWeight: 800,
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          📝 Personnaliser
        </button>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.selected === next.selected &&
         prev.price === next.price &&
         prev.item.id === next.item.id &&
         prev.tint === next.tint &&
         prev.compact === next.compact &&
         prev.badge === next.badge &&
         prev.zoom === next.zoom &&
         prev.count === next.count &&
         prev.onCustomize === next.onCustomize;
});

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
function PizzaPanel({
  orderType,
  onAdd,
  size,
  setSize,
  zoom = 125,
  setZoom,
  onCustomize,
}: {
  orderType: OrderType;
  onAdd: (item: any, custom: any, price: number) => void;
  size: PizzaSizeId;
  setSize: (size: PizzaSizeId) => void;
  zoom?: number;
  setZoom?: (z: number | ((prev: number) => number)) => void;
  onCustomize?: (pizza: any, base: 'tomate' | 'creme') => void;
}) {
  const { data: dbPizzasTomate = [] } = usePizzasByBase('tomate');
  const { data: dbPizzasCreme  = [] } = usePizzasByBase('creme');

  const pizzasTomate = useMemo(() => {
    return dbPizzasTomate.map((p: any) => ({ ...p, _base: 'tomate' as const }));
  }, [dbPizzasTomate]);

  const pizzasCreme = useMemo(() => {
    return dbPizzasCreme.map((p: any) => ({ ...p, _base: 'creme' as const }));
  }, [dbPizzasCreme]);

  const [pizzaSelectMode, setPizzaSelectMode] = useState<'multi' | 'direct'>('multi');
  const [multiSelections, setMultiSelections] = useState<Record<string, { item: any; count: number }>>({});
  const [sel, setSel] = useState<any | null>(null);
  const [supps, setSupps] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const basePrice = PIZZA_SIZES.find(s => s.id === size)!.price;
  const suppTotal = supps.reduce((s, id) => {
    const x = cheeseSupplementOptions.find(c => c.id === id);
    return s + (x?.price || 0);
  }, 0);
  const singlePrice = basePrice + suppTotal;

  const totalMultiCount = useMemo(() => {
    return Object.values(multiSelections).reduce((acc, curr) => acc + curr.count, 0);
  }, [multiSelections]);

  const totalMultiPrice = useMemo(() => {
    return totalMultiCount * basePrice;
  }, [totalMultiCount, basePrice]);

  const handleDecreaseCount = useCallback((item: any) => {
    const key = `${item._base}-${item.id}`;
    setMultiSelections(prev => {
      const existing = prev[key];
      if (!existing || existing.count <= 1) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { item, count: existing.count - 1 } };
    });
  }, []);

  const handleIncreaseCount = useCallback((item: any) => {
    const key = `${item._base}-${item.id}`;
    setMultiSelections(prev => {
      const existing = prev[key];
      const newCount = (existing?.count || 0) + 1;
      return { ...prev, [key]: { item, count: newCount } };
    });
  }, []);

  const handleTileClick = useCallback((item: any) => {
    const key = `${item._base}-${item.id}`;
    if (pizzaSelectMode === 'direct') {
      const sizeLabel = PIZZA_SIZES.find(s => s.id === size)!.label;
      onAdd(
        { id: item.id, name: item.name, price: basePrice, category: 'pizzas', description: '' },
        { size, sizeLabel, base: item._base, supplements: supps, note, isMenuMidi: size === 'menu_midi' || size === 'menu_midi_mega' },
        singlePrice,
        1
      );
      toast.success(`➕ ${item.name} (${sizeLabel}) ajouté!`, { duration: 1500 });
    } else {
      handleIncreaseCount(item);
      setSel(item);
    }
  }, [pizzaSelectMode, size, basePrice, supps, note, singlePrice, onAdd, handleIncreaseCount]);

  const handleCustomizeClick = useCallback((item: any) => {
    if (onCustomize) {
      onCustomize(item, item._base);
    }
  }, [onCustomize]);

  const handleAddBatch = () => {
    const sizeLabel = PIZZA_SIZES.find(s => s.id === size)!.label;
    const itemsList = Object.values(multiSelections);

    if (itemsList.length === 0 && sel) {
      onAdd(
        { id: sel.id, name: sel.name, price: basePrice, category: 'pizzas', description: '' },
        { size, sizeLabel, base: sel._base, supplements: supps, note, isMenuMidi: size === 'menu_midi' || size === 'menu_midi_mega' },
        singlePrice,
        1
      );
      toast.success(`➕ ${sel.name} (${sizeLabel}) ajouté!`);
    } else if (itemsList.length > 0) {
      itemsList.forEach(({ item, count }) => {
        onAdd(
          { id: item.id, name: item.name, price: basePrice, category: 'pizzas', description: '' },
          { size, sizeLabel, base: item._base, supplements: supps, note, isMenuMidi: size === 'menu_midi' || size === 'menu_midi_mega' },
          singlePrice,
          count
        );
      });
      toast.success(`✅ ${totalMultiCount} pizza(s) ajoutées au panier!`);
    }

    setMultiSelections({});
    setSel(null);
    setSupps([]);
    setNote('');
  };

  const handleClearMulti = () => {
    setMultiSelections({});
    setSel(null);
    setSupps([]);
    setNote('');
  };

  const minWidth = Math.round(95 * (zoom / 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Pizza Size Selector Bar (top of panel) ── */}
      <div className={currentThemeMode === 'glassy' ? 'pos-segmented-container' : ''} style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        background: currentThemeMode === 'glassy' ? 'transparent' : '#0a0f1e', borderBottom: currentThemeMode === 'glassy' ? 'none' : `1px solid ${S.border}`,
        flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        ...(currentThemeMode === 'glassy' ? { margin: '8px 12px 0' } : {})
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {PIZZA_SIZES.map((s) => {
            const active = size === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={`pos-btn-interactive ${currentThemeMode === 'glassy' ? 'pos-segmented-btn' : ''} ${currentThemeMode === 'glassy' && active ? 'active' : ''}`}
                style={{
                  padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 800, fontSize: 11, lineHeight: 1.3,
                  border: currentThemeMode === 'glassy' ? 'none' : `1.5px solid ${s.color}`,
                  background: currentThemeMode === 'glassy' ? (active ? 'rgba(255,255,255,0.12)' : 'transparent') : (active ? s.color : s.color + '18'),
                  color: currentThemeMode === 'glassy' ? (active ? '#fff' : 'rgba(255,255,255,0.6)') : (active ? '#fff' : s.color),
                  boxShadow: currentThemeMode === 'glassy' ? 'none' : (active ? `0 0 8px ${s.color}55` : 'none'),
                  transition: 'all .1s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                <span>{s.label}</span>
                <span style={{ fontSize: 10, opacity: 0.85 }}>{s.price}€</span>
              </button>
            );
          })}
        </div>

        {/* Mode Toggle: Multi-selection vs Direct 1-tap add */}
        <div style={{ display: 'flex', gap: 4, background: '#111827', padding: '3px 4px', borderRadius: 8, border: `1px solid ${S.border}` }}>
          <button
            onClick={() => setPizzaSelectMode('multi')}
            style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800,
              background: pizzaSelectMode === 'multi' ? '#22c55e' : 'transparent',
              color: pizzaSelectMode === 'multi' ? '#000' : S.muted,
              transition: 'all .12s'
            }}
          >
            ☑️ Multiple ({totalMultiCount})
          </button>
          <button
            onClick={() => setPizzaSelectMode('direct')}
            style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 800,
              background: pizzaSelectMode === 'direct' ? S.accent : 'transparent',
              color: pizzaSelectMode === 'direct' ? '#000' : S.muted,
              transition: 'all .12s'
            }}
          >
            ⚡ 1-Clic Direct
          </button>
        </div>
      </div>

      {/* Scrollable grid container split into Tomato and Cream base (2 columns side-by-side) */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', position: 'relative' }}>
        
        {/* Left Column: Tomato base section */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 800,
            color: '#ef4444',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
            paddingLeft: 4,
            borderLeft: '3px solid #ef4444',
            padding: '2px 8px',
            background: 'rgba(239, 68, 68, 0.05)',
            borderRadius: 4
          }}>
            🍅 Sauce Tomate
            <span style={{ fontSize: 10, color: S.muted, fontWeight: 500, textTransform: 'none', marginLeft: 'auto' }}>
              {pizzasTomate.length} Pizzas
            </span>
          </div>
          <div className="grid-fade-in" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 8 }}>
            {pizzasTomate.map((p: any) => {
              const key = `tomate-${p.id}`;
              const count = multiSelections[key]?.count || 0;
              return (
                <ProductTile
                  key={`tomate-${p.id}`}
                  compact
                  tint="#ef4444"
                  item={p}
                  price={basePrice}
                  zoom={zoom}
                  badge={count > 0 ? `x${count}` : undefined}
                  count={count}
                  onDecrement={handleDecreaseCount}
                  onIncrement={handleIncreaseCount}
                  selected={count > 0 || (sel?.id === p.id && sel?._base === 'tomate')}
                  onClick={handleTileClick}
                  onCustomize={onCustomize ? handleCustomizeClick : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Right Column: Cream base section */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 800,
            color: '#3b82f6',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
            paddingLeft: 4,
            borderLeft: '3px solid #3b82f6',
            padding: '2px 8px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: 4
          }}>
            🥛 Crème Fraîche
            <span style={{ fontSize: 10, color: S.muted, fontWeight: 500, textTransform: 'none', marginLeft: 'auto' }}>
              {pizzasCreme.length} Pizzas
            </span>
          </div>
          <div className="grid-fade-in" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 8 }}>
            {pizzasCreme.map((p: any) => {
              const key = `creme-${p.id}`;
              const count = multiSelections[key]?.count || 0;
              return (
                <ProductTile
                  key={`creme-${p.id}`}
                  compact
                  tint="#3b82f6"
                  item={p}
                  price={basePrice}
                  zoom={zoom}
                  badge={count > 0 ? `x${count}` : undefined}
                  count={count}
                  onDecrement={handleDecreaseCount}
                  onIncrement={handleIncreaseCount}
                  selected={count > 0 || (sel?.id === p.id && sel?._base === 'creme')}
                  onClick={handleTileClick}
                  onCustomize={onCustomize ? handleCustomizeClick : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Compact zoom control — bottom-right floating badge */}
        {setZoom && (
          <div style={{
            position: 'absolute', bottom: 8, right: 24, zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#111827cc', backdropFilter: 'blur(6px)',
            border: `1px solid ${S.border}`,
            borderRadius: 99, padding: '3px 8px',
            width: 'fit-content',
          }}>
            <button onClick={() => setZoom(z => Math.max(80, z - 5))} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 15, fontWeight: 900, cursor: 'pointer', padding: '0 3px', lineHeight: 1 }}>−</button>
            <span style={{ fontSize: 10, fontWeight: 800, color: S.accent, minWidth: 28, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 5))} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 15, fontWeight: 900, cursor: 'pointer', padding: '0 3px', lineHeight: 1 }}>+</button>
          </div>
        )}

      </div>

      {/* Supplements + Add */}
      <div style={{ background: '#111827', borderTop: `1px solid ${S.border}`, padding: '10px 14px', flexShrink: 0 }}>
        {(sel || totalMultiCount > 0) && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: S.muted, fontWeight: 700, textTransform: 'uppercase' }}>Suppléments fromage:</span>
              {cheeseSupplementOptions.map(s => (
                <Chip key={s.id} label={s.name} extra={`+${s.price}€`} active={supps.includes(s.id)} onClick={() => setSupps(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} />
              ))}
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note..." style={{ ...S.input, marginBottom: 8 }} />
          </>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {totalMultiCount > 0 && (
            <button
              onClick={handleClearMulti}
              style={{
                padding: '9px 14px', borderRadius: 9, border: '1px solid #ef444455',
                background: '#ef444418', color: '#ef4444', fontSize: 12, fontWeight: 800, cursor: 'pointer'
              }}
            >
              🗑️ Annuler ({totalMultiCount})
            </button>
          )}
          <button
            onClick={handleAddBatch}
            disabled={totalMultiCount === 0 && !sel}
            style={{
              flex: 1, padding: '9px', borderRadius: 9, border: 'none',
              background: (totalMultiCount > 0 || sel) ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#1f2937',
              color: (totalMultiCount > 0 || sel) ? '#fff' : '#374151', fontSize: 13, fontWeight: 800,
              cursor: (totalMultiCount > 0 || sel) ? 'pointer' : 'not-allowed',
              boxShadow: totalMultiCount > 0 ? '0 0 14px rgba(34, 197, 94, 0.4)' : 'none'
            }}
          >
            {totalMultiCount > 0
              ? `➕ Ajouter ${totalMultiCount} pizza(s) au panier — ${totalMultiPrice.toFixed(2)}€`
              : (sel ? `➕ ${sel.name} ${PIZZA_SIZES.find(s => s.id === size)!.label} — ${singlePrice.toFixed(2)}€` : (pizzaSelectMode === 'direct' ? '⚡ Mode Clic Direct actif — Cliquez sur n\'importe quelle pizza' : 'Sélectionnez vos pizzas'))}
          </button>
        </div>
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

  const active = products.filter((p:any) => p.is_active);

  const productsWithPrice = useMemo(() => {
    return active.map((p: any) => ({ ...p, price: p.base_price }));
  }, [active]);

  const handleTileClick = useCallback((item: any) => {
    setSel((prev: any) => prev?.id === item.id ? null : item);
  }, []);

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

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Product grid */}
      <div style={{ flex:'0 0 auto', padding:'12px 14px', borderBottom:`1px solid ${S.border}`, overflow:'auto', maxHeight:220 }}>
        <div className="grid-fade-in" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))', gap:8 }}>
          {productsWithPrice.map((p:any) => (
            <ProductTile
              key={p.id}
              item={p}
              selected={sel?.id === p.id}
              onClick={handleTileClick}
            />
          ))}
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
const FREE_SAUCES = supplementPrices.freeSaucesCount, EXTRA_SAUCE = supplementPrices.extraSauce;

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
  const { data: dbSizePrices = [] } = useProductSizePrices(type);
  const fallbackSizes = (wizardSizePrices as any)[type] as { id:string; label:string; maxMeats:number; price:number }[];
  const sizes = useMemo(() => {
    if (dbSizePrices && dbSizePrices.length > 0) {
      return dbSizePrices.map(s => ({
        id: s.size_id,
        label: s.size_label,
        maxMeats: s.max_meats,
        price: Number(s.price)
      }));
    }
    return fallbackSizes;
  }, [dbSizePrices, fallbackSizes]);
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

      {/* 2-Column layout — all sections */}
      <div style={{ flex:1, overflow:'auto', padding:'10px 14px', display:'flex', flexDirection:'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Left Column: Viandes + Crudités/Garnitures */}
          <div>
            {/* Meats */}
            <SectionTitle hint={`max ${maxMeats} — détermine la taille`}>Viandes</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:12 }}>
              {meats.map(m => (
                <OptTile key={m.id} name={m.name} img={m.img} emoji="🥩"
                  selected={selMeats.includes(m.id)}
                  disabled={selMeats.length >= maxMeats && !selMeats.includes(m.id)}
                  onClick={()=>toggle(m.id, selMeats, setMeats, maxMeats)} />
              ))}
            </div>

            {/* Garnitures */}
            {hasGarniture && (defaultGarn.length > 0 || extraGarn.length > 0) && (
              <>
                <SectionTitle hint="inclus — touchez pour retirer">{isCrudite?'Crudités':'Garnitures'}</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:8 }}>
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
          </div>

          {/* Right Column: Sauces + Suppléments */}
          <div>
            {/* Sauces */}
            <SectionTitle hint={`${FREE_SAUCES} gratuites, +${EXTRA_SAUCE.toFixed(2)}€ ensuite`}>Sauces</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:12 }}>
              {sauces.map(s => (
                <OptTile key={s.id} name={s.name} img={s.img} emoji="🥫"
                  selected={selSauces.includes(s.id)}
                  onClick={()=>toggle(s.id, selSauces, setSauces)} />
              ))}
            </div>

            {/* Supplements */}
            {cfg.supplements && supps.length > 0 && (
              <>
                <SectionTitle hint="optionnel">Suppléments</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:12 }}>
                  {supps.map(s => (
                    <OptTile key={s.id} name={s.name} img={s.img} emoji="🧀" price={s.price}
                      selected={selSupps.includes(s.id)}
                      onClick={()=>toggle(s.id, selSupps, setSelSupps)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

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

  const active = products.filter((p:any)=>p.is_active);

  const activeSandwichesWithPrice = useMemo(() => {
    return active.map((p: any) => ({ ...p, price: p.base_price }));
  }, [active]);

  const handleTileClick = useCallback((item: any) => {
    setSel((prev: any) => prev?.id === item.id ? null : item);
  }, []);

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

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Sandwich products */}
      <div style={{ flex:'0 0 auto', padding:'10px 14px', borderBottom:`1px solid ${S.border}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(82px,1fr))', gap:6 }}>
          {activeSandwichesWithPrice.map((p:any)=>(
            <ProductTile key={p.id} compact item={p} selected={sel?.id===p.id} onClick={handleTileClick} />
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'10px 14px' }}>
        {!sel && <div style={{ textAlign:'center', color:'#374151', fontSize:13, paddingTop:24 }}>Choisissez un sandwich ci-dessus</div>}
        {sel && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <SectionTitle hint={`${FREE_SAUCES} gratuites, +${EXTRA_SAUCE.toFixed(2)}€ ensuite`}>Sauces</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:12 }}>
                  {sauces.map(s => (
                    <OptTile key={s.id} name={s.name} img={s.img} emoji="🥫"
                      selected={selSauces.includes(s.id)} onClick={()=>toggle(s.id, selSauces, setSauces)} />
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle hint="inclus — touchez pour retirer">Crudités</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(68px,1fr))', gap:6, marginBottom:12 }}>
                  {defCrud.map(g => (
                    <OptTile key={g.id} name={g.name} img={g.img} emoji="🥗" isDefaultRemovable
                      selected={!removed.includes(g.id)} onClick={()=>toggle(g.id, removed, setRemoved)} />
                  ))}
                  {extraCrud.map(g => (
                    <OptTile key={g.id} name={g.name} img={g.img} emoji="➕"
                      selected={selExtra.includes(g.id)} onClick={()=>toggle(g.id, selExtra, setExtra)} />
                  ))}
                </div>
              </div>
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

// ── Local TexMex Images Fallback ──────────────────────────────────────────────
const LOCAL_TEXMEX_IMAGES: Record<string, string> = {
  'wings': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=300&q=80',
  'tenders': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=300&q=80',
  'tenders-tx': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=300&q=80',
  'nuggets': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=300&q=80',
  'nuggets-tx': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=300&q=80',
  'mozzastick': 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300&q=80',
  'mozza stick': 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300&q=80',
  'jalapeños': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80',
  'jalapenos': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80',
  'onion rings': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&q=80',
  'onionrings': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&q=80',
  'menu enfant': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
  'petite barquette': 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=300&q=80',
  'grande barquette': 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=300&q=80',
  'croque monsieur': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&q=80',
  'croque madame': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&q=80',
};

// ── TexMex panel — Snacks (dégressif) + Menu Enfant + Frites + Croques ────────
interface TxProduct { id:string; name:string; unit_price:number; image_url:string|null; category?:'snack'|'frites'|'croque'|'menu_enfant'; }

const TX_SNACKS:TxProduct[] = [
  { id:'wings',      name:'Wings',        unit_price:1.40, image_url:null, category:'snack'  },
  { id:'tenders-tx', name:'Tenders',      unit_price:1.40, image_url:null, category:'snack'  },
  { id:'nuggets-tx', name:'Nuggets',      unit_price:1.40, image_url:null, category:'snack'  },
  { id:'mozzastick', name:'Mozza Stick',  unit_price:1.20, image_url:null, category:'snack'  },
  { id:'jalapenos',  name:'Jalapeños',    unit_price:1.20, image_url:null, category:'snack'  },
  { id:'onionrings', name:'Onion Rings',  unit_price:1.20, image_url:null, category:'snack'  },
];
const TX_MENUS:TxProduct[] = [
  { id:'menu-enfant-tx', name:'Menu Enfant', unit_price:6.50, image_url:null, category:'menu_enfant' },
];
const TX_FRITES:TxProduct[] = [
  { id:'petite-barquette', name:'Petite Barquette', unit_price:3.00, image_url:null, category:'frites' },
  { id:'grande-barquette', name:'Grande Barquette', unit_price:5.00, image_url:null, category:'frites' },
];
const TX_CROQUES:TxProduct[] = [
  { id:'croque-monsieur', name:'Croque Monsieur', unit_price:3.00, image_url:null, category:'croque' },
  { id:'croque-madame',   name:'Croque Madame',   unit_price:5.00, image_url:null, category:'croque' },
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
            setProducts([...TX_SNACKS,...TX_MENUS,...TX_FRITES,...TX_CROQUES]); return;
          }
          const raw = data as unknown as TxProduct[];
          const rawSnacks = raw.filter(p=>(p.category??'snack')==='snack');
          const hasMenu   = raw.some(p=>p.category==='menu_enfant');
          const hasFrites = raw.some(p=>p.category==='frites');
          const hasCroque = raw.some(p=>p.category==='croque');

          // Ensure all 6 standard snacks are present (including onionrings)
          const snackMap = new Map<string, TxProduct>();
          TX_SNACKS.forEach(s => snackMap.set(s.id, s));
          rawSnacks.forEach(s => {
            const match = TX_SNACKS.find(t => t.id === s.id || t.name.toLowerCase() === s.name.toLowerCase());
            if (match) {
              snackMap.set(match.id, { ...match, ...s, unit_price: s.unit_price || match.unit_price });
            } else {
              snackMap.set(s.id, s);
            }
          });
          const mergedSnacks = Array.from(snackMap.values());

          setProducts([
            ...mergedSnacks,
            ...(hasMenu   ? raw.filter(p=>p.category==='menu_enfant')       : TX_MENUS),
            ...(hasFrites ? raw.filter(p=>p.category==='frites')           : TX_FRITES),
            ...(hasCroque ? raw.filter(p=>p.category==='croque')           : TX_CROQUES),
          ]);
        });
    });
  },[]);

  const change = (id:string, delta:number) =>
    setQtys(prev => { const n = Math.max(0,(prev[id]||0)+delta); const next={...prev}; if(n===0) delete next[id]; else next[id]=n; return next; });

  const snacks  = products.filter(p=>(p.category??'snack')==='snack');
  const menus   = products.filter(p=>p.category==='menu_enfant');
  const frites  = products.filter(p=>p.category==='frites');
  const croques = products.filter(p=>p.category==='croque');

  const total = (()=>{
    let qA=0,qB=0,fixed=0;
    Object.entries(qtys).forEach(([id,qty])=>{
      const p = products.find(x=>x.id===id); if(!p||qty<=0) return;
      if(p.category==='frites'||p.category==='croque'||p.category==='menu_enfant') fixed += p.unit_price*qty;
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

  const catEmoji = (cat?:string) => cat==='menu_enfant' ? '👶' : cat==='frites' ? '🍟' : cat==='croque' ? '🥪' : '🌶️';
  const catGrad  = (cat?:string) => cat==='menu_enfant' ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
    : cat==='frites' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
    : cat==='croque' ? 'linear-gradient(135deg,#a16207,#78350f)'
    : 'linear-gradient(135deg,#ef4444,#f97316)';

  // Single image tile
  const TxTile = ({ p }:{ p:TxProduct }) => {
    const [imgError, setImgError] = useState(false);
    const q = qtys[p.id]||0;
    const isFixed = p.category==='frites'||p.category==='croque'||p.category==='menu_enfant';
    const normName = (p.name || '').trim().toLowerCase();
    const imgSrc = resolveImg(p.image_url || LOCAL_TEXMEX_IMAGES[normName] || LOCAL_TEXMEX_IMAGES[p.id] || LOCAL_PIZZA_IMAGES[normName]);

    return (
      <div style={{
        display:'flex', flexDirection:'column', borderRadius:10,
        border:`2px solid ${q>0 ? '#f59e0b' : S.border}`,
        background: q>0 ? 'rgba(245,158,11,0.10)' : S.card,
        overflow:'hidden', position:'relative',
        transition:'border-color 0.15s, background 0.15s',
      }}>
        {/* Image area — 3:2 aspect ratio for food cards */}
        <div style={{ position:'relative', width:'100%', paddingTop:'60%', overflow:'hidden', flexShrink:0, background:'#1e293b' }}>
          {imgSrc && !imgError ? (
            <img src={imgSrc} alt={p.name} onError={() => setImgError(true)} style={{
              position:'absolute', top:0, left:0, width:'100%', height:'100%', objectFit:'cover',
            }} />
          ) : (
            <div style={{
              position:'absolute', top:0, left:0, width:'100%', height:'100%',
              background: catGrad(p.category),
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
            }}>{catEmoji(p.category)}</div>
          )}
          {/* Qty badge */}
          {q > 0 && (
            <div style={{
              position:'absolute', top:4, right:4,
              background:'#f59e0b', color:'#000', borderRadius:'50%',
              width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:900, lineHeight:1, boxShadow:'0 2px 4px rgba(0,0,0,0.4)'
            }}>{q}</div>
          )}
        </div>
        {/* Name + price */}
        <div style={{ padding:'4px 5px 3px', flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:10, fontWeight:800, color:S.text, lineHeight:1.2, marginBottom:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{p.name}</div>
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
              fontSize:14, fontWeight:900, borderRight:`1px solid ${S.border}`,
            }}>−</button>
          <button
            onClick={(e)=>{ e.stopPropagation(); change(p.id,+1); }}
            style={{ flex:1, padding:'4px 0', border:'none', background:'transparent',
              color:'#22c55e', cursor:'pointer', fontSize:14, fontWeight:900,
            }}>+</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* 2-Column Balanced Layout */}
      <div style={{ flex:1, overflow:'auto', padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        
        {/* Left Column: Snacks / Viandes — 3x2 Grid */}
        <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            fontSize:11, fontWeight:800, color:'#ef4444',
            textTransform:'uppercase', letterSpacing:'0.05em',
            marginBottom:8, padding:'3px 8px',
            borderLeft:'3px solid #ef4444',
            background:'rgba(239, 68, 68, 0.06)', borderRadius:4
          }}>
            <span>🌶️ Snacks / Viandes</span>
            <span style={{ fontSize:9, color:S.muted, fontWeight:500, marginLeft:'auto' }}>Prix Dégressifs</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:7 }}>
            {snacks.map(p=><TxTile key={p.id} p={p} />)}
          </div>
        </div>

        {/* Right Column: Menu Enfant + Frites + Croques */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>
          
          {/* Menu Enfant Section */}
          {menus.length > 0 && (
            <div>
              <div style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:11, fontWeight:800, color:'#a855f7',
                textTransform:'uppercase', letterSpacing:'0.05em',
                marginBottom:6, padding:'3px 8px',
                borderLeft:'3px solid #a855f7',
                background:'rgba(168, 85, 247, 0.06)', borderRadius:4
              }}>
                <span>👶 Menu Enfant</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:7 }}>
                {menus.map(p=><TxTile key={p.id} p={p} />)}
              </div>
            </div>
          )}

          {/* Frites Section */}
          {frites.length > 0 && (
            <div>
              <div style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:11, fontWeight:800, color:'#f59e0b',
                textTransform:'uppercase', letterSpacing:'0.05em',
                marginBottom:6, padding:'3px 8px',
                borderLeft:'3px solid #f59e0b',
                background:'rgba(245, 158, 11, 0.06)', borderRadius:4
              }}>
                <span>🍟 Frites</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:7 }}>
                {frites.map(p=><TxTile key={p.id} p={p} />)}
              </div>
            </div>
          )}

          {/* Croques Section */}
          {croques.length > 0 && (
            <div>
              <div style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:11, fontWeight:800, color:'#eab308',
                textTransform:'uppercase', letterSpacing:'0.05em',
                marginBottom:6, padding:'3px 8px',
                borderLeft:'3px solid #eab308',
                background:'rgba(234, 179, 8, 0.06)', borderRadius:4
              }}>
                <span>🥪 Croques</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:7 }}>
                {croques.map(p=><TxTile key={p.id} p={p} />)}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Dégressif info + Add button */}
      <div style={{ padding:'7px 12px', borderTop:`1px solid ${S.border}`, background:S.panel, flexShrink:0 }}>
        {hasItems && (
          <div style={{ fontSize:9, color:S.muted, marginBottom:4, textAlign:'center' }}>
            Snacks: A (Wings/Tenders/Nuggets) 1.40€ · 5=7€ · 10=13€ &nbsp;|&nbsp; B (autres) 1.20€ · 5=6€ · 10=10€
          </div>
        )}
        <button onClick={handleAdd} disabled={!hasItems} style={{
          width:'100%', padding:'10px', borderRadius:9, border:'none',
          background:hasItems?'linear-gradient(135deg,#f59e0b,#ef4444)':'#1f2937',
          color:hasItems?'#000':'#4b5563', fontSize:13, fontWeight:900, cursor:hasItems?'pointer':'not-allowed',
          transition:'all 0.15s ease',
          boxShadow:hasItems?'0 4px 12px rgba(245, 158, 11, 0.3)':'none',
        }}>➕ Ajouter au panier — {total.toFixed(2)}€</button>
      </div>
    </div>
  );
}

// ── Boissons panel — canette/bouteille avec note + quantité ──────────────────
const BOISSON_ITEMS = [
  { id:'canette',   name:'Canette au choix',   price:1.50, hasNote:true  },
  { id:'bouteille', name:'Grande Bouteille',   price:3.50, hasNote:true  },
  { id:'eau-mini',  name:'Eau Mini (50cl)',     price:1.50, hasNote:false },
  { id:'eau-grand', name:'Eau Grand (1.5L)',    price:1.50, hasNote:false },
];
function BoissonPanel({ onAdd }:{ onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: dbDrinks } = useDrinks();
  const [qtys,  setQtys]  = useState<Record<string,number>>({});
  const [notes, setNotes] = useState<Record<string,string>>({});

  const displayDrinks = dbDrinks && dbDrinks.length > 0
    ? dbDrinks.map(d => ({
        id: d.id,
        name: d.name,
        price: Number(d.price),
        hasNote: !d.name.toLowerCase().includes('eau')
      }))
    : BOISSON_ITEMS;

  const changeQty = (id:string, d:number) =>
    setQtys(p => { const n=Math.max(0,(p[id]||0)+d); const r={...p}; if(n===0) delete r[id]; else r[id]=n; return r; });

  const total = displayDrinks.reduce((s,b)=>s+(qtys[b.id]||0)*b.price, 0);
  const hasItems = Object.values(qtys).some(q=>q>0);

  const handleAdd = () => {
    if (!hasItems) { toast.error('Sélectionnez au moins une boisson'); return; }
    const lines = displayDrinks
      .filter(b=>(qtys[b.id]||0)>0)
      .map(b=>{ const n=notes[b.id]; return `${qtys[b.id]}x ${b.name}${n?` (${n})`:''}`; });
    // Add each boisson as separate cart item for clarity
    displayDrinks.filter(b=>(qtys[b.id]||0)>0).forEach(b=>{
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
        {displayDrinks.map(b=>{
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
                  placeholder={b.name.toLowerCase().includes('canette')?'Ex: Coca-Cola, Fanta, Sprite…':'Ex: Coca 1.5L, eau gazeuse…'}
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

const ToppingMedia = ({ name, emoji }: { name: string; emoji: string }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const fileSafeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const imgSrc = `/toppings/${fileSafeName}.png`;

  if (imgFailed) {
    return <span style={{ fontSize: 20 }}>{emoji}</span>;
  }

  return (
    <img
      src={imgSrc}
      alt={name}
      onError={() => setImgFailed(true)}
      style={{ width: 28, height: 28, objectFit: 'contain', marginBottom: 2 }}
    />
  );
};

const CupToppingOverlay = ({ name, emoji, style }: { name: string; emoji: string; style: React.CSSProperties }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const fileSafeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const imgSrc = `/toppings/${fileSafeName}.png`;

  if (imgFailed) {
    return <span style={{ position: 'absolute', zIndex: 6, userSelect: 'none', pointerEvents: 'none', ...style }}>{emoji}</span>;
  }

  return (
    <img
      src={imgSrc}
      alt={name}
      onError={() => setImgFailed(true)}
      style={{
        position: 'absolute',
        width: 32,
        height: 32,
        objectFit: 'contain',
        filter: 'drop-shadow(0 2.5px 5px rgba(0,0,0,0.4))',
        zIndex: 6,
        userSelect: 'none',
        pointerEvents: 'none',
        ...style
      }}
    />
  );
};

const FloatingToppingCircle = memo(({ name, emoji, active, onClick, onDragStart, onDragEnd, style }: {
  name: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  style: React.CSSProperties;
}) => {
  return (
    <div
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="pos-btn-interactive"
      style={{
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: '50%',
        border: `2px solid ${active ? '#f59e0b' : '#374151'}`,
        background: active ? 'rgba(245,158,11,0.15)' : 'rgba(31, 41, 55, 0.85)',
        color: active ? '#f59e0b' : '#e5e7eb',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        boxShadow: active ? '0 0 12px rgba(245,158,11,0.3)' : '0 4px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(4px)',
        userSelect: 'none',
        ...style,
      }}
    >
      <ToppingMedia name={name} emoji={emoji} />
      <span style={{ fontSize: 9, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {active && (
        <span style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: 8,
          background: '#f59e0b',
          color: '#000',
          borderRadius: '50%',
          width: 14,
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          border: '1px solid #111827',
        }}>
          ✓
        </span>
      )}
    </div>
  );
});

function MilkshakePanel({ onAdd }: { onAdd: (item: any, custom: any, price: number) => void }) {
  const toppingsList = ['Kinder Bueno', 'Oreo', "M&M's", 'Speculoos', 'Nutella', 'Daim'];
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [nappage, setNappage] = useState<string[]>([]); // 'Chocolat', 'Caramel'
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [isDraggingTopping, setIsDraggingTopping] = useState<string | null>(null);
  const [isDragOverCup, setIsDragOverCup] = useState(false);
  const [cupImageSrc] = useState(() => `/milkshake_cup.png?t=${Date.now()}`);

  const basePrice = 5.00;
  const extraToppingsCount = Math.max(0, selectedToppings.length - 1);
  const extraToppingsPrice = extraToppingsCount * 0.50;
  const unitPrice = basePrice + extraToppingsPrice;
  const totalPrice = unitPrice * qty;

  const toggleTopping = useCallback((topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping) ? prev.filter(t => t !== topping) : [...prev, topping]
    );
  }, []);

  const toggleNappage = useCallback((sauce: string) => {
    setNappage(prev =>
      prev.includes(sauce) ? prev.filter(s => s !== sauce) : [...prev, sauce]
    );
  }, []);

  const handleAdd = () => {
    const finalToppings = [...selectedToppings];
    nappage.forEach(n => finalToppings.push(`Nappage ${n}`));

    onAdd(
      {
        id: 'milk-custom-' + Date.now(),
        name: 'Milkshake',
        price: unitPrice,
        category: 'milkshakes',
        description: 'Base vanille & Chantilly'
      },
      {
        toppings: finalToppings,
        garnitures: finalToppings,
        note: note
      },
      totalPrice
    );
    setSelectedToppings([]);
    setNappage([]);
    setQty(1);
    setNote('');
  };

  const handleToppingDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'topping-raw', name }));
    setIsDraggingTopping(name);
  };

  const handleToppingDragEnd = () => {
    setIsDraggingTopping(null);
  };

  const handleCupDragStart = (e: React.DragEvent) => {
    const finalToppings = [...selectedToppings];
    nappage.forEach(n => finalToppings.push(`Nappage ${n}`));

    const data = {
      type: 'milkshake-custom',
      toppings: finalToppings,
      unitPrice,
      totalPrice
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
  };

  const handleCupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCup(true);
  };

  const handleCupDragLeave = () => {
    setIsDragOverCup(false);
  };

  const handleCupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCup(false);
    setIsDraggingTopping(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'topping-raw' && toppingsList.includes(data.name)) {
        if (!selectedToppings.includes(data.name)) {
          toggleTopping(data.name);
          toast.success(`${data.name} ajouté ! 🥛`);
        }
      }
    } catch {
      const name = e.dataTransfer.getData('text/plain');
      if (toppingsList.includes(name)) {
        if (!selectedToppings.includes(name)) {
          toggleTopping(name);
          toast.success(`${name} ajouté ! 🥛`);
        }
      }
    }
  };

  const toppingEmojis: Record<string, string> = {
    'Kinder Bueno': '🍫',
    'Oreo': '🍪',
    "M&M's": '🔴',
    'Speculoos': '🍪',
    'Nutella': '🫙',
    'Daim': '🍬'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Scrollable middle container */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* Info card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '6px 12px', marginBottom: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', marginBottom: 2 }}>🥛 Milkshake Personnalisé (5.00€)</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>Base vanille + Crème Chantilly et 1 topping inclus. Topping supplém. +0.50€.</div>
        </div>

        {/* Circular Floating Builder Area */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 390,
          background: 'rgba(15,23,42,0.15)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          maxWidth: 680,
        }}>
          {/* Milkshake Cup in the middle */}
          <div
            onDragOver={handleCupDragOver}
            onDragLeave={handleCupDragLeave}
            onDrop={handleCupDrop}
            draggable={selectedToppings.length > 0 || nappage.length > 0}
            onDragStart={handleCupDragStart}
            style={{
              position: 'relative',
              width: 220,
              height: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              border: isDragOverCup 
                ? `3.5px dashed #f59e0b` 
                : (isDraggingTopping ? '2px dashed rgba(255,255,255,0.25)' : '2px dashed transparent'),
              background: isDragOverCup 
                ? 'rgba(245,158,11,0.08)' 
                : (isDraggingTopping ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)'),
              boxShadow: isDragOverCup ? `0 0 30px rgba(245,158,11,0.3)` : 'none',
              transform: isDragOverCup ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: (selectedToppings.length > 0 || nappage.length > 0) ? 'grab' : 'default',
              zIndex: 10,
            }}
          >
            {/* Cup Image */}
            <img
              src={cupImageSrc}
              alt="Milkshake Cup"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: isDragOverCup ? 0.8 : 1,
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
              }}
            />

            {/* REACTIVE DRIZZLES & TOPPING SPRINKLES */}
            
            {/* Chocolat Nappage */}
            {nappage.includes('Chocolat') && (
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, width: '100%', height: '100%' }}>
                <path d="M 38 22 Q 42 38 44 26 Q 48 42 52 24 Q 56 42 60 27 Q 65 38 68 22" fill="none" stroke="#2c1a11" strokeWidth="5.5" strokeLinecap="round" opacity="0.95" />
                <path d="M 44 19 Q 50 35 54 21 Q 58 35 62 19" fill="none" stroke="#2c1a11" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
              </svg>
            )}

            {/* Caramel Nappage */}
            {nappage.includes('Caramel') && (
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, width: '100%', height: '100%' }}>
                <path d="M 36 24 Q 40 39 42 27 Q 47 43 50 25 Q 55 43 58 28 Q 63 39 66 24" fill="none" stroke="#b45309" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
                <path d="M 41 21 Q 48 37 52 23 Q 56 37 60 21" fill="none" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
              </svg>
            )}

            {/* Topping Sprinkles */}
            {selectedToppings.includes('Nutella') && (
              <>
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, width: '100%', height: '100%' }}>
                  <path d="M 39 23 Q 41 33 43 25 Q 46 35 48 23" fill="none" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                </svg>
                <CupToppingOverlay name="Nutella" emoji="🫙" style={{ top: '12%', left: '44%', transform: 'rotate(-5deg)' }} />
              </>
            )}
            {selectedToppings.includes('Kinder Bueno') && (
              <>
                <CupToppingOverlay name="Kinder Bueno" emoji="🍫" style={{ top: '15%', left: '36%', transform: 'rotate(-25deg)' }} />
                <CupToppingOverlay name="Kinder Bueno" emoji="🍫" style={{ top: '19%', left: '50%', transform: 'rotate(15deg)' }} />
              </>
            )}
            {selectedToppings.includes('Oreo') && (
              <>
                <CupToppingOverlay name="Oreo" emoji="🍪" style={{ top: '21%', left: '30%', transform: 'rotate(10deg)' }} />
                <CupToppingOverlay name="Oreo" emoji="🍪" style={{ top: '23%', left: '56%', transform: 'rotate(-15deg)' }} />
              </>
            )}
            {selectedToppings.includes("M&M's") && (
              <>
                <CupToppingOverlay name="M&M's" emoji="🔴" style={{ top: '24%', left: '36%' }} />
                <CupToppingOverlay name="M&M's" emoji="🟡" style={{ top: '20%', left: '48%' }} />
                <CupToppingOverlay name="M&M's" emoji="🔵" style={{ top: '26%', left: '54%' }} />
              </>
            )}
            {selectedToppings.includes('Speculoos') && (
              <>
                <CupToppingOverlay name="Speculoos" emoji="🍪" style={{ top: '26%', left: '32%' }} />
                <CupToppingOverlay name="Speculoos" emoji="🍪" style={{ top: '21%', left: '40%' }} />
              </>
            )}
            {selectedToppings.includes('Daim') && (
              <>
                <CupToppingOverlay name="Daim" emoji="🍬" style={{ top: '25%', left: '33%' }} />
                <CupToppingOverlay name="Daim" emoji="🍬" style={{ top: '18%', left: '51%' }} />
              </>
            )}

            {/* Topping Count Badge */}
            {(selectedToppings.length + nappage.length) > 0 && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: '#f59e0b',
                color: '#000',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: 9,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                zIndex: 10
              }}>
                {selectedToppings.length + nappage.length}
              </div>
            )}

            {/* Drag Prompts */}
            {isDraggingTopping && !isDragOverCup && (
              <div style={{
                position: 'absolute',
                bottom: 8,
                background: 'rgba(0,0,0,0.85)',
                color: '#f59e0b',
                padding: '3px 8px',
                borderRadius: 99,
                fontSize: 8,
                fontWeight: 800,
                textTransform: 'uppercase',
                zIndex: 10,
              }}>
                Déposer !
              </div>
            )}
            {(selectedToppings.length > 0 || nappage.length > 0) && !isDraggingTopping && (
              <div style={{
                position: 'absolute',
                bottom: 8,
                background: 'rgba(15,23,42,0.85)',
                color: '#fff',
                padding: '3px 8px',
                borderRadius: 99,
                fontSize: 8,
                fontWeight: 800,
                zIndex: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                whiteSpace: 'nowrap',
              }}>
                Glisser vers la caisse 👈
              </div>
            )}
          </div>

          {/* FLOATING TOPPING TILES (CIRCULATING IN AN ARC AROUND THE CUP) */}
          {/* Kinder Bueno */}
          <FloatingToppingCircle
            name="Kinder Bueno"
            emoji="🍫"
            active={selectedToppings.includes('Kinder Bueno')}
            onClick={() => toggleTopping('Kinder Bueno')}
            onDragStart={(e) => handleToppingDragStart(e, 'Kinder Bueno')}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '4%', left: '8%' }}
          />

          {/* Oreo */}
          <FloatingToppingCircle
            name="Oreo"
            emoji="🍪"
            active={selectedToppings.includes('Oreo')}
            onClick={() => toggleTopping('Oreo')}
            onDragStart={(e) => handleToppingDragStart(e, 'Oreo')}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '38%', left: '2%' }}
          />

          {/* M&M's */}
          <FloatingToppingCircle
            name="M&M's"
            emoji="🔴"
            active={selectedToppings.includes("M&M's")}
            onClick={() => toggleTopping("M&M's")}
            onDragStart={(e) => handleToppingDragStart(e, "M&M's")}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '72%', left: '8%' }}
          />

          {/* Speculoos */}
          <FloatingToppingCircle
            name="Speculoos"
            emoji="🍪"
            active={selectedToppings.includes('Speculoos')}
            onClick={() => toggleTopping('Speculoos')}
            onDragStart={(e) => handleToppingDragStart(e, 'Speculoos')}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '4%', right: '8%' }}
          />

          {/* Nutella */}
          <FloatingToppingCircle
            name="Nutella"
            emoji="🫙"
            active={selectedToppings.includes('Nutella')}
            onClick={() => toggleTopping('Nutella')}
            onDragStart={(e) => handleToppingDragStart(e, 'Nutella')}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '38%', right: '2%' }}
          />

          {/* Daim */}
          <FloatingToppingCircle
            name="Daim"
            emoji="🍬"
            active={selectedToppings.includes('Daim')}
            onClick={() => toggleTopping('Daim')}
            onDragStart={(e) => handleToppingDragStart(e, 'Daim')}
            onDragEnd={handleToppingDragEnd}
            style={{ top: '72%', right: '8%' }}
          />

          {/* NAPPAGE / DRIZZLE SELECTORS (BOTTOM CENTER) */}
          <div style={{
            position: 'absolute',
            bottom: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
            background: 'rgba(0,0,0,0.3)',
            padding: '6px 10px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.05)',
            zIndex: 15,
          }}>
            <button
              onClick={() => toggleNappage('Chocolat')}
              className="pos-btn-interactive"
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1.5px solid ${nappage.includes('Chocolat') ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                background: nappage.includes('Chocolat') ? 'rgba(59,35,20,0.4)' : '#1e293b',
                color: nappage.includes('Chocolat') ? '#f59e0b' : '#94a3b8',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>🍫</span> Chocolat
            </button>
            <button
              onClick={() => toggleNappage('Caramel')}
              className="pos-btn-interactive"
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1.5px solid ${nappage.includes('Caramel') ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                background: nappage.includes('Caramel') ? 'rgba(180,83,9,0.3)' : '#1e293b',
                color: nappage.includes('Caramel') ? '#f59e0b' : '#94a3b8',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>🍯</span> Caramel
            </button>
          </div>

        </div>

        {/* Notes input */}
        <div style={{ marginTop: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: S.muted, fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>NOTES / MODIFICATIONS</div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Sans chantilly, extra caramel..."
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 8,
              border: `1px solid ${S.border}`,
              background: '#1f2937',
              color: '#fff',
              fontSize: 11,
              outline: 'none'
            }}
          />
        </div>

      </div>

      {/* Quantity bar */}
      <div style={{ padding: '6px 14px', borderTop: `1px solid ${S.border}`, background: '#111827', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: S.muted, fontWeight: 700 }}>Qté:</span>
        <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ ...S.btn, padding: '3px 8px', fontWeight: 900 }}>−</button>
        <span style={{ fontSize: 13, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{qty}</span>
        <button onClick={() => setQty(qty + 1)} style={{ ...S.btn, padding: '3px 8px', fontWeight: 900 }}>+</button>
      </div>

      {/* Add CTA */}
      <div style={{ padding: '8px 14px', borderTop: `1px solid ${S.border}`, background: '#111827', flexShrink: 0 }}>
        <button
          onClick={handleAdd}
          style={{
            width: '100%',
            padding: '9px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
            color: '#000',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
          }}
        >
          <span>Ajouter au panier</span>
          <span style={{ opacity: 0.85 }}>({totalPrice.toFixed(2)}€)</span>
        </button>
      </div>
    </div>
  );
}

// ── Simple panel (frites, crêpes, boissons, etc.) ────────────────────────────
function SimplePanel({ categorySlug, title, onAdd }: { categorySlug:string; title:string; onAdd:(item:any,custom:any,price:number)=>void }) {
  const { data: dbProducts = [] } = useProductsByCategory(categorySlug);
  const fallbacks: Record<string,any[]> = { frites:staticFrites, crepes:crepes, gaufres:gaufres, boissons:boissons, croques:staticCroques, milkshakes:milkshakes };
  const products = toItems(dbProducts.length ? dbProducts : undefined, fallbacks[categorySlug] || []);

  const [sel, setSel] = useState<any|null>(null);
  const [qty, setQty] = useState(1);

  const handleTileClick = useCallback((item: any) => {
    setSel((prev: any) => prev?.id === item.id ? null : item);
    setQty(1);
  }, []);

  const handleAdd = () => {
    if (!sel) { toast.error('Choisissez un produit'); return; }
    onAdd({ id:sel.id, name:sel.name, price:sel.price, category:categorySlug, description:'' }, {}, sel.price * qty);
    setSel(null); setQty(1);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px' }}>
        <div className="grid-fade-in" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8 }}>
          {products.map((p:any) => (
            <ProductTile
              key={p.id}
              item={p}
              selected={sel?.id === p.id}
              onClick={handleTileClick}
            />
          ))}
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
      <div className="pos-glassy-panel" onClick={e=>e.stopPropagation()} style={{ width:480, maxWidth:'90%', height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, display:'flex', flexDirection:'column' }}>
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

function POSEditModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'pizzas' | 'texmex' | 'sandwiches' | 'other' | 'options' | 'prices' | 'availability'>('pizzas');
  const [subCat, setSubCat] = useState<'soufflets' | 'makloub' | 'mlawi' | 'tacos' | 'panini' | 'croques' | 'frites' | 'milkshakes' | 'crepes' | 'gaufres' | 'drinks'>('tacos');
  const [subOption, setSubOption] = useState<'meats' | 'sauces' | 'garnitures' | 'crudites' | 'supplements'>('meats');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1117',
          borderRadius: 16,
          border: '1px solid #334155',
          width: '96vw',
          maxWidth: 1200,
          maxHeight: '94vh',
          height: '94vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✏️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>Éditeur POS Direct</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Modifiez vos produits, prix, tex-mex et options en direct sans quitter la caisse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#21262d', border: '1px solid #30363d', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Top Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#161b22', borderBottom: '1px solid #30363d', overflowX: 'auto', flexShrink: 0 }}>
          {[
            { id: 'pizzas', label: '🍕 Pizzas' },
            { id: 'texmex', label: '🌶️ Tex-Mex' },
            { id: 'sandwiches', label: '🥖 Sandwiches' },
            { id: 'other', label: '📦 Tacos & Produits' },
            { id: 'options', label: '🥩 Viandes & Options' },
            { id: 'prices', label: '💰 Tous les Prix' },
            { id: 'availability', label: '⚡ Épuisé / Dispo' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: active ? '#f59e0b' : '#21262d',
                  color: active ? '#000' : '#c9d1d9',
                  transition: 'all .12s'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs for Other */}
        {tab === 'other' && (
          <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: '#0d1117', borderBottom: '1px solid #30363d', overflowX: 'auto', flexShrink: 0 }}>
            {[
              { id: 'tacos', label: '🌮 Tacos' },
              { id: 'soufflets', label: '🥙 Soufflé' },
              { id: 'makloub', label: '🍛 Makloub' },
              { id: 'mlawi', label: '🫓 Mlawi' },
              { id: 'panini', label: '🥪 Panini' },
              { id: 'croques', label: '🧀 Croques' },
              { id: 'frites', label: '🍟 Frites' },
              { id: 'milkshakes', label: '🥤 Milkshakes' },
              { id: 'crepes', label: '🥞 Crêpes' },
              { id: 'gaufres', label: '🧇 Gaufres' },
              { id: 'drinks', label: '🧃 Boissons' },
            ].map((st) => {
              const active = subCat === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSubCat(st.id as any)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #30363d',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: active ? '#38bdf8' : '#161b22',
                    color: active ? '#000' : '#8b949e',
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-tabs for Options */}
        {tab === 'options' && (
          <div style={{ display: 'flex', gap: 4, padding: '6px 12px', background: '#0d1117', borderBottom: '1px solid #30363d', overflowX: 'auto', flexShrink: 0 }}>
            {[
              { id: 'meats', label: '🥩 Viandes' },
              { id: 'sauces', label: '🍅 Sauces' },
              { id: 'garnitures', label: '🥬 Garnitures' },
              { id: 'crudites', label: '🥗 Crudités' },
              { id: 'supplements', label: '➕ Suppléments' },
            ].map((so) => {
              const active = subOption === so.id;
              return (
                <button
                  key={so.id}
                  onClick={() => setSubOption(so.id as any)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #30363d',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: active ? '#38bdf8' : '#161b22',
                    color: active ? '#000' : '#8b949e',
                  }}
                >
                  {so.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#0d1117', color: '#f8fafc' }}>
          {tab === 'pizzas' && <PizzaManager />}
          {tab === 'texmex' && <TexMexManager />}
          {tab === 'sandwiches' && <SandwichManager />}
          {tab === 'other' && subCat === 'drinks' && <ImageUploadTable tableName="drinks" title="Boissons" hasImage />}
          {tab === 'other' && subCat !== 'drinks' && <ProductCategoryManager categorySlug={subCat} title={subCat.toUpperCase()} />}
          {tab === 'options' && subOption === 'meats' && <ImageUploadTable tableName="meat_options" title="Options viandes" hasImage />}
          {tab === 'options' && subOption === 'sauces' && <ImageUploadTable tableName="sauce_options" title="Options sauces" hasImage />}
          {tab === 'options' && subOption === 'garnitures' && <ImageUploadTable tableName="garniture_options" title="Options garnitures" hasImage />}
          {tab === 'options' && subOption === 'crudites' && <ImageUploadTable tableName="crudites_options" title="Crudités" hasImage />}
          {tab === 'options' && subOption === 'supplements' && <ImageUploadTable tableName="supplement_options" title="Suppléments" hasImage />}
          {tab === 'prices' && <PriceManager />}
          {tab === 'availability' && <AvailabilityManager />}
        </div>
      </div>
    </div>
  );
}

// ── Settings panel (theme / colors + Freebox) ───────────────────────────────
function SettingsPanel({ onClose }: { onClose:()=>void }) {
  useThemeBump();
  const setColor = (k:ThemeKey, v:string) => { (S as any)[k] = v; saveTheme(); notifyTheme(); };
  const resetAll = () => { Object.assign(S, DEFAULT_THEME); saveTheme(); notifyTheme(); };

  // Unified Box State
  const [boxType, setBoxType] = useState<'freebox' | 'livebox'>('livebox');
  const [fbRegistered, setFbRegistered] = useState(false);
  const [fbState, setFbState] = useState<'idle' | 'pairing' | 'granted' | 'denied' | 'timeout' | 'error'>('idle');
  const [fbError, setFbError] = useState('');
  
  const [lbPassword, setLbPassword] = useState('');
  const [lbRegistered, setLbRegistered] = useState(false);
  const [lbState, setLbState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lbError, setLbError] = useState('');
  
  const isElectron = typeof window !== 'undefined' && 'twinHub' in window;

  useEffect(() => {
    if (isElectron) {
      const th = (window as any).twinHub;
      if (th.freeboxStatus) {
        th.freeboxStatus().then((res: any) => {
          if (res && res.success && res.registered) {
            setFbRegistered(true);
            setBoxType('freebox');
          }
        });
      }
      if (th.liveboxStatus) {
        th.liveboxStatus().then((res: any) => {
          if (res && res.success && res.registered) {
            setLbRegistered(true);
            setBoxType('livebox');
          }
        });
      }
    }
  }, [isElectron]);

  const handleFreeboxPair = async () => {
    if (!isElectron) return;
    setFbState('pairing');
    setFbError('');
    try {
      const res = await (window as any).twinHub.freeboxRegister();
      if (!res.success) {
        setFbState('error');
        setFbError(res.error || "Impossible d'initier l'association");
        return;
      }
      
      const { app_token, track_id } = res.result;
      
      // Poll authorization status every 2 seconds
      const pollTimer = setInterval(async () => {
        try {
          const checkRes = await (window as any).twinHub.freeboxCheckAuth(track_id, app_token);
          if (checkRes.success) {
            const status = checkRes.result.status;
            if (status === 'granted') {
              clearInterval(pollTimer);
              setFbRegistered(true);
              setFbState('granted');
              toast.success("✅ Freebox connectée avec succès !");
            } else if (status === 'denied' || status === 'timeout') {
              clearInterval(pollTimer);
              setFbState(status);
            }
          }
        } catch (e: any) {
          clearInterval(pollTimer);
          setFbState('error');
          setFbError(e.message || "Erreur de vérification");
        }
      }, 2000);

      setTimeout(() => clearInterval(pollTimer), 60000);

    } catch (e: any) {
      setFbState('error');
      setFbError(e.message || "Erreur d'association");
    }
  };

  const handleFreeboxUnlink = async () => {
    if (!isElectron) return;
    try {
      const res = await (window as any).twinHub.freeboxUnregister();
      if (res.success) {
        setFbRegistered(false);
        setFbState('idle');
        toast.success("🔴 Freebox déconnectée");
      }
    } catch (e: any) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleLiveboxPair = async () => {
    if (!isElectron || !lbPassword.trim()) return;
    setLbState('loading');
    setLbError('');
    try {
      const res = await (window as any).twinHub.liveboxRegister(lbPassword.trim());
      if (res.success) {
        setLbRegistered(true);
        setLbState('idle');
        toast.success("✅ Livebox Orange connectée avec succès !");
      } else {
        setLbState('error');
        setLbError(res.error || "Mot de passe incorrect.");
        toast.error("Échec de la connexion à la Livebox");
      }
    } catch (e: any) {
      setLbState('error');
      setLbError(e.message || "Erreur de connexion");
      toast.error("Erreur de connexion");
    }
  };

  const handleLiveboxUnlink = async () => {
    if (!isElectron) return;
    try {
      const res = await (window as any).twinHub.liveboxUnregister();
      if (res.success) {
        setLbRegistered(false);
        setLbState('idle');
        setLbPassword('');
        toast.success("🔴 Livebox Orange déconnectée");
      }
    } catch (e: any) {
      toast.error("Erreur lors de la déconnexion");
    }
  };  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div className="pos-glassy-panel" onClick={e=>e.stopPropagation()} style={{ width:340, height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, padding:'18px 20px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:S.text }}>⚙️ Personnalisation & Caisse</div>
          <button onClick={onClose} style={{ ...S.btn, padding:'5px 12px' }}>✕</button>
        </div>
        
        <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingRight:2 }}>
          {/* Aesthetic Preset Switcher */}
          <div style={{ fontSize:11, color:S.muted, textTransform:'uppercase', fontWeight:800, letterSpacing:'0.05em', marginBottom:10 }}>Style Visuel</div>
          <div className="pos-segmented-container" style={{ display:'flex', gap:2, marginBottom:20 }}>
            <button 
              onClick={() => { applyThemePreset('classic'); notifyTheme(); }}
              className={`pos-segmented-btn pos-btn-interactive ${currentThemeMode === 'classic' ? 'active' : ''}`}
              style={{ flex:1, padding:'6px', fontSize:11, cursor:'pointer' }}
            >
              🎨 Classique
            </button>
            <button 
              onClick={() => { applyThemePreset('glassy'); notifyTheme(); }}
              className={`pos-segmented-btn pos-btn-interactive ${currentThemeMode === 'glassy' ? 'active' : ''}`}
              style={{ flex:1, padding:'6px', fontSize:11, cursor:'pointer' }}
            >
              🍏 iOS Glass
            </button>
          </div>

          {/* Section 1: Colors */}
          <div style={{ fontSize:11, color:S.muted, textTransform:'uppercase', fontWeight:800, letterSpacing:'0.05em', marginBottom:10 }}>Thème de l'application</div>
          {currentThemeMode === 'glassy' ? (
            <div style={{ fontSize:12, color:S.muted, padding:'14px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, textAlign:'center', marginBottom:20 }}>
              ✨ Personnalisation des couleurs désactivée en mode Glassmorphism. Repassez en <b>Classique</b> pour éditer.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:20 }}>
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
              <button onClick={resetAll} style={{ ...S.btn, width:'100%', marginTop:10, padding:'8px', fontSize:11, fontWeight:700 }}>
                ↺ Réinitialiser les couleurs
              </button>
            </div>
          )}

          <hr style={{ border:'none', borderTop:`1px solid ${S.border}`, margin:'16px 0' }} />

          {/* Section 2: Liaison Ligne Téléphonique */}
          <div style={{ fontSize:11, color:S.muted, textTransform:'uppercase', fontWeight:800, letterSpacing:'0.05em', marginBottom:10 }}>Liaison Ligne Téléphonique Fixe</div>
          
          {!isElectron ? (
            <div style={{ fontSize:12, color:S.muted, padding:10, background:'#1f293755', borderRadius:8 }}>
              ⚠️ Non disponible en mode navigateur. Lancez l'application officielle pour connecter votre Box.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {/* Segmented Control */}
              <div style={{ display:'flex', background:'#111', padding:3, borderRadius:8, gap:2 }}>
                <button 
                  onClick={() => setBoxType('livebox')}
                  style={{ 
                    flex:1, padding:'6px', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
                    background: boxType === 'livebox' ? S.accent : 'transparent',
                    color: boxType === 'livebox' ? '#000' : S.muted
                  }}
                >
                  Livebox (Orange)
                </button>
                <button 
                  onClick={() => setBoxType('freebox')}
                  style={{ 
                    flex:1, padding:'6px', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
                    background: boxType === 'freebox' ? S.accent : 'transparent',
                    color: boxType === 'freebox' ? '#000' : S.muted
                  }}
                >
                  Freebox (Free)
                </button>
              </div>

              {boxType === 'freebox' ? (
                // Freebox UI
                fbRegistered ? (
                  <div style={{ background:'#22c55e0d', border:'1px solid #22c55e33', borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#22c55e', display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <span>🟢 Freebox connectée</span>
                      <span style={{ width:7, height:7, background:'#22c55e', borderRadius:'50%' }} />
                    </div>
                    <div style={{ fontSize:11, color:S.text, lineHeight:1.3, marginBottom:10 }}>
                      La caisse reçoit en temps réel les numéros des appels entrants pour pré-remplir les fiches clients.
                    </div>
                    <button onClick={handleFreeboxUnlink} style={{ ...S.btn, width:'100%', padding:'8px', borderColor:'#ef444455', color:'#ef4444', background:'#ef44440d', fontWeight:700 }}>
                      🔴 Déconnecter la Freebox
                    </button>
                  </div>
                ) : (
                  <div style={{ background:'#1f293733', border:`1px solid ${S.border}`, borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:S.text, marginBottom:6 }}>Liaison Freebox</div>
                    <div style={{ fontSize:11, color:S.muted, lineHeight:1.3, marginBottom:12 }}>
                      Associez la caisse à votre Freebox locale pour pré-remplir automatiquement les coordonnées des clients lorsqu'ils vous appellent.
                    </div>

                    {fbState === 'idle' && (
                      <button onClick={handleFreeboxPair} style={{ ...S.btn, width:'100%', padding:'10px', background:S.accent, color:'#000', border:'none', fontWeight:800, fontSize:12 }}>
                        🔗 Associer ma Freebox
                      </button>
                    )}

                    {fbState === 'pairing' && (
                      <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b44', borderRadius:8, padding:10, textAlign:'center' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginBottom:4 }}>⏳ Demande en cours...</div>
                        <div style={{ fontSize:11, color:S.text, fontWeight:600, lineHeight:1.3 }}>
                          👉 Regardez l'écran LCD de votre Freebox et appuyez sur la flèche de **DROITE (Oui)** pour valider !
                        </div>
                      </div>
                    )}

                    {fbState === 'denied' && (
                      <div style={{ color:'#ef4444', fontSize:11, fontWeight:600, textAlign:'center', marginTop:8 }}>
                        ❌ Association refusée sur la Freebox. <span style={{ textDecoration:'underline', cursor:'pointer' }} onClick={handleFreeboxPair}>Réessayer</span>
                      </div>
                    )}

                    {fbState === 'timeout' && (
                      <div style={{ color:'#ef4444', fontSize:11, fontWeight:600, textAlign:'center', marginTop:8 }}>
                        ⏳ Temps écoulé. <span style={{ textDecoration:'underline', cursor:'pointer' }} onClick={handleFreeboxPair}>Réessayer</span>
                      </div>
                    )}

                    {fbState === 'error' && (
                      <div style={{ color:'#ef4444', fontSize:11, fontWeight:600, textAlign:'center', marginTop:8 }}>
                        ❌ Erreur: {fbError}. <span style={{ textDecoration:'underline', cursor:'pointer' }} onClick={handleFreeboxPair}>Réessayer</span>
                      </div>
                    )}
                  </div>
                )
              ) : (
                // Livebox UI
                lbRegistered ? (
                  <div style={{ background:'#22c55e0d', border:'1px solid #22c55e33', borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#22c55e', display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <span>🟢 Livebox connectée</span>
                      <span style={{ width:7, height:7, background:'#22c55e', borderRadius:'50%' }} />
                    </div>
                    <div style={{ fontSize:11, color:S.text, lineHeight:1.3, marginBottom:10 }}>
                      La caisse reçoit en temps réel les numéros des appels entrants pour pré-remplir les fiches clients.
                    </div>
                    <button onClick={handleLiveboxUnlink} style={{ ...S.btn, width:'100%', padding:'8px', borderColor:'#ef444455', color:'#ef4444', background:'#ef44440d', fontWeight:700 }}>
                      🔴 Déconnecter la Livebox
                    </button>
                  </div>
                ) : (
                  <div style={{ background:'#1f293733', border:`1px solid ${S.border}`, borderRadius:10, padding:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:S.text, marginBottom:6 }}>Liaison Livebox (Orange)</div>
                    <div style={{ fontSize:11, color:S.muted, lineHeight:1.3, marginBottom:12 }}>
                      Entrez le mot de passe d'administration de votre Livebox (par défaut, ce sont les **8 premiers caractères de votre clé de sécurité Wi-Fi** imprimée sur l'étiquette au dos ou sous la box).
                    </div>
                    
                    <input 
                      type="password"
                      placeholder="Mot de passe d'administration"
                      value={lbPassword}
                      onChange={e => setLbPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        background: '#111',
                        border: `1px solid ${S.border}`,
                        borderRadius: 8,
                        color: S.text,
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />

                    {lbState === 'loading' ? (
                      <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', textAlign:'center', padding:10 }}>
                        ⏳ Connexion en cours à la Livebox...
                      </div>
                    ) : (
                      <button onClick={handleLiveboxPair} style={{ ...S.btn, width:'100%', padding:'10px', background:S.accent, color:'#000', border:'none', fontWeight:800, fontSize:12 }}>
                        🔗 Associer ma Livebox
                      </button>
                    )}

                    {lbState === 'error' && (
                      <div style={{ color:'#ef4444', fontSize:11, fontWeight:600, textAlign:'center', marginTop:8 }}>
                        ❌ {lbError}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
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
      <div className="pos-glassy-panel" onClick={e=>e.stopPropagation()} style={{ width:360, height:'100%', background:S.panel, borderLeft:`1px solid ${S.border}`, padding:'18px 20px', overflow:'auto', display:'flex', flexDirection:'column' }}>
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

// ── Facture Hub Modal (Consolidated Invoice Hub) ─────────────────────────────
function FactureHubModal({ onClose }: { onClose:()=>void }) {
  const [activeTab, setActiveTab] = useState<'recent' | 'manual'>('recent');
  
  // Tab 1: Recent orders
  const { data: orders = [], isLoading } = useOrders(); // no filter = all recent orders
  const [printingOrder, setPrintingOrder] = useState<string | null>(null);

  const printOrderInvoice = async (orderNumber: string) => {
    setPrintingOrder(orderNumber);
    try {
      const res = await fetch(`${PRINT_SERVER}/print-invoice/${orderNumber}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        toast.success(`✅ Facture #${orderNumber} imprimée`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      toast.error(e.message?.includes('fetch') ? '❌ Serveur impression hors ligne' : '❌ ' + e.message);
    } finally {
      setPrintingOrder(null);
    }
  };

  // Tab 2: Manual Invoice creation
  const [repas,   setRepas]   = useState(1);
  const [unit,    setUnit]    = useState(0);
  const [label,   setLabel]   = useState('Repas');
  const [tvaRate, setTvaRate] = useState(10);
  const [client,  setClient]  = useState('');
  const [clientSiret, setClientSiret] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [printingManual, setPrintingManual] = useState(false);

  const totalTTC = repas * unit;
  const totalHT  = totalTTC / (1 + tvaRate / 100);
  const tvaAmt   = totalTTC - totalHT;

  const printManualInvoice = async () => {
    if (totalTTC <= 0) { toast.error('Montant invalide'); return; }
    setPrintingManual(true);
    try {
      const d = new Date();
      const invoiceNumber = `FA-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*900)+100)}`;
      const res = await fetch(`${PRINT_SERVER}/print-custom-invoice`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          invoiceDate: d.toISOString().slice(0,10),
          clientName: client.trim() || undefined,
          clientSiret: clientSiret.trim() || undefined,
          clientAddress: clientAddress.trim() || undefined,
          items: [{ description: label.trim() || 'Repas', quantity: repas, unitPrice: unit }],
          tvaRate,
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data.success) {
        toast.success(`✅ Facture ${invoiceNumber} imprimée`);
        onClose();
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      toast.error(e.message?.includes('fetch') ? '❌ Serveur impression hors ligne' : '❌ ' + e.message);
    } finally {
      setPrintingManual(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch {
      return '';
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'#000a', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="pos-glassy-panel" onClick={e=>e.stopPropagation()} style={{ width:540, maxWidth:'95%', background:S.panel, border:`1px solid ${S.border}`, borderRadius:14, padding:'20px 22px', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:17, fontWeight:800, color:S.accent }}>🧾 Factures Client</div>
          <button onClick={onClose} style={{ ...S.btn, padding:'3px 8px', fontSize:12 }}>✕</button>
        </div>

        {/* Tab Selection */}
        <div style={{ display:'flex', gap:6, background:'#111827', padding:4, borderRadius:8, marginBottom:16 }}>
          <button
            onClick={() => setActiveTab('recent')}
            style={{
              flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: activeTab === 'recent' ? S.accent : 'transparent',
              color: activeTab === 'recent' ? '#000' : S.muted,
              transition: 'all .1s'
            }}
          >
            📋 Commandes Récentes
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: activeTab === 'manual' ? S.accent : 'transparent',
              color: activeTab === 'manual' ? '#000' : S.muted,
              transition: 'all .1s'
            }}
          >
            ✏️ Créer Facture Libre
          </button>
        </div>

        {activeTab === 'recent' ? (
          /* Tab 1: Recent orders */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {isLoading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40, color:S.muted, fontSize:12 }}>⏳ Chargement des commandes...</div>
            ) : orders.length === 0 ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40, color:S.muted, fontSize:12 }}>Aucune commande trouvée</div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
                {orders.slice(0, 30).map((o: any) => (
                  <div
                    key={o.id}
                    style={{
                      background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: '8px 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: S.accent }}>#{o.order_number}</span>
                        <span style={{ fontSize: 10, color: S.muted }}>{formatDate(o.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 2, textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
                        {o.customer_name} · <span style={{ textTransform: 'capitalize', fontSize:10, color:S.muted }}>{o.payment_method}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{o.total?.toFixed(2)}€</span>
                      <button
                        disabled={printingOrder !== null}
                        onClick={() => printOrderInvoice(o.order_number)}
                        style={{
                          ...S.btn, padding: '5px 8px', fontSize: 12, cursor: printingOrder ? 'wait' : 'pointer',
                          borderColor: S.accent + '33', color: S.accent, background: printingOrder === o.order_number ? '#1f2937' : S.accent + '0a'
                        }}
                      >
                        {printingOrder === o.order_number ? '⏳' : '🖨️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Manual custom invoice */
          <div>
            <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Désignation</label>
            <input value={label} onChange={e=>setLabel(e.target.value)} style={{ ...S.input, margin:'4px 0 10px' }} />

            <div style={{ display:'flex', gap:10, marginBottom:10 }}>
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

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Client (Optionnel)</label>
                <input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nom / Société" style={{ ...S.input, marginTop:4 }} />
              </div>
              <div>
                <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>SIRET (Optionnel)</label>
                <input value={clientSiret} onChange={e=>setClientSiret(e.target.value)} placeholder="Siret du client" style={{ ...S.input, marginTop:4 }} />
              </div>
            </div>
            
            <label style={{ fontSize:11, color:S.muted, fontWeight:700 }}>Adresse (Optionnelle)</label>
            <input value={clientAddress} onChange={e=>setClientAddress(e.target.value)} placeholder="Adresse du client" style={{ ...S.input, margin:'4px 0 14px' }} />

            <div style={{ background:S.card, borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12, color:S.muted }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>Total HT</span><span style={{marginLeft:'auto'}}>{totalHT.toFixed(2)} €</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}><span>TVA {tvaRate}%</span><span style={{marginLeft:'auto'}}>{tvaAmt.toFixed(2)} €</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', color:S.accent, fontWeight:800, fontSize:14, marginTop:4, paddingTop:4, borderTop:`1px solid ${S.border}33` }}>
                <span>TOTAL TTC</span><span style={{marginLeft:'auto'}}>{totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ ...S.btn, flex:1, padding:'9px', fontWeight:700 }}>Annuler</button>
              <button onClick={printManualInvoice} disabled={printingManual} style={{
                flex:2, padding:'9px', borderRadius:8, border:'none', fontWeight:800, cursor:printingManual?'wait':'pointer',
                background: printingManual ? '#374151' : 'linear-gradient(135deg,#f59e0b,#ef4444)', color: printingManual?'#6b7280':'#000',
              }}>
                {printingManual ? '⏳ Impression...' : '🖨️ Imprimer la Facture'}
              </button>
            </div>
          </div>
        )}
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
function CaissePanel({ leftCollapsed, toggleLeft, cart, needsInfo, name, setName, phone, setPhone, address, setAddress, notes, setNotes, discount, setDiscount, payMethod, setPayMethod, pizzaPromo, pizzaSaving, discountAmt, ht, tva, total, submitting, handleSubmit, clearCart, setShowFacture, mapboxToken, incomingCall, setIncomingCall, handleLinkIncomingCall, orderType, handleOrderType }: any) {
  const { updateCartItem, removeFromCart, addToCart } = useOrder();
  
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Mapbox Geocoding Autocomplete
  useEffect(() => {
    if (!mapboxToken || !address.trim() || address.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    // Debounce geocoding requests to Mapbox (proximity set to Grand-Couronne: 1.0135, 49.3564)
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=fr&proximity=1.0135,49.3564&limit=5&types=address,poi,house&language=fr`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.features) {
          setAddressSuggestions(data.features);
        }
      } catch (e) {
        console.error('Error fetching address suggestions:', e);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address, mapboxToken]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.type === 'milkshake-custom') {
        addToCart(
          {
            id: 'milk-custom-' + Date.now(),
            name: 'Milkshake',
            price: data.unitPrice,
            category: 'milkshakes',
            description: 'Base vanille & Chantilly'
          },
          1,
          {
            toppings: data.toppings,
            garnitures: data.toppings,
            note: ''
          },
          data.totalPrice
        );
        toast.success('Milkshake personnalisé ajouté au panier ! 🥤');
      } else if (data.type === 'topping-raw') {
        const toppingName = data.name;
        const unitPrice = 5.00;
        addToCart(
          {
            id: 'milk-custom-' + Date.now(),
            name: 'Milkshake',
            price: unitPrice,
            category: 'milkshakes',
            description: 'Base vanille & Chantilly'
          },
          1,
          {
            toppings: [toppingName],
            garnitures: [toppingName],
            note: ''
          },
          unitPrice
        );
        toast.success(`Milkshake avec ${toppingName} ajouté au panier ! 🥤`);
      }
    } catch {
      const toppingName = dataStr;
      if (['Kinder Bueno', 'Oreo', "M&M's", 'Speculoos', 'Nutella', 'Daim'].includes(toppingName)) {
        const unitPrice = 5.00;
        addToCart(
          {
            id: 'milk-custom-' + Date.now(),
            name: 'Milkshake',
            price: unitPrice,
            category: 'milkshakes',
            description: 'Base vanille & Chantilly'
          },
          1,
          {
            toppings: [toppingName],
            garnitures: [toppingName],
            note: ''
          },
          unitPrice
        );
        toast.success(`Milkshake avec ${toppingName} ajouté au panier ! 🥤`);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="pos-glassy-panel"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: S.panel,
        border: isDragOver ? `2px dashed ${S.accent}` : 'none',
        boxShadow: isDragOver ? `0 0 20px rgba(245, 158, 11, 0.2)` : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header — compact */}
      <div style={{ padding:'7px 12px', borderBottom:`1px solid ${S.border}`, fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        {leftCollapsed && <button onClick={toggleLeft} style={{ ...S.btn, padding:'3px 7px', fontSize:13 }}>⟩</button>}
        🛒 Caisse
        {cart.length > 0 && <span style={{ background:S.accent, color:'#000', borderRadius:99, fontSize:10, fontWeight:800, padding:'1px 7px' }}>{cart.reduce((s:number,i:any)=>s+i.quantity,0)}</span>}
      </div>

      {/* Order Type Selector */}
      <div className={currentThemeMode === 'glassy' ? 'pos-segmented-container' : ''} style={{
        display: 'flex',
        padding: '8px 10px',
        gap: 6,
        background: currentThemeMode === 'glassy' ? 'transparent' : 'rgba(0,0,0,0.2)',
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        ...(currentThemeMode === 'glassy' ? { margin: '8px 10px' } : {})
      }}>
        {(['surplace','emporter','livraison'] as OrderType[]).map(t => {
          const active = orderType === t;
          
          // Vibrant colors for selected states
          const activeStyles: Record<OrderType, React.CSSProperties> = {
            surplace: { background: '#0a84ff', color: '#fff', boxShadow: '0 2px 8px rgba(10,132,255,0.4)' },
            emporter: { background: '#ff9f0a', color: '#fff', boxShadow: '0 2px 8px rgba(255,159,10,0.4)' },
            livraison: { background: '#30d158', color: '#fff', boxShadow: '0 2px 8px rgba(48,209,88,0.4)' }
          };

          const inactiveStyles: React.CSSProperties = {
            background: currentThemeMode === 'glassy' ? 'transparent' : '#1f2937',
            color: S.muted,
            border: currentThemeMode === 'glassy' ? 'none' : '1px solid rgba(255,255,255,0.05)'
          };

          return (
            <button
              key={t}
              onClick={() => handleOrderType(t)}
              className={`pos-btn-interactive ${currentThemeMode === 'glassy' ? 'pos-segmented-btn' : ''} ${currentThemeMode === 'glassy' && active ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 800,
                textAlign: 'center',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                ...(active ? activeStyles[t] : inactiveStyles)
              }}
            >
              <span style={{ fontSize: 13 }}>{t === 'surplace' ? '🍽️' : t === 'emporter' ? '🛍️' : '🛵'}</span>
              <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                {t === 'surplace' ? 'Sur Place' : t === 'emporter' ? 'Emporter' : 'Livraison'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Incoming Call Notification Card */}
      {incomingCall && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          borderBottom: `2.5px solid ${S.accent}`,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: S.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📞 APPEL ENTRANT DEPUIS LIGNE</span>
            <span style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%', display: 'inline-block' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
            {incomingCall.phone} {incomingCall.name ? `(${incomingCall.name})` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button
              onClick={() => handleLinkIncomingCall(incomingCall)}
              style={{
                background: S.accent, color: '#000', border: 'none', borderRadius: 6,
                padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', flex: 1
              }}
            >
              🚀 Lancer la commande
            </button>
            <button
              onClick={() => setIncomingCall(null)}
              style={{
                background: '#374151', color: S.muted, border: 'none', borderRadius: 6,
                padding: '6px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      {/* Client info — compact */}
      <div style={{ padding:'6px 12px', borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        {needsInfo && <input value={name} onChange={(e:any)=>setName(e.target.value)} placeholder="Nom *" style={{...S.input,marginBottom:4,padding:'4px 8px',fontSize:11}} />}
        <input value={phone} onChange={(e:any)=>setPhone(e.target.value)} placeholder="Téléphone" style={{...S.input,marginBottom:needsInfo?4:0,padding:'4px 8px',fontSize:11}} />
        {needsInfo && (
          <div style={{ position: 'relative' }}>
            <input
              value={address}
              onChange={(e:any)=>setAddress(e.target.value)}
              placeholder="Adresse *"
              style={{...S.input, marginBottom: 4, padding: '4px 8px', fontSize: 11}}
            />
            {addressSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: S.card,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                zIndex: 100,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                marginTop: -2
              }}>
                {addressSuggestions.map((feat: any) => (
                  <button
                    key={feat.id}
                    onClick={() => {
                      setAddress(feat.place_name);
                      setAddressSuggestions([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      borderBottom: `1px solid ${S.border}`,
                      color: S.text,
                      fontSize: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1f2937'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontWeight: 700 }}>{feat.text}</span>
                    <span style={{ color: S.muted, fontSize: 9 }}>{feat.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
        {/* Vider */}
        <div style={{ display:'flex', gap:4, marginTop:5 }}>
          <button onClick={()=>{clearCart();setDiscount(0);}} style={{ flex:1, padding:'6px', borderRadius:7, border:`1px solid ${S.border}`, background:'none', color:S.muted, cursor:'pointer', fontSize:10 }}>
            🗑️ Vider le panier
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppModal({ status, qr, onClose }: { status: string; qr: string | null; onClose: () => void }) {
  const [sendingReviews, setSendingReviews] = useState(false);

  const handleSendPastReviews = async () => {
    setSendingReviews(true);
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', '2026-07-22T00:00:00Z')
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        toast.info('Aucune commande récente trouvée.');
        setSendingReviews(false);
        return;
      }

      const clientsMap = new Map();
      orders.forEach((o: any) => {
        if (!o.customer_phone) return;
        const clean = o.customer_phone.replace(/[^0-9]/g, '');
        if (clean.length < 9) return;
        if (!clientsMap.has(clean)) {
          clientsMap.set(clean, { phone: o.customer_phone, name: o.customer_name, order: o });
        }
      });

      const targets = Array.from(clientsMap.values());
      let sentCount = 0;

      const reviewLink = 'https://g.page/r/CXpZZnzoTBFREBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr';

      for (const target of targets) {
        const rawName = (target.name || '').trim();
        const firstName = (!rawName || rawName.startsWith('[POS]')) ? '' : rawName.split(/\s+/)[0];
        const hello = firstName ? ` ${firstName}` : '';

        let msg = `Bonjour${hello} ! 😊\n\n`;
        msg += `Merci d'être venu(e) chez *Twin Pizza* récemment ! 🍕\n\n`;
        msg += `Votre avis compte énormément pour notre équipe. Si vous avez apprécié votre repas, pourriez-vous nous laisser une note ou un petit mot ⭐ ?\n\n`;
        msg += `👉 *Donner mon avis* : ${reviewLink}\n\n`;
        msg += `Un grand merci pour votre soutien ! 🙏 *Twin Pizza*`;

        if (typeof window !== 'undefined' && (window as any).twinHub) {
          try {
            await (window as any).twinHub.sendWhatsApp(target.phone, msg);
            sentCount++;
          } catch (e) {
            console.error('WhatsApp send error for', target.phone, e);
          }
        }
      }

      toast.success(`✅ Message d'avis envoyé à ${sentCount} client(s) !`);
    } catch (e: any) {
      toast.error('Erreur lors de l\'envoi des avis: ' + e.message);
    } finally {
      setSendingReviews(false);
    }
  };

  const isConnected = status === 'connected';
  const isQr = status === 'qr' || !!qr;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #334155', width: '90vw', maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, color: '#f8fafc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#25D366', display: 'flex', alignItems: 'center', gap: 8 }}>
            💬 Connexion WhatsApp Web
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 10, background: isConnected ? 'rgba(34,197,94,0.1)' : (isQr ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)'), border: `1px solid ${isConnected ? '#22c55e44' : (isQr ? '#f9731644' : '#ef444444')}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: isConnected ? '#22c55e' : (isQr ? '#f97316' : '#ef4444') }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: isConnected ? '#22c55e' : (isQr ? '#f97316' : '#f87171') }}>
              {isConnected ? '🟢 WhatsApp Connecté' : (isQr ? '📱 Scannez le QR Code' : '🔴 Déconnecté')}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {isConnected ? 'Les confirmations et avis sont envoyés en direct aux clients.' : 'Scannez le QR code ci-dessous avec WhatsApp pour connecter le bot.'}
            </div>
          </div>
        </div>

        {isQr && qr && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, background: '#fff', borderRadius: 12 }}>
            <img src={qr} alt="WhatsApp QR Code" style={{ width: 220, height: 220 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', textAlign: 'center' }}>
              Ouvrez WhatsApp sur téléphone ➔ Réglages / Appareils connectés ➔ Connecter un appareil
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <button
            onClick={handleSendPastReviews}
            disabled={sendingReviews || !isConnected}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: isConnected ? 'linear-gradient(135deg, #25D366, #128C7E)' : '#334155',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              border: 'none',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              opacity: (sendingReviews || !isConnected) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {sendingReviews ? '⏳ Envoi des avis en cours...' : '⭐ Envoyer l\'Avis Google aux 11 Clients du 22 au 25 Juillet'}
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
  const { getImageOrEmoji, getDisplayName } = useCategoryImages();
  const createOrder = useCreateOrder();

  // ── Pre-fetch queries on boot to eliminate category/wizard loading delays ──
  usePizzasByBase('tomate');
  usePizzasByBase('creme');
  useMeatOptions();
  useSauceOptions();
  useSupplementOptions();
  useGarnitureOptions();
  useCruditesOptions();
  useSandwichTypes();

  const [orderType,  setOrderType]  = useState<OrderType>('surplace');
  const [payMethod,  setPayMethod]  = useState<PayMethod>('especes');
  const [activeCategory, setActiveCat] = useState<string | null>('pizzas');
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
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [showWaModal, setShowWaModal] = useState<boolean>(false);
  const { toggleKeyboard } = useVirtualKeyboard();
  const [printingIngredientsPOS, setPrintingIngredientsPOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).twinHub) {
      const hub = (window as any).twinHub;
      hub.getWhatsAppStatus?.().then((res: any) => {
        if (typeof res === 'string') setWaStatus(res);
        else if (res?.status) setWaStatus(res.status);
        if (res?.qr) setWaQr(res.qr);
      }).catch(() => {});

      hub.onWhatsAppStatus?.((data: any) => {
        const statusStr = typeof data === 'string' ? data : data?.status;
        if (statusStr) setWaStatus(statusStr);
        if (data?.qr) setWaQr(data.qr);
      });

      hub.onWhatsAppQR?.((qr: string) => {
        setWaQr(qr);
        setWaStatus('qr');
      });
    }
  }, []);

  const handlePrintIngredientLabelsPOS = async () => {
    setPrintingIngredientsPOS(true);
    const INGREDIENT_LABELS = [
      'Salade', 'Tomate', 'Oignon', 'Sauce Tomate',
      'Crème Fraîche', 'Merguez', 'Poivrons', 'Jambon',
      'Olives', 'Champignon', 'Lardons', 'Pommes de Terre',
    ];
    try {
      const now = new Date();
      const dlcDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const dlcStr = dlcDate.toLocaleDateString('fr-FR') + ' ' + dlcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      let printSuccess = false;
      for (const name of INGREDIENT_LABELS) {
        const ok = await printDateLabel({
          productName: name,
          madeDate: dateStr,
          useByDate: dlcStr,
          actionType: 'fait',
          operator: 'Staff POS',
          copies: 1,
        });
        if (ok) printSuccess = true;
      }

      if (!printSuccess) {
        const labelsHtml = INGREDIENT_LABELS.map(name => `
          <div style="padding:4mm 2mm;margin-bottom:4mm;border-bottom:2px dashed #000;text-align:center;">
            <div style="font-weight:bold;font-size:16px;">TWIN PIZZA</div>
            <div style="border-bottom:1.5px dashed #000;margin:6px 0;"></div>
            <div style="font-size:22px;font-weight:bold;margin:6px 0;">${name}</div>
            <div style="border-bottom:1.5px dashed #000;margin:6px 0;"></div>
            <div style="font-size:14px;font-weight:bold;text-align:left;">Préparé le: ${dateStr}</div>
            <div style="font-size:17px;font-weight:bold;border:2px solid #000;padding:4px;margin:6px 0;">À CONSOMMER AVANT LE:<br/>${dlcStr}</div>
            <div style="font-size:11px;font-weight:bold;">NE PAS DÉPASSER 3 JOURS</div>
            <div style="font-size:11px;margin-top:4px;">Par: Staff POS</div>
          </div>
        `).join('');

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`<!DOCTYPE html><html><head><title>Étiquettes Ingrédients</title><style>@page{size:80mm auto;margin:0;}@media print{body{width:80mm;margin:0;}*{print-color-adjust:exact !important;}}body{font-family:'Courier New',monospace;width:80mm;padding:2mm;color:#000;}</style></head><body>${labelsHtml}</body></html>`);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => iframe.remove(), 4000);
          }, 300);
        }
        toast.info(`🖨️ ${INGREDIENT_LABELS.length} étiquettes ouvertes dans le navigateur`);
      } else {
        toast.success(`✅ ${INGREDIENT_LABELS.length} étiquettes envoyées à l'imprimante !`);
      }
    } catch {
      toast.error('Erreur impression étiquettes');
    } finally {
      setPrintingIngredientsPOS(false);
    }
  };
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [quickUpdating, setQuickUpdating] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [customizingPizza, setCustomizingPizza] = useState<any | null>(null);
  const [pizzaSize, setPizzaSize] = useState<PizzaSizeId>('senior');
  const [pizzaZoom, setPizzaZoom] = useState(() => {
    try {
      return Number(localStorage.getItem('pos-pizza-zoom')) || 125;
    } catch {
      return 125;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pos-pizza-zoom', String(pizzaZoom));
    } catch {}
  }, [pizzaZoom]);
  const [mapboxToken, setMapboxToken] = useState('');
  const [incomingCall, setIncomingCall] = useState<{ phone: string; name: string | null } | null>(null);
  // ── Auto-reset collapsed layout if saved layout in localStorage collapsed the left panel ──
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('pos-layout-h');
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout);
        if (Array.isArray(parsed) && (parsed[0] < 20 || parsed.length < 2)) {
          localStorage.removeItem('pos-layout-h');
        }
      }
    } catch {}
  }, []);

  const leftRef = useRef<ImperativePanelHandle>(null);

  const toggleLeft = () => {
    const p = leftRef.current;
    if (!p) return;
    if (p.isCollapsed() || p.getSize() < 30) { p.resize(70); setLeftCollapsed(false); }
    else { p.resize(35); }
  };

  const needsInfo = orderType === 'livraison';

  // ── Startup recovery: flush any orders saved offline during previous session ──
  useEffect(() => {
    const flushPendingOrders = async () => {
      try {
        const raw = localStorage.getItem('pos-pending-orders');
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!Array.isArray(pending) || pending.length === 0) return;
        console.log(`[POS] Flushing ${pending.length} pending order(s) from offline queue...`);
        for (const order of pending) {
          try {
            const { _savedAt, ...payload } = order;
            const { error } = await (supabase as any).from('orders').insert(payload, { returning: 'minimal' });
            if (!error) {
              const updated = JSON.parse(localStorage.getItem('pos-pending-orders') || '[]')
                .filter((o: any) => o.order_number !== payload.order_number);
              localStorage.setItem('pos-pending-orders', JSON.stringify(updated));
            }
          } catch { /* will retry on next boot or via retryOrderToSupabase */ }
        }
      } catch { /* localStorage may be unavailable */ }
    };
    // Delay slightly to not compete with initial render
    const t = setTimeout(flushPendingOrders, 2000);
    return () => clearTimeout(t);
  }, []);

  // Fetch Mapbox token for autocomplete

  useEffect(() => {
    async function fetchToken() {
      const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';
      if (envToken && envToken.length > 20) {
        setMapboxToken(envToken);
        return;
      }
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) setMapboxToken(data.token);
      } catch (e) {
        console.error('Error fetching Mapbox token in POS:', e);
      }
    }
    fetchToken();
  }, []);

  // Listen to incoming calls in realtime via voice_calls table
  useEffect(() => {
    const channel = supabase
      .channel('voice-calls-pos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_calls' }, (payload) => {
        const newCall = payload.new;
        if (newCall && (newCall.status === 'ringing' || newCall.status === 'active') && newCall.phone_number) {
          setIncomingCall({ phone: newCall.phone_number, name: newCall.customer_name });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voice_calls' }, (payload) => {
        const updatedCall = payload.new;
        if (updatedCall && (updatedCall.status === 'ringing' || updatedCall.status === 'active') && updatedCall.phone_number) {
          setIncomingCall({ phone: updatedCall.phone_number, name: updatedCall.customer_name });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen to incoming calls from local Freebox (Electron process)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'twinHub' in window && (window as any).twinHub.onFreeboxCall) {
      const cleanup = (window as any).twinHub.onFreeboxCall((data: any) => {
        if (data && data.phone) {
          setIncomingCall({ phone: data.phone, name: data.name || null });
        }
      });
      return cleanup;
    }
  }, []);

  // Find customer by phone in previous orders and pre-fill details
  const searchClientByPhone = async (phoneNumber: string) => {
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone.length < 8) return;

    // Generate alternate format for French numbers (e.g. 0612345678 <-> +33612345678)
    let alternatePhone = cleanPhone;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      alternatePhone = '+33' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+33') && cleanPhone.length === 12) {
      alternatePhone = '0' + cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('0033') && cleanPhone.length === 13) {
      alternatePhone = '0' + cleanPhone.substring(4);
    }

    try {
      const query = supabase
        .from('orders')
        .select('customer_name, customer_address, customer_notes')
        .order('created_at', { ascending: false })
        .limit(1);

      if (alternatePhone !== cleanPhone) {
        query.or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${alternatePhone}`);
      } else {
        query.eq('customer_phone', cleanPhone);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const lastOrder = data[0];
        if (lastOrder.customer_name && !name) {
          setName(lastOrder.customer_name);
        }
        if (lastOrder.customer_address && !address) {
          setAddress(lastOrder.customer_address);
        }
        if (lastOrder.customer_notes && !notes) {
          setNotes(lastOrder.customer_notes);
        }
        toast.success(`Client trouvé : ${lastOrder.customer_name || cleanPhone}`, { duration: 4000 });
      } else {
        toast.info(`Nouveau client ou historique indisponible`, { duration: 3000 });
      }
    } catch (err) {
      console.error('Error finding client by phone:', err);
    }
  };

  // Trigger search when phone number is fully entered (10 digits)
  useEffect(() => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length === 10) {
      searchClientByPhone(cleanPhone);
    }
  }, [phone]);

  const handleLinkIncomingCall = (incoming: { phone: string; name: string | null }) => {
    setPhone(incoming.phone);
    if (incoming.name) setName(incoming.name);
    setIncomingCall(null);
    toast.success(`📞 Numéro ${incoming.phone} lié à la caisse`);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'twinHub' in window) {
      (window as any).twinHub.checkForUpdates().then((res: any) => {
        if (res && res.success && res.updateAvailable) {
          setUpdateAvailable(true);
        }
      }).catch((e: any) => console.error('Auto update check failed:', e));
    }
  }, []);

  // Quick one-tap update: triggers git pull + build + relaunch instantly
  const quickUpdate = async () => {
    if (typeof window === 'undefined' || !('twinHub' in window)) return;
    if (quickUpdating) return;
    setQuickUpdating(true);
    setUpdateAvailable(false);
    toast.info('🔄 Mise à jour en cours...');
    // Listen for progress toasts
    const cleanup = (window as any).twinHub.onUpdateStatus((data: any) => {
      if (data.status === 'progress') toast.info(`⏳ ${data.message}`);
      else if (data.status === 'error') { toast.error(`❌ ${data.message}`); setQuickUpdating(false); }
    });
    try {
      const res = await (window as any).twinHub.triggerUpdate();
      if (!res.success) { toast.error(res.error || 'Mise à jour échouée'); setQuickUpdating(false); }
    } catch (e: any) { toast.error(e.message || 'Erreur'); setQuickUpdating(false); }
    if (typeof cleanup === 'function') cleanup();
  };

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
  const handleAdd = (item: any, customization: any, calculatedPrice: number, quantity = 1) => {
    addToCart(item, quantity, customization, calculatedPrice);
    // No toast on add — the cart on the right already shows it instantly
  };

  // Render the active category's inline panel
  const renderPanel = () => {
    if (!activeCategory) return (
      <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24, color: S.text }}>
        <div style={{ fontSize:40 }}>🍕</div>
        <div style={{ fontSize:16, fontWeight:800, color: S.accent }}>Veuillez choisir une catégorie ci-dessus</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:600 }}>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.slug)}
              style={{ padding:'8px 16px', borderRadius:10, background:'#1e293b', border:`1px solid ${S.border}`, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13 }}
            >
              {CAT_ICON[c.slug] || '🍽️'} {c.name}
            </button>
          ))}
        </div>
      </div>
    );
    if (activeCategory === 'pizzas') return (
      <PizzaPanel
        orderType={orderType}
        onAdd={handleAdd}
        size={pizzaSize}
        setSize={setPizzaSize}
        zoom={pizzaZoom}
        setZoom={setPizzaZoom}
        onCustomize={(pizza, base) => {
          setCustomizingPizza({
            item: pizza,
            basePrice: PIZZA_SIZES.find(s => s.id === pizzaSize)!.price,
            formatLabel: PIZZA_SIZES.find(s => s.id === pizzaSize)!.label,
            size: pizzaSize,
            initialBase: base
          });
        }}
      />
    );
    // Build-it wizards (meat → size): Soufflet, Makloub, Mlawi, Tacos, Panini
    if (WIZARD_MAP[activeCategory]) return <WizardPanel categorySlug={activeCategory} onAdd={handleAdd} />;
    // Sandwich: pick sandwich → sauce + crudités (no meat)
    if (activeCategory === 'sandwiches') return <SandwichPanel onAdd={handleAdd} />;
    // Tex-Mex: dedicated panel with Snacks/Frites/Croques sections
    if (activeCategory === 'texmex')   return <TexMexPanel  onAdd={handleAdd} />;
    // Boissons: canette/bouteille avec note + quantité
    if (activeCategory === 'boissons') return <BoissonPanel onAdd={handleAdd} />;
    // Milkshakes customizable panel
    if (activeCategory === 'milkshakes') return <MilkshakePanel onAdd={handleAdd} />;
    // Product-based customizable (Croques): pick product then customize
    const CUSTOMIZABLE = ['croques'];
    if (CUSTOMIZABLE.includes(activeCategory)) return <CustomizablePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
    return <SimplePanel categorySlug={activeCategory} title={activeCategory} onAdd={handleAdd} />;
  };

  // ── Optimistic order queue ────────────────────────────────────────────────
  // Orders are committed to localStorage instantly so the UI never blocks.
  // A background loop retries failed Supabase writes indefinitely.
  const retryOrderToSupabase = async (payload: any, attempt = 1): Promise<void> => {
    try {
      const { error } = await (supabase as any)
        .from('orders')
        .insert(payload, { returning: 'minimal' });
      if (error) throw error;
      // Sync: remove from pending queue
      try {
        const pending = JSON.parse(localStorage.getItem('pos-pending-orders') || '[]');
        const updated = pending.filter((o: any) => o.order_number !== payload.order_number);
        localStorage.setItem('pos-pending-orders', JSON.stringify(updated));
      } catch {}
    } catch {
      // Exponential backoff: 1s, 2s, 4s … capped at 30s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      setTimeout(() => retryOrderToSupabase(payload, attempt + 1), delay);
    }
  };

  const handleSubmit = async () => {
    if (!cart.length) { toast.error('Panier vide'); return; }
    if (needsInfo && !name.trim()) { toast.error('Nom requis'); return; }
    if (needsInfo && !address.trim()) { toast.error('Adresse requise'); return; }
    setSubmitting(true);
    try {
      const orderNumber = await generateOrderNumber();
      const { ht: fHt, tva: fTva } = calculateTVA(total);
      const payload = {
        order_number: orderNumber, order_type: orderType, items: cart as any,
        customer_name:    needsInfo ? name.trim() : `[POS] ${TYPE_LABELS[orderType]}`,
        customer_phone:   phone.trim() || 'pos',
        customer_address: needsInfo ? address.trim() : null,
        customer_notes:   notes.trim() || null,
        payment_method:   payMethod as any,
        subtotal: fHt, tva: fTva, total, delivery_fee: 0,
        status: 'pending', is_scheduled: false, scheduled_for: null,
      };

      // 1. Persist to localStorage immediately (offline safety net)
      try {
        const pending = JSON.parse(localStorage.getItem('pos-pending-orders') || '[]');
        pending.push({ ...payload, _savedAt: Date.now() });
        localStorage.setItem('pos-pending-orders', JSON.stringify(pending));
      } catch {}

      // 2. Show success to cashier instantly — no waiting
      toast.success(`✅ Commande #${orderNumber}`);
      setLastOrder(orderNumber);
      clearCart(); setName(''); setPhone(''); setAddress(''); setNotes(''); setDiscount(0);

      // 3. Fire print — completely async, never blocks order flow
      fetch(`${PRINT_SERVER}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, order: payload }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => { /* print server offline — silent, order already saved */ });

      // 4. Persist to Supabase in background with unlimited retries
      retryOrderToSupabase(payload);

    } catch (e: any) {
      // Only generateOrderNumber() can throw here (very rare)
      // Still try to save with a timestamp fallback number
      toast.error('⚠️ Commande enregistrée localement — synchronisation en cours');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh', overflow:'hidden', background: currentThemeMode === 'glassy' ? '#090d16' : S.bg }}>
      {currentThemeMode === 'glassy' && (
        <div className="pos-glass-bg">
          <div className="pos-glass-bg-blob blob-1"></div>
          <div className="pos-glass-bg-blob blob-2"></div>
          <div className="pos-glass-bg-blob blob-3"></div>
          <div className="pos-glass-bg-blob blob-4"></div>
        </div>
      )}
      <PanelGroup
        direction="horizontal"
        autoSaveId="pos-layout-h"
        className={`pos-root ${currentThemeMode === 'glassy' ? 'pos-theme-apple' : ''}`}
        style={{ height:'100%', background:'transparent', color:S.text }}
      >
      {/* Hide scrollbars (touch screen) — swipe still works */}
      <style>{`
        .pos-root *::-webkit-scrollbar { width:0 !important; height:0 !important; display:none !important; }
        .pos-root * { scrollbar-width:none !important; -ms-overflow-style:none !important; }
      `}</style>

      {/* ── LEFT (resizable) ── */}
      <Panel ref={leftRef} defaultSize={70} minSize={30}
        onCollapse={()=>setLeftCollapsed(true)} onExpand={()=>setLeftCollapsed(false)}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, overflow:'hidden' }}>

        {/* ── Top Header Bar: Logo + System Buttons + Last Order ── */}
        <div className="pos-glassy-panel" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          background: S.panel,
          borderBottom: `1px solid ${S.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: S.accent }}>TWIN PIZZA</span>

          {lastOrder && (
            <span style={{ background:'#22c55e11', color:'#22c55e', border:'1px solid #22c55e33', padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:700 }}>
              ✅ #{lastOrder}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button title="Éditer le menu en direct" onClick={() => setShowQuickEdit(true)} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:11, fontWeight:800, color:'#38bdf8', borderColor:'#38bdf833', background:'#38bdf811', display:'flex', alignItems:'center', gap:3 }}>
            ✏️ Éditer Menu
          </button>
          <button
            title={waStatus === 'connected' ? 'WhatsApp Connecté (cliquez pour détails)' : 'WhatsApp Déconnecté / QR Code (cliquez pour scanner)'}
            onClick={() => setShowWaModal(true)}
            className="pos-btn-interactive"
            style={{
              ...S.btn,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 800,
              color: waStatus === 'connected' ? '#22c55e' : (waStatus === 'qr' ? '#f97316' : '#ef4444'),
              borderColor: waStatus === 'connected' ? '#22c55e44' : (waStatus === 'qr' ? '#f9731644' : '#ef444444'),
              background: waStatus === 'connected' ? '#22c55e11' : (waStatus === 'qr' ? '#f9731611' : '#ef444411'),
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            {waStatus === 'connected' ? '🟢 WhatsApp' : (waStatus === 'qr' ? '📱 Scan QR WA' : '💬 WhatsApp Off')}
          </button>
          <button title="Imprimer directement les 12 étiquettes d'ingrédients" onClick={handlePrintIngredientLabelsPOS} disabled={printingIngredientsPOS} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:11, fontWeight:800, color:'#22c55e', borderColor:'#22c55e33', background:'#22c55e11', display:'flex', alignItems:'center', gap:3 }}>
            🏷️ 12 Étiquettes
          </button>
          <button title="Ouvrir le clavier virtuel tactile" onClick={toggleKeyboard} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:11, fontWeight:800, color:'#f59e0b', borderColor:'#f59e0b33', background:'#f59e0b11', display:'flex', alignItems:'center', gap:3 }}>
            ⌨️ Clavier
          </button>
          <button title="Historique & Statistiques" onClick={() => setShowHistory(true)} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:11, fontWeight:800, color:S.accent, borderColor:S.accent+'33', background:S.accent+'11', display:'flex', alignItems:'center', gap:3 }}>
            📊 Stats
          </button>
          <button title="Factures" onClick={() => setShowFacture(true)} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:12 }}>🧾</button>
          {typeof window !== 'undefined' && 'twinHub' in window && (
            <button
              title="Clic = MAJ rapide · Clic droit = détails"
              onClick={quickUpdate}
              onContextMenu={(e) => { e.preventDefault(); setShowUpdateModal(true); setUpdateAvailable(false); }}
              disabled={quickUpdating}
              className="pos-btn-interactive"
              style={{
                ...S.btn, padding:'4px 8px', fontSize:12, position:'relative',
                border: updateAvailable ? `1px solid ${S.accent}` : S.btn.border,
                opacity: quickUpdating ? 0.5 : 1,
                animation: quickUpdating ? 'spin 1s linear infinite' : 'none',
              }}
            >
              🔄
              {updateAvailable && <span style={{ position:'absolute', top:-2, right:-2, background:'#ef4444', width:6, height:6, borderRadius:'50%', border:'1px solid #111827' }} />}
            </button>
          )}
          <button title="Personnaliser" onClick={()=>setShowSettings(true)} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:12 }}>⚙️</button>
          <button title="Replier" onClick={toggleLeft} className="pos-btn-interactive" style={{ ...S.btn, padding:'4px 8px', fontSize:12 }}>⟨</button>
        </div>

        {/* ── Horizontal Category Bar with Images ── */}
        <div className="pos-glassy-panel" style={{
          display: 'flex',
          padding: '6px 8px',
          gap: 4,
          background: S.panel,
          borderBottom: `1px solid ${S.border}`,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {categories.filter(cat => cat.slug !== 'salades').map(cat => {
            const active = activeCategory === cat.slug;
            const imgData = getImageOrEmoji(cat.slug);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(active ? null : cat.slug)}
                className={`pos-btn-interactive ${active ? 'pos-cat-top-active' : ''}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '4px 2px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all .15s cubic-bezier(0.16, 1, 0.3, 1)',
                  background: active ? S.accent + '22' : 'transparent',
                  outline: active ? `2px solid ${S.accent}` : '2px solid transparent',
                  outlineOffset: -1,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? S.accent + '15' : (S.card || '#1f2937'),
                  flexShrink: 0,
                  border: `1px solid ${active ? S.accent + '44' : S.border}`,
                }}>
                  {imgData.type === 'image'
                    ? <img
                        src={imgData.value}
                        alt={cat.name}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        loading="eager"
                        onError={(e) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const fallbackEmoji = (cat as any).emoji_fallback || '📦';
                            parent.innerHTML = `<span style="font-size:18px">${fallbackEmoji}</span>`;
                          }
                        }}
                      />
                    : <span style={{ fontSize: 18 }}>{imgData.value}</span>
                  }
                </div>
                <span style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: active ? S.accent : '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  lineHeight: 1.2,
                }}>{getDisplayName(cat.slug) || cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Products area — takes all remaining space */}
        <div className="pos-glassy-panel" style={{ flex:1, minHeight:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
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
        mapboxToken={mapboxToken}
        incomingCall={incomingCall}
        setIncomingCall={setIncomingCall}
        handleLinkIncomingCall={handleLinkIncomingCall}
        orderType={orderType}
        handleOrderType={handleOrderType}
      />
      </Panel>

      {/* ── Overlays ── */}
      {showQuickEdit && <POSEditModal onClose={() => setShowQuickEdit(false)} />}
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)} />}
      {showHistory && <HistoryPanel onClose={()=>setShowHistory(false)} />}
      {showFacture && <FactureHubModal onClose={()=>setShowFacture(false)} />}
      {showUpdateModal && <UpdatePanel onClose={()=>setShowUpdateModal(false)} />}
      {showWaModal && <WhatsAppModal status={waStatus} qr={waQr} onClose={() => setShowWaModal(false)} />}
      {customizingPizza && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
          onClick={() => setCustomizingPizza(null)}
        >
          <div
            style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #334155', width: '95vw', maxWidth: 850, maxHeight: '92vh', height: 'auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <PizzaIngredientCustomizer
              pizza={customizingPizza.item}
              basePrice={customizingPizza.basePrice}
              formatLabel={customizingPizza.formatLabel}
              initialBase={customizingPizza.initialBase}
              onConfirm={(removedIngredients, addedExtras, note, base) => {
                const sizeLabel = customizingPizza.formatLabel;
                const extrasTotal = addedExtras.reduce((sum, e) => sum + e.price, 0);
                const totalPrice = customizingPizza.basePrice + extrasTotal;
                
                handleAdd(
                  { id: customizingPizza.item.id, name: customizingPizza.item.name, price: customizingPizza.basePrice, category: 'pizzas', description: '' },
                  {
                    size: customizingPizza.size,
                    sizeLabel,
                    base,
                    removedIngredients,
                    addedExtras: addedExtras.map(e => e.name),
                    supplements: addedExtras.map(e => e.name),
                    note,
                    isMenuMidi: customizingPizza.size === 'menu_midi' || customizingPizza.size === 'menu_midi_mega'
                  },
                  totalPrice
                );
                setCustomizingPizza(null);
              }}
              onBack={() => setCustomizingPizza(null)}
            />
          </div>
        </div>
      )}
    </PanelGroup>
    </div>
  );
}

export default function POSPage() {
  return <OrderProvider><POSContent /></OrderProvider>;
}
