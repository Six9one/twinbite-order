import { useState, useEffect } from 'react';
import { MenuItem, PizzaCustomization, PizzaBase, PizzaSize } from '@/types/order';
import { pizzasTomate, pizzasCreme, pizzaPrices } from '@/data/menu';
import { isMenuMidiTime, getMenuMidiRemainingTime } from '@/utils/promotions';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Pizza, Sun, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PizzaWizardProps {
  onClose: () => void;
}

export function PizzaWizard({ onClose }: PizzaWizardProps) {
  const { addToCart, orderType } = useOrder();
  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [base, setBase] = useState<PizzaBase>('tomate');
  const [size, setSize] = useState<PizzaSize>('senior');
  const [isMenuMidi, setIsMenuMidi] = useState(false);
  const [note, setNote] = useState('');
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const showMenuMidi = isMenuMidiTime();
  const promoText = orderType === 'livraison' 
    ? '2 achetées = 1 offerte' 
    : orderType ? '1 achetée = 1 offerte' : null;

  // Update countdown every second
  useEffect(() => {
    if (!showMenuMidi) return;
    
    const updateCountdown = () => {
      setCountdown(getMenuMidiRemainingTime());
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [showMenuMidi]);

  const handleSelectPizza = (pizza: MenuItem) => {
    setSelectedPizza(pizza);
    setBase(pizza.base || 'tomate');
    setStep('customize');
  };

  const getPrice = () => {
    if (isMenuMidi && showMenuMidi) {
      return size === 'senior' ? pizzaPrices.menuMidiSenior : pizzaPrices.menuMidiMega;
    }
    return size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
  };

  const handleAddToCart = () => {
    if (!selectedPizza) return;

    const customization: PizzaCustomization = {
      base,
      size,
      isMenuMidi: isMenuMidi && showMenuMidi,
      note: note || undefined,
    };

    const cartItem = {
      ...selectedPizza,
      id: `${selectedPizza.id}-${Date.now()}`,
    };

    addToCart(cartItem, 1, customization);
    
    toast({
      title: 'Ajouté au panier',
      description: `${selectedPizza.name} ${size === 'mega' ? 'Mega' : 'Senior'}${isMenuMidi ? ' (Menu Midi)' : ''}`,
    });
    
    // Reset and go back to pizza selection instead of closing
    setSelectedPizza(null);
    setSize('senior');
    setIsMenuMidi(false);
    setNote('');
    setStep('select');
  };

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-display font-bold">Nos Pizzas</h1>
                {promoText && (
                  <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary">
                    {promoText}
                  </Badge>
                )}
              </div>
            </div>

            {/* Menu Midi availability banner */}
            {showMenuMidi && countdown && (
              <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-600">
                  <Sun className="w-5 h-5" />
                  <span className="font-semibold">Menu Midi disponible</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-600 font-mono">
                  <Clock className="w-4 h-4" />
                  <span>Fin dans {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            )}
            {!showMenuMidi && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Menu midi disponible uniquement de 11:00 à 15:00
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="tomate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tomate" className="text-base">
                🍅 Base Tomate
              </TabsTrigger>
              <TabsTrigger value="creme" className="text-base">
                🥛 Base Crème
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tomate">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pizzasTomate.map((pizza) => (
                  <Card
                    key={pizza.id}
                    className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30"
                    onClick={() => handleSelectPizza(pizza)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg">{pizza.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{pizza.description}</p>
                      </div>
                      <Pizza className="w-8 h-8 text-primary/50" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{pizzaPrices.senior}€</span>
                      <span className="text-sm text-muted-foreground">Senior</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-lg font-bold text-primary">{pizzaPrices.mega}€</span>
                      <span className="text-sm text-muted-foreground">Mega</span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="creme">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pizzasCreme.map((pizza) => (
                  <Card
                    key={pizza.id}
                    className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30"
                    onClick={() => handleSelectPizza(pizza)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg">{pizza.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{pizza.description}</p>
                      </div>
                      <Pizza className="w-8 h-8 text-primary/50" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{pizzaPrices.senior}€</span>
                      <span className="text-sm text-muted-foreground">Senior</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-lg font-bold text-primary">{pizzaPrices.mega}€</span>
                      <span className="text-sm text-muted-foreground">Mega</span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Customize step
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">{selectedPizza?.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedPizza?.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Size Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Choisir la taille</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={`p-4 cursor-pointer transition-all ${size === 'senior' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              onClick={() => setSize('senior')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Senior</h3>
                  <p className="text-2xl font-bold text-primary">{pizzaPrices.senior}€</p>
                </div>
                {size === 'senior' && <Check className="w-6 h-6 text-primary" />}
              </div>
            </Card>
            <Card
              className={`p-4 cursor-pointer transition-all ${size === 'mega' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              onClick={() => setSize('mega')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Mega</h3>
                  <p className="text-2xl font-bold text-primary">{pizzaPrices.mega}€</p>
                  <p className="text-xs text-muted-foreground">+7€</p>
                </div>
                {size === 'mega' && <Check className="w-6 h-6 text-primary" />}
              </div>
            </Card>
          </div>
        </div>

        {/* Menu Midi Options */}
        {showMenuMidi && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              Menu Midi
              {countdown && (
                <span className="text-sm font-mono text-yellow-600">
                  (Fin dans {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')})
                </span>
              )}
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Menu Midi Senior */}
              {size === 'senior' && (
                <Card
                  className={`p-4 cursor-pointer transition-all border-2 ${isMenuMidi ? 'border-yellow-500 bg-yellow-500/10' : 'border-transparent hover:bg-muted/50'}`}
                  onClick={() => setIsMenuMidi(!isMenuMidi)}
                >
                  <div className="flex items-center gap-3">
                    <Sun className="w-8 h-8 text-yellow-500" />
                    <div className="flex-1">
                      <h3 className="font-semibold">Menu Midi Senior</h3>
                      <p className="text-sm text-muted-foreground">Pizza Senior + Boisson</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600">{pizzaPrices.menuMidiSenior}€</p>
                      <p className="text-xs text-green-600">Économie de {pizzaPrices.senior + 2 - pizzaPrices.menuMidiSenior}€</p>
                    </div>
                    {isMenuMidi && <Check className="w-6 h-6 text-yellow-500" />}
                  </div>
                </Card>
              )}
              
              {/* Menu Midi Mega */}
              {size === 'mega' && (
                <Card
                  className={`p-4 cursor-pointer transition-all border-2 ${isMenuMidi ? 'border-yellow-500 bg-yellow-500/10' : 'border-transparent hover:bg-muted/50'}`}
                  onClick={() => setIsMenuMidi(!isMenuMidi)}
                >
                  <div className="flex items-center gap-3">
                    <Sun className="w-8 h-8 text-yellow-500" />
                    <div className="flex-1">
                      <h3 className="font-semibold">Menu Midi Mega</h3>
                      <p className="text-sm text-muted-foreground">Pizza Mega + Boisson</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600">{pizzaPrices.menuMidiMega}€</p>
                      <p className="text-xs text-green-600">Économie de {pizzaPrices.mega + 2 - pizzaPrices.menuMidiMega}€</p>
                    </div>
                    {isMenuMidi && <Check className="w-6 h-6 text-yellow-500" />}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Notes / Remarques</h2>
          <Textarea
            placeholder="Ex: bien cuite, sans oignons..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Promo reminder */}
        {promoText && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-center">
              <span className="font-semibold text-primary">Rappel :</span> {promoText}
            </p>
          </Card>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container mx-auto">
          <Button 
            className="w-full h-14 text-lg" 
            onClick={handleAddToCart}
          >
            Ajouter au panier - {getPrice()}€
          </Button>
        </div>
      </div>
    </div>
  );
}