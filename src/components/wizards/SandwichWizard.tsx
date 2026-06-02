import { useState } from 'react';
import { MenuItem } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { useSandwichTypes, useCruditeOptions, SandwichType } from '@/hooks/useSandwiches';
import { useSauceOptions, useSupplementOptions } from '@/hooks/useCustomizationOptions';
import { menuOptionPrices } from '@/data/menu';
import { useMenuOptionImages } from '@/hooks/useWizardImages';
import { SandwichCustomization } from '@/types/order';
import { trackProductView, trackAddToCart } from '@/hooks/useProductAnalytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Sandwich, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

// Emoji fallbacks for crudités
const cruditeEmojis: Record<string, string> = {
  'Salade': '🥬',
  'Tomate': '🍅',
  'Oignon': '🧅',
  'Oignons': '🧅',
  'Olive': '🫒',
  'Olives': '🫒',
  'Cornichon': '🥒',
};

// Emoji fallbacks for supplements
const supplementEmojis: Record<string, string> = {
  'Chèvre': '🐐',
  'Reblochon': '🧀',
  'Mozzarella': '🧀',
  'Raclette': '🫕',
  'Cheddar': '🧡',
  'Boursin': '🌿',
  'Fromage': '🧀',
};

// Default crudités that come pre-selected (user can remove them)
const DEFAULT_CRUDITES = ['Salade', 'Tomate', 'Oignon'];

interface SandwichWizardProps {
  onClose: () => void;
}

function getOptionEmoji(name: string, map: Record<string, string>): string {
  for (const [key, emoji] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🥗';
}

export function SandwichWizard({ onClose }: SandwichWizardProps) {
  const { addToCart } = useOrder();
  const { data: sandwichTypes, isLoading: loadingSandwiches } = useSandwichTypes();
  const { data: cruditeOptions } = useCruditeOptions();
  const { data: sauceOptionsData } = useSauceOptions();
  const { data: supplementOptionsData } = useSupplementOptions();

  const [step, setStep] = useState<number>(1);
  const [selectedSandwich, setSelectedSandwich] = useState<SandwichType | null>(null);
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  // Crudités: track which defaults have been removed
  const [removedDefaults, setRemovedDefaults] = useState<string[]>([]);
  const [selectedExtraCrudites, setSelectedExtraCrudites] = useState<string[]>([]);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');
  const [note, setNote] = useState('');
  const { data: menuOptionImages } = useMenuOptionImages();

  const totalSteps = 5;

  // Split crudites into defaults and extras
  const defaultCrudites = (cruditeOptions || []).filter(c =>
    DEFAULT_CRUDITES.some(d => c.name.toLowerCase().includes(d.toLowerCase()))
  );
  const extraCrudites = (cruditeOptions || []).filter(c =>
    !DEFAULT_CRUDITES.some(d => c.name.toLowerCase().includes(d.toLowerCase()))
  );

  const sauceSurcharge = Math.max(0, selectedSauces.length - FREE_SAUCES_COUNT) * EXTRA_SAUCE_PRICE;

  const toggleSauce = (sauce: string) => {
    setSelectedSauces(prev =>
      prev.includes(sauce) ? prev.filter(s => s !== sauce) : [...prev, sauce]
    );
  };

  const toggleDefaultCrudite = (cruditeId: string) => {
    setRemovedDefaults(prev =>
      prev.includes(cruditeId) ? prev.filter(c => c !== cruditeId) : [...prev, cruditeId]
    );
  };

  const toggleExtraCrudite = (cruditeId: string) => {
    setSelectedExtraCrudites(prev =>
      prev.includes(cruditeId) ? prev.filter(c => c !== cruditeId) : [...prev, cruditeId]
    );
  };

  const toggleSupplement = (supplement: string) => {
    setSelectedSupplements(prev =>
      prev.includes(supplement) ? prev.filter(s => s !== supplement) : [...prev, supplement]
    );
  };

  const calculatePrice = () => {
    if (!selectedSandwich) return 0;

    let price = selectedSandwich.base_price;

    selectedSupplements.forEach(supName => {
      const sup = supplementOptionsData?.find(s => s.name === supName);
      if (sup) price += sup.price;
    });

    if (menuOption === 'frites' || menuOption === 'boisson') {
      price += menuOptionPrices.frites;
    } else if (menuOption === 'menu') {
      price += menuOptionPrices.menu;
    }

    price += sauceSurcharge;

    return price;
  };

  const canContinue = () => {
    switch (step) {
      case 1: return selectedSandwich !== null;
      case 2: return selectedSauces.length > 0;
      case 3: return true; // Crudités optional
      case 4: return true; // Supplements optional
      case 5: return true; // Menu option
      default: return false;
    }
  };

  const handleAddToCart = () => {
    if (!selectedSandwich) return;

    // Build final crudites list
    const activeCruditeNames = [
      ...defaultCrudites.filter(c => !removedDefaults.includes(c.id)).map(c => c.name),
      ...extraCrudites.filter(c => selectedExtraCrudites.includes(c.id)).map(c => c.name),
    ];

    // Add "Sans X" for removed defaults
    const removedNames = defaultCrudites
      .filter(c => removedDefaults.includes(c.id))
      .map(c => `Sans ${c.name}`);

    const customization: SandwichCustomization = {
      sauces: selectedSauces,
      crudites: [...activeCruditeNames, ...removedNames],
      supplements: selectedSupplements,
      menuOption,
      note: note || undefined,
    };

    const menuItem: MenuItem = {
      id: `sandwich-${selectedSandwich.id}-${Date.now()}`,
      name: selectedSandwich.name,
      description: selectedSandwich.description || '',
      price: selectedSandwich.base_price,
      category: 'panini',
      imageUrl: selectedSandwich.image_url || undefined,
    };

    const calculatedPrice = calculatePrice();
    addToCart(menuItem, 1, customization, calculatedPrice);

    trackAddToCart(selectedSandwich.id, selectedSandwich.name, 'sandwiches');

    toast({
      title: 'Ajouté au panier',
      description: `${selectedSandwich.name}${menuOption !== 'none' ? ` (${menuOption})` : ''}`,
    });

    setSelectedSandwich(null);
    setSelectedSauces([]);
    setRemovedDefaults([]);
    setSelectedExtraCrudites([]);
    setSelectedSupplements([]);
    setMenuOption('none');
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

      case 2: {
        const freeSaucesLeft = Math.max(0, FREE_SAUCES_COUNT - selectedSauces.length);
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choisir vos sauces</h2>
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
              {sauceOptionsData?.map((sauce, index) => {
                const isSelected = selectedSauces.includes(sauce.name);
                const sauceIndex = selectedSauces.indexOf(sauce.name);
                const isPaidSauce = sauceIndex >= FREE_SAUCES_COUNT;
                const wouldBePaid = !isSelected && selectedSauces.length >= FREE_SAUCES_COUNT;
                const emoji = getOptionEmoji(sauce.name, sauceEmojis);
                return (
                  <Card
                    key={sauce.id}
                    className={`cursor-pointer transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleSauce(sauce.name)}
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
                      {wouldBePaid && <p className="text-xs text-primary font-semibold">+{EXTRA_SAUCE_PRICE.toFixed(2)}€</p>}
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

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Crudités</h2>

            {/* Default crudites — pre-selected, tap to remove */}
            {defaultCrudites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Inclus par défaut</p>
                <div className="grid grid-cols-3 gap-3">
                  {defaultCrudites.map((crudite) => {
                    const isRemoved = removedDefaults.includes(crudite.id);
                    const emoji = getOptionEmoji(crudite.name, cruditeEmojis);
                    return (
                      <Card
                        key={crudite.id}
                        className={`cursor-pointer transition-all overflow-hidden ${!isRemoved ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50 opacity-60'}`}
                        onClick={() => toggleDefaultCrudite(crudite.id)}
                      >
                        <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                          {crudite.image_url ? (
                            <img src={crudite.image_url} alt={crudite.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{emoji}</span>
                          )}
                          {!isRemoved && (
                            <div className="absolute top-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isRemoved && (
                            <div className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center">
                          <p className="font-medium text-sm">{crudite.name}</p>
                          {isRemoved && <p className="text-xs text-red-500">Retiré</p>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra crudites */}
            {extraCrudites.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Ajouter</p>
                <div className="grid grid-cols-3 gap-3">
                  {extraCrudites.map((crudite) => {
                    const emoji = getOptionEmoji(crudite.name, cruditeEmojis);
                    return (
                      <Card
                        key={crudite.id}
                        className={`cursor-pointer transition-all overflow-hidden ${selectedExtraCrudites.includes(crudite.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                        onClick={() => toggleExtraCrudite(crudite.id)}
                      >
                        <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                          {crudite.image_url ? (
                            <img src={crudite.image_url} alt={crudite.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{emoji}</span>
                          )}
                          {selectedExtraCrudites.includes(crudite.id) && (
                            <div className="absolute top-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 text-center">
                          <p className="font-medium text-sm">{crudite.name}</p>
                          {crudite.price > 0 && <p className="text-xs text-primary font-semibold">+{crudite.price.toFixed(2)}€</p>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Suppléments (optionnel)</h2>
            <div className="grid grid-cols-3 gap-3">
              {supplementOptionsData?.map(sup => {
                const emoji = getOptionEmoji(sup.name, supplementEmojis);
                return (
                  <Card
                    key={sup.id}
                    className={`cursor-pointer transition-all overflow-hidden ${selectedSupplements.includes(sup.name) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleSupplement(sup.name)}
                  >
                    <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {sup.image_url ? (
                        <img src={sup.image_url} alt={sup.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{emoji}</span>
                      )}
                      {selectedSupplements.includes(sup.name) && (
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
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Options menu</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'none', label: 'Sans supplément', price: 0, emoji: '🚫', imageUrl: null },
                  { id: 'frites', label: 'Frites', price: menuOptionPrices.frites, emoji: '🍟', imageUrl: menuOptionImages?.frites || null },
                  { id: 'boisson', label: 'Boisson', price: menuOptionPrices.boisson, emoji: '🥤', imageUrl: menuOptionImages?.boisson || null },
                  { id: 'menu', label: 'Menu Complet', price: menuOptionPrices.menu, emoji: '🍔', imageUrl: menuOptionImages?.menu || null, desc: 'Frites + Boisson' },
                ].map((option) => {
                  const isSelected = menuOption === option.id;
                  return (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all overflow-hidden ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setMenuOption(option.id as typeof menuOption)}
                    >
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {option.imageUrl ? (
                          <img src={option.imageUrl} alt={option.label} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{option.emoji}</span>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-center">
                        <p className="font-medium text-sm leading-tight">{option.label}</p>
                        {option.price > 0 && (
                          <p className="text-xs text-primary font-semibold">+{option.price.toFixed(2)}€</p>
                        )}
                        {option.desc && <p className="text-[10px] text-muted-foreground">{option.desc}</p>}
                      </div>
                    </Card>
                  );
                })}
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
                  Sandwiches
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
                className={`h-1 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'}`}
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
