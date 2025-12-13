import { ShoppingBag } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { getItemCount, getTotal } = useOrder();
  const itemCount = getItemCount();
  const total = getTotal();

  if (itemCount === 0) return null;

  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[99998] h-16 px-6 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground animate-bounce-slow"
      style={{
        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)',
      }}
    >
      <ShoppingBag className="w-6 h-6 mr-2" />
      <span className="font-bold text-lg">{itemCount}</span>
      <span className="mx-2">•</span>
      <span className="font-bold text-lg">{total.toFixed(2)}€</span>
    </Button>
  );
}
