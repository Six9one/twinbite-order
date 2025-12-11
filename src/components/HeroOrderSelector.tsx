import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Card } from '@/components/ui/card';
import { ShoppingBag, Truck, UtensilsCrossed } from 'lucide-react';

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
  const { setOrderType } = useOrder();

  const handleSelect = (type: OrderType) => {
    setOrderType(type);
    onSelect();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-center text-white/80 mb-6 text-lg">
        Comment souhaitez-vous commander ?
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orderOptions.map((option) => {
          const Icon = option.icon;
          
          return (
            <Card
              key={option.type}
              className="p-6 cursor-pointer transition-all duration-300 bg-background/90 hover:bg-primary/10 hover:scale-105 hover:ring-2 hover:ring-primary active:scale-100"
              onClick={() => handleSelect(option.type)}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-muted group-hover:bg-primary transition-colors">
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
    </div>
  );
}
