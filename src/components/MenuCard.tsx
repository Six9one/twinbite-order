import { Plus } from 'lucide-react';
import { MenuItem } from '@/types/order';
import { useOrder } from '@/context/OrderContext';
import { toast } from 'sonner';

interface MenuCardProps {
  item: MenuItem;
  onCustomize?: () => void;
}

export function MenuCard({ item, onCustomize }: MenuCardProps) {
  const { addToCart } = useOrder();

  const handleAdd = () => {
    if (item.category === 'soufflets' && onCustomize) {
      onCustomize();
    } else {
      addToCart(item);
      toast.success(`${item.name} ajouté au panier`);
    }
  };

  return (
    <div className="card-menu group">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            {item.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {item.description}
          </p>
          <span className="text-xl font-bold text-primary">
            {item.price.toFixed(2)} €
          </span>
        </div>
        
        <button
          onClick={handleAdd}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
