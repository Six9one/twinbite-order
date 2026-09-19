import { Truck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { OrderType } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { useStoreStatus } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';

const orderTypes = [
  {
    type: 'emporter' as OrderType,
    label: 'À Emporter',
    description: 'Récupérez votre commande au comptoir',
    icon: ShoppingBag,
  },
  {
    type: 'livraison' as OrderType,
    label: 'Livraison',
    description: 'Livré chez vous en 30-45 min',
    icon: Truck,
  },
  {
    type: 'surplace' as OrderType,
    label: 'Sur Place',
    description: 'Dégustez dans notre restaurant',
    icon: UtensilsCrossed,
  },
];

interface OrderTypeSelectorProps {
  onSelect: () => void;
}

export function OrderTypeSelector({ onSelect }: OrderTypeSelectorProps) {
  const { orderType, setOrderType } = useOrder();
  const { isDeliveryAvailable } = useStoreStatus();

  const handleSelect = (type: OrderType) => {
    if (type === 'livraison' && !isDeliveryAvailable) {
      toast.error("La livraison est actuellement indisponible (pas de livreur ce soir). Commandes uniquement à emporter ou sur place.");
      return;
    }
    setOrderType(type);
  };

  const handleContinue = () => {
    if (orderType) {
      onSelect();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          Bienvenue chez <span className="text-primary">Twin Pizza</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Comment souhaitez-vous profiter de votre repas ?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
        {orderTypes.map((option) => {
          const Icon = option.icon;
          const isSelected = orderType === option.type;
          const isOptionDisabled = option.type === 'livraison' && !isDeliveryAvailable;

          return (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className={`order-type-card ${isSelected ? 'selected' : ''} ${
                isOptionDisabled ? 'opacity-50 cursor-not-allowed border-red-300 bg-stone-50' : ''
              }`}
            >
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${
                isOptionDisabled
                  ? 'bg-muted-foreground/20 text-muted-foreground'
                  : isSelected ? 'bg-primary' : 'bg-muted'
              }`}>
                <Icon className={`w-8 h-8 ${isOptionDisabled ? 'text-muted-foreground' : isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <h3 className={`font-display text-xl font-semibold mb-2 ${isOptionDisabled ? 'line-through text-stone-400' : ''}`}>
                {option.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isOptionDisabled ? '🚫 Indisponible ce soir (Pas de livreur)' : option.description}
              </p>
            </button>
          );
        })}
      </div>

      {orderType && (
        <button
          onClick={handleContinue}
          className="btn-primary px-8 py-4 rounded-full text-lg font-semibold animate-slide-up"
        >
          Continuer vers le menu
        </button>
      )}
    </div>
  );
}
