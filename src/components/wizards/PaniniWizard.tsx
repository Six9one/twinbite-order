import { useState } from 'react';
import { MenuItem, PaniniCustomization } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useMeatOptions, useSauceOptions, useSupplementOptions } from '@/hooks/useCustomizationOptions';
import { menuOptionPrices } from '@/data/menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PaniniWizardProps {
  onClose: () => void;
}

type PaniniSize = 'solo' | 'duo';

const paniniSizes = [
  { id: 'solo' as PaniniSize, label: 'Solo', maxMeats: 1, price: 5 },
  { id: 'duo' as PaniniSize, label: 'Duo', maxMeats: 2, price: 7 },
];

// Allowed meats for Panini
const allowedMeatNames = [
  'Escalope marinée',
  'Tenders',
  'Viande hachée',
  'Merguez',
  'Cordon bleu',
  'Nuggets',
];

export function PaniniWizard({ onClose }: PaniniWizardProps) {
  const { addToCart } = useOrder();
  
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<PaniniSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [note, setNote] = useState('');

  // Load options from database
  const { data: dbMeats } = useMeatOptions();
  const { data: dbSauces } = useSauceOptions();
  const { data: dbSupplements } = useSupplementOptions();

  // Filter meats to only allowed ones
  const meatOptions = (dbMeats || [])
    .map(m => ({ id: m.id, name: m.name, price: Number(m.price) }))
    .filter(m => allowedMeatNames.some(allowed => 
      m.name.toLowerCase().includes(allowed.toLowerCase()) || 
      allowed.toLowerCase().includes(m.name.toLowerCase())
    ));

  const sauceOptions = (dbSauces || []).map(s => ({ id: s.id, name: s.name, price: Number(s.price) }));
  const supplementOptions = (dbSupplements || []).map(s => ({ id: s.id, name: s.name, price: Number(s.price) }));

  const currentSizeConfig = paniniSizes.find(s => s.id === size) || paniniSizes[0];
  const maxMeats = currentSizeConfig.maxMeats;
  const totalSteps = 4;

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
    if (selectedSupplements.includes(supId)) {
      setSelectedSupplements(selectedSupplements.filter(s => s !== supId));
    } else {
      setSelectedSupplements([...selectedSupplements, supId]);
    }
  };

  const calculatePrice = () => {
    let price = currentSizeConfig.price;
    
    // Add menu option price
    price += menuOptionPrices[menuOption];
    
    // Add supplement costs
    selectedSupplements.forEach(supId => {
      const sup = supplementOptions.find(s => s.id === supId);
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
    const meatNames = selectedMeats.map(id => {
      const meat = meatOptions.find(m => m.id === id);
      return meat?.name || id;
    });
    
    const sauceNames = selectedSauces.map(id => {
      const sauce = sauceOptions.find(s => s.id === id);
      return sauce?.name || id;
    });
    
    const supplementNames = selectedSupplements.map(id => {
      const sup = supplementOptions.find(s => s.id === id);
      return sup?.name || id;
    });

    const baseItem: MenuItem = {
      id: `panini-${size}`,
      name: `Panini ${currentSizeConfig.label}`,
      description: `${maxMeats} viande${maxMeats > 1 ? 's' : ''}, sauce`,
      price: currentSizeConfig.price,
      category: 'panini',
    };

    const customization: PaniniCustomization = {
      size,
      meats: meatNames,
      sauces: sauceNames,
      supplements: supplementNames,
      menuOption,
      note: note || undefined,
    };

    const cartItem: MenuItem = {
      ...baseItem,
      id: `${baseItem.id}-${Date.now()}`,
    };

    const calculatedPrice = calculatePrice();
    addToCart(cartItem, 1, customization, calculatedPrice);
    
    trackAddToCart(baseItem.id, `Panini ${size}`, 'panini');
    
    toast({
      title: 'Ajouté au panier',
      description: `Panini ${currentSizeConfig.label} - ${meatNames.join(', ')}`,
    });
    
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir la taille</h2>
            <div className="grid grid-cols-2 gap-4">
              {paniniSizes.map((s) => (
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

            {/* Show supplements when frites or menu is selected */}
            {(menuOption === 'frites' || menuOption === 'menu') && supplementOptions.length > 0 && (
              <>
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
              </>
            )}

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
              <h1 className="text-2xl font-display font-bold">Panini</h1>
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
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
