import { useState } from 'react';
import { MenuItem } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { useSandwichTypes, useCruditeOptions, SandwichType } from '@/hooks/useSandwiches';
import { useSauceOptions, useSupplementOptions } from '@/hooks/useCustomizationOptions';
import { useProductsByCategory } from '@/hooks/useProducts';
import { menuOptionPrices, boissons as staticBoissons } from '@/data/menu';
import { SandwichCustomization } from '@/types/order';
import { trackProductView, trackAddToCart } from '@/hooks/useProductAnalytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Sandwich, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SandwichWizardProps {
  onClose: () => void;
}

export function SandwichWizard({ onClose }: SandwichWizardProps) {
  const { addToCart } = useOrder();
  const { data: sandwichTypes, isLoading: loadingSandwiches } = useSandwichTypes();
  const { data: cruditeOptions } = useCruditeOptions();
  const { data: sauceOptions } = useSauceOptions();
  const { data: supplementOptions } = useSupplementOptions();

  const [step, setStep] = useState<number>(1);
  const [selectedSandwich, setSelectedSandwich] = useState<SandwichType | null>(null);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const [selectedCrudites, setSelectedCrudites] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [selectedMenuDrink, setSelectedMenuDrink] = useState<string | null>(null);
  const [selectedExtraDrinks, setSelectedExtraDrinks] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const { data: dbBoissons } = useProductsByCategory('boissons');

  const boissonOptions = dbBoissons && dbBoissons.length > 0
    ? dbBoissons.filter(p => p.is_active).map(p => ({ id: p.id, name: p.name, price: Number(p.base_price || 0), image_url: p.image_url }))
    : staticBoissons.map(p => ({ id: p.id, name: p.name, price: Number(p.price || 0), image_url: p.imageUrl || p.image }));

  const requiresDrinkSelect = menuOption === 'boisson' || menuOption === 'menu';
  const totalSteps = requiresDrinkSelect ? 6 : 5;

  const toggleSauce = (sauce: string) => {
    setSelectedSauces(prev =>
      prev.includes(sauce) ? prev.filter(s => s !== sauce) : [...prev, sauce]
    );
  };

  const toggleCrudite = (crudite: string) => {
    setSelectedCrudites(prev =>
      prev.includes(crudite) ? prev.filter(c => c !== crudite) : [...prev, crudite]
    );
  };

  const toggleSupplement = (supplement: string) => {
    setSelectedSupplements(prev =>
      prev.includes(supplement) ? prev.filter(s => s !== supplement) : [...prev, supplement]
    );
  };

  const toggleExtraDrink = (id: string) => {
    if (selectedExtraDrinks.includes(id)) {
      setSelectedExtraDrinks(selectedExtraDrinks.filter(d => d !== id));
    } else {
      setSelectedExtraDrinks([...selectedExtraDrinks, id]);
    }
  };

  const calculatePrice = () => {
    if (!selectedSandwich) return 0;

    let price = selectedSandwich.base_price;

    // Add supplements
    selectedSupplements.forEach(supName => {
      const sup = supplementOptions?.find(s => s.name === supName);
      if (sup) price += sup.price;
    });

    // Add menu option
    if (menuOption === 'frites' || menuOption === 'boisson') {
      price += menuOptionPrices.frites;
    } else if (menuOption === 'menu') {
      price += menuOptionPrices.menu;
    }

    // Drink supplement (if expensive drink chosen for menu)
    if (requiresDrinkSelect && selectedMenuDrink) {
      const d = boissonOptions.find(b => b.id === selectedMenuDrink);
      if (d) {
        price += Math.max(0, d.price - 1.5);
      }
    }

    // Add extra drinks costs
    selectedExtraDrinks.forEach(dId => {
      const d = boissonOptions.find(b => b.id === dId);
      if (d) price += d.price;
    });

    return price;
  };

  const canContinue = () => {
    switch (step) {
      case 1: return selectedSandwich !== null;
      case 2: return selectedSauces.length > 0;
      case 3: return true; // Crudités optional
      case 4: return true; // Supplements optional
      case 5: return true; // Menu option
      case 6: return requiresDrinkSelect ? selectedMenuDrink !== null : true;
      default: return false;
    }
  };

  const handleAddToCart = () => {
    if (!selectedSandwich) return;

    const menuDrinkName = selectedMenuDrink ? boissonOptions.find(b => b.id === selectedMenuDrink)?.name : undefined;
    const extraDrinkNames = selectedExtraDrinks.map(id => boissonOptions.find(b => b.id === id)?.name || id);

    const customization: SandwichCustomization = {
      sauces: selectedSauces,
      crudites: selectedCrudites,
      supplements: selectedSupplements,
      menuOption,
      menuDrink: menuDrinkName,
      extraDrinks: extraDrinkNames.length > 0 ? extraDrinkNames : undefined,
      note: note || undefined,
    };

    const menuItem: MenuItem = {
      id: `sandwich-${selectedSandwich.id}-${Date.now()}`,
      name: selectedSandwich.name,
      description: selectedSandwich.description || '',
      price: selectedSandwich.base_price,
      category: 'panini', // Use existing category for now
      imageUrl: selectedSandwich.image_url || undefined,
    };

    const calculatedPrice = calculatePrice();
    addToCart(menuItem, 1, customization, calculatedPrice);

    trackAddToCart(selectedSandwich.id, selectedSandwich.name, 'sandwiches');

    toast({
      title: 'Ajouté au panier',
      description: `${selectedSandwich.name}${menuOption !== 'none' ? ` (${menuOption})` : ''}`,
    });

    // Reset for another order
    setSelectedSandwich(null);
    setSelectedSauces([]);
    setSelectedCrudites([]);
    setSelectedSupplements([]);
    setMenuOption('none');
    setSelectedMenuDrink(null);
    setSelectedExtraDrinks([]);
    setNote('');
    setStep(1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir votre sandwich</h2>
            {loadingSandwiches ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sandwichTypes?.map(sandwich => (
                  <Card
                    key={sandwich.id}
                    className={`overflow-hidden cursor-pointer transition-all ${selectedSandwich?.id === sandwich.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                      }`}
                    onClick={() => {
                      setSelectedSandwich(sandwich);
                      trackProductView(sandwich.id, sandwich.name, 'sandwiches');
                    }}
                  >
                    {sandwich.image_url ? (
                      <div className="aspect-video relative">
                        <img
                          src={sandwich.image_url}
                          alt={sandwich.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Sandwich className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{sandwich.name}</h3>
                        {selectedSandwich?.id === sandwich.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      {sandwich.description && (
                        <p className="text-sm text-muted-foreground mt-1">{sandwich.description}</p>
                      )}
                      <p className="text-lg font-bold text-primary mt-2">{sandwich.base_price.toFixed(2)}€</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir vos sauces</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sauceOptions?.map(sauce => (
                <Card
                  key={sauce.id}
                  className={`p-3 cursor-pointer transition-all ${selectedSauces.includes(sauce.name)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                    }`}
                  onClick={() => toggleSauce(sauce.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sauce.name}</span>
                    {selectedSauces.includes(sauce.name) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {selectedSauces.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Sélectionnées: {selectedSauces.join(', ')}
              </p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Crudités (optionnel)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cruditeOptions?.map(crudite => (
                <Card
                  key={crudite.id}
                  className={`p-3 cursor-pointer transition-all ${selectedCrudites.includes(crudite.name)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                    }`}
                  onClick={() => toggleCrudite(crudite.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{crudite.name}</span>
                    {selectedCrudites.includes(crudite.name) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Suppléments (+1€ chacun)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {supplementOptions?.map(sup => (
                <Card
                  key={sup.id}
                  className={`p-3 cursor-pointer transition-all ${selectedSupplements.includes(sup.name)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                    }`}
                  onClick={() => toggleSupplement(sup.name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{sup.name}</span>
                      <span className="text-xs text-muted-foreground ml-1">+{sup.price}€</span>
                    </div>
                    {selectedSupplements.includes(sup.name) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Options menu</h2>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`p-4 cursor-pointer transition-all ${menuOption === 'none' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  onClick={() => setMenuOption('none')}
                >
                  <div className="flex items-center justify-between">
                    <span>Sans supplément</span>
                    {menuOption === 'none' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </Card>
                <Card
                  className={`p-4 cursor-pointer transition-all ${menuOption === 'frites' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  onClick={() => setMenuOption('frites')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span>+ Frites</span>
                      <p className="text-xs text-muted-foreground">+{menuOptionPrices.frites}€</p>
                    </div>
                    {menuOption === 'frites' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </Card>
                <Card
                  className={`p-4 cursor-pointer transition-all ${menuOption === 'boisson' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  onClick={() => setMenuOption('boisson')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span>+ Boisson</span>
                      <p className="text-xs text-muted-foreground">+{menuOptionPrices.boisson}€</p>
                    </div>
                    {menuOption === 'boisson' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </Card>
                <Card
                  className={`p-4 cursor-pointer transition-all ${menuOption === 'menu' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  onClick={() => setMenuOption('menu')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span>Menu Complet</span>
                      <p className="text-xs text-muted-foreground">Frites + Boisson +{menuOptionPrices.menu}€</p>
                    </div>
                    {menuOption === 'menu' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Notes (optionnel)</h2>
              <Textarea
                placeholder="Instructions spéciales..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        );

      case 6:
        if (!requiresDrinkSelect) return null;
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Votre Boisson Menu <span className="text-red-500">*</span></h2>
              <p className="text-sm text-muted-foreground mb-3">Choisissez la boisson incluse dans votre formule.</p>
              <div className="grid grid-cols-2 gap-3">
                {boissonOptions.map((boisson) => {
                  const supplement = Math.max(0, boisson.price - 1.5);
                  return (
                    <Card
                      key={`menu-${boisson.id}`}
                      className={`p-3 cursor-pointer transition-all ${selectedMenuDrink === boisson.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedMenuDrink(boisson.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{boisson.name}</span>
                        {selectedMenuDrink === boisson.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="mt-1">
                        {supplement > 0 ? (
                          <span className="text-sm font-semibold text-primary">+{supplement.toFixed(2)}€</span>
                        ) : (
                          <span className="text-xs font-semibold text-green-600">Inclus</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="my-4 border-t border-border" />

            <div>
              <h2 className="text-lg font-semibold">Boissons Supplémentaires</h2>
              <p className="text-sm text-muted-foreground mb-3">Envie d'une autre boisson ? (Prix normal)</p>
              <div className="grid grid-cols-2 gap-3">
                {boissonOptions.map((boisson) => (
                  <Card
                    key={`extra-${boisson.id}`}
                    className={`p-3 cursor-pointer transition-all ${selectedExtraDrinks.includes(boisson.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleExtraDrink(boisson.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{boisson.name}</span>
                      {selectedExtraDrinks.includes(boisson.id) && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-sm text-primary font-semibold">+{boisson.price.toFixed(2)}€</span>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-display font-bold">
                  Sandwiches (pain maison)
                </h1>
                <p className="text-sm text-muted-foreground">Étape {step}/{totalSteps}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-primary">{calculatePrice().toFixed(2)}€</span>
          </div>

          {/* Progress */}
          <div className="flex gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {renderStep()}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button
          className="w-full h-12 text-lg"
          disabled={!canContinue()}
          onClick={() => {
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              handleAddToCart();
            }
          }}
        >
          {step < totalSteps ? 'Continuer' : 'Ajouter au panier'}
        </Button>
      </div>
    </div>
  );
}
