import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { souffletOptions, menuItems } from '@/data/menu';
import { SouffletOrder } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { toast } from 'sonner';

interface SouffletBuilderProps {
  onClose: () => void;
}

const steps = ['Viande', 'Sauce', 'Garnitures', 'Accompagnement'];

export function SouffletBuilder({ onClose }: SouffletBuilderProps) {
  const { addToCart } = useOrder();
  const [currentStep, setCurrentStep] = useState(0);
  const [order, setOrder] = useState<SouffletOrder>({
    meat: null,
    sauce: null,
    toppings: [],
    side: null,
  });

  const handleMeatSelect = (meatId: string) => {
    setOrder({ ...order, meat: meatId });
  };

  const handleSauceSelect = (sauceId: string) => {
    setOrder({ ...order, sauce: sauceId });
  };

  const handleToppingToggle = (toppingId: string) => {
    const newToppings = order.toppings.includes(toppingId)
      ? order.toppings.filter(t => t !== toppingId)
      : [...order.toppings, toppingId];
    setOrder({ ...order, toppings: newToppings });
  };

  const handleSideSelect = (sideId: string) => {
    setOrder({ ...order, side: sideId });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!order.meat;
      case 1: return !!order.sauce;
      case 2: return true;
      case 3: return !!order.side;
      default: return false;
    }
  };

  const calculateTotal = () => {
    let total = 7.50; // Base price
    const meat = souffletOptions.meats.find(m => m.id === order.meat);
    const side = souffletOptions.sides.find(s => s.id === order.side);
    const toppings = order.toppings.map(t => souffletOptions.toppings.find(top => top.id === t));
    
    if (meat) total += meat.price;
    if (side) total += side.price;
    toppings.forEach(t => { if (t) total += t.price; });
    
    return total;
  };

  const handleAddToCart = () => {
    const souffletItem = menuItems.find(item => item.category === 'soufflets')!;
    const customizedItem = { ...souffletItem, price: calculateTotal() };
    addToCart(customizedItem, 1, order);
    toast.success('Soufflet personnalisé ajouté au panier');
    onClose();
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleAddToCart();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Progress Bar */}
      <div className="sticky top-[73px] z-40 bg-background border-b border-border py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevStep} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <h2 className="font-display text-xl font-bold">Créez votre Soufflet</h2>
            <span className="text-lg font-semibold text-primary">{calculateTotal().toFixed(2)} €</span>
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`step-indicator ${
                  index < currentStep ? 'step-completed' : 
                  index === currentStep ? 'step-active' : 'step-inactive'
                }`}>
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:inline ${
                  index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-accent' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto animate-slide-up">
          {currentStep === 0 && (
            <div>
              <h3 className="font-display text-2xl font-bold mb-6 text-center">Choisissez votre viande</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {souffletOptions.meats.map((meat) => (
                  <button
                    key={meat.id}
                    onClick={() => handleMeatSelect(meat.id)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      order.meat === meat.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-lg">{meat.name}</h4>
                    {meat.price > 0 && (
                      <span className="text-sm text-primary">+{meat.price.toFixed(2)} €</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h3 className="font-display text-2xl font-bold mb-6 text-center">Choisissez votre sauce</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {souffletOptions.sauces.map((sauce) => (
                  <button
                    key={sauce.id}
                    onClick={() => handleSauceSelect(sauce.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      order.sauce === sauce.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold">{sauce.name}</h4>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="font-display text-2xl font-bold mb-6 text-center">Ajoutez des garnitures</h3>
              <p className="text-center text-muted-foreground mb-6">Sélectionnez autant que vous le souhaitez</p>
              <div className="grid grid-cols-2 gap-4">
                {souffletOptions.toppings.map((topping) => (
                  <button
                    key={topping.id}
                    onClick={() => handleToppingToggle(topping.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      order.toppings.includes(topping.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{topping.name}</h4>
                      {order.toppings.includes(topping.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {topping.price > 0 && (
                      <span className="text-sm text-primary">+{topping.price.toFixed(2)} €</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="font-display text-2xl font-bold mb-6 text-center">Accompagnement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {souffletOptions.sides.map((side) => (
                  <button
                    key={side.id}
                    onClick={() => handleSideSelect(side.id)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      order.side === side.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-semibold text-lg">{side.name}</h4>
                    {side.price > 0 && (
                      <span className="text-sm text-primary">+{side.price.toFixed(2)} €</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container mx-auto max-w-2xl">
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className={`w-full py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              canProceed()
                ? 'btn-primary'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {currentStep === 3 ? (
              <>Ajouter au panier - {calculateTotal().toFixed(2)} €</>
            ) : (
              <>Continuer <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
