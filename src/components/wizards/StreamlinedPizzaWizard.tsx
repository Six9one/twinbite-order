import { useState } from 'react';
import { MenuItem, PizzaCustomization } from '@/types/order';
import { pizzasTomate, pizzasCreme, pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { isMenuMidiTime } from '@/utils/promotions';
import { useOrder } from '@/context/OrderContext';
import { usePizzasByBase } from '@/hooks/useProducts';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Plus, Minus, Pizza, Sun, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { playTossAnimation } from '@/utils/tossAnimation';
import { PizzaIngredientCustomizer, PizzaExtra } from '@/components/wizards/PizzaIngredientCustomizer';

const toppingVisuals: Record<string, { emoji: string; positions: { top: string; left: string }[] }> = {
  chevre: {
    emoji: '🧀',
    positions: [
      { top: '25%', left: '30%' },
      { top: '35%', left: '60%' },
      { top: '55%', left: '25%' },
      { top: '65%', left: '55%' },
      { top: '45%', left: '45%' },
    ]
  },
  reblochon: {
    emoji: '🧀',
    positions: [
      { top: '20%', left: '45%' },
      { top: '40%', left: '20%' },
      { top: '50%', left: '65%' },
      { top: '70%', left: '35%' },
    ]
  },
  mozzarella: {
    emoji: '⚪',
    positions: [
      { top: '15%', left: '35%' },
      { top: '30%', left: '50%' },
      { top: '50%', left: '30%' },
      { top: '60%', left: '60%' },
      { top: '40%', left: '75%' },
    ]
  },
  raclette: {
    emoji: '🟨',
    positions: [
      { top: '30%', left: '35%' },
      { top: '45%', left: '60%' },
      { top: '60%', left: '40%' },
    ]
  },
  cheddar: {
    emoji: '🟧',
    positions: [
      { top: '25%', left: '55%' },
      { top: '55%', left: '25%' },
      { top: '65%', left: '60%' },
      { top: '40%', left: '40%' },
    ]
  },
  boursin: {
    emoji: '🌿',
    positions: [
      { top: '30%', left: '25%' },
      { top: '20%', left: '60%' },
      { top: '50%', left: '50%' },
      { top: '65%', left: '30%' },
      { top: '60%', left: '70%' },
    ]
  }
};


interface StreamlinedPizzaWizardProps {
  onClose: () => void;
  lockedSize?: 'senior' | 'mega' | null;
}

export function StreamlinedPizzaWizard({ onClose, lockedSize }: StreamlinedPizzaWizardProps) {
  const { cart, addToCart, removeFromCart, getTotal, getItemCount } = useOrder();

  // Selected format states
  const [selectedSize, setSelectedSize] = useState<'senior' | 'mega'>(lockedSize || 'senior');
  const [selectedIsMenuMidi, setSelectedIsMenuMidi] = useState<boolean>(false);
  const [activeBase, setActiveBase] = useState<'tomate' | 'creme'>('tomate');

  // Customization state
  const [customizingPizza, setCustomizingPizza] = useState<MenuItem | null>(null);
  const [customNote, setCustomNote] = useState('');

  // Database pizzas
  const { data: dbPizzasTomate, isLoading: loadingTomate } = usePizzasByBase('tomate');
  const { data: dbPizzasCreme, isLoading: loadingCreme } = usePizzasByBase('creme');

  const displayPizzasTomate = dbPizzasTomate && dbPizzasTomate.length > 0 
    ? dbPizzasTomate.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.base_price) || 18,
        category: 'pizzas' as const,
        base: 'tomate' as const,
        imageUrl: p.image_url || undefined
      }))
    : pizzasTomate;

  const displayPizzasCreme = dbPizzasCreme && dbPizzasCreme.length > 0 
    ? dbPizzasCreme.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.base_price) || 18,
        category: 'pizzas' as const,
        base: 'creme' as const,
        imageUrl: p.image_url || undefined
      }))
    : pizzasCreme;

  const displayPizzas = activeBase === 'tomate' ? displayPizzasTomate : displayPizzasCreme;
  const showMenuMidi = isMenuMidiTime();

  // Pricing calculations based on format
  const getFormatPrice = (size: 'senior' | 'mega', isMidi: boolean) => {
    if (isMidi) {
      return size === 'senior' ? pizzaPrices.menuMidiSenior : pizzaPrices.menuMidiMega;
    }
    return size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
  };

  const currentPrice = getFormatPrice(selectedSize, selectedIsMenuMidi);

  // ─── Cart Quantity Helper ───
  const getPizzaCount = (pizzaId: string) => {
    return cart.filter(ci => 
      ci.item.category === 'pizzas' && 
      ci.item.id === pizzaId && 
      (ci.customization as PizzaCustomization)?.size === selectedSize && 
      (ci.customization as PizzaCustomization)?.base === activeBase &&
      (ci.customization as PizzaCustomization)?.isMenuMidi === selectedIsMenuMidi
    ).reduce((sum, ci) => sum + ci.quantity, 0);
  };

  // ─── Add/Remove Pizza Actions ───
  const handleQuickAdd = (pizza: MenuItem, event?: React.MouseEvent<HTMLButtonElement>) => {
    // When isMenuMidi, use 'menu_midi' / 'menu_midi_mega' size IDs so that
    // OrderContext and promotions.ts calculate the correct price.
    const sizeId = selectedIsMenuMidi
      ? (selectedSize === 'mega' ? 'menu_midi_mega' : 'menu_midi')
      : selectedSize;
    const customization: PizzaCustomization = {
      base: activeBase,
      size: sizeId,
      isMenuMidi: selectedIsMenuMidi,
    };
    addToCart(pizza, 1, customization, currentPrice);
    if (event) {
      playTossAnimation(event.currentTarget, 'pizzas');
    }
    toast.success(`${pizza.name} ajoutée au panier`);
  };

  const handleQuickRemove = (pizzaId: string) => {
    const matches = cart.filter(ci => 
      ci.item.category === 'pizzas' && 
      ci.item.id === pizzaId && 
      (ci.customization as PizzaCustomization)?.size === selectedSize && 
      (ci.customization as PizzaCustomization)?.base === activeBase &&
      (ci.customization as PizzaCustomization)?.isMenuMidi === selectedIsMenuMidi
    );
    if (matches.length > 0) {
      removeFromCart(matches[matches.length - 1].id);
      toast.error(`Pizza retirée`);
    }
  };

  // ─── Customization Handler ───
  const openCustomization = (pizza: MenuItem) => {
    setCustomizingPizza(pizza);
    setCustomNote('');
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="w-10 h-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">🍕 Pizzas</h1>
              <p className="text-xs text-muted-foreground">Sélectionnez la taille et ajoutez vos pizzas</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-semibold text-muted-foreground mr-2">Panier</span>
            <Badge variant="secondary" className="px-2.5 py-1 text-sm bg-primary/10 text-primary border-primary/20">
              {getItemCount()} articles • {getTotal().toFixed(2)}€
            </Badge>
          </div>
        </div>

        {/* Format & Size Selection Pills */}
        <div className="container mx-auto px-4 pb-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format :</span>
          
          {/* Normal sizes */}
          <button
            onClick={() => {
              setSelectedSize('senior');
              setSelectedIsMenuMidi(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedSize === 'senior' && !selectedIsMenuMidi
                ? 'bg-amber-400 border-amber-400 text-black shadow-md scale-105'
                : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Senior 31cm ({pizzaPrices.senior}€)
          </button>

          <button
            onClick={() => {
              setSelectedSize('mega');
              setSelectedIsMenuMidi(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedSize === 'mega' && !selectedIsMenuMidi
                ? 'bg-amber-400 border-amber-400 text-black shadow-md scale-105'
                : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Mega 40cm ({pizzaPrices.mega}€)
          </button>

          {/* Menu Midi options */}
          {showMenuMidi && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <button
                onClick={() => {
                  setSelectedSize('senior');
                  setSelectedIsMenuMidi(true);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                  selectedSize === 'senior' && selectedIsMenuMidi
                    ? 'bg-yellow-500 border-yellow-500 text-black shadow-md scale-105'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Midi Senior ({pizzaPrices.menuMidiSenior}€)
              </button>

              <button
                onClick={() => {
                  setSelectedSize('mega');
                  setSelectedIsMenuMidi(true);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                  selectedSize === 'mega' && selectedIsMenuMidi
                    ? 'bg-yellow-500 border-yellow-500 text-black shadow-md scale-105'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Midi Mega ({pizzaPrices.menuMidiMega}€)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Selector Body */}
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeBase} onValueChange={(val: any) => setActiveBase(val)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="tomate" className="text-sm font-semibold h-10">🍅 Base Tomate</TabsTrigger>
            <TabsTrigger value="creme" className="text-sm font-semibold h-10">🥛 Base Crème</TabsTrigger>
          </TabsList>

          <TabsContent value="tomate" className="mt-0">
            {loadingTomate ? (
              <div className="text-center py-12 text-muted-foreground">Chargement des pizzas tomate...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayPizzasTomate.map((pizza) => (
                  <PizzaCard
                    key={pizza.id}
                    pizza={pizza}
                    count={getPizzaCount(pizza.id)}
                    price={currentPrice}
                    onAdd={handleQuickAdd}
                    onRemove={handleQuickRemove}
                    onCustomize={openCustomization}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creme" className="mt-0">
            {loadingCreme ? (
              <div className="text-center py-12 text-muted-foreground">Chargement des pizzas crème...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayPizzasCreme.map((pizza) => (
                  <PizzaCard
                    key={pizza.id}
                    pizza={pizza}
                    count={getPizzaCount(pizza.id)}
                    price={currentPrice}
                    onAdd={handleQuickAdd}
                    onRemove={handleQuickRemove}
                    onCustomize={openCustomization}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Full-Screen Customization (new) */}
      {customizingPizza && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <PizzaIngredientCustomizer
            pizza={customizingPizza}
            basePrice={currentPrice}
            formatLabel={
              selectedIsMenuMidi
                ? `Midi ${selectedSize === 'mega' ? 'Mega' : 'Senior'}`
                : `${selectedSize === 'mega' ? 'Mega 40cm' : 'Senior 31cm'}`
            }
            isKiosk={false}
            onBack={() => setCustomizingPizza(null)}
            onConfirm={(removed, extras, noteText) => {
              const sizeId = selectedIsMenuMidi
                ? (selectedSize === 'mega' ? 'menu_midi_mega' : 'menu_midi')
                : selectedSize;
              const extrasPrice = extras.reduce((s: number, e: PizzaExtra) => s + e.price, 0);
              const finalPrice = currentPrice + extrasPrice;
              const customization: PizzaCustomization = {
                base: activeBase,
                size: sizeId,
                isMenuMidi: selectedIsMenuMidi,
                note: noteText.trim() || undefined,
                removedIngredients: removed.length > 0 ? removed : undefined,
                addedExtras: extras.length > 0 ? extras : undefined,
              };
              addToCart(customizingPizza, 1, customization, finalPrice);
              toast.success(`${customizingPizza.name} personnalisée ajoutée !`);
              setCustomizingPizza(null);
            }}
          />
        </div>
      )}


      {/* Floating View Cart Footer (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-background/95 backdrop-blur border-t border-border z-35 md:hidden safe-bottom">
        <Button
          onClick={onClose}
          className="w-full h-14 text-base shadow-lg rounded-xl relative bg-stone-900 hover:bg-stone-850 text-white font-bold"
        >
          <ShoppingCart className="w-5 h-5 mr-2 text-amber-400" />
          Retour au menu ({getItemCount()} Pizzas)
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-Component: PizzaCard ───
interface PizzaCardProps {
  pizza: MenuItem;
  count: number;
  price: number;
  onAdd: (pizza: MenuItem, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onRemove: (pizzaId: string) => void;
  onCustomize: (pizza: MenuItem) => void;
}

function PizzaCard({ pizza, count, price, onAdd, onRemove, onCustomize }: PizzaCardProps) {
  const imageUrl = pizza.imageUrl;
  return (
    <Card className="overflow-hidden border border-border flex flex-col justify-between hover:shadow-md transition-shadow relative">
      <div className="p-4 flex gap-4">
        {/* Pizza Thumbnail image */}
        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-muted-foreground/10 shadow-sm">
          {imageUrl ? (
            <div className="w-full h-full animate-spin-slow">
              <OptimizedImage
                src={imageUrl}
                alt={pizza.name}
                className="w-full h-full object-cover"
                containerClassName="w-full h-full"
              />
            </div>
          ) : (
            <Pizza className="w-8 h-8 text-muted-foreground/30" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">{pizza.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {pizza.description}
          </p>
          <p className="text-sm font-extrabold text-primary mt-2">
            {price.toFixed(2)}€
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-3 pt-1 border-t border-muted/30">
        <button 
          onClick={() => onCustomize(pizza)}
          className="text-xs font-semibold text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1"
        >
          📝 Personnaliser
        </button>

        {count > 0 ? (
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background"
              onClick={() => onRemove(pizza.id)}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="w-5 text-center font-bold text-xs">{count}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background"
              onClick={(e) => onAdd(pizza, e)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={(e) => onAdd(pizza, e)}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        )}
      </div>
    </Card>
  );
}
