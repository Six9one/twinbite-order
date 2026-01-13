import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { useLoyalty } from '@/context/LoyaltyContext';
import { PizzaCustomization, TacosCustomization, SouffletCustomization, MakloubCustomization } from '@/types/order';
import { meatOptions, sauceOptions, garnitureOptions, souffletGarnitureOptions, makloubGarnitureOptions, pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { applyPizzaPromotions } from '@/utils/promotions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Trash2, ShoppingBag, CalendarClock, Star } from 'lucide-react';
import { format, addMonths, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NewCartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function NewCart({ isOpen, onClose, onCheckout }: NewCartProps) {
  const { cart, orderType, scheduledInfo, setScheduledInfo, updateQuantity, removeFromCart, getTotal } = useOrder();
  const { customer, calculatePointsToEarn } = useLoyalty();
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = useState<string>('12:00');

  // Calculate with promotions
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');

  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((sum, item) =>
    sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);

  const subtotal = pizzaPromo.discountedTotal + otherTotal;

  // Delivery fee logic: 
  // - If there's pizza in cart → NO delivery fee (pizza has its own 1+1 promo)
  // - If no pizza → free if >= 25€, else 5€ fee
  const FREE_DELIVERY_THRESHOLD = 25;
  const DELIVERY_FEE = 5;
  const isDelivery = orderType === 'livraison';
  const hasPizza = pizzaItems.length > 0;
  const qualifiesForFreeDelivery = hasPizza || otherTotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = isDelivery && !qualifiesForFreeDelivery ? DELIVERY_FEE : 0;
  const amountToFreeDelivery = FREE_DELIVERY_THRESHOLD - otherTotal;

  const total = subtotal + deliveryFee;

  // Suggestions to reach free delivery
  const suggestions = [
    { name: 'Tarte au Daim', price: 4, emoji: '🍰' },
    { name: 'Tiramisu', price: 4, emoji: '🍮' },
    { name: 'Milkshake', price: 4, emoji: '🥤' },
    { name: 'Supplément Frites', price: 3, emoji: '🍟' },
  ];

  // Calculate loyalty points to earn from this order
  const pointsToEarn = calculatePointsToEarn(total);

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
                <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <CalendarClock className="w-4 h-4" />
                      Commander pour plus tard
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <div className="p-4 space-y-4">
                      <h4 className="font-semibold text-center">Choisir date et heure</h4>
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
                        className="rounded-md border"
                      />
                      <Select value={tempTime} onValueChange={setTempTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Heure" />
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
                          className="flex-1"
                          onClick={handleConfirmSchedule}
                          disabled={!tempDate}
                        >
                          Confirmer
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{total.toFixed(2)}€</span>
              </div>

              {/* Loyalty Stamps Section - New System */}
              {cart.length > 0 && (
                <Card className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-amber-700">Carte de Fidélité</span>
                  </div>
                  {customer ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Vos tampons:</span>
                        <span className="font-bold text-amber-600">{customer.stamps || 0} / 10</span>
                      </div>
                      {(customer.freeItemsAvailable || 0) > 0 && (
                        <div className="mt-2 p-2 bg-green-100 rounded text-green-700 text-center text-xs font-bold animate-pulse">
                          🎁 Vous avez {customer.freeItemsAvailable} produit(s) GRATUIT!
                        </div>
                      )}
                      {(customer.stamps || 0) % 10 === 9 && (customer.freeItemsAvailable || 0) === 0 && (
                        <div className="mt-2 p-2 bg-amber-100 rounded text-amber-700 text-center text-xs font-bold">
                          🎉 Plus qu'1 achat pour un cadeau!
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Entrez votre numéro de téléphone au checkout pour accumuler des tampons!
                      <br />
                      <span className="font-medium text-amber-600">10 tampons = 1 produit GRATUIT 🎁</span>
                    </p>
                  )}
                </Card>
              )}

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
