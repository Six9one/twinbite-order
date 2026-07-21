import { useState, useEffect } from 'react';
import { MenuItem } from '@/types/order';
import { pizzaIngredientSupplements } from '@/data/menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, X, Plus, Check, Pizza } from 'lucide-react';
import { resolveImg } from '@/utils/resolveImg';

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

const SUPPLEMENT_IMAGES: Record<string, string> = {
  "pi-fromage": "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=120&auto=format&fit=crop&q=60",
  "pi-viande": "https://images.unsplash.com/photo-1544025162-d76694265947?w=120&auto=format&fit=crop&q=60",
  "pi-sauce": "/icons/sauce.png",
  "pi-champignons": "/icons/mushroom.png",
  "pi-olives": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=120&auto=format&fit=crop&q=60",
  "pi-poivrons": "https://images.unsplash.com/photo-1566822268153-f72535099c27?w=120&auto=format&fit=crop&q=60",
  "pi-oignons": "/icons/onion.png",
  "pi-oeuf": "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=120&auto=format&fit=crop&q=60",
  "pi-mozzarella": "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=120&auto=format&fit=crop&q=60",
  "pi-jambon": "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=120&auto=format&fit=crop&q=60",
  "pi-lardons": "https://images.unsplash.com/photo-1606851094655-b2593a9af63f?w=120&auto=format&fit=crop&q=60",
  "pi-merguez": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=120&auto=format&fit=crop&q=60",
  "pi-poulet": "https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=120&auto=format&fit=crop&q=60",
  "pi-chorizo": "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=120&auto=format&fit=crop&q=60",
  "pi-thon": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=120&auto=format&fit=crop&q=60",
  "pi-chevre": "https://images.unsplash.com/photo-1596450514966-a12da7fb104b?w=120&auto=format&fit=crop&q=60"
};

function SupplementTile({ extra, isKiosk }: { extra: any; isKiosk: boolean }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = SUPPLEMENT_IMAGES[extra.id];

  return (
    <div style={{
      width: isKiosk ? 50 : 38,
      height: isKiosk ? 50 : 38,
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f2937',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: 4,
    }}>
      {imgUrl && !imgError ? (
        <img
          src={imgUrl}
          alt={extra.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: isKiosk ? 22 : 18 }}>{extra.emoji}</span>
      )}
    </div>
  );
}

/**
 * Parse a pizza description string into individual ingredient chips.
 * e.g. "Sauce tomate, Mozzarella, merguez, poivron, œuf" → ["Sauce tomate", "Mozzarella", "merguez", "poivron", "œuf"]
 */
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

  const toggleIngredient = (ingredient: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const toggleExtra = (extra: typeof pizzaIngredientSupplements[0]) => {
    setAddedExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, { id: extra.id, name: extra.name, price: extra.price }];
    });
  };

  const extrasTotal = addedExtras.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = basePrice + extrasTotal;

  const isExtraSelected = (id: string) => addedExtras.some(e => e.id === id);
  const isIngredientRemoved = (ing: string) => removedIngredients.includes(ing);

  // Kiosk-specific large-touch styles
  const kioskCard = isKiosk ? 'min-h-[80px] text-lg' : 'min-h-[56px] text-sm';
  const kioskIngChip = isKiosk ? 'text-base px-5 py-3' : 'text-sm px-3 py-1.5';
  const kioskBtn = isKiosk ? 'h-20 text-xl' : 'h-14 text-base';

  return (
    <div className={`flex flex-col bg-background ${isKiosk ? 'min-h-screen pb-6' : 'min-h-screen pb-24'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size={isKiosk ? 'default' : 'icon'} onClick={onBack}
              className={isKiosk ? 'h-14 w-14' : 'h-10 w-10'}>
              <ArrowLeft className={isKiosk ? 'w-7 h-7' : 'w-5 h-5'} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`font-display font-bold truncate ${isKiosk ? 'text-3xl' : 'text-xl'}`}>
                🍕 {pizza.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {formatLabel}
                </Badge>
              </div>
            </div>
            <span className={`font-bold text-primary flex-shrink-0 ${isKiosk ? 'text-3xl' : 'text-xl'}`}>
              {totalPrice.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-4 py-6 space-y-8 ${isKiosk ? 'max-w-4xl' : ''}`}>

        {/* Pizza Image */}
        <div className="flex justify-center">
          <div className={`rounded-full overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 border-4 border-orange-200 shadow-xl flex items-center justify-center ${isKiosk ? 'w-44 h-44' : 'w-36 h-36'}`}>
            {(() => {
              const normalizedName = (pizza.name || '').trim().toLowerCase();
              const pizzaImg = resolveImg(pizza.imageUrl || pizza.image_url || LOCAL_PIZZA_IMAGES[normalizedName]);
              return pizzaImg ? (
                <img
                  src={pizzaImg}
                  alt={pizza.name}
                  className="w-full h-full object-cover animate-spin-slow"
                  style={{ animation: 'spin 12s linear infinite' }}
                />
              ) : (
                <Pizza
                  className={`text-orange-300 animate-spin-slow ${isKiosk ? 'w-20 h-20' : 'w-16 h-16'}`}
                  style={{ animation: 'spin 12s linear infinite' }}
                />
              );
            })()}
          </div>
        </div>

        {/* BASE SAUCE TOGGLE */}
        <div className={`rounded-2xl border-2 p-4 space-y-3 ${selectedBase !== (initialBase || 'tomate') ? 'border-amber-400 bg-amber-50/60' : 'border-border bg-muted/20'}`}>
          <div className="flex items-center gap-2">
            <span className={isKiosk ? 'text-2xl' : 'text-base'}>🫙</span>
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>Base de sauce</h2>
            {selectedBase !== (initialBase || 'tomate') && (
              <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-3 py-1">Modifiée</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedBase('tomate')}
              className={`rounded-xl border-2 font-semibold transition-all flex flex-col items-center justify-center gap-1 ${isKiosk ? 'py-5 text-lg' : 'py-4 text-sm'} ${
                selectedBase === 'tomate'
                  ? 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-200'
                  : 'border-border hover:border-red-300 hover:bg-red-50/30'
              }`}
            >
              <span className={isKiosk ? 'text-4xl' : 'text-3xl'}>🍅</span>
              Sauce Tomate
              {selectedBase === 'tomate' && <span className="text-xs">✓ Sélectionné</span>}
            </button>
            <button
              onClick={() => setSelectedBase('creme')}
              className={`rounded-xl border-2 font-semibold transition-all flex flex-col items-center justify-center gap-1 ${isKiosk ? 'py-5 text-lg' : 'py-4 text-sm'} ${
                selectedBase === 'creme'
                  ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200'
                  : 'border-border hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <span className={isKiosk ? 'text-4xl' : 'text-3xl'}>🥛</span>
              Crème Fraîche
              {selectedBase === 'creme' && <span className="text-xs">✓ Sélectionné</span>}
            </button>
          </div>
        </div>

        {/* SECTION 1: Removable Ingredients */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>
              Retirer des ingrédients
            </h2>
            <span className={`text-muted-foreground ${isKiosk ? 'text-base' : 'text-sm'}`}>(gratuit)</span>
          </div>
          <p className={`text-muted-foreground ${isKiosk ? 'text-base' : 'text-sm'}`}>
            Appuyez pour retirer un ingrédient ✕
          </p>
          <div className="flex flex-wrap gap-2">
            {ingredients.length > 0 ? (
              ingredients.map(ingredient => {
                const removed = isIngredientRemoved(ingredient);
                return (
                  <button
                    key={ingredient}
                    onClick={() => toggleIngredient(ingredient)}
                    className={`rounded-full border-2 font-medium transition-all ${kioskIngChip} ${
                      removed
                        ? 'border-red-400 bg-red-50 text-red-400 line-through opacity-60'
                        : 'border-green-400 bg-green-50 text-green-800 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    {removed ? '✕ ' : '✓ '}{ingredient}
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm italic">Aucun ingrédient listé.</p>
            )}
          </div>
          {removedIngredients.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <span className="font-semibold">Sans :</span> {removedIngredients.join(', ')}
            </div>
          )}
        </div>

        {/* SECTION 2: Addable Extras */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>
              Ajouter des extras
            </h2>
          </div>
          <div className={`grid gap-3 ${isKiosk ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {pizzaIngredientSupplements.map(extra => {
              const selected = isExtraSelected(extra.id);
              return (
                <Card
                  key={extra.id}
                  onClick={() => toggleExtra(extra)}
                  className={`cursor-pointer transition-all select-none ${kioskCard} p-3 flex flex-col items-center justify-center gap-1 border-2 ${
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <SupplementTile extra={extra} isKiosk={isKiosk} />
                  <span className={`font-semibold text-center leading-tight ${isKiosk ? 'text-base' : 'text-xs'}`}>
                    {extra.name}
                  </span>
                  <span className={`font-bold text-primary ${isKiosk ? 'text-base' : 'text-xs'}`}>
                    +{extra.price.toFixed(2)}€
                  </span>
                  {selected && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {addedExtras.length > 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <span className="font-semibold">Extras :</span>{' '}
              {addedExtras.map(e => `${e.name} (+${e.price.toFixed(2)}€)`).join(', ')}
              <span className="ml-2 font-bold">= +{extrasTotal.toFixed(2)}€</span>
            </div>
          )}
        </div>

        {/* SECTION 3: Note */}
        {!isKiosk && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold">📝 Notes / Remarques</h2>
            <Textarea
              placeholder="Ex: bien cuite, sauce à part, sans origan..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Kiosk note field */}
        {isKiosk && (
          <div className="space-y-2">
            <h2 className="text-xl font-bold">📝 Remarque</h2>
            <Textarea
              placeholder="Ex: bien cuite, sauce à part..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="resize-none text-lg h-20"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
        <div className={`mx-auto ${isKiosk ? 'max-w-4xl' : 'container'}`}>
          <Button
            className={`w-full rounded-xl font-bold ${kioskBtn}`}
            onClick={() => onConfirm(removedIngredients, addedExtras, note, selectedBase)}
          >
            ✅ Ajouter au panier — {totalPrice.toFixed(2)}€
          </Button>
        </div>
      </div>
    </div>
  );
}
