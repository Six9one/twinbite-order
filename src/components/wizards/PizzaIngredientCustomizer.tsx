import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { MenuItem } from '@/types/order';
import { pizzaIngredientSupplements } from '@/data/menu';
import { Button } from '@/components/ui/button';
import { X, Plus, Check, Pizza } from 'lucide-react';
import { resolveImg } from '@/utils/resolveImg';
import {
  useSupplementOptions,
  useMeatOptions,
  useGarnitureOptions,
  useCruditesOptions,
  useSauceOptions
} from '@/hooks/useCustomizationOptions';

export interface PizzaExtra {
  id: string;
  name: string;
  price: number;
}

interface PizzaIngredientCustomizerProps {
  pizza: MenuItem;
  basePrice: number;
  formatLabel: string;
  initialBase?: 'tomate' | 'creme';
  onConfirm: (removedIngredients: string[], addedExtras: PizzaExtra[], note: string, base: 'tomate' | 'creme') => void;
  onBack: () => void;
  isKiosk?: boolean;
}

const LOCAL_PIZZA_IMAGES: Record<string, string> = {
  'margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80',
  'végétarienne': 'https://images.unsplash.com/photo-1571066811602-71683a3f680d?w=200&q=80',
  'fruits de mer': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80',
  'mexicaine': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&q=80',
  '4 saisons': 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=200&q=80',
  'reine': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80',
  'orientale': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80',
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

const SUPPLEMENT_FALLBACKS: Record<string, string> = {
  "pi-fromage": "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=120&q=80",
  "pi-viande": "https://images.unsplash.com/photo-1544025162-d76694265947?w=120&q=80",
  "pi-sauce": "/icons/sauce.png",
  "pi-champignons": "/icons/mushroom.png",
  "pi-olives": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=120&q=80",
  "pi-poivrons": "https://images.unsplash.com/photo-1566822268153-f72535099c27?w=120&q=80",
  "pi-oignons": "/icons/onion.png",
  "pi-oeuf": "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=120&q=80",
  "pi-mozzarella": "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=120&q=80",
  "pi-jambon": "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=120&q=80",
  "pi-lardons": "https://images.unsplash.com/photo-1606851094655-b2593a9af63f?w=120&q=80",
  "pi-merguez": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=120&q=80",
  "pi-poulet": "https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=120&q=80",
  "pi-chorizo": "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=120&q=80",
  "pi-thon": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=120&q=80",
  "pi-chevre": "https://images.unsplash.com/photo-1596450514966-a12da7fb104b?w=120&q=80"
};

const SupplementTile = memo(function SupplementTile({
  extra,
  selected,
  onClick,
  imageUrl
}: {
  extra: any;
  selected: boolean;
  onClick: (extra: any) => void;
  imageUrl?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  return (
    <button
      type="button"
      onClick={() => onClick(extra)}
      className={`relative select-none p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-between min-h-[90px] gap-1 ${
        selected
          ? 'border-amber-500 bg-amber-500/25 text-white ring-2 ring-amber-500/40 shadow-md'
          : 'border-slate-800 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-slate-950 border border-slate-700/60 shrink-0 shadow-inner">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={extra.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-lg">{extra.emoji || '🍕'}</span>
        )}
      </div>
      <span className="text-[11px] font-bold text-center leading-snug line-clamp-2 w-full text-white px-0.5 my-auto">
        {extra.name}
      </span>
      <span className="text-[11px] font-black text-amber-400 shrink-0 bg-slate-950/80 px-2 py-0.5 rounded-full border border-amber-500/20">
        +{extra.price.toFixed(2)}€
      </span>
      {selected && (
        <div className="absolute top-1 right-1 bg-amber-500 rounded-full p-0.5 shadow-md">
          <Check className="w-3 h-3 text-slate-950 font-extrabold" />
        </div>
      )}
    </button>
  );
});

function findDbImage(name: string, dbImageMap: Record<string, string>): string | undefined {
  const norm = name.trim().toLowerCase();
  if (dbImageMap[norm]) return dbImageMap[norm];

  const clean = norm
    .replace('extra', '')
    .replace('supplémentaire', '')
    .replace('supplément', '')
    .trim();

  if (dbImageMap[clean]) return dbImageMap[clean];

  const plural = clean + 's';
  if (dbImageMap[plural]) return dbImageMap[plural];

  const singular = clean.endsWith('s') ? clean.slice(0, -1) : clean;
  if (dbImageMap[singular]) return dbImageMap[singular];

  if (clean === 'œuf' && dbImageMap['oeuf']) return dbImageMap['oeuf'];
  if (clean === 'oeuf' && dbImageMap['œuf']) return dbImageMap['œuf'];

  for (const key of Object.keys(dbImageMap)) {
    if (key.includes(clean) || clean.includes(key)) {
      return dbImageMap[key];
    }
  }

  return undefined;
}

function parseIngredients(description: string): string[] {
  return description
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function PizzaIngredientCustomizer({
  pizza,
  basePrice,
  formatLabel,
  initialBase,
  onConfirm,
  onBack,
  isKiosk = false,
}: PizzaIngredientCustomizerProps) {
  const ingredients = parseIngredients(pizza.description || '');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<PizzaExtra[]>([]);
  const [note, setNote] = useState('');
  const [selectedBase, setSelectedBase] = useState<'tomate' | 'creme'>(initialBase || 'tomate');

  const { data: dbSupps = [] } = useSupplementOptions();
  const { data: dbMeats = [] } = useMeatOptions();
  const { data: dbGarn = [] } = useGarnitureOptions();
  const { data: dbCrud = [] } = useCruditesOptions();
  const { data: dbSauces = [] } = useSauceOptions();

  const dbImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    [...dbSupps, ...dbMeats, ...dbGarn, ...dbCrud, ...dbSauces].forEach(opt => {
      if (opt.name && opt.image_url) {
        map[opt.name.trim().toLowerCase()] = opt.image_url;
      }
    });
    return map;
  }, [dbSupps, dbMeats, dbGarn, dbCrud, dbSauces]);

  const toggleIngredient = useCallback((ingredient: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  }, []);

  const toggleExtra = useCallback((extra: typeof pizzaIngredientSupplements[0]) => {
    setAddedExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, { id: extra.id, name: extra.name, price: extra.price }];
    });
  }, []);

  const extrasTotal = addedExtras.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = basePrice + extrasTotal;

  const isExtraSelected = (id: string) => addedExtras.some(e => e.id === id);
  const isIngredientRemoved = (ing: string) => removedIngredients.includes(ing);

  return (
    <div className="flex flex-col h-full max-h-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* ── HEADER: Clear High Contrast Title & Close Button ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">🍕</span>
          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-white truncate tracking-wide">
              {pizza.name}
            </h1>
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold flex-shrink-0">
              {formatLabel}
            </span>
          </div>
        </div>

        {/* Right side: Price & Close Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xl md:text-2xl font-extrabold text-amber-400">
            {totalPrice.toFixed(2)}€
          </span>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow cursor-pointer border border-slate-700"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── BODY: 2 COLUMNS COMPACT ONE-PAGE LAYOUT ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Pizza image + Base toggle + Ingredients to remove + Note */}
        <div className="md:col-span-5 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-slate-800 md:pr-4 pb-3 md:pb-0">
          {/* Pizza Thumbnail & Base Sauce Selection */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-800 border-2 border-amber-500/50 flex-shrink-0 flex items-center justify-center shadow">
                {(() => {
                  const normalizedName = (pizza.name || '').trim().toLowerCase();
                  const pizzaImg = resolveImg(pizza.imageUrl || pizza.image_url || LOCAL_PIZZA_IMAGES[normalizedName]);
                  return pizzaImg ? (
                    <img src={pizzaImg} alt={pizza.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pizza className="w-7 h-7 text-amber-400" />
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Base de sauce
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBase('tomate')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      selectedBase === 'tomate'
                        ? 'border-red-500 bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🍅</span> Tomate
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBase('creme')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      selectedBase === 'creme'
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>🥛</span> Crème
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Retirer des ingrédients */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Retirer des ingrédients
              </span>
              <span className="text-[10px] text-slate-500">(gratuit)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ingredients.length > 0 ? (
                ingredients.map(ing => {
                  const removed = isIngredientRemoved(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => toggleIngredient(ing)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all cursor-pointer ${
                        removed
                          ? 'border-red-500/60 bg-red-500/20 text-red-400 line-through opacity-70'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-red-500/50'
                      }`}
                    >
                      {removed ? '✕ ' : '✓ '}{ing}
                    </button>
                  );
                })
              ) : (
                <span className="text-xs text-slate-500 italic">Aucun ingrédient spécifique.</span>
              )}
            </div>
          </div>

          {/* Remarques / Note */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              📝 Note / Instruction
            </span>
            <input
              type="text"
              placeholder="Ex: bien cuite, sans origan..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Extras grid */}
        <div className="md:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Ajouter des extras
            </span>
            {addedExtras.length > 0 && (
              <span className="text-xs font-bold text-emerald-400">
                +{extrasTotal.toFixed(2)}€ ({addedExtras.length})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[400px] p-1">
            {pizzaIngredientSupplements.map(extra => {
              const selected = isExtraSelected(extra.id);
              const imgUrl = findDbImage(extra.name, dbImageMap) || SUPPLEMENT_FALLBACKS[extra.id];
              return (
                <SupplementTile
                  key={extra.id}
                  extra={extra}
                  selected={selected}
                  onClick={toggleExtra}
                  imageUrl={imgUrl}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FOOTER BAR ── */}
      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center gap-3 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 px-4 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl"
        >
          Annuler
        </Button>

        <Button
          type="button"
          onClick={() => onConfirm(removedIngredients, addedExtras, note, selectedBase)}
          className="flex-1 h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-orange-500/20 cursor-pointer"
        >
          ✅ Ajouter au panier — {totalPrice.toFixed(2)}€
        </Button>
      </div>
    </div>
  );
}
