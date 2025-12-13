import { useOrder } from '@/context/OrderContext';
import { PizzaCustomization, TacosCustomization, SouffletCustomization, MakloubCustomization } from '@/types/order';
import { meatOptions, sauceOptions, garnitureOptions, souffletGarnitureOptions, makloubGarnitureOptions, pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { applyPizzaPromotions } from '@/utils/promotions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface NewCartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function NewCart({ isOpen, onClose, onCheckout }: NewCartProps) {
  const { cart, orderType, updateQuantity, removeFromCart, getTotal } = useOrder();

  // Calculate with promotions
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');
  
  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((sum, item) => 
    sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);
  
  const total = pizzaPromo.discountedTotal + otherTotal;

  const getCustomizationText = (item: typeof cart[0]) => {
    if (!item.customization) return null;
    
    const custom = item.customization;
    const parts: string[] = [];
    
    // Check if it's a Pizza customization
    if ('base' in custom && 'size' in custom && !('meats' in custom)) {
      const pizzaCustom = custom as PizzaCustomization;
      parts.push(pizzaCustom.size === 'mega' ? 'Mega' : 'Senior');
      parts.push(pizzaCustom.base === 'creme' ? 'Base crème' : 'Base tomate');
      if (pizzaCustom.isMenuMidi) parts.push('Menu Midi');
      // Show supplements with prices
      if (pizzaCustom.supplements && pizzaCustom.supplements.length > 0) {
        const supNames = pizzaCustom.supplements.map(id => {
          const sup = cheeseSupplementOptions.find(s => s.id === id);
          return sup ? `+${sup.name} (${sup.price}€)` : null;
        }).filter(Boolean);
        if (supNames.length > 0) parts.push(supNames.join(', '));
      }
      return parts.join(' • ');
    }
    
    // Check if it's a Tacos, Soufflet, or Makloub customization
    if ('meats' in custom && 'sauces' in custom) {
      // Size
      if ('size' in custom) {
        parts.push((custom as any).size.charAt(0).toUpperCase() + (custom as any).size.slice(1));
      }
      
      // Meats
      if (custom.meats.length > 0) {
        const meatNames = custom.meats.map(id => meatOptions.find(m => m.id === id)?.name).filter(Boolean);
        parts.push('🥩 ' + meatNames.join(', '));
      }
      
      // Sauces
      if (custom.sauces.length > 0) {
        const sauceNames = custom.sauces.map(id => sauceOptions.find(s => s.id === id)?.name).filter(Boolean);
        parts.push('🍯 ' + sauceNames.join(', '));
      }
      
      // Garnitures - check for soufflet or makloub specific garnitures
      if ('garnitures' in custom) {
        const garnitures = (custom as SouffletCustomization | MakloubCustomization).garnitures;
        if (garnitures && garnitures.length > 0) {
          // Try soufflet garnitures first, then makloub, then general
          const garNames = garnitures.map(id => {
            const sGar = souffletGarnitureOptions.find(g => g.id === id);
            const mGar = makloubGarnitureOptions.find(g => g.id === id);
            const gGar = garnitureOptions.find(g => g.id === id);
            return sGar?.name || mGar?.name || gGar?.name || null;
          }).filter(Boolean);
          if (garNames.length > 0) parts.push('🥗 ' + garNames.join(', '));
        }
      }
      
      // Supplements (cheese)
      if ('supplements' in custom) {
        const supplements = (custom as SouffletCustomization | MakloubCustomization | TacosCustomization).supplements;
        if (supplements && supplements.length > 0) {
          const supNames = supplements.map(id => {
            const sup = cheeseSupplementOptions.find(s => s.id === id);
            return sup ? `+${sup.name} (${sup.price}€)` : null;
          }).filter(Boolean);
          if (supNames.length > 0) parts.push('🧀 ' + supNames.join(', '));
        }
      }
      
      // Menu option
      if ('menuOption' in custom) {
        const menuOpt = (custom as TacosCustomization | SouffletCustomization).menuOption;
        if (menuOpt && menuOpt !== 'none') {
          const menuLabels: Record<string, string> = {
            'frites': '+Frites',
            'boisson': '+Boisson',
            'menu': '+Menu complet'
          };
          parts.push(menuLabels[menuOpt] || '');
        }
      }
      
      // Note
      if ('note' in custom && custom.note) {
        parts.push(`📝 "${custom.note}"`);
      }
      
      return parts.join(' • ');
    }
    
    return null;
  };

  const getItemPrice = (item: typeof cart[0]) => {
    // Always prioritize calculatedPrice if it exists (set by wizards)
    if (item.calculatedPrice !== undefined && item.calculatedPrice > 0) {
      return item.calculatedPrice;
    }
    
    // Fallback for pizzas without calculatedPrice
    if (item.item.category === 'pizzas' && item.customization && 'size' in item.customization) {
      const pizzaCustom = item.customization as PizzaCustomization;
      if (pizzaCustom.isMenuMidi) {
        return pizzaCustom.size === 'senior' ? pizzaPrices.menuMidiSenior : pizzaPrices.menuMidiMega;
      }
      return pizzaCustom.size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
    }
    
    return item.item.price;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col z-[99999]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Votre Panier
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Votre panier est vide</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.item.name}</h4>
                      {getCustomizationText(item) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getCustomizationText(item)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-primary">
                      {(getItemPrice(item) * item.quantity).toFixed(2)}€
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              {pizzaPromo.supplementsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Suppléments pizza</span>
                  <span>+{pizzaPromo.supplementsTotal.toFixed(2)}€</span>
                </div>
              )}
              
              {pizzaPromo.promoDescription && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{pizzaPromo.promoDescription}</span>
                  <span>-{(pizzaPromo.originalTotal - pizzaPromo.discountedTotal).toFixed(2)}€</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{total.toFixed(2)}€</span>
              </div>

              <Button 
                className="w-full h-12" 
                onClick={onCheckout}
                disabled={cart.length === 0}
              >
                Commander - {total.toFixed(2)}€
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
