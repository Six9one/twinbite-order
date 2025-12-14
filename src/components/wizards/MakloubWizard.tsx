import { useState } from 'react';
import { MenuItem, MakloubCustomization } from '@/types/order';
import { makloub, meatOptions, sauceOptions, makloubGarnitureOptions, cheeseSupplementOptions } from '@/data/menu';
import { useOrder } from '@/context/OrderContext';
import { trackAddToCart } from '@/hooks/useProductAnalytics';
import { useProductsByCategory, Product } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MakloubWizardProps {
  onClose: () => void;
}

type MakloubSize = 'solo' | 'double';

// Helper to map database products to expected shape
function mapDbProductsToMakloub(products: Product[] | undefined): MenuItem[] {
  if (!products || products.length === 0) return makloub;
  
  // Sort by base_price to determine size
  const sorted = [...products].sort((a, b) => Number(a.base_price) - Number(b.base_price));
  
  return sorted.map((p, idx) => {
    let size: MakloubSize = 'solo';
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('double')) size = 'double';
    else if (idx === 1) size = 'double';
    
    return {
      id: `makloub-${size}`,
      name: p.name,
      description: p.description || '',
      price: Number(p.base_price),
      category: 'makloub' as const,
      imageUrl: p.image_url || undefined,
    };
  });
}

export function MakloubWizard({ onClose }: MakloubWizardProps) {
  const { addToCart } = useOrder();
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<MakloubSize>('solo');
  const [selectedMeats, setSelectedMeats] = useState<string[]>([]);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedGarnitures, setSelectedGarnitures] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Load makloub from database (fallback to static)
  const { data: dbMakloub } = useProductsByCategory('makloub');
  const makloubProducts = mapDbProductsToMakloub(dbMakloub);

  const maxMeats = size === 'solo' ? 1 : 2;
  const makloubItem = makloubProducts.find(m => m.id === `makloub-${size}`) || makloub.find(m => m.id === `makloub-${size}`);

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
    let price = makloubItem?.price || 0;
    
    // Add supplement costs (1€ each)
    price += selectedSupplements.length * 1;
    
    return price;
  };

  const canContinue = () => {
    if (step === 1) return true;
    if (step === 2) return selectedMeats.length > 0;
    if (step === 3) return selectedSauces.length > 0;
    return true;
  };

  const handleAddToCart = () => {
    if (!makloubItem) return;

    const customization: MakloubCustomization = {
      size,
      meats: selectedMeats,
      sauces: selectedSauces,
      garnitures: selectedGarnitures,
      supplements: selectedSupplements,
      note: note || undefined,
    };

    const cartItem: MenuItem = {
      ...makloubItem,
      id: `${makloubItem.id}-${Date.now()}`,
    };

    const calculatedPrice = calculatePrice();
    addToCart(cartItem, 1, customization, calculatedPrice);
    
    // Track analytics
    trackAddToCart(makloubItem.id, `Makloub ${size}`, 'makloub');
    
    const meatNames = selectedMeats.map(id => meatOptions.find(m => m.id === id)?.name).join(', ');
    toast({
      title: 'Ajouté au panier',
      description: `Makloub ${size} - ${meatNames}`,
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
              {(['solo', 'double'] as MakloubSize[]).map((s) => {
                const item = makloubProducts.find(m => m.id === `makloub-${s}`) || makloub.find(m => m.id === `makloub-${s}`);
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
                      {s === 'solo' ? '1' : '2'} viande{s !== 'solo' ? 's' : ''}
                    </p>
                    <p className="text-xl font-bold text-primary mt-2">{item?.price}€</p>
                  </Card>
                );
              })}
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
            <h2 className="text-lg font-semibold">Choisir les garnitures</h2>
            <p className="text-sm text-muted-foreground">Sélection multiple possible</p>
            <div className="grid grid-cols-3 gap-3">
              {makloubGarnitureOptions.map((gar) => (
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

            <h3 className="text-lg font-semibold">Suppléments fromage</h3>
            <p className="text-sm text-muted-foreground">1€ par supplément</p>
            <div className="grid grid-cols-2 gap-3">
              {cheeseSupplementOptions.map((sup) => (
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
              <h1 className="text-2xl font-display font-bold">Makloub</h1>
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
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
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
