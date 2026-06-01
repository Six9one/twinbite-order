import { useState } from 'react';
import { MenuItem, SouffletCustomization, MakloubCustomization, MlawiCustomization } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useMeatOptions, useSauceOptions, useSupplementOptions, useGarnitureOptions } from '@/hooks/useCustomizationOptions';
import { useWizardImage } from '@/hooks/useWizardImages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  meatOptions as staticMeatOptions,
  sauceOptions as staticSauceOptions,
  cheeseSupplementOptions as staticSupplements,
} from '@/data/menu';
import { wizardSizePrices, menuOptionPrices, oldPrices } from '@/data/pricing';

export type ProductType = 'soufflet' | 'mlawi' | 'makloub' | 'panini';
type ProductSize = string;

// Free sauces count before paying extra
const FREE_SAUCES_COUNT = 2;
const EXTRA_SAUCE_PRICE = 0.30;

// Emoji fallbacks for sauces when no image_url
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

// Emoji fallbacks for garnitures
const garnitureEmojis: Record<string, string> = {
  'Salade': '🥬',
  'Tomate': '🍅',
  'Oignon': '🧅',
  'Oignons': '🧅',
  'Olive': '🫒',
  'Olives': '🫒',
  'Pomme de terre': '🥔',
  'Pomme de Terre': '🥔',
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

// Default garnitures that are ON by default (user removes them)
const DEFAULT_GARNITURES = ['Salade', 'Tomate', 'Oignon'];

interface ProductConfig {
  title: string;
  categorySlug: string;
  garnitureType: 'soufflet' | 'makloub' | 'mlawi' | 'panini';
  sizes: { id: string; label: string; maxMeats: number; price: number }[];
  showMenuOption: boolean;
  showGarniture: boolean;
}

const productConfigs: Record<ProductType, ProductConfig> = {
  soufflet: {
    title: 'Soufflet',
    categorySlug: 'soufflets',
    garnitureType: 'soufflet',
    sizes: wizardSizePrices.soufflet,
    showMenuOption: true,
    showGarniture: true,
  },
  mlawi: {
    title: 'Mlawi',
    categorySlug: 'mlawi',
    garnitureType: 'mlawi',
    sizes: wizardSizePrices.mlawi,
    showMenuOption: true,
    showGarniture: true,
  },
  makloub: {
    title: 'Makloub',
    categorySlug: 'makloub',
    garnitureType: 'makloub',
    sizes: wizardSizePrices.makloub,
    showMenuOption: true,
    showGarniture: true,
  },
  panini: {
    title: 'Panini',
    categorySlug: 'panini',
    garnitureType: 'panini',
    sizes: wizardSizePrices.panini,
    showMenuOption: true,
    showGarniture: false, // No garnitures for Panini
  },
};

const allowedMeatNames = [
  'Escalope marinée',
  'Tenders',
  'Viande hachée',
  'Merguez',
  'Cordon bleu',
  'Nuggets',
];

// Product-specific garnitures (static fallback)
const souffletGarnitures = [
  { id: 'sans_crudite', name: 'Sans crudité', price: 0 },
  { id: 'pomme_de_terre', name: 'Pomme de terre', price: 0 },
  { id: 'oignon', name: 'Oignon', price: 0 },
  { id: 'olive', name: 'Olive', price: 0 },
];

const makloubGarnitures = [
  { id: 'salade', name: 'Salade', price: 0 },
  { id: 'tomate', name: 'Tomate', price: 0 },
  { id: 'oignon', name: 'Oignon', price: 0 },
];

const mlawiGarnitures = [
  { id: 'salade', name: 'Salade', price: 0 },
  { id: 'tomate', name: 'Tomate', price: 0 },
  { id: 'oignon', name: 'Oignon', price: 0 },
  { id: 'olive', name: 'Olive', price: 0 },
];

interface UnifiedProductWizardProps {
  productType: ProductType;
  onClose: () => void;
}

function getOptionEmoji(name: string, map: Record<string, string>): string {
  for (const [key, emoji] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '•';
}

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

export function UnifiedProductWizard({ productType, onClose }: UnifiedProductWizardProps) {
  const { addToCart } = useOrder();
  const config = productConfigs[productType];

  const [step, setStep] = useState(1);
  const [size, setSize] = useState<ProductSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  // For garnitures: start with defaults, user can toggle OFF
  const [removedDefaults, setRemovedDefaults] = useState<string[]>([]);
  const [selectedExtra, setSelectedExtra] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [note, setNote] = useState('');

  // Load wizard image
  const { data: wizardImage } = useWizardImage(productType);

  // Load options from database
  const { data: dbMeats } = useMeatOptions();
  const { data: dbSauces } = useSauceOptions();
  const { data: dbSupplements } = useSupplementOptions();
  const { data: dbGarnitures } = useGarnitureOptions();

  const allMeats = dbMeats && dbMeats.length > 0
    ? dbMeats.map(m => ({ id: m.id, name: m.name, price: Number(m.price), image_url: m.image_url }))
    : staticMeatOptions.map(m => ({ ...m, image_url: null }));

  const meatOptions = allMeats.filter(m =>
    allowedMeatNames.some(allowed => m.name.toLowerCase().includes(allowed.toLowerCase()))
  );

  const sauceOptions = dbSauces && dbSauces.length > 0
    ? dbSauces.map(s => ({ id: s.id, name: s.name, price: Number(s.price), image_url: s.image_url }))
    : staticSauceOptions.map(s => ({ ...s, image_url: null }));

  const supplementOptions = dbSupplements && dbSupplements.length > 0
    ? dbSupplements.map(s => ({ id: s.id, name: s.name, price: Number(s.price), image_url: s.image_url }))
    : staticSupplements.map(s => ({ ...s, image_url: null }));

  // Garnitures from DB or static fallback, product-specific
  const getStaticGarnitures = () => {
    switch (productType) {
      case 'soufflet': return souffletGarnitures.map(g => ({ ...g, image_url: null }));
      case 'makloub': return makloubGarnitures.map(g => ({ ...g, image_url: null }));
      case 'mlawi': return mlawiGarnitures.map(g => ({ ...g, image_url: null }));
      default: return [];
    }
  };

  // For non-panini, build the garnitures list
  // Split into: defaults (salade, tomate, oignon) and extras
  const allGarnitures = config.showGarniture
    ? (dbGarnitures && dbGarnitures.length > 0
        ? dbGarnitures.map(g => ({ id: g.id, name: g.name, price: Number(g.price), image_url: g.image_url }))
        : getStaticGarnitures()
      )
    : [];

  const defaultGarnitures = allGarnitures.filter(g =>
    DEFAULT_GARNITURES.some(d => g.name.toLowerCase().includes(d.toLowerCase()))
  );
  const extraGarnitures = allGarnitures.filter(g =>
    !DEFAULT_GARNITURES.some(d => g.name.toLowerCase().includes(d.toLowerCase()))
  );

  const currentSizeConfig = config.sizes.find(s => s.id === size) || config.sizes[0];
  const maxMeats = currentSizeConfig.maxMeats;

  // Steps: 1=size, 2=meats, 3=sauces, 4=garnitures (skip for panini), 5=menu+notes
  const totalSteps = config.showGarniture ? 5 : 4;

  const getActualStep = (displayStep: number): number => {
    if (!config.showGarniture && displayStep >= 4) return displayStep + 1;
    return displayStep;
  };

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

  const toggleDefaultGarniture = (garId: string) => {
    // Toggle removal of a default garniture
    if (removedDefaults.includes(garId)) {
      setRemovedDefaults(removedDefaults.filter(g => g !== garId));
    } else {
      setRemovedDefaults([...removedDefaults, garId]);
    }
  };

  const toggleExtraGarniture = (garId: string) => {
    if (selectedExtra.includes(garId)) {
      setSelectedExtra(selectedExtra.filter(g => g !== garId));
    } else {
      setSelectedExtra([...selectedExtra, garId]);
    }
  };

  const toggleSupplement = (supId: string) => {
    if (selectedSupplements.includes(supId)) {
      setSelectedSupplements(selectedSupplements.filter(s => s !== supId));
    } else {
      setSelectedSupplements([...selectedSupplements, supId]);
    }
  };

  // Extra sauce cost: first FREE_SAUCES_COUNT are free, rest are EXTRA_SAUCE_PRICE each
  const sauceSurcharge = Math.max(0, selectedSauces.length - FREE_SAUCES_COUNT) * EXTRA_SAUCE_PRICE;

  const calculatePrice = () => {
    let price = currentSizeConfig.price;

    if (config.showMenuOption) {
      price += menuOptionPrices[menuOption];
    }

    selectedSupplements.forEach(supId => {
      const sup = supplementOptions.find(s => s.id === supId);
      if (sup) price += sup.price;
    });

    price += sauceSurcharge;

    return price;
  };

  const canContinue = () => {
    if (step === 1) return true;
    if (step === 2) return selectedMeats.length > 0;
    if (step === 3) return selectedSauces.length > 0;
    return true;
  };

  const handleAddToCart = () => {
    const meatNames = selectedMeats.map(id => {
      const meat = meatOptions.find(m => m.id === id);
      return meat?.name || id;
    });

    const sauceNames = selectedSauces.map(id => {
      const sauce = sauceOptions.find(s => s.id === id);
      return sauce?.name || id;
    });

    // Build final garnitures: defaults minus removed, plus extras
    const activeDefaults = defaultGarnitures
      .filter(g => !removedDefaults.includes(g.id))
      .map(g => g.name);
    const activeExtras = extraGarnitures
      .filter(g => selectedExtra.includes(g.id))
      .map(g => g.name);
    const garnitureNames = [...activeDefaults, ...activeExtras];

    // Add "sans X" for removed defaults
    const removedNames = defaultGarnitures
      .filter(g => removedDefaults.includes(g.id))
      .map(g => `Sans ${g.name}`);
    const allGarnitureNotes = [...garnitureNames, ...removedNames];

    const supplementNames = selectedSupplements.map(id => {
      const sup = supplementOptions.find(s => s.id === id);
      return sup?.name || id;
    });

    const baseItem: MenuItem = {
      id: `${productType}-${size}`,
      name: `${config.title} ${currentSizeConfig.label}`,
      description: `${maxMeats} viande${maxMeats > 1 ? 's' : ''}, sauce, garnitures`,
      price: currentSizeConfig.price,
      category: config.categorySlug as any,
    };

    let customization: SouffletCustomization | MakloubCustomization | MlawiCustomization;

    const customBase = {
      size,
      meats: meatNames,
      sauces: sauceNames,
      garnitures: allGarnitureNotes,
      supplements: supplementNames,
      menuOption,
      note: note || undefined,
    };

    if (productType === 'soufflet') {
      customization = customBase as SouffletCustomization;
    } else if (productType === 'makloub') {
      customization = customBase as MakloubCustomization;
    } else if (productType === 'mlawi') {
      customization = customBase as MlawiCustomization;
    } else {
      customization = customBase as any;
    }

    const cartItem: MenuItem = {
      ...baseItem,
      id: `${baseItem.id}-${Date.now()}`,
    };

    const calculatedPrice = calculatePrice();
    addToCart(cartItem, 1, customization, calculatedPrice);

    trackAddToCart(baseItem.id, `${config.title} ${size}`, config.categorySlug);

    toast({
      title: 'Ajouté au panier',
      description: `${config.title} ${currentSizeConfig.label} - ${meatNames.join(', ')}`,
    });

    onClose();
  };

  const renderStep = () => {
    const actualStep = getActualStep(step);

    switch (actualStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choisir la taille</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {config.sizes.map((s) => {
                const productOldPrices = oldPrices[productType as keyof typeof oldPrices];
                const oldPrice = productOldPrices ? (productOldPrices as any)[s.id] : null;
                const showOldPrice = oldPrice !== null && oldPrice !== s.price;

                return (
                  <Card
                    key={s.id}
                    className={`p-4 cursor-pointer transition-all text-center ${size === s.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => {
                      setSize(s.id);
                      setSelectedMeats([]);
                    }}
                  >
                    <h3 className="font-semibold capitalize">{s.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {s.maxMeats} viande{s.maxMeats > 1 ? 's' : ''}
                    </p>
                    <div className="mt-2">
                      {showOldPrice && (
                        <p className="text-xs text-gray-400 line-through">{oldPrice}€</p>
                      )}
                      <p className="text-xl font-bold text-primary">{s.price}€</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {wizardImage && (
              <div className="mt-6 flex justify-center">
                <div className="relative w-full max-w-xs overflow-hidden rounded-xl shadow-lg">
                  <img
                    src={wizardImage}
                    alt={config.title}
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
            <div className="grid grid-cols-2 gap-3">
              {meatOptions.map((meat) => (
                <Card
                  key={meat.id}
                  className={`p-3 cursor-pointer transition-all ${selectedMeats.includes(meat.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'} ${selectedMeats.length >= maxMeats && !selectedMeats.includes(meat.id) ? 'opacity-50' : ''}`}
                  onClick={() => toggleMeat(meat.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{meat.name}</span>
                    {selectedMeats.includes(meat.id) && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
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
              {sauceOptions.map((sauce, index) => {
                const isSelected = selectedSauces.includes(sauce.id);
                const isExtraPaid = !isSelected && selectedSauces.length >= FREE_SAUCES_COUNT;
                const emoji = getOptionEmoji(sauce.name, sauceEmojis);
                const sauceIndex = selectedSauces.indexOf(sauce.id);
                const isPaidSauce = sauceIndex >= FREE_SAUCES_COUNT;
                return (
                  <OptionCard
                    key={sauce.id}
                    name={sauce.name}
                    imageUrl={sauce.image_url}
                    emoji={emoji}
                    isSelected={isSelected}
                    price={isExtraPaid ? EXTRA_SAUCE_PRICE : (isPaidSauce ? EXTRA_SAUCE_PRICE : 0)}
                    extraInfo={isExtraPaid ? `+${EXTRA_SAUCE_PRICE.toFixed(2)}€` : (isPaidSauce ? `+${EXTRA_SAUCE_PRICE.toFixed(2)}€` : undefined)}
                    onClick={() => toggleSauce(sauce.id)}
                  />
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
        // Garnitures step (only for non-panini)
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Garnitures</h2>

            {/* Default garnitures — tap to remove */}
            {defaultGarnitures.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Inclus par défaut</p>
                <div className="grid grid-cols-3 gap-3">
                  {defaultGarnitures.map((gar) => {
                    const isRemoved = removedDefaults.includes(gar.id);
                    const emoji = getOptionEmoji(gar.name, garnitureEmojis);
                    return (
                      <OptionCard
                        key={gar.id}
                        name={gar.name}
                        imageUrl={gar.image_url}
                        emoji={emoji}
                        isSelected={!isRemoved}
                        isDefault={true}
                        onClick={() => toggleDefaultGarniture(gar.id)}
                      />
                    );
                  })}
                </div>
                {removedDefaults.length > 0 && (
                  <p className="text-xs text-red-500">
                    Retiré : {defaultGarnitures.filter(g => removedDefaults.includes(g.id)).map(g => g.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Extra garnitures */}
            {extraGarnitures.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Ajouter</p>
                <div className="grid grid-cols-3 gap-3">
                  {extraGarnitures.map((gar) => {
                    const emoji = getOptionEmoji(gar.name, garnitureEmojis);
                    return (
                      <OptionCard
                        key={gar.id}
                        name={gar.name}
                        imageUrl={gar.image_url}
                        emoji={emoji}
                        isSelected={selectedExtra.includes(gar.id)}
                        price={gar.price > 0 ? gar.price : undefined}
                        onClick={() => toggleExtraGarniture(gar.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            <h3 className="text-lg font-semibold">Suppléments</h3>
            <p className="text-sm text-muted-foreground">Optionnel</p>
            <div className="grid grid-cols-3 gap-3">
              {supplementOptions.map((sup) => {
                const emoji = getOptionEmoji(sup.name, supplementEmojis);
                return (
                  <OptionCard
                    key={sup.id}
                    name={sup.name}
                    imageUrl={sup.image_url}
                    emoji={emoji}
                    isSelected={selectedSupplements.includes(sup.id)}
                    price={sup.price}
                    onClick={() => toggleSupplement(sup.id)}
                  />
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Supplements for Panini (no garnitures step) */}
            {!config.showGarniture && (
              <>
                <h2 className="text-lg font-semibold">Suppléments</h2>
                <div className="grid grid-cols-3 gap-3">
                  {supplementOptions.map((sup) => {
                    const emoji = getOptionEmoji(sup.name, supplementEmojis);
                    return (
                      <OptionCard
                        key={sup.id}
                        name={sup.name}
                        imageUrl={sup.image_url}
                        emoji={emoji}
                        isSelected={selectedSupplements.includes(sup.id)}
                        price={sup.price}
                        onClick={() => toggleSupplement(sup.id)}
                      />
                    );
                  })}
                </div>
                <Separator />
              </>
            )}

            <h2 className="text-lg font-semibold">Option Menu</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'none', label: 'Sans', price: 0 },
                { id: 'frites', label: 'Frites', price: 1.5 },
                { id: 'boisson', label: 'Boisson', price: 1.5 },
                { id: 'menu', label: 'Menu Complet', price: 2.5, desc: 'Frites + Boisson' },
              ].map((option) => (
                <Card
                  key={option.id}
                  className={`p-3 cursor-pointer transition-all ${menuOption === option.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setMenuOption(option.id as typeof menuOption)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{option.label}</span>
                      {(option as any).desc && <p className="text-xs text-muted-foreground">{(option as any).desc}</p>}
                    </div>
                    {menuOption === option.id && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  {option.price > 0 && (
                    <span className="text-sm text-primary font-semibold">+{option.price}€</span>
                  )}
                </Card>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h3 className="font-semibold">Notes / Remarques</h3>
              <Textarea
                placeholder="Ex: sans oignons, bien cuit..."
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
              <h1 className="text-2xl font-display font-bold">{config.title}</h1>
              <p className="text-sm text-muted-foreground">Étape {step}/{totalSteps}</p>
            </div>
            <span className="text-xl font-bold text-primary">{calculatePrice().toFixed(2)}€</span>
          </div>

          <div className="flex gap-2 mt-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container mx-auto">
          {step < totalSteps ? (
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
