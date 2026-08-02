import { useState, useRef, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { CustomerInfo, PaymentMethod, PizzaCustomization } from '@/types/order';
import { applyPizzaPromotions, calculateTVA } from '@/utils/promotions';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Check, CreditCard, Banknote, PartyPopper, Loader2, CalendarClock, Clock,
  ShieldCheck, Lock, ChevronRight, QrCode, Sparkles, Home, Briefcase, 
  Truck, Zap, Tag, ShoppingBag, MapPin, Ticket, AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { format, addMonths, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { initiateMyPosCheckout } from '@/services/mypos';

// Customer info validation schema
const customerInfoSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  phone: z.string()
    .trim()
    .min(10, 'Numéro de téléphone invalide')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^[0-9\s+()-]+$/, 'Format de téléphone invalide'),
  address: z.string()
    .trim()
    .max(500, 'L\'adresse ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .trim()
    .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
    .optional()
    .or(z.literal('')),
});

// Base street list for dynamic address matching
const BASE_STREET_NAMES = [
  'Rue Georges Clemenceau, 76530 Grand-Couronne',
  'Rue du Général de Gaulle, 76530 Grand-Couronne',
  'Avenue Franklin Roosevelt, 76530 Grand-Couronne',
  'Rue Pasteur, 76530 Grand-Couronne',
  'Rue Jules Ferry, 76530 Grand-Couronne',
  'Boulevard Maritime, 76530 Grand-Couronne',
  'Rue Pierre et Marie Curie, 76530 Grand-Couronne',
  'Rue de la République, 76530 Grand-Couronne',
  'Avenue de l\'Europe, 76530 Grand-Couronne',
  'Rue Victor Hugo, 76530 Grand-Couronne',
];

function getDynamicAddresses(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [
      '12 Rue Georges Clemenceau, 76530 Grand-Couronne',
      '45 Avenue Franklin Roosevelt, 76530 Grand-Couronne',
      '8 Rue du Général de Gaulle, 76530 Grand-Couronne',
      '24 Rue Pasteur, 76530 Grand-Couronne',
      '56 Boulevard Maritime, 76530 Grand-Couronne',
    ];
  }

  const numberMatch = trimmed.match(/^(\d+)/);
  const numberPrefix = numberMatch ? numberMatch[1] : '';
  const textQuery = trimmed.replace(/^\d+\s*/, '').toLowerCase();

  const matches = BASE_STREET_NAMES
    .filter(street => !textQuery || street.toLowerCase().includes(textQuery))
    .map(street => numberPrefix ? `${numberPrefix} ${street}` : street);

  return matches.length > 0 ? matches.slice(0, 5) : [
    `${trimmed}, 76530 Grand-Couronne`,
    `${trimmed} Rue Georges Clemenceau, 76530 Grand-Couronne`,
    `${trimmed} Avenue Franklin Roosevelt, 76530 Grand-Couronne`,
  ];
}

interface NewCheckoutProps {
  onBack: (size?: 'senior' | 'mega') => void;
  onComplete: () => void;
}

export function NewCheckout({ onBack, onComplete }: NewCheckoutProps) {
  const { cart, orderType, setOrderType, clearCart, scheduledInfo, setScheduledInfo } = useOrder();
  const createOrder = useCreateOrder();
  const { data: paymentSettings } = usePaymentSettings();

  // Wizard Steps: 1 ('info') | 2 ('payment') | 'success'
  const [step, setStep] = useState<'info' | 'payment' | 'success'>(
    localStorage.getItem('tp_customer_name') && localStorage.getItem('tp_customer_phone') ? 'payment' : 'info'
  );

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: localStorage.getItem('tp_customer_name') || '',
    phone: localStorage.getItem('tp_customer_phone') || '',
    address: localStorage.getItem('tp_customer_address') || '',
    notes: '',
  });

  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const orderNumberRef = useRef<string | null>(null);

  const [tempScheduleDate, setTempScheduleDate] = useState<Date | undefined>(undefined);
  const [tempScheduleTime, setTempScheduleTime] = useState<string>('12:00');

  const [confirmedOrderData, setConfirmedOrderData] = useState<{
    orderNumber: string;
    items: typeof cart;
    total: number;
    productsSubtotal: number;
    deliveryFee: number;
    orderType: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    paymentMethod: string;
    createdAt: Date;
    scheduledFor?: Date;
  } | null>(null);

  // Auto-save customer details
  useEffect(() => {
    if (customerInfo.name) localStorage.setItem('tp_customer_name', customerInfo.name);
    if (customerInfo.phone) localStorage.setItem('tp_customer_phone', customerInfo.phone);
    if (customerInfo.address) localStorage.setItem('tp_customer_address', customerInfo.address);
  }, [customerInfo]);

  useEffect(() => {
    return () => {
      orderNumberRef.current = null;
    };
  }, []);

  // Calculate totals
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const hasPizza = pizzaItems.length > 0;
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');

  const pizzaSizes = pizzaItems.map(item => {
    const custom = item.customization as any;
    return custom?.size || 'senior';
  });
  const seniorCount = pizzaSizes.filter(s => s === 'senior').length;
  const megaCount = pizzaSizes.filter(s => s === 'mega').length;
  const dominantPizzaSize: 'senior' | 'mega' = megaCount > seniorCount ? 'mega' : 'senior';

  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((sum, item) =>
    sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);

  const productsSubtotal = pizzaPromo.discountedTotal + otherTotal;

  const FREE_DELIVERY_THRESHOLD = 25;
  const BASE_DELIVERY_FEE = 2.50;
  const isDelivery = orderType === 'livraison';

  const hasMenuMidiPizza = pizzaItems.some(item => {
    const custom = item.customization as any;
    return custom?.isMenuMidi === true;
  });
  const hasOtherProducts = otherItems.length > 0;
  const hasRegularPizzaOnly = pizzaItems.length > 0 && !hasMenuMidiPizza && !hasOtherProducts;

  const shouldApplyDeliveryFee = isDelivery && !hasRegularPizzaOnly && productsSubtotal < FREE_DELIVERY_THRESHOLD;
  const deliveryFee = shouldApplyDeliveryFee ? BASE_DELIVERY_FEE : 0;
  const qualifiesForFreeDelivery = productsSubtotal >= FREE_DELIVERY_THRESHOLD || hasRegularPizzaOnly;

  const subtotal = productsSubtotal + deliveryFee;
  const { ht, tva, ttc } = calculateTVA(subtotal);
  const isCartValid = cart.length > 0 && ttc > 0;

  const orderTypeLabels: Record<string, string> = {
    emporter: 'À emporter',
    livraison: 'Livraison',
    surplace: 'Sur place',
  };

  const paymentMethodLabels: Record<string, string> = {
    cb: 'Carte Bancaire / TPE',
    especes: 'Espèces',
    en_ligne: 'Paiement en ligne / Apple Pay',
  };

  const validateInfo = () => {
    const result = customerInfoSchema.safeParse(customerInfo);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({ title: 'Champ requis', description: firstError.message, variant: 'destructive' });
      return false;
    }

    if (orderType === 'livraison' && !customerInfo.address?.trim()) {
      toast({ title: 'Adresse requise', description: 'Veuillez entrer votre adresse de livraison', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleMyPosPayment = async () => {
    if (!isCartValid) {
      toast({ title: 'Erreur', description: 'Votre panier est vide ou invalide.', variant: 'destructive' });
      return;
    }
    if (!orderType) {
      toast({ title: 'Erreur', description: 'Type de commande non sélectionné', variant: 'destructive' });
      return;
    }
    if (orderSubmitted || isProcessing) return;

    setIsProcessing(true);
    setOrderSubmitted(true);

    if (!orderNumberRef.current) {
      orderNumberRef.current = await generateOrderNumber();
    }
    const orderNumber = orderNumberRef.current;

    try {
      const finalHt = Math.max(ht, 0);
      const finalTva = Math.max(tva, 0);
      const finalTotal = Math.max(ttc, 0.01);

      // 1. Create order record in Supabase FIRST so it exists when myPOS webhook fires
      await createOrder.mutateAsync({
        order_number: orderNumber,
        order_type: orderType,
        items: cart as unknown as import('@/integrations/supabase/types').Json,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        customer_address: customerInfo.address?.trim() || null,
        customer_notes: customerInfo.notes?.trim() || null,
        payment_method: 'en_ligne',
        subtotal: finalHt,
        tva: finalTva,
        total: finalTotal,
        delivery_fee: deliveryFee,
        status: 'pending',
        is_scheduled: scheduledInfo.isScheduled,
        scheduled_for: scheduledInfo.scheduledFor?.toISOString() || null,
      });

      // 2. Send initial Telegram notification (or let webhook update it upon payment)
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber,
            customerName: customerInfo.name.trim(),
            customerPhone: customerInfo.phone.trim(),
            customerAddress: customerInfo.address?.trim() || null,
            customerNotes: customerInfo.notes?.trim() || null,
            orderType,
            paymentMethod: 'en_ligne (En attente de règlement)',
            total: finalTotal,
            subtotal: finalHt,
            tva: finalTva,
            deliveryFee: deliveryFee,
            items: cart.map(item => ({
              name: item.item.name,
              quantity: item.quantity,
              price: item.calculatedPrice || item.item.price,
              category: item.item.category,
              customization: item.customization,
            })),
            isScheduled: scheduledInfo.isScheduled,
            scheduledFor: scheduledInfo.scheduledFor?.toISOString() || null,
          },
        });
      } catch (tgErr) {
        console.error('Initial Telegram notification error:', tgErr);
      }

      // 3. Initiate myPOS Checkout
      await initiateMyPosCheckout({
        amount: finalTotal,
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: null,
        orderNumber,
        items: cart.map(item => ({
          name: item.item.name,
          quantity: item.quantity,
          price: item.calculatedPrice || item.item.price,
          customization: item.customization,
        })),
        orderType,
        customerAddress: customerInfo.address?.trim() || null,
        customerNotes: customerInfo.notes?.trim() || null,
        subtotal: ht,
        tva,
      });
    } catch (error) {
      console.error('myPOS checkout error:', error);
      setOrderSubmitted(false);
      orderNumberRef.current = null;
      toast({
        title: 'Paiement en ligne indisponible',
        description: 'Veuillez choisir un autre mode de paiement (CB ou Espèces).',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!isCartValid) return;
    if (!orderType || !customerInfo.name?.trim() || !customerInfo.phone?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir vos informations', variant: 'destructive' });
      setStep('info');
      return;
    }
    if (orderType === 'livraison' && !customerInfo.address?.trim()) {
      toast({ title: 'Erreur', description: 'Adresse de livraison requise', variant: 'destructive' });
      setStep('info');
      return;
    }
    if (orderSubmitted || isProcessing) return;

    // If payment is online, Apple Pay, or Google Pay, redirect to myPOS Checkout
    if (paymentMethod === 'en_ligne' || paymentMethod === 'mypos' || paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') {
      await handleMyPosPayment();
      return;
    }

    setIsProcessing(true);
    setOrderSubmitted(true);

    if (!orderNumberRef.current) {
      orderNumberRef.current = await generateOrderNumber();
    }

    try {
      const finalHt = Math.max(ht, 0);
      const finalTva = Math.max(tva, 0);
      const finalTtc = Math.max(ttc, 0.01);

      await createOrder.mutateAsync({
        order_number: orderNumberRef.current,
        order_type: orderType,
        items: cart as unknown as import('@/integrations/supabase/types').Json,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        customer_address: customerInfo.address?.trim() || null,
        customer_notes: customerInfo.notes?.trim() || null,
        payment_method: paymentMethod,
        subtotal: finalHt,
        tva: finalTva,
        total: finalTtc,
        delivery_fee: deliveryFee,
        status: 'pending',
        is_scheduled: scheduledInfo.isScheduled,
        scheduled_for: scheduledInfo.scheduledFor?.toISOString() || null,
      });

      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber: orderNumberRef.current,
            customerName: customerInfo.name.trim(),
            customerPhone: customerInfo.phone.trim(),
            customerAddress: customerInfo.address?.trim() || null,
            customerNotes: customerInfo.notes?.trim() || null,
            orderType,
            paymentMethod,
            total: finalTtc,
            subtotal: finalHt,
            tva: finalTva,
            deliveryFee: deliveryFee,
            items: cart.map(item => ({
              name: item.item.name,
              quantity: item.quantity,
              price: item.calculatedPrice || item.item.price,
              category: item.item.category,
              customization: item.customization,
            })),
            isScheduled: scheduledInfo.isScheduled,
            scheduledFor: scheduledInfo.scheduledFor?.toISOString() || null,
          },
        });
      } catch (telegramError) {
        console.error('Telegram notification failed:', telegramError);
      }

      setConfirmedOrderData({
        orderNumber: orderNumberRef.current!,
        items: [...cart],
        total: ttc,
        productsSubtotal: productsSubtotal,
        deliveryFee: deliveryFee,
        orderType: orderType,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address || '',
        paymentMethod: paymentMethod,
        createdAt: new Date(),
        scheduledFor: scheduledInfo.scheduledFor || undefined,
      });

      clearCart();
      setStep('success');
    } catch (error) {
      console.error('Failed to create order:', error);
      setOrderSubmitted(false);
      orderNumberRef.current = null;
      toast({
        title: 'Impossible de créer la commande',
        description: 'Veuillez réessayer ou contacter le restaurant.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper for step number computation
  const getStepNumber = () => {
    if (step === 'info') return 1;
    if (step === 'payment') return 2;
    return 3;
  };

  // ----------------------------------------------------
  // SUCCESS SCREEN (Step 4)
  // ----------------------------------------------------
  if (step === 'success' && confirmedOrderData) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] dark:bg-stone-950 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          
          {/* Animated Pulsing Success Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-brand-500/30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30 text-white">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Commande confirmée !
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
              {confirmedOrderData.orderType === 'livraison'
                ? `Votre commande #${confirmedOrderData.orderNumber} a été enregistrée. Elle sera livrée dans 30 à 40 minutes !`
                : `Votre commande #${confirmedOrderData.orderNumber} a été enregistrée. Elle sera prête dans 10 à 20 minutes !`}
            </p>
          </div>

          {/* Time estimate pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-900/60 text-xs font-bold text-brand-700 dark:text-brand-300 shadow-sm">
            {confirmedOrderData.orderType === 'livraison' ? (
              <>
                <Truck className="w-4 h-4 text-brand-600 animate-pulse" />
                <span>🛵 Livraison dans 30 - 40 min</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-brand-600 animate-pulse" />
                <span>⏱️ Prêt dans 10 - 20 min</span>
              </>
            )}
          </div>

          {/* Digital Ticket Card */}
          <Card className="rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xl overflow-hidden text-left bg-white dark:bg-stone-900">
            <div className="bg-stone-950 text-white p-5 text-center relative overflow-hidden border-b border-stone-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-brand-500">TWIN PIZZA</span>
                {['en_ligne', 'mypos', 'apple_pay', 'google_pay', 'weero'].includes(confirmedOrderData.paymentMethod) ? (
                  <span className="bg-black text-white px-3.5 py-1.5 rounded-lg border border-stone-700 text-xs font-black uppercase tracking-wider shadow-md inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    PAYÉ EN LIGNE
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                    À PAYER EN CAISSE
                  </span>
                )}
              </div>

              <p className="text-4xl font-black font-mono tracking-tight text-white mt-1">#{confirmedOrderData.orderNumber}</p>
              <p className="text-[11px] text-stone-400 mt-1">Consultez votre ticket sur twinpizza.fr/tickets?phone={confirmedOrderData.customerPhone}</p>
            </div>
            
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Client:</span>
                <span className="font-semibold text-stone-900 dark:text-white">{confirmedOrderData.customerName}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Téléphone:</span>
                <span className="font-medium text-stone-900 dark:text-white">{confirmedOrderData.customerPhone}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Mode:</span>
                <span className="font-medium text-stone-900 dark:text-white">{orderTypeLabels[confirmedOrderData.orderType]}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Paiement:</span>
                <span className="font-medium text-stone-900 dark:text-white">{paymentMethodLabels[confirmedOrderData.paymentMethod]}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total réglé</span>
                <span className="text-brand-600">{confirmedOrderData.total.toFixed(2)} €</span>
              </div>
            </div>
          </Card>

          <Button 
            onClick={onComplete} 
            className="w-full h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg shadow-lg shadow-brand-600/25 active:scale-[0.98] transition-all"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN CHECKOUT FLOW (Steps 1, 2, 3)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-stone-950 pb-36 text-stone-900 dark:text-white antialiased">
      
      {/* Dynamic Header & Segmented Progress Bar */}
      <div className="sticky top-0 z-30 bg-[#FFF8F5]/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-brand-100/60 dark:border-stone-800">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
          
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full hover:bg-brand-100/50 text-stone-700 dark:text-stone-300"
              onClick={() => {
                if (step === 'info') onBack();
                else if (step === 'payment') setStep('info');
                else setStep('payment');
              }}
              disabled={isProcessing}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <h1 className="text-xl font-bold tracking-tight">Checkout</h1>
            
            <span className="text-xs font-semibold text-stone-400">
              Step {step === 'info' ? 1 : 2} of 2
            </span>
          </div>

          {/* 2 Segmented Animated Progress Bars */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[1, 2].map((sIndex) => (
              <div
                key={sIndex}
                className="h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden"
              >
                <div
                  className={`h-full bg-brand-600 transition-all duration-500 ease-out ${
                    (step === 'info' ? 1 : 2) >= sIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Validation Error Banner */}
        {!isCartValid && (
          <Card className="p-4 rounded-2xl bg-red-50 border-red-200 text-red-700 text-sm font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>Votre panier est vide. Veuillez ajouter des produits pour continuer.</span>
          </Card>
        )}

        {/* ==================================================== */}
        {/* STEP 1: DELIVERY ADDRESS & DETAILS */}
        {/* ==================================================== */}
        {step === 'info' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Compact Order Type Toggle (Delivery vs Pickup vs Dine-in) */}
            <div className="grid grid-cols-3 gap-1 bg-stone-200/50 dark:bg-stone-900 p-1 rounded-xl">
              {[
                { id: 'livraison', label: 'Livraison', icon: Truck },
                { id: 'emporter', label: 'À emporter', icon: ShoppingBag },
                { id: 'surplace', label: 'Sur place', icon: Home },
              ].map(type => {
                const Icon = type.icon;
                const active = orderType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderType(type.id as any)}
                    className={`py-1 px-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                      active
                        ? 'bg-white dark:bg-stone-800 text-brand-600 shadow-sm'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Where to? Section for Livraison */}
            {isDelivery && (
              <div className="space-y-1.5 pt-0.5">
                <div className="space-y-1 relative">
                  <Label htmlFor="address-input" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>Adresse de livraison *</span>
                  </Label>
                  <Input
                    id="address-input"
                    value={customerInfo.address}
                    onChange={(e) => {
                      setCustomerInfo({ ...customerInfo, address: e.target.value });
                      setShowAddressSuggestions(true);
                    }}
                    onFocus={() => setShowAddressSuggestions(true)}
                    placeholder="Saisissez votre rue et numéro (ex: 45 Avenue...)"
                    className="h-10 rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm focus-visible:ring-brand-600"
                  />

                  {/* Dynamic Address Suggestions Helper */}
                  {showAddressSuggestions && (
                    <Card className="absolute top-full left-0 right-0 z-50 mt-1 p-1.5 rounded-xl shadow-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-48 overflow-y-auto">
                      <p className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1">Adresses suggérées</p>
                      {getDynamicAddresses(customerInfo.address).map((addr, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setCustomerInfo({ ...customerInfo, address: addr });
                            setShowAddressSuggestions(false);
                          }}
                          className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-brand-50 dark:hover:bg-stone-800 cursor-pointer flex items-center gap-2 font-medium text-stone-800 dark:text-stone-200"
                        >
                          <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                          <span>{addr}</span>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              </div>
            )}



            {/* Customer Info Form */}
            <div className="space-y-4 pt-2">
              <h2 className="text-lg font-bold tracking-tight">Coordonnées client</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Nom *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="Votre nom"
                    className="h-12 rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm focus-visible:ring-brand-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Téléphone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="06 XX XX XX XX"
                    className="h-12 rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm focus-visible:ring-brand-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Instructions spéciales (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Code porte, instructions livreur..."
                  className="rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm min-h-[70px] focus-visible:ring-brand-600"
                />
              </div>
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: PAYMENT METHOD & PROMO CODE */}
        {/* ==================================================== */}
        {step === 'payment' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div>
              <h2 className="text-lg font-bold tracking-tight">Paiement</h2>
              <p className="text-xs text-stone-500">Comment souhaitez-vous régler ?</p>
            </div>

            {/* Payment Method Option Cards */}
            <div className="space-y-3">
              
              {/* Option 1: Apple Pay */}
              <div
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                  paymentMethod === 'apple_pay'
                    ? 'bg-brand-50/60 dark:bg-brand-950/20 border-2 border-brand-600 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg bg-black text-white`}>
                    
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Apple Pay</span>
                    <span className="text-xs text-stone-500">Touch ID / Face ID</span>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'apple_pay' ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'
                }`}>
                  {paymentMethod === 'apple_pay' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Option 2: Google Pay */}
              <div
                onClick={() => setPaymentMethod('google_pay')}
                className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                  paymentMethod === 'google_pay'
                    ? 'bg-brand-50/60 dark:bg-brand-950/20 border-2 border-brand-600 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm bg-stone-900 text-white`}>
                    GPay
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Google Pay</span>
                    <span className="text-xs text-stone-500">Paiement Android rapide</span>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'google_pay' ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'
                }`}>
                  {paymentMethod === 'google_pay' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Option 3: Carte Bancaire via myPOS */}
              <div
                onClick={() => setPaymentMethod('en_ligne')}
                className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                  paymentMethod === 'en_ligne'
                    ? 'bg-brand-50/60 dark:bg-brand-950/20 border-2 border-brand-600 shadow-sm'
                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    paymentMethod === 'en_ligne' ? 'bg-brand-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Carte Bancaire</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Secured 🔒</span>
                    </div>
                    <span className="text-xs text-stone-500">Visa, Mastercard</span>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'en_ligne' ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'
                }`}>
                  {paymentMethod === 'en_ligne' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Option 4 & 5: Side-by-Side Row for Espèces & CB */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                
                {/* Espèces */}
                <div
                  onClick={() => setPaymentMethod('especes')}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                    paymentMethod === 'especes'
                      ? 'bg-brand-50/60 dark:bg-brand-950/20 border-2 border-brand-600 shadow-sm'
                      : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'especes' ? 'bg-brand-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">Espèces</span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'especes' ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'
                  }`}>
                    {paymentMethod === 'especes' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* CB */}
                <div
                  onClick={() => setPaymentMethod('cb')}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                    paymentMethod === 'cb'
                      ? 'bg-brand-50/60 dark:bg-brand-950/20 border-2 border-brand-600 shadow-sm'
                      : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'cb' ? 'bg-brand-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">CB</span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cb' ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'
                  }`}>
                    {paymentMethod === 'cb' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

              </div>

            </div>

            {/* Promo Code Section */}
            <div className="space-y-3 pt-2">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Promo</h2>
                <p className="text-xs text-stone-500">Vous avez un code de réduction ?</p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Saisir votre code promo"
                    className="pl-10 h-11 rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-sm focus-visible:ring-brand-600"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (promoCode.trim()) {
                      setAppliedPromo(promoCode.toUpperCase());
                      toast({ title: 'Code appliqué !', description: `Le code promo ${promoCode.toUpperCase()} a été pris en compte.` });
                    }
                  }}
                  className="h-11 px-5 rounded-xl border-brand-200 text-brand-600 hover:bg-brand-50 font-bold"
                >
                  Appliquer
                </Button>
              </div>
              
              {appliedPromo && (
                <div className="text-xs font-semibold text-green-600 flex items-center gap-1.5 bg-green-50 p-2.5 rounded-xl border border-green-200">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Code promo <strong>{appliedPromo}</strong> activé</span>
                </div>
              )}
            </div>

            {/* Security Badge */}
            <div className="p-3.5 rounded-2xl bg-stone-100/70 dark:bg-stone-900 text-center flex items-center justify-center gap-2 text-xs text-stone-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Paiement 100% Sécurisé & Chiffré SSL</span>
            </div>

          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* STICKY BOTTOM ACTION BAR */}
      {/* ==================================================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-brand-100/60 dark:border-stone-800 p-4 z-50 shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          
          <div>
            <span className="text-xs text-stone-400 block font-medium">Total</span>
            <span className="text-xl font-extrabold text-stone-900 dark:text-white">
              {ttc.toFixed(2)} €
            </span>
          </div>

          <div className="flex-1">
            {step === 'info' && (
              <Button
                onClick={() => validateInfo() && setStep('payment')}
                disabled={!isCartValid}
                className="w-full h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-lg shadow-brand-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Continuer</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {step === 'payment' && (
              <Button
                onClick={handleConfirmOrder}
                disabled={isProcessing || orderSubmitted || !isCartValid}
                className="w-full h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-lg shadow-brand-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Valider & Payer ({ttc.toFixed(2)} €)</span>
                  </>
                )}
              </Button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
