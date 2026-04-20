import { useState } from 'react';
import { MenuItem, TacosCustomization } from '@/types/order';
import { tacos, meatOptions as staticMeatOptions, sauceOptions as staticSauceOptions, supplementOptions, cheeseSupplementOptions } from '@/data/menu';
import { tacosPrices, menuOptionPrices, wizardSizePrices } from '@/data/pricing';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useProductsByCategory, Product } from '@/hooks/useProducts';
import { useMeatOptions, useSauceOptions } from '@/hooks/useCustomizationOptions';
import { useWizardImage } from '@/hooks/useWizardImages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Allowed meats for Tacos (same as other products)
const allowedMeatNames = [
  'Escalope marinée',
  'Tenders',
  'Viande hachée',
  'Merguez',
  'Cordon bleu',
  'Nuggets',
];

interface TacosWizardProps {
  onClose: () => void;
}

type TacosSize = 'solo' | 'double' | 'triple';

// Helper to map database products to expected shape
function mapDbProductsToTacos(products: Product[] | undefined): MenuItem[] {
  if (!products || products.length === 0) return tacos;

  // Sort by base_price to determine size
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

export function TacosWizard({ onClose }: TacosWizardProps) {
  const { addToCart } = useOrder();
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<TacosSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Load tacos from database (fallback to static)
  const { data: dbTacos } = useProductsByCategory('tacos');
  const tacosProducts = mapDbProductsToTacos(dbTacos);

  // Load wizard image
  const { data: wizardImage } = useWizardImage('tacos');

  // Load meat and sauce options from database (fallback to static)
  const { data: dbMeats } = useMeatOptions();
  const { data: dbSauces } = useSauceOptions();

  // Use database options if available, else static
  const meatOptions = (dbMeats && dbMeats.length > 0)
    ? dbMeats.filter(m => allowedMeatNames.some(allowed =>
      m.name.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(m.name.toLowerCase())
    ))
    : staticMeatOptions.filter(m => allowedMeatNames.some(allowed =>
      m.name.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(m.name.toLowerCase())
    ));

  const sauceOptions = (dbSauces && dbSauces.length > 0) ? dbSauces : staticSauceOptions;

  const maxMeats = size === 'solo' ? 1 : size === 'double' ? 2 : 3;
  const tacosItem = tacosProducts.find(t => t.id === `tacos-${size}`) || tacos.find(t => t.id === `tacos-${size}`);

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

    // Add meat supplements
    selectedMeats.forEach(meatId => {
      const meat = meatOptions.find(m => m.id === meatId);
      if (meat) price += meat.price;
    });

    // Add other supplements (cheese)
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

    // Convert IDs to names for display
    const meatNames = selectedMeats.map(id => {
      const meat = meatOptions.find(m => m.id === id);
      return meat?.name || id;
    });

    const sauceNames = selectedSauces.map(id => {
      const sauce = sauceOptions.find(s => s.id === id);
      return sauce?.name || id;
    });

    // For supplements in Tacos, we also need to map them if they come from DB (cheese supplements usually static, but better to be safe)
    // Supplements in TacosWizard uses specific logic: meat supplements or cheese supplements
    // Line 128: const sup = supplementOptions.find(s => s.id === supId) || cheeseSupplementOptions.find(s => s.id === supId);

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

    // Track analytics
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

            {/* Product Image */}
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
          <div className="space-y-6">
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
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Options supplémentaires (+1€ chacun)
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {cheeseSupplementOptions.map((sup) => (
                  <Card
                    key={sup.id}
                    className={`p-3 cursor-pointer transition-all ${supplements.includes(sup.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleSupplement(sup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sup.name}</span>
                      {supplements.includes(sup.id) && <Check className="w-5 h-5 text-primary" />}
                    </div>
                    <span className="text-sm text-primary font-semibold">+{sup.price}€</span>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notes */}
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

          {/* Progress */}
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

      {/* Bottom Action */}
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
