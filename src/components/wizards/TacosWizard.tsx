import { useState } from 'react';
import { MenuItem, TacosCustomization } from '@/types/order';
import { tacos, meatOptions as staticMeatOptions, sauceOptions as staticSauceOptions, supplementOptions, cheeseSupplementOptions } from '@/data/menu';
import { tacosPrices, menuOptionPrices, wizardSizePrices } from '@/data/pricing';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useProductsByCategory, Product } from '@/hooks/useProducts';
import { useMeatOptions, useSauceOptions } from '@/hooks/useCustomizationOptions';
import { useWizardImage, useMenuOptionImages } from '@/hooks/useWizardImages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const FREE_SAUCES_COUNT = 2;
const EXTRA_SAUCE_PRICE = 0.30;

// Emoji fallbacks for sauces
const sauceEmojis: Record<string, string> = {
  'Sauce Blanche': '🥛',
  'Algérienne': '🟡',
  'Algériene': '🟡',
  'Harissa': '🌶️',
  'Biggy Burger': '🍔',
  'Biggy': '🍔',
  'Samouraï': '⚔️',
  'Samourai': '⚔️',
  'Ketchup': '🍅',
  'Mayonnaise': '🥚',
  'Barbecue': '🔥',
  'BBQ': '🔥',
  'Curry': '🟠',
  'Moutarde': '🌻',
};

// Emoji fallbacks for supplements
const supplementEmojis: Record<string, string> = {
  'Chèvre': '🐐',
  'Reblochon': '🧀',
  'Mozzarella': '🧀',
  'Raclette': '🫕',
  'Cheddar': '🧡',
  'Boursin': '🌿',
};

const allowedMeatNames = [
  'Escalope marinée',
  'Tenders',
  'Viande hachée',
  'Merguez',
  'Cordon bleu',
  'Nuggets',
];

// Emoji fallbacks for meats
const meatEmojis: Record<string, string> = {
  'poulet': '🍗',
  'escalope': '🥩',
  'viande': '🥩',
  'merguez': '🌭',
  'cordon': '🫓',
  'nuggets': '🍗',
  'tenders': '🍗',
  'mixte': '🍖',
  'thon': '🐟',
};

const getMeatEmoji = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(meatEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return '🥩';
};

function OptionCard({
  name,
  imageUrl,
  emoji,
  isSelected,
  isDefault,
  isDisabled,
  price,
  extraInfo,
  onClick,
}: {
  name: string;
  imageUrl?: string | null;
  emoji: string;
  isSelected: boolean;
  isDefault?: boolean;
  isDisabled?: boolean;
  price?: number;
  extraInfo?: string;
  onClick: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all overflow-hidden ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      onClick={isDisabled ? undefined : onClick}
    >
      {/* Image or emoji */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{emoji}</span>
        )}
        {isSelected && (
          <div className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center ${
            isDefault ? 'bg-red-500' : 'bg-primary'
          }`}>
            {isDefault ? <X className="w-3 h-3 text-white" /> : <Check className="w-3 h-3 text-white" />}
          </div>
        )}
      </div>
      <div className="p-2 text-center">
        <p className="font-medium text-sm leading-tight">{name}</p>
        {price !== undefined && price > 0 && (
          <p className="text-xs text-primary font-semibold">+{price.toFixed(2)}€</p>
        )}
        {extraInfo && <p className="text-xs text-muted-foreground">{extraInfo}</p>}
      </div>
    </Card>
  );
}

interface TacosWizardProps {
  onClose: () => void;
}

type TacosSize = 'solo' | 'double' | 'triple';

function mapDbProductsToTacos(products: Product[] | undefined): MenuItem[] {
  if (!products || products.length === 0) return tacos;
  const sorted = [...products].sort((a, b) => Number(a.base_price) - Number(b.base_price));
  return sorted.map((p, idx) => {
    let size: TacosSize = 'solo';
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('triple')) size = 'triple';
    else if (nameLower.includes('double')) size = 'double';
    else if (idx === 1) size = 'double';
    else if (idx === 2) size = 'triple';
    return {
      id: `tacos-${size}`,
      name: p.name,
      description: p.description || '',
      price: Number(p.base_price),
      category: 'tacos' as const,
      imageUrl: p.image_url || undefined,
    };
  });
}

function getOptionEmoji(name: string, map: Record<string, string>): string {
  for (const [key, emoji] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '•';
}

export function TacosWizard({ onClose }: TacosWizardProps) {
  const { addToCart } = useOrder();
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<TacosSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { data: menuOptionImages } = useMenuOptionImages();

  const { data: dbTacos } = useProductsByCategory('tacos');
  const tacosProducts = mapDbProductsToTacos(dbTacos);
  const { data: wizardImage } = useWizardImage('tacos');
  const { data: dbMeats } = useMeatOptions();
  const { data: dbSauces } = useSauceOptions();

  const allMeats = (dbMeats && dbMeats.length > 0)
    ? dbMeats.map(m => ({ id: m.id, name: m.name, price: Number(m.price), image_url: m.image_url }))
    : staticMeatOptions.map(m => ({ ...m, image_url: null }));

  const meatOptions = allMeats.filter(m =>
    allowedMeatNames.some(allowed =>
      m.name.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(m.name.toLowerCase())
    )
  );

  const sauceOptions = (dbSauces && dbSauces.length > 0)
    ? dbSauces.map(s => ({ ...s, image_url: s.image_url }))
    : staticSauceOptions.map(s => ({ ...s, image_url: null }));

  const maxMeats = size === 'solo' ? 1 : size === 'double' ? 2 : 3;
  const tacosItem = tacosProducts.find(t => t.id === `tacos-${size}`) || tacos.find(t => t.id === `tacos-${size}`);

  const sauceSurcharge = Math.max(0, selectedSauces.length - FREE_SAUCES_COUNT) * EXTRA_SAUCE_PRICE;

  const toggleMeat = (meatId: string) => {
    if (selectedMeats.includes(meatId)) {
      setSelectedMeats(selectedMeats.filter(m => m !== meatId));
    } else if (selectedMeats.length < maxMeats) {
      setSelectedMeats([...selectedMeats, meatId]);
    }
  };

  const toggleSauce = (sauceId: string) => {
    if (selectedSauces.includes(sauceId)) {
      setSelectedSauces(selectedSauces.filter(s => s !== sauceId));
    } else {
      setSelectedSauces([...selectedSauces, sauceId]);
    }
  };

  const toggleSupplement = (supId: string) => {
    if (supplements.includes(supId)) {
      setSupplements(supplements.filter(s => s !== supId));
    } else {
      setSupplements([...supplements, supId]);
    }
  };

  const calculatePrice = () => {
    let price = tacosItem?.price || 0;
    price += menuOptionPrices[menuOption];
    price += sauceSurcharge;

    selectedMeats.forEach(meatId => {
      const meat = meatOptions.find(m => m.id === meatId);
      if (meat) price += meat.price;
    });

    supplements.forEach(supId => {
      const sup = supplementOptions.find(s => s.id === supId) || cheeseSupplementOptions.find(s => s.id === supId);
      if (sup) price += sup.price;
    });

    return price;
  };

  const canContinue = () => {
    if (step === 1) return true;
    if (step === 2) return selectedMeats.length > 0;
    if (step === 3) return selectedSauces.length > 0;
    return true;
  };

  const handleAddToCart = () => {
    if (!tacosItem) return;

    const meatNames = selectedMeats.map(id => {
      const meat = meatOptions.find(m => m.id === id);
      return meat?.name || id;
    });

    const sauceNames = selectedSauces.map(id => {
      const sauce = sauceOptions.find(s => s.id === id);
      return sauce?.name || id;
    });

    const supplementNames = supplements.map(id => {
      const sup = supplementOptions.find(s => s.id === id) || cheeseSupplementOptions.find(s => s.id === id);
      return sup?.name || id;
    });

    const customization: TacosCustomization = {
      size,
      meats: meatNames,
      sauces: sauceNames,
      menuOption,
      supplements: supplementNames,
      note: note || undefined,
    };

    const cartItem = {
      ...tacosItem,
      id: `${tacosItem.id}-${Date.now()}`,
    };

    const calculatedPrice = calculatePrice();
    addToCart(cartItem, 1, customization, calculatedPrice);
    trackAddToCart(tacosItem.id, `Tacos ${size}`, 'tacos');

    toast({
      title: 'Ajouté au panier',
      description: `Tacos ${size} - ${meatNames.join(', ')}`,
    });

    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choisir la taille</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['solo', 'double', 'triple'] as TacosSize[]).map((s) => {
                const item = tacosProducts.find(t => t.id === `tacos-${s}`) || tacos.find(t => t.id === `tacos-${s}`);
                return (
                  <Card
                    key={s}
                    className={`p-4 cursor-pointer transition-all text-center ${size === s ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => {
                      setSize(s);
                      setSelectedMeats([]);
                    }}
                  >
                    <h3 className="font-semibold capitalize">{s}</h3>
                    <p className="text-xs text-muted-foreground">
                      {s === 'solo' ? '1' : s === 'double' ? '2' : '3'} viande{s !== 'solo' ? 's' : ''}
                    </p>
                    <p className="text-xl font-bold text-primary mt-2">{item?.price}€</p>
                  </Card>
                );
              })}
            </div>

            {wizardImage && (
              <div className="mt-6 flex justify-center">
                <div className="relative w-full max-w-xs overflow-hidden rounded-xl shadow-lg">
                  <img
                    src={wizardImage}
                    alt="Tacos"
                    className="w-full h-auto object-cover"
                    style={{ aspectRatio: '4/5' }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choisir les viandes</h2>
              <Badge>{selectedMeats.length}/{maxMeats}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {meatOptions.map((meat) => (
                <OptionCard
                  key={meat.id}
                  name={meat.name}
                  emoji={getMeatEmoji(meat.name)}
                  imageUrl={meat.image_url}
                  isSelected={selectedMeats.includes(meat.id)}
                  isDisabled={selectedMeats.length >= maxMeats && !selectedMeats.includes(meat.id)}
                  onClick={() => toggleMeat(meat.id)}
                />
              ))}
            </div>
          </div>
        );

      case 3: {
        const freeSaucesLeft = Math.max(0, FREE_SAUCES_COUNT - selectedSauces.length);
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir les sauces</h2>
            {/* Info banner */}
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
              <span className="text-primary font-bold">🎁</span>
              <span>
                {freeSaucesLeft > 0
                  ? <><strong>{freeSaucesLeft}</strong> sauce{freeSaucesLeft > 1 ? 's' : ''} gratuite{freeSaucesLeft > 1 ? 's' : ''} restante{freeSaucesLeft > 1 ? 's' : ''}</>
                  : <><strong>+{EXTRA_SAUCE_PRICE.toFixed(2)}€</strong> par sauce supplémentaire</>
                }
              </span>
              {selectedSauces.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {selectedSauces.length} sélectionnée{selectedSauces.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sauceOptions.map((sauce) => {
                const isSelected = selectedSauces.includes(sauce.id);
                const isExtraPaid = !isSelected && selectedSauces.length >= FREE_SAUCES_COUNT;
                const sauceIndex = selectedSauces.indexOf(sauce.id);
                const isPaidSauce = sauceIndex >= FREE_SAUCES_COUNT;
                const emoji = getOptionEmoji(sauce.name, sauceEmojis);
                return (
                  <Card
                    key={sauce.id}
                    className={`cursor-pointer transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleSauce(sauce.id)}
                  >
                    <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {sauce.image_url ? (
                        <img src={sauce.image_url} alt={sauce.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{emoji}</span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center">
                      <p className="font-medium text-sm leading-tight">{sauce.name}</p>
                      {isExtraPaid && <p className="text-xs text-primary font-semibold">+{EXTRA_SAUCE_PRICE.toFixed(2)}€</p>}
                      {isPaidSauce && isSelected && <p className="text-xs text-primary font-semibold">+{EXTRA_SAUCE_PRICE.toFixed(2)}€</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
            {sauceSurcharge > 0 && (
              <p className="text-sm text-primary font-medium text-center">
                Supplément sauces : +{sauceSurcharge.toFixed(2)}€
              </p>
            )}
          </div>
        );
      }

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Option Menu</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'none', label: 'Sans', price: 0, emoji: '🚫', imageUrl: null },
                  { id: 'frites', label: 'Frites', price: 1.5, emoji: '🍟', imageUrl: menuOptionImages?.frites || null },
                  { id: 'boisson', label: 'Boisson', price: 1.5, emoji: '🥤', imageUrl: menuOptionImages?.boisson || null },
                  { id: 'menu', label: 'Menu Complet', price: 2.5, desc: 'Frites + Boisson', emoji: '🍔', imageUrl: menuOptionImages?.menu || null },
                ].map((option) => (
                  <OptionCard
                    key={option.id}
                    name={option.label}
                    emoji={option.emoji}
                    imageUrl={option.imageUrl}
                    isSelected={menuOption === option.id}
                    price={option.price}
                    extraInfo={(option as any).desc}
                    onClick={() => setMenuOption(option.id as typeof menuOption)}
                  />
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Suppléments (+1€ chacun)
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {cheeseSupplementOptions.map((sup) => {
                  const emoji = getOptionEmoji(sup.name, supplementEmojis);
                  return (
                    <Card
                      key={sup.id}
                      className={`cursor-pointer transition-all overflow-hidden ${supplements.includes(sup.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => toggleSupplement(sup.id)}
                    >
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {(sup as any).image_url ? (
                          <img src={(sup as any).image_url} alt={sup.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{emoji}</span>
                        )}
                        {supplements.includes(sup.id) && (
                          <div className="absolute top-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-center">
                        <p className="font-medium text-sm">{sup.name}</p>
                        <p className="text-xs text-primary font-semibold">+{sup.price}€</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Notes / Remarques</h2>
              <Textarea
                placeholder="Ex: bien cuit, sans oignons..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">Tacos</h1>
              <p className="text-sm text-muted-foreground">Étape {step}/4</p>
            </div>
            <span className="text-xl font-bold text-primary">{calculatePrice().toFixed(2)}€</span>
          </div>

          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {renderStep()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
        <div className="container mx-auto">
          {step < 4 ? (
            <Button
              className="w-full h-14 text-lg"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
            >
              Continuer
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-lg"
              onClick={handleAddToCart}
            >
              Ajouter au panier - {calculatePrice().toFixed(2)}€
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
