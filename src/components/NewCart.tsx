import { useState, useEffect, useRef } from 'react';
import { useOrder } from '@/context/OrderContext';
import { PizzaCustomization, TacosCustomization, SouffletCustomization, MakloubCustomization } from '@/types/order';
import { meatOptions, sauceOptions, garnitureOptions, souffletGarnitureOptions, makloubGarnitureOptions, pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { applyPizzaPromotions } from '@/utils/promotions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Trash2, ShoppingBag, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { format, addMonths, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

interface NewCartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function NewCart({ isOpen, onClose, onCheckout }: NewCartProps) {
  const { cart, orderType, scheduledInfo, setScheduledInfo, updateQuantity, removeFromCart, getTotal } = useOrder();
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = useState<string>('12:00');
  const isMobile = useIsMobile();
  const prevCountRef = useRef(cart.length);
  const [badgePulse, setBadgePulse] = useState(false);

  // Animate badge when item is added
  useEffect(() => {
    if (cart.length > prevCountRef.current) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 600);
      prevCountRef.current = cart.length;
      return () => clearTimeout(t);
    }
    prevCountRef.current = cart.length;
  }, [cart.length]);

  // Calculate with promotions
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');

  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((sum, item) =>
    sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);

  const subtotal = pizzaPromo.discountedTotal + otherTotal;

  // Delivery fee logic: 
  // - 5€ fee for orders < 25€ (only for non-pizza items + menu midi)
  // - Regular pizzas: NO delivery fee at all
  // - Other products (soufflet, makloub, tacos, mlawi, sandwiches, menu midi): 5€ if < 25€
  const FREE_DELIVERY_THRESHOLD = 25;
  const DELIVERY_FEE = 5;
  const isDelivery = orderType === 'livraison';

  // Check if there are any items that should incur delivery fee (non-pizza or menu midi pizza)
  const hasMenuMidiPizza = pizzaItems.some(item => {
    const custom = item.customization as any;
    return custom?.isMenuMidi === true;
  });
  const hasOtherProducts = otherItems.length > 0;
  const hasRegularPizzaOnly = pizzaItems.length > 0 && !hasMenuMidiPizza && !hasOtherProducts;

  // Only apply delivery fee if there are non-regular-pizza items
  const shouldApplyDeliveryFee = isDelivery && !hasRegularPizzaOnly && subtotal < FREE_DELIVERY_THRESHOLD;
  const deliveryFee = shouldApplyDeliveryFee ? DELIVERY_FEE : 0;
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD || hasRegularPizzaOnly;
  const amountToFreeDelivery = hasRegularPizzaOnly ? 0 : FREE_DELIVERY_THRESHOLD - subtotal;

  const total = subtotal + deliveryFee;

  // Suggestions to reach free delivery
  const suggestions = [
    { name: 'Tarte au Daim', price: 4, emoji: '🍰' },
    { name: 'Tiramisu', price: 4, emoji: '🍮' },
    { name: 'Milkshake', price: 4, emoji: '🥤' },
    { name: 'Supplément Frites', price: 3, emoji: '🍟' },
  ];


  // Time slots for scheduling
  const timeSlots = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  const handleConfirmSchedule = () => {
    if (tempDate && tempTime) {
      const [hours, minutes] = tempTime.split(':').map(Number);
      const scheduledDate = new Date(tempDate);
      scheduledDate.setHours(hours, minutes, 0, 0);
      setScheduledInfo({ isScheduled: true, scheduledFor: scheduledDate });
      setShowSchedulePicker(false);
    }
  };

  const handleCancelSchedule = () => {
    setScheduledInfo({ isScheduled: false, scheduledFor: null });
    setShowSchedulePicker(false);
  };

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
        const menuOpt = (custom as any).menuOption;
        if (menuOpt && menuOpt !== 'none') {
          const menuLabels: Record<string, string> = {
            'frites': '+Frites',
            'boisson': '+Boisson',
            'supp_frites': '+Supplément Frites',
            'menu': '+Menu complet'
          };
          const opts = menuOpt.split(',').map((o: string) => o.trim()).filter(Boolean);
          const labels = opts.map((opt: string) => menuLabels[opt] || opt);
          const activeLabels = labels.filter(Boolean);
          if (activeLabels.length > 0) {
            parts.push(activeLabels.join(' | '));
          }
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
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`flex flex-col z-[99999] p-0 sm:p-0 ${
          isMobile ? 'w-full rounded-t-2xl max-h-[92dvh]' : 'w-full sm:max-w-md'
        }`}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            Votre Panier
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground p-6">
              <ShoppingBag className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 opacity-40" />
              <p className="text-base sm:text-lg">Votre panier est vide</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Ajoutez des articles pour commencer</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-3 sm:py-4 px-4 sm:px-6 space-y-3">
              {cart.map((item) => (
                <Card key={item.id} className="p-3 sm:p-4">
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

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-muted/50">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-bold text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="font-bold text-base sm:text-lg text-primary">
                      {(getItemPrice(item) * item.quantity).toFixed(2)}€
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="border-t pt-3 sm:pt-4 px-4 sm:px-6 space-y-3 bg-muted/20">
              {/* Scheduled order indicator or button */}
              {scheduledInfo.isScheduled && scheduledInfo.scheduledFor ? (
                <Card className="p-3 bg-purple-50 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-700">
                      <CalendarClock className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {format(scheduledInfo.scheduledFor, "EEE d MMM 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 h-7 px-2"
                      onClick={handleCancelSchedule}
                    >
                      Annuler
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="border border-purple-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-purple-600 hover:bg-purple-50/60 transition-colors"
                    onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                  >
                    <span className="flex items-center gap-2 font-medium text-sm">
                      <CalendarClock className="w-4 h-4" />
                      Commander pour plus tard
                    </span>
                    {showSchedulePicker
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSchedulePicker && (
                    <div className="px-4 pb-4 space-y-3 border-t border-purple-100 bg-purple-50/20">
                      <h4 className="font-semibold text-sm text-center pt-3 text-purple-800">Choisir date et heure</h4>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={tempDate}
                          onSelect={setTempDate}
                          locale={fr}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const maxDate = addMonths(today, 1);
                            return date < today || date > maxDate || isSunday(date);
                          }}
                          modifiers={{ sunday: (date) => isSunday(date) }}
                          modifiersClassNames={{ sunday: 'text-red-500 line-through' }}
                          className="rounded-md border bg-white"
                        />
                      </div>
                      <Select value={tempTime} onValueChange={setTempTime}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choisir l'heure" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(slot => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowSchedulePicker(false)}
                        >
                          Annuler
                        </Button>
                        <Button
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={handleConfirmSchedule}
                          disabled={!tempDate}
                        >
                          Confirmer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Subtotal for delivery orders */}
              {isDelivery && (
                <div className="flex justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
              )}

              {/* Delivery fee section */}
              {isDelivery && (
                <>
                  {qualifiesForFreeDelivery ? (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>🚗 Livraison</span>
                      <span className="font-semibold">GRATUITE</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>🚗 Frais de livraison</span>
                        <span>+{DELIVERY_FEE.toFixed(2)}€</span>
                      </div>

                      {/* Suggestion to reach free delivery */}
                      {amountToFreeDelivery > 0 && amountToFreeDelivery <= 10 && (
                        <Card className="p-3 bg-blue-50 border-blue-200">
                          <p className="text-xs text-blue-700 font-semibold mb-2">
                            💡 Plus que {amountToFreeDelivery.toFixed(2)}€ pour la livraison gratuite!
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.filter(s => s.price >= amountToFreeDelivery).slice(0, 3).map((s, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {s.emoji} {s.name} +{s.price}€
                              </span>
                            ))}
                          </div>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}

              <Separator />

              <div className="flex justify-between text-lg sm:text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">{total.toFixed(2)}€</span>
              </div>


              <Button
                className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-xl"
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
