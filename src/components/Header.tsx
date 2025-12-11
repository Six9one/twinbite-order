import { ShoppingCart, Pizza } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { getItemCount, orderType } = useOrder();
  const itemCount = getItemCount();

  const orderTypeLabels = {
    emporter: 'À Emporter',
    livraison: 'Livraison',
    surplace: 'Sur Place',
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Pizza className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Twin Pizza</h1>
            {orderType && (
              <span className="text-sm text-primary font-medium">
                {orderTypeLabels[orderType]}
              </span>
            )}
          </div>
        </div>
        
        <Button 
          onClick={onCartClick}
          className="btn-primary relative flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="hidden sm:inline">Panier</span>
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse-glow">
              {itemCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
