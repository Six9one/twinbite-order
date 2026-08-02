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
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Plus, Minus, Trash2, ShoppingBag, CalendarClock, ChevronDown, ChevronUp, Pencil, Tag, ChevronRight } from 'lucide-react';
import { format, addMonths, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';

const categoryEmojiMap: Record<string, string> = {
  pizzas: '🍕',
  tacos: '🌮',
  soufflets: '🥐',
  makloub: '🥙',
  mlawi: '🫓',
  sandwiches: '🥪',
  panini: '🥖',
  croques: '🍞',
  frites: '🍟',
  milkshakes: '🥤',
  crepes: '🥞',
  gaufres: '🧇',
  boissons: '🥤',
};

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
  onEditItem?: (category: string) => void;
}

export function NewCart({ isOpen, onClose, onCheckout, onEditItem }: NewCartProps) {
  const { cart, orderType, scheduledInfo, setScheduledInfo, updateQuantity, updateCartItem, removeFromCart, getTotal } = useOrder();
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = useState<string>('12:00');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
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
      if (pizzaCustom.note) {
        parts.push(`📝 "${pizzaCustom.note}"`);
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
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 border-b border-stone-100 dark:border-stone-800">
          <SheetTitle className="flex items-center justify-between text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-stone-800 text-brand-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span>Mon Panier ({cart.length})</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-3">
              <div className="w-28 h-28 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="https://lottie.host/80a95770-b2ba-4007-857d-5258ad6242f8/DYZ5mGoQPV.lottie"
                  loop
                  autoplay
                  className="w-full h-full"
                />
              </div>
              <p className="text-base font-bold text-stone-800 dark:text-stone-200">Votre panier est vide</p>
              <p className="text-xs text-stone-500">Ajoutez des produits pour démarrer votre commande</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-3 px-3 sm:px-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3.5 rounded-[24px] border border-stone-200/80 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 flex items-center justify-between gap-3">
                  
                  {/* Left Category Emoji Badge / Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-stone-800 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                    {categoryEmojiMap[item.item.category] || '🍽️'}
                  </div>

                  {/* Middle Product Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 truncate">{item.item.name}</h4>
                      
                      {/* Small Edit Button */}
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditItem(item.item.category);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-stone-800 hover:bg-brand-100 px-1.5 py-0.5 rounded-md transition-colors"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          <span>Éditer</span>
                        </button>
                      )}
                    </div>

                    <span className="font-extrabold text-xs text-brand-600 dark:text-brand-400 block">
                      {(getItemPrice(item) * item.quantity).toFixed(2)} €
                    </span>

                    {getCustomizationText(item) && (
                      <p className="text-[10px] text-stone-500 font-medium truncate">
                        {getCustomizationText(item)}
                      </p>
                    )}
                  </div>

                  {/* Right Capsule Pill Quantity Controller (Matching Mockup "- 3 +") */}
                  <div className="bg-stone-100 dark:bg-stone-800 rounded-full px-2.5 py-1 flex items-center gap-2.5 flex-shrink-0 shadow-2xs">
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full flex items-center justify-center font-black text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 text-xs active:scale-95 transition-all"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-4 text-center font-black text-xs text-stone-900 dark:text-white">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      className="w-5 h-5 rounded-full flex items-center justify-center font-black text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 text-xs active:scale-95 transition-all"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Bottom Summary Container (Matching Mockup 100%) */}
            <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-900 border-t border-stone-200/60 dark:border-stone-800 space-y-3.5 rounded-t-[32px] shadow-xl">
              
              {/* Promo Code Row (Matching Mockup) */}
              <div className="bg-white dark:bg-stone-800 rounded-2xl p-3.5 flex items-center justify-between text-xs text-stone-500 font-medium shadow-2xs border border-stone-100 dark:border-stone-700 cursor-pointer hover:border-brand-300 transition-all">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-brand-600" />
                  <span>Vous avez un code promo ?</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>

              {/* Subtotal & Total Rows */}
              <div className="space-y-1.5 px-1 pt-1 text-xs">
                <div className="flex justify-between text-stone-500 font-medium">
                  <span>Sous-total</span>
                  <span className="font-bold text-stone-900 dark:text-white">{subtotal.toFixed(2)} €</span>
                </div>
                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between text-stone-500 font-medium">
                    <span>Frais de livraison</span>
                    <span className="font-bold text-brand-600">+{deliveryFee.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-stone-900 dark:text-white pt-1.5 border-t border-stone-200/60 dark:border-stone-800">
                  <span>Total</span>
                  <span className="text-base text-brand-600 font-black">{total.toFixed(2)} €</span>
                </div>
              </div>

              {/* Pill Checkout Action Button */}
              <Button
                className="w-full h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-black text-base shadow-lg shadow-brand-600/25 active:scale-[0.98] transition-all flex items-center justify-center"
                onClick={onCheckout}
                disabled={cart.length === 0}
              >
                Commander ({total.toFixed(2)} €)
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
