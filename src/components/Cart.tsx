import { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { TacosCustomization, SouffletCustomization, MakloubCustomization, MlawiCustomization, PaniniCustomization, PizzaCustomization } from '@/types/order';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

// Helper to get menu option label
const getMenuOptionLabel = (option: string | undefined) => {
  switch (option) {
    case 'frites': return '+ Frites';
    case 'boisson': return '+ Boisson';
    case 'menu': return '+ Menu (Frites + Boisson)';
    default: return 'Seul';
  }
};

// Helper to get size label
const getSizeLabel = (size: string | undefined, category?: string) => {
  if (category === 'panini') {
    switch (size) {
      case 'solo': return 'Solo';
      case 'duo': return 'Duo';
      default: return size;
    }
  }
  switch (size) {
    case 'solo': return '1 Viande';
    case 'double': return '2 Viandes';
    case 'triple': return '3 Viandes';
    case 'senior': return 'Senior';
    case 'mega': return 'Mega';
    default: return size;
  }
};

export function Cart({ isOpen, onClose, onCheckout }: CartProps) {
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart, orderType } = useOrder();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getCustomizationDetails = (customization: any, category?: string) => {
    if (!customization) return null;

    const details: { label: string; value: string }[] = [];

    // Size
    if (customization.size) {
      details.push({ label: 'Taille', value: getSizeLabel(customization.size, category) });
    }

    // Base (for pizzas)
    if (customization.base) {
      details.push({ label: 'Base', value: customization.base === 'tomate' ? 'Sauce Tomate' : 'Crème Fraîche' });
    }

    // Meats
    if (customization.meats && customization.meats.length > 0) {
      details.push({ label: 'Viandes', value: customization.meats.join(', ') });
    }

    // Meat (singular for old format)
    if (customization.meat) {
      details.push({ label: 'Viande', value: customization.meat });
    }

    // Sauces
    if (customization.sauces && customization.sauces.length > 0) {
      details.push({ label: 'Sauces', value: customization.sauces.join(', ') });
    }

    // Sauce (singular for old format)
    if (customization.sauce) {
      details.push({ label: 'Sauce', value: customization.sauce });
    }

    // Garnitures
    if (customization.garnitures && customization.garnitures.length > 0) {
      details.push({ label: 'Garnitures', value: customization.garnitures.join(', ') });
    }

    // Toppings (old format)
    if (customization.toppings && customization.toppings.length > 0) {
      details.push({ label: 'Garnitures', value: customization.toppings.join(', ') });
    }

    // Menu option
    if (customization.menuOption && customization.menuOption !== 'none') {
      details.push({ label: 'Menu', value: getMenuOptionLabel(customization.menuOption) });
    }

    // Side (old format)
    if (customization.side) {
      details.push({ label: 'Accompagnement', value: customization.side });
    }

    // Supplements
    if (customization.supplements && customization.supplements.length > 0) {
      details.push({ label: 'Suppléments', value: customization.supplements.join(', ') });
    }

    // Cheese supplements
    if (customization.cheeseSupplements && customization.cheeseSupplements.length > 0) {
      details.push({ label: 'Fromages', value: customization.cheeseSupplements.join(', ') });
    }

    // Note
    if (customization.note) {
      details.push({ label: 'Note', value: customization.note });
    }

    return details;
  };

  const handleCheckout = () => {
    if (!orderType) {
      toast.error('Veuillez d\'abord choisir un mode de commande');
      return;
    }
    onCheckout();
  };

  const handleEditItem = (itemId: string) => {
    // For now, we'll just show the item details
    // A full implementation would reopen the wizard with the item data
    toast.info('Pour modifier, supprimez cet article et ajoutez-en un nouveau');
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
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-2">{cart.length}</Badge>
              )}
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
                {cart.map((cartItem) => {
                  const isExpanded = expandedItems.has(cartItem.id);
                  const details = getCustomizationDetails(cartItem.customization, cartItem.item.category);
                  const hasDetails = details && details.length > 0;
                  const itemPrice = cartItem.calculatedPrice || cartItem.item.price;

                  return (
                    <div key={cartItem.id} className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
                      {/* Header row */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{cartItem.item.name}</h4>
                            {cartItem.customization?.size && (
                              <Badge variant="outline" className="text-xs">
                                {getSizeLabel(cartItem.customization.size, cartItem.item.category)}
                              </Badge>
                            )}
                            {cartItem.customization?.menuOption && cartItem.customization.menuOption !== 'none' && (
                              <Badge className="text-xs bg-primary/20 text-primary border-0">
                                {getMenuOptionLabel(cartItem.customization.menuOption)}
                              </Badge>
                            )}
                          </div>

                          {/* Quick summary (always visible) */}
                          {hasDetails && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {details.slice(0, 2).map(d => d.value).join(' • ')}
                              {details.length > 2 && '...'}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {hasDetails && (
                            <button
                              onClick={() => toggleExpand(cartItem.id)}
                              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                              title={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => removeFromCart(cartItem.id)}
                            className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && hasDetails && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="space-y-2">
                            {details.map((detail, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{detail.label}</span>
                                <span className="font-medium text-right max-w-[60%]">{detail.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price and quantity row */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
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
                        <div className="text-right">
                          {cartItem.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">{itemPrice.toFixed(2)}€ × {cartItem.quantity}</p>
                          )}
                          <span className="font-bold text-primary text-lg">
                            {(itemPrice * cartItem.quantity).toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Vider le panier
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className="border-t border-border p-4 space-y-4 bg-card/50">
              {!orderType && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-center p-2 rounded-lg">
                  ⚠️ Choisissez d'abord un mode de commande
                </p>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} article(s)</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary text-2xl">{getTotal().toFixed(2)} €</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full btn-primary py-4 rounded-full text-lg font-semibold"
                disabled={!orderType}
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
