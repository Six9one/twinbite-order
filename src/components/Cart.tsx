import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { souffletOptions } from '@/data/menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function Cart({ isOpen, onClose, onCheckout }: CartProps) {
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart, orderType } = useOrder();

  const getSouffletDescription = (customization: any) => {
    if (!customization) return null;
    
    const meat = souffletOptions.meats.find(m => m.id === customization.meat)?.name;
    const sauce = souffletOptions.sauces.find(s => s.id === customization.sauce)?.name;
    const toppings = customization.toppings
      .map((t: string) => souffletOptions.toppings.find(top => top.id === t)?.name)
      .filter(Boolean);
    const side = souffletOptions.sides.find(s => s.id === customization.side)?.name;

    return `${meat} • ${sauce} • ${toppings.join(', ')} • ${side}`;
  };

  const handleCheckout = () => {
    if (!orderType) {
      toast.error('Veuillez d\'abord choisir un mode de commande');
      return;
    }
    onCheckout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Cart Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-xl animate-slide-up">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              <h2 className="font-display text-xl font-bold">Votre Panier</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">Panier vide</h3>
                <p className="text-muted-foreground">Ajoutez des articles pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((cartItem) => (
                  <div key={cartItem.id} className="bg-card rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{cartItem.item.name}</h4>
                        {cartItem.customization ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {getSouffletDescription(cartItem.customization)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{cartItem.item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(cartItem.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold w-8 text-center">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-bold text-primary">
                        {(cartItem.item.price * cartItem.quantity).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Vider le panier
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-4">
              {!orderType && (
                <p className="text-sm text-accent text-center">
                  Choisissez d'abord un mode de commande
                </p>
              )}
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary text-xl">{getTotal().toFixed(2)} €</span>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full btn-primary py-4 rounded-full text-lg font-semibold"
              >
                Passer la commande
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
