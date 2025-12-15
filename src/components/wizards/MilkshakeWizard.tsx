import { useState } from 'react';
import { MenuItem } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MilkshakeWizardProps {
  onClose: () => void;
}

const milkshakeToppings = [
  { id: 'kinder-bueno', name: 'Kinder Bueno', price: 0 },
  { id: 'oreo', name: 'Oreo', price: 0 },
  { id: 'mms', name: "M&M's", price: 0 },
  { id: 'speculoos', name: 'Speculoos', price: 0 },
  { id: 'nutella', name: 'Nutella', price: 0 },
  { id: 'daim', name: 'Daim', price: 0 },
];

const coulisList = [
  { id: 'caramel', name: 'Coulis Caramel', price: 0 },
  { id: 'chocolat', name: 'Coulis Chocolat', price: 0 },
];

export function MilkshakeWizard({ onClose }: MilkshakeWizardProps) {
  const { addToCart } = useOrder();
  
  const [step, setStep] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCoulis, setSelectedCoulis] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const maxToppings = 2;
  const totalSteps = 3;
  const basePrice = 5;

  const toggleTopping = (toppingId: string) => {
    if (selectedToppings.includes(toppingId)) {
      setSelectedToppings(selectedToppings.filter(t => t !== toppingId));
    } else if (selectedToppings.length < maxToppings) {
      setSelectedToppings([...selectedToppings, toppingId]);
    }
  };

  const calculatePrice = () => {
    return basePrice;
  };

  const canContinue = () => {
    if (step === 1) return selectedToppings.length > 0;
    return true;
  };

  const handleAddToCart = () => {
    const toppingNames = selectedToppings.map(id => {
      const topping = milkshakeToppings.find(t => t.id === id);
      return topping?.name || id;
    });
    
    const coulisName = selectedCoulis 
      ? coulisList.find(c => c.id === selectedCoulis)?.name 
      : null;

    const description = `Base vanille, ${toppingNames.join(' + ')}${coulisName ? `, ${coulisName}` : ''}, Crème Chantilly`;

    const baseItem: MenuItem = {
      id: `milkshake-custom`,
      name: `Milkshake ${toppingNames.join(' & ')}`,
      description,
      price: basePrice,
      category: 'milkshakes',
    };

    const customization = {
      base: 'vanille',
      toppings: toppingNames,
      coulis: coulisName || undefined,
      chantilly: true,
      note: note || undefined,
    };

    const cartItem: MenuItem = {
      ...baseItem,
      id: `${baseItem.id}-${Date.now()}`,
    };

    addToCart(cartItem, 1, customization as any, calculatePrice());
    
    trackAddToCart(baseItem.id, `Milkshake`, 'milkshakes');
    
    toast({
      title: 'Ajouté au panier',
      description: `Milkshake ${toppingNames.join(' & ')}`,
    });
    
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choisir vos toppings</h2>
              <Badge>{selectedToppings.length}/{maxToppings}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Sélectionnez jusqu'à 2 toppings</p>
            
            <Alert className="bg-primary/10 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                Base vanille • Crème Chantilly incluse
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-3">
              {milkshakeToppings.map((topping) => (
                <Card
                  key={topping.id}
                  className={`p-4 cursor-pointer transition-all ${selectedToppings.includes(topping.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'} ${selectedToppings.length >= maxToppings && !selectedToppings.includes(topping.id) ? 'opacity-50' : ''}`}
                  onClick={() => toggleTopping(topping.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{topping.name}</span>
                    {selectedToppings.includes(topping.id) && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir le coulis</h2>
            <p className="text-sm text-muted-foreground">Optionnel</p>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`p-4 cursor-pointer transition-all ${selectedCoulis === null ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedCoulis(null)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Sans coulis</span>
                  {selectedCoulis === null && <Check className="w-5 h-5 text-primary" />}
                </div>
              </Card>
              {coulisList.map((coulis) => (
                <Card
                  key={coulis.id}
                  className={`p-4 cursor-pointer transition-all ${selectedCoulis === coulis.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedCoulis(coulis.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{coulis.name}</span>
                    {selectedCoulis === coulis.id && <Check className="w-5 h-5 text-primary" />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            
            <Card className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base</span>
                <span className="font-medium">Vanille</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toppings</span>
                <span className="font-medium">
                  {selectedToppings.map(id => 
                    milkshakeToppings.find(t => t.id === id)?.name
                  ).join(', ')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coulis</span>
                <span className="font-medium">
                  {selectedCoulis 
                    ? coulisList.find(c => c.id === selectedCoulis)?.name 
                    : 'Sans coulis'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-primary">
                <span className="font-medium">✓ Crème Chantilly incluse</span>
              </div>
            </Card>

            <div className="space-y-2">
              <h3 className="font-semibold">Notes / Remarques</h3>
              <Textarea
                placeholder="Ex: sans chantilly..."
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
              <h1 className="text-2xl font-display font-bold">Milkshake</h1>
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
