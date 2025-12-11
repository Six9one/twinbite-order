import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Truck, UtensilsCrossed, ArrowRight } from 'lucide-react';

interface HeroOrderSelectorProps {
  onSelect: () => void;
}

const orderOptions = [
  {
    type: 'emporter' as OrderType,
    label: 'À Emporter',
    description: 'Récupérez votre commande',
    icon: ShoppingBag,
    promo: '1 achetée = 1 offerte',
  },
  {
    type: 'livraison' as OrderType,
    label: 'Livraison',
    description: 'Livré chez vous',
    icon: Truck,
    promo: '2 achetées = 1 offerte',
  },
  {
    type: 'surplace' as OrderType,
    label: 'Sur Place',
    description: 'Mangez au restaurant',
    icon: UtensilsCrossed,
    promo: '1 achetée = 1 offerte',
  },
];

export function HeroOrderSelector({ onSelect }: HeroOrderSelectorProps) {
  const { orderType, setOrderType } = useOrder();

  const handleSelect = (type: OrderType) => {
    setOrderType(type);
  };

  const handleContinue = () => {
    if (orderType) {
      onSelect();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-center text-white/80 mb-6 text-lg">
        Comment souhaitez-vous commander ?
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {orderOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = orderType === option.type;
          
          return (
            <Card
              key={option.type}
              className={`p-6 cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/10 scale-105' 
                  : 'bg-background/90 hover:bg-background hover:scale-102'
              }`}
              onClick={() => handleSelect(option.type)}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-xl mb-1">{option.label}</h3>
                <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  🍕 {option.promo}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {orderType && (
        <div className="text-center animate-fade-in">
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg"
            onClick={handleContinue}
          >
            Voir le menu
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
