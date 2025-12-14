import { useState } from 'react';
import { MenuItem, SouffletCustomization, MakloubCustomization, MlawiCustomization } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useMeatOptions, useSauceOptions, useSupplementOptions } from '@/hooks/useCustomizationOptions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  meatOptions as staticMeatOptions, 
  sauceOptions as staticSauceOptions,
  souffletGarnitureOptions,
  makloubGarnitureOptions,
  cheeseSupplementOptions as staticSupplements,
  menuOptionPrices
} from '@/data/menu';

export type ProductType = 'soufflet' | 'mlawi' | 'makloub';
type ProductSize = 'solo' | 'double' | 'triple';

interface ProductConfig {
  title: string;
  categorySlug: string;
  garnitureType: 'soufflet' | 'makloub' | 'mlawi';
  sizes: { id: ProductSize; label: string; maxMeats: number; price: number }[];
  showMenuOption: boolean;
}

const productConfigs: Record<ProductType, ProductConfig> = {
  soufflet: {
    title: 'Soufflé',
    categorySlug: 'soufflets',
    garnitureType: 'soufflet',
    sizes: [
      { id: 'solo', label: 'Solo', maxMeats: 1, price: 6 },
      { id: 'double', label: 'Double', maxMeats: 2, price: 8 },
      { id: 'triple', label: 'Triple', maxMeats: 3, price: 10 },
    ],
    showMenuOption: true,
  },
  mlawi: {
    title: 'Mlawi',
    categorySlug: 'mlawi',
    garnitureType: 'mlawi',
    sizes: [
      { id: 'solo', label: 'Solo', maxMeats: 1, price: 6 },
      { id: 'double', label: 'Double', maxMeats: 2, price: 8 },
      { id: 'triple', label: 'Triple', maxMeats: 3, price: 10 },
    ],
    showMenuOption: true,
  },
  makloub: {
    title: 'Makloub',
    categorySlug: 'makloub',
    garnitureType: 'makloub',
    sizes: [
      { id: 'solo', label: 'Solo', maxMeats: 1, price: 6 },
      { id: 'double', label: 'Double', maxMeats: 2, price: 8 },
      { id: 'triple', label: 'Triple', maxMeats: 3, price: 10 },
    ],
    showMenuOption: true,
  },
};

// Product-specific garnitures
const souffletGarnitures = [
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

export function UnifiedProductWizard({ productType, onClose }: UnifiedProductWizardProps) {
  const { addToCart } = useOrder();
  const config = productConfigs[productType];
  
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<ProductSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedGarnitures, setSelectedGarnitures] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [note, setNote] = useState('');

  // Load options from database (with static fallback)
  const { data: dbMeats } = useMeatOptions();
  const { data: dbSauces } = useSauceOptions();
  const { data: dbSupplements } = useSupplementOptions();

  // Use database options if available, otherwise fallback to static
  const meatOptions = dbMeats && dbMeats.length > 0 
    ? dbMeats.map(m => ({ id: m.id, name: m.name, price: Number(m.price), image_url: m.image_url }))
    : staticMeatOptions;
  
  const sauceOptions = dbSauces && dbSauces.length > 0
    ? dbSauces.map(s => ({ id: s.id, name: s.name, price: Number(s.price), image_url: s.image_url }))
    : staticSauceOptions;
  
  const supplementOptions = dbSupplements && dbSupplements.length > 0
    ? dbSupplements.map(s => ({ id: s.id, name: s.name, price: Number(s.price), image_url: s.image_url }))
    : staticSupplements;

  // Garniture options - product-specific (not from database)
  const getGarnitureOptions = () => {
    switch (productType) {
      case 'soufflet':
        return souffletGarnitures;
      case 'makloub':
        return makloubGarnitures;
      case 'mlawi':
        return mlawiGarnitures;
      default:
        return [];
    }
  };

  const garnitureOptions = getGarnitureOptions();
  const currentSizeConfig = config.sizes.find(s => s.id === size) || config.sizes[0];
  const maxMeats = currentSizeConfig.maxMeats;
  const totalSteps = config.showMenuOption ? 5 : 4;

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

  const toggleGarniture = (garId: string) => {
    if (selectedGarnitures.includes(garId)) {
      setSelectedGarnitures(selectedGarnitures.filter(g => g !== garId));
    } else {
      setSelectedGarnitures([...selectedGarnitures, garId]);
    }
  };

  const toggleSupplement = (supId: string) => {
    if (selectedSupplements.includes(supId)) {
      setSelectedSupplements(selectedSupplements.filter(s => s !== supId));
    } else {
      setSelectedSupplements([...selectedSupplements, supId]);
    }
  };

  const calculatePrice = () => {
    let price = currentSizeConfig.price;
    
    // Add menu option price
    if (config.showMenuOption) {
      price += menuOptionPrices[menuOption];
    }
    
    // Add supplement costs
    selectedSupplements.forEach(supId => {
      const sup = supplementOptions.find(s => s.id === supId);
      if (sup) price += sup.price;
    });
    
    return price;
  };

  const canContinue = () => {
    if (step === 1) return true; // Size selection always allowed
    if (step === 2) return selectedMeats.length > 0;
    if (step === 3) return selectedSauces.length > 0;
    return true; // Steps 4 and 5 are optional
  };

  const handleAddToCart = () => {
    // Convert IDs to names for display in cart/notifications
    const meatNames = selectedMeats.map(id => {
      const meat = meatOptions.find(m => m.id === id);
      return meat?.name || id;
    });
    
    const sauceNames = selectedSauces.map(id => {
      const sauce = sauceOptions.find(s => s.id === id);
      return sauce?.name || id;
    });
    
    const garnitureNames = selectedGarnitures.map(id => {
      const gar = garnitureOptions.find(g => g.id === id);
      return gar?.name || id;
    });
    
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
    
    // Store NAMES instead of IDs for display in cart/notifications
    if (productType === 'soufflet') {
      customization = {
        size,
        meats: meatNames,
        sauces: sauceNames,
        garnitures: garnitureNames,
        supplements: supplementNames,
        menuOption,
        note: note || undefined,
      } as SouffletCustomization;
    } else if (productType === 'makloub') {
      customization = {
        size,
        meats: meatNames,
        sauces: sauceNames,
        garnitures: garnitureNames,
        supplements: supplementNames,
        menuOption,
        note: note || undefined,
      } as MakloubCustomization;
    } else {
      customization = {
        size,
        meats: meatNames,
        sauces: sauceNames,
        garnitures: garnitureNames,
        supplements: supplementNames,
        menuOption,
        note: note || undefined,
      } as MlawiCustomization;
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
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir la taille</h2>
            <div className="grid grid-cols-3 gap-4">
              {config.sizes.map((s) => (
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
                  <p className="text-xl font-bold text-primary mt-2">{s.price}€</p>
                </Card>
              ))}
            </div>
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
                  {meat.price > 0 && (
                    <span className="text-sm text-primary">+{meat.price}€</span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir les sauces</h2>
            <p className="text-sm text-muted-foreground">Sélection multiple possible</p>
            <div className="grid grid-cols-2 gap-3">
              {sauceOptions.map((sauce) => (
                <Card
                  key={sauce.id}
                  className={`p-3 cursor-pointer transition-all ${selectedSauces.includes(sauce.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => toggleSauce(sauce.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sauce.name}</span>
                    {selectedSauces.includes(sauce.id) && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir les garnitures</h2>
            <p className="text-sm text-muted-foreground">Sélection multiple possible</p>
            <div className="grid grid-cols-3 gap-3">
              {garnitureOptions.map((gar) => (
                <Card
                  key={gar.id}
                  className={`p-3 cursor-pointer transition-all ${selectedGarnitures.includes(gar.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => toggleGarniture(gar.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{gar.name}</span>
                    {selectedGarnitures.includes(gar.id) && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </Card>
              ))}
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-semibold">Suppléments</h3>
            <p className="text-sm text-muted-foreground">Optionnel</p>
            <div className="grid grid-cols-2 gap-3">
              {supplementOptions.map((sup) => (
                <Card
                  key={sup.id}
                  className={`p-3 cursor-pointer transition-all ${selectedSupplements.includes(sup.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => toggleSupplement(sup.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sup.name}</span>
                    {selectedSupplements.includes(sup.id) && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  <span className="text-sm text-primary font-semibold">+{sup.price}€</span>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
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
                      {option.desc && <p className="text-xs text-muted-foreground">{option.desc}</p>}
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
          
          {/* Progress */}
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

      {/* Bottom Action */}
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
