import { Truck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { OrderType } from '@/types/order';
import { useOrder } from '@/context/OrderContext';

const orderTypes = [
  {
    type: 'emporter' as OrderType,
    label: 'À Emporter',
    description: 'Récupérez au comptoir',
    icon: ShoppingBag,
  },
  {
    type: 'livraison' as OrderType,
    label: 'Livraison',
    description: 'Chez vous en 30-45 min',
    icon: Truck,
  },
  {
    type: 'surplace' as OrderType,
    label: 'Sur Place',
    description: 'Dans notre restaurant',
    icon: UtensilsCrossed,
  },
];

export function HeroOrderSelector() {
  const { orderType, setOrderType } = useOrder();

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {orderTypes.map((option) => {
        const Icon = option.icon;
        const isSelected = orderType === option.type;

        return (
          <button
            key={option.type}
            onClick={() => setOrderType(option.type)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                : 'border-card bg-card/90 backdrop-blur-sm hover:border-primary/50 hover:scale-102'
            }`}
          >
            <Icon className={`w-6 h-6 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
            <div className="text-left">
              <h3 className="font-semibold">{option.label}</h3>
              <p className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
