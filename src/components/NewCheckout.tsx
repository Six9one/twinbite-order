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
import { ArrowLeft, Check, CreditCard, Banknote, PartyPopper, Globe, Loader2, CalendarClock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { format, addMonths, isSunday } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface NewCheckoutProps {
  onBack: (size?: 'senior' | 'mega') => void;
  onComplete: () => void;
}

export function NewCheckout({ onBack, onComplete }: NewCheckoutProps) {
  const { cart, orderType, setOrderType, clearCart, scheduledInfo, setScheduledInfo } = useOrder();
  const createOrder = useCreateOrder();
  const { data: paymentSettings, isLoading: isLoadingPaymentSettings } = usePaymentSettings();
  const [step, setStep] = useState<'info' | 'payment' | 'schedule-confirm' | 'confirm' | 'success'>('info');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const orderNumberRef = useRef<string | null>(null);
  const [scheduleAsked, setScheduleAsked] = useState(false);
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


  // Prevent duplicate submissions
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      orderNumberRef.current = null;
    };
  }, []);

  // Calculate totals with promotions - recalculate on every render to ensure accuracy
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const hasPizza = pizzaItems.length > 0;  // Check if cart has any pizza items
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');

  // Determine the dominant pizza size in cart (for deferral)
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
  const shouldApplyDeliveryFee = isDelivery && !hasRegularPizzaOnly && productsSubtotal < FREE_DELIVERY_THRESHOLD;
  const deliveryFee = shouldApplyDeliveryFee ? DELIVERY_FEE : 0;
  const qualifiesForFreeDelivery = productsSubtotal >= FREE_DELIVERY_THRESHOLD || hasRegularPizzaOnly;

  const subtotal = productsSubtotal + deliveryFee;

  const { ht, tva, ttc } = calculateTVA(subtotal);
  const isCartValid = cart.length > 0 && ttc > 0;

  const orderTypeLabels = {
    emporter: 'À emporter',
    livraison: 'Livraison',
    surplace: 'Sur place',
  };

  const paymentMethodLabels = {
    cb: 'Carte Bancaire',
    especes: 'Espèces',
    en_ligne: 'Paiement en ligne',
  };

  const validateInfo = () => {
    // Validate with zod schema
    const result = customerInfoSchema.safeParse(customerInfo);

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({ title: 'Erreur', description: firstError.message, variant: 'destructive' });
      return false;
    }

    // Additional check for delivery address
    if (orderType === 'livraison' && !customerInfo.address?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre adresse de livraison', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const handleStripePayment = async () => {
    // Validate cart before proceeding
    if (!isCartValid) {
      toast({
        title: 'Erreur',
        description: 'Votre panier est vide ou invalide. Veuillez ajouter des articles.',
        variant: 'destructive'
      });
      return;
    }

    if (!orderType) {
      toast({ title: 'Erreur', description: 'Type de commande non sélectionné', variant: 'destructive' });
      return;
    }

    // Prevent duplicate submissions
    if (orderSubmitted) {
      toast({ title: 'Commande en cours', description: 'Veuillez patienter...', variant: 'default' });
      return;
    }

    setIsProcessing(true);
    setOrderSubmitted(true);

    // Generate order number only once (from server)
    if (!orderNumberRef.current) {
      orderNumberRef.current = await generateOrderNumber();
    }
    const orderNumber = orderNumberRef.current;

    try {
      // Recalculate totals server-side friendly format
      const finalTotal = Math.max(ttc, 0.01); // Ensure minimum price for Stripe

      // Create Stripe checkout session with ALL order data
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
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
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      // Clear cart and redirect to Stripe
      clearCart();
      window.location.href = data.url;
    } catch (error) {
      console.error('Stripe checkout error:', error);
      setOrderSubmitted(false);
      orderNumberRef.current = null;
      toast({
        title: 'Erreur de paiement',
        description: 'Impossible de créer la session de paiement. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
    // Validate cart before proceeding
    if (!isCartValid) {
      toast({
        title: 'Erreur',
        description: 'Votre panier est vide ou invalide. Veuillez ajouter des articles.',
        variant: 'destructive'
      });
      return;
    }

    if (!orderType) {
      toast({ title: 'Erreur', description: 'Type de commande non sélectionné', variant: 'destructive' });
      return;
    }

    // Validate customer info first
    if (!customerInfo.name?.trim() || !customerInfo.phone?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir votre nom et téléphone', variant: 'destructive' });
      return;
    }

    if (orderType === 'livraison' && !customerInfo.address?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre adresse de livraison', variant: 'destructive' });
      return;
    }

    // Prevent duplicate submissions
    if (orderSubmitted || isProcessing) {
      toast({ title: 'Commande en cours', description: 'Veuillez patienter...', variant: 'default' });
      return;
    }

    // If payment is online, redirect to Stripe
    if (paymentMethod === 'en_ligne') {
      await handleStripePayment();
      return;
    }

    setIsProcessing(true);
    setOrderSubmitted(true);

    // Generate order number only once (from server)
    if (!orderNumberRef.current) {
      orderNumberRef.current = await generateOrderNumber();
    }

    try {
      // Double check totals are valid
      const finalHt = Math.max(ht, 0);
      const finalTva = Math.max(tva, 0);
      const finalTtc = Math.max(ttc, 0.01);

      if (finalTtc <= 0) {
        throw new Error('Total invalide');
      }

      console.log('[CHECKOUT] Creating order:', {
        orderNumber: orderNumberRef.current,
        orderType,
        paymentMethod,
        total: finalTtc,
        itemCount: cart.length
      });

      // Create order in database
      const result = await createOrder.mutateAsync({
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

      console.log('[CHECKOUT] Order created successfully:', result);

      // Send Telegram notification with stamp info included
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
        console.log('[CHECKOUT] Telegram notification sent with stamp info');
      } catch (telegramError) {
        console.error('[CHECKOUT] Telegram notification failed:', telegramError);
        // Don't fail the order if Telegram fails
      }

      // WhatsApp confirmation is now handled automatically by TwinPizza Hub (Electron)
      // via Supabase Realtime — no API call needed here.

      // Save order data for the success screen BEFORE clearing cart
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
      console.error('[CHECKOUT] Failed to create order:', error);
      setOrderSubmitted(false);
      orderNumberRef.current = null;

      const anyError = error as any;
      let errorMessage = 'Erreur inconnue';
      if (anyError?.message) {
        errorMessage = anyError.message;
      } else if (typeof anyError === 'string') {
        errorMessage = anyError;
      } else if (anyError?.code) {
        errorMessage = `Code ${anyError.code}`;
      }

      toast({
        title: 'Impossible de créer la commande',
        description: `${errorMessage}. Veuillez réessayer ou appeler le restaurant.`,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'success' && confirmedOrderData) {
    const orderTypeLabels: Record<string, string> = {
      emporter: 'À emporter',
      livraison: 'Livraison',
      surplace: 'Sur place',
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-b from-green-50 to-white rounded-xl p-2">
            {/* Success header */}
            <div className="text-center mb-4">
              <PartyPopper className="w-16 h-16 mx-auto text-green-500 mb-2" />
              <h1 className="text-2xl font-display font-bold text-green-600">Commande Confirmée!</h1>
            </div>

            {/* Digital Ticket - designed to be screenshot-friendly */}
            <Card className="overflow-hidden border-2 border-primary/20 shadow-lg" id="order-ticket">
              {/* Ticket Header */}
              <div className="bg-primary text-white p-4 text-center">
                <p className="text-sm opacity-80">TWIN PIZZA</p>
                <p className="text-4xl font-bold font-mono mt-1">#{confirmedOrderData.orderNumber}</p>
                <p className="text-xs opacity-70 mt-1">Présentez ce ticket à la caisse</p>
                <div className="mt-2 bg-white/20 p-2 rounded text-xs select-all">
                  Lien: twinpizza.fr/tickets?phone={confirmedOrderData.customerPhone}
                </div>
              </div>

              {/* Order info */}
              <div className="p-4 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{format(confirmedOrderData.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{orderTypeLabels[confirmedOrderData.orderType] || confirmedOrderData.orderType}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-medium">{confirmedOrderData.customerName}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Paiement:</span>
                  <span className="font-medium">{confirmedOrderData.paymentMethod === 'cb' ? 'Carte Bancaire' : 'Espèces'}</span>
                </div>
                {/* Wait time display */}
                <div className="flex justify-between text-sm mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                  <span className="text-amber-700">⏰ Prêt dans:</span>
                  <span className="font-bold text-amber-800">10-20 min</span>
                </div>
                {/* Delivery address */}
                {confirmedOrderData.orderType === 'livraison' && confirmedOrderData.customerAddress && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-700 font-medium">📍 Adresse de livraison:</span>
                    <p className="text-blue-600 mt-1">{confirmedOrderData.customerAddress}</p>
                  </div>
                )}
                {confirmedOrderData.scheduledFor && (
                  <div className="flex justify-between text-sm mt-1 text-purple-600">
                    <span>Programmé:</span>
                    <span className="font-medium">{format(confirmedOrderData.scheduledFor, "EEE d MMM 'à' HH:mm", { locale: fr })}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Order items */}
              <div className="p-4">
                <h3 className="font-semibold mb-2">Votre commande:</h3>
                <div className="space-y-2 text-sm">
                  {confirmedOrderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.item.name}
                        {item.customization && (
                          <span className="text-muted-foreground text-xs ml-1">
                            {(() => {
                              const c = item.customization as any;
                              const parts = [];
                              // Don't show size - it's already in the product name
                              if (c.isMenuMidi) parts.push('Menu Midi');
                              if (c.meats?.length) parts.push(c.meats.join(', '));
                              if (c.sauces?.length) parts.push(c.sauces.join(', '));
                              return parts.length > 0 ? `(${parts.join(' • ')})` : '';
                            })()}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">{((item.calculatedPrice || item.item.price) * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}

                  {/* Delivery fee on ticket */}
                  {confirmedOrderData.deliveryFee > 0 && (
                    <div className="flex justify-between text-orange-600 pt-2 border-t">
                      <span>🚗 Frais de livraison</span>
                      <span className="font-medium">+{confirmedOrderData.deliveryFee.toFixed(2)}€</span>
                    </div>
                  )}
                  {confirmedOrderData.orderType === 'livraison' && confirmedOrderData.deliveryFee === 0 && (
                    <div className="flex justify-between text-green-600 pt-2 border-t">
                      <span>🚗 Livraison</span>
                      <span className="font-medium">GRATUITE</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="p-4 bg-primary/5">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">TOTAL</span>
                  <span className="text-2xl font-bold text-primary">{confirmedOrderData.total.toFixed(2)}€</span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-muted/50 text-center text-xs text-muted-foreground">
                Merci de votre confiance! À bientôt chez Twin Pizza 🍕
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-4 sm:mt-6 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              📸 Faites une capture d'écran de votre ticket!
            </p>
            <Button onClick={onComplete} className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-xl">
              Retour à l'accueil
            </Button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 sm:w-11 sm:h-11"
              onClick={() => step === 'info' ? onBack() : setStep(step === 'confirm' ? 'payment' : 'info')}
              disabled={isProcessing}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">Finaliser la commande</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {step === 'info' ? 'Vos informations' : step === 'payment' ? 'Paiement' : 'Confirmation'}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            {['info', 'payment', 'confirm'].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 sm:h-2 flex-1 rounded-full transition-colors ${['info', 'payment', 'schedule-confirm', 'confirm'].indexOf(step) >= i ? 'bg-primary' : 'bg-muted'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Cart validation warning */}
        {!isCartValid && (
          <Card className="p-4 bg-destructive/10 border-destructive">
            <p className="text-destructive font-medium">
              ⚠️ Votre panier est vide ou le total est invalide. Veuillez ajouter des articles.
            </p>
          </Card>
        )}

        {step === 'info' && (
          <div className="space-y-5 sm:space-y-5">
            <div>
              <Label htmlFor="name" className="text-base sm:text-base font-semibold">Nom *</Label>
              <Input
                id="name"
                autoComplete="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="Votre nom"
                className="mt-2 h-14 text-base rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-base sm:text-base font-semibold">Téléphone *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="06 XX XX XX XX"
                className="mt-2 h-14 text-base rounded-xl"
              />
            </div>
            {orderType === 'livraison' && (
              <div>
                <Label htmlFor="address" className="text-base font-semibold">Adresse de livraison *</Label>
                <Textarea
                  id="address"
                  autoComplete="street-address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  placeholder="Votre adresse complète"
                  className="mt-2 text-base min-h-[80px] rounded-xl"
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes" className="text-base font-semibold">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                placeholder="Instructions spéciales..."
                className="mt-2 text-base min-h-[60px] rounded-xl"
              />
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Mode de paiement</h2>
            <div className="grid grid-cols-1 gap-3">
              {/* Online Payment - Only show if enabled */}
              {paymentSettings?.online_payments_enabled && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'en_ligne'}
                  className={`w-full flex items-center gap-4 p-4 min-h-[72px] rounded-xl border-2 transition-all text-left ${paymentMethod === 'en_ligne' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}
                  onClick={() => setPaymentMethod('en_ligne')}
                >
                  <Globe className="w-8 h-8 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Payer maintenant (Stripe)</h3>
                    <p className="text-xs text-muted-foreground">Paiement sécurisé par carte</p>
                  </div>
                  {paymentMethod === 'en_ligne' && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                </button>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'cb'}
                className={`w-full flex items-center gap-4 p-4 min-h-[72px] rounded-xl border-2 transition-all text-left ${paymentMethod === 'cb' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}
                onClick={() => setPaymentMethod('cb')}
              >
                <CreditCard className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">Carte Bancaire</h3>
                  <p className="text-xs text-muted-foreground">
                    {orderType === 'livraison' ? 'À la livraison' : 'Sur place'}
                  </p>
                </div>
                {paymentMethod === 'cb' && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'especes'}
                className={`w-full flex items-center gap-4 p-4 min-h-[72px] rounded-xl border-2 transition-all text-left ${paymentMethod === 'especes' ? 'border-green-500 bg-green-500/5 shadow-sm' : 'border-border hover:border-green-400/40 hover:bg-muted/40'}`}
                onClick={() => setPaymentMethod('especes')}
              >
                <Banknote className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold">Espèces</h3>
                  <p className="text-xs text-muted-foreground">
                    {orderType === 'livraison' ? 'À la livraison' : 'Sur place'}
                  </p>
                </div>
                {paymentMethod === 'especes' && <Check className="w-5 h-5 text-green-600 flex-shrink-0" />}
              </button>
            </div>

            {/* Delivery info for non-delivery orders WITHOUT pizza - CLICKABLE */}
            {orderType !== 'livraison' && !hasPizza && (
              <Card
                className="p-4 bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all"
                onClick={() => {
                  setOrderType('livraison');
                  setStep('info'); // Go back to info step to enter address
                }}
              >
                <h3 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                  🚗 Livraison aussi disponible!
                </h3>
                <div className="text-sm text-blue-600 space-y-1">
                  <p>• <span className="font-semibold">Gratuite</span> pour les commandes ≥ 25€</p>
                  <p>• +5€ de frais pour les commandes &lt; 25€</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-3 bg-blue-600 text-white hover:bg-blue-700 border-0"
                >
                  Passer en livraison →
                </Button>
              </Card>
            )}

            {/* For orders with pizza - just show simple livraison message */}
            {orderType !== 'livraison' && hasPizza && (
              <Card
                className="p-4 bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition-all"
                onClick={() => {
                  setOrderType('livraison');
                  setStep('info');
                }}
              >
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  🚗 Livraison gratuite avec vos pizzas!
                </h3>
                <p className="text-sm text-green-600 mt-1">
                  Cliquez pour passer en mode livraison
                </p>
              </Card>
            )}
          </div>
        )}

        {step === 'schedule-confirm' && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <CalendarClock className="w-12 h-12 mx-auto text-purple-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Commander pour plus tard ?</h2>
              <p className="text-muted-foreground mb-4">
                Souhaitez-vous programmer votre commande pour un autre moment ?
              </p>
              <div className="space-y-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full gap-2 border-purple-300 text-purple-700">
                      <CalendarClock className="w-4 h-4" />
                      {tempScheduleDate
                        ? format(tempScheduleDate, "EEE d MMM", { locale: fr }) + " à " + tempScheduleTime
                        : "Choisir date et heure"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="center">
                    <Calendar
                      mode="single"
                      selected={tempScheduleDate}
                      onSelect={setTempScheduleDate}
                      locale={fr}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today || date > addMonths(today, 1) || isSunday(date);
                      }}
                      modifiersClassNames={{ sunday: 'text-red-500 line-through' }}
                    />
                    <Select value={tempScheduleTime} onValueChange={setTempScheduleTime}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Heure" />
                      </SelectTrigger>
                      <SelectContent>
                        {['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tempScheduleDate && (
                      <Button
                        className="w-full mt-3"
                        onClick={() => {
                          const [h, m] = tempScheduleTime.split(':').map(Number);
                          const d = new Date(tempScheduleDate);
                          d.setHours(h, m, 0, 0);
                          setScheduledInfo({ isScheduled: true, scheduledFor: d });
                          setScheduleAsked(true);
                          setStep('confirm');
                        }}
                      >
                        Confirmer
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </Card>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Scheduled Order Banner */}
            {scheduledInfo.isScheduled && scheduledInfo.scheduledFor && (
              <Card className="p-4 bg-purple-50 border-purple-300 border-2">
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="font-bold text-purple-700">Commande programmée</p>
                    <p className="text-sm text-purple-600">
                      📅 {format(new Date(scheduledInfo.scheduledFor), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{orderTypeLabels[orderType!]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom</span>
                  <span>{customerInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span>{customerInfo.phone}</span>
                </div>
                {customerInfo.address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adresse</span>
                    <span className="text-right max-w-[200px]">{customerInfo.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paiement</span>
                  <span>{paymentMethodLabels[paymentMethod]}</span>
                </div>
              </div>
            </Card>

            {/* 🍕 PIZZA CREDIT DEFERRAL - Show when promotion gives free pizzas */}
            {pizzaPromo.freePizzas > 0 && (
              <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400">
                <div className="flex items-start gap-3">
                  <div className="text-4xl animate-bounce">🍕</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-green-800 text-lg">
                      {pizzaPromo.freePizzas} Pizza{pizzaPromo.freePizzas > 1 ? 's' : ''} {dominantPizzaSize === 'mega' ? 'Mega' : 'Senior'} Gratuite{pizzaPromo.freePizzas > 1 ? 's' : ''}!
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Ajoutez votre pizza gratuite à cette commande :
                    </p>

                    <div className="mt-3 flex flex-col gap-2">
                      {/* Option 1: Prendre maintenant - redirect to pizza menu */}
                      <Button
                        variant="outline"
                        className="w-full p-4 h-auto bg-white border-2 border-green-400 hover:bg-green-50 text-left justify-start"
                        onClick={() => {
                          // Go back to menu to pick the pizza with size locked
                          onBack(dominantPizzaSize);
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl">👉</span>
                          <div>
                            <p className="font-bold text-green-800">
                              Prendre maintenant
                            </p>
                            <p className="text-xs text-green-600">
                              Ajouter {pizzaPromo.freePizzas === 1 ? 'ma pizza' : 'mes pizzas'} {dominantPizzaSize === 'mega' ? 'Mega' : 'Senior'} à cette commande
                            </p>
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Articles ({cart.length})</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.item.name}
                      {item.customization && 'size' in item.customization && (
                        <span className="text-muted-foreground"> ({(item.customization as PizzaCustomization).size})</span>
                      )}
                    </span>
                    <span>{((item.calculatedPrice || item.item.price) * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              {pizzaPromo.promoDescription && (
                <>
                  <Separator className="my-3" />
                  <div className="text-sm text-green-600 flex justify-between">
                    <span>{pizzaPromo.promoDescription}</span>
                    <span>-{(pizzaPromo.originalTotal - pizzaPromo.discountedTotal).toFixed(2)}€</span>
                  </div>
                </>
              )}



              {/* Delivery fee display */}
              {isDelivery && (
                <>
                  <Separator className="my-3" />
                  <div className={`text-sm flex justify-between ${qualifiesForFreeDelivery ? 'text-green-600' : 'text-orange-600'}`}>
                    <span>🚗 Livraison</span>
                    <span className="font-semibold">
                      {qualifiesForFreeDelivery ? 'GRATUITE' : `+${DELIVERY_FEE.toFixed(2)}€`}
                    </span>
                  </div>
                </>
              )}

              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total HT</span>
                  <span>{ht.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA (10%)</span>
                  <span>{tva.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total TTC</span>
                  <span className="text-primary">{ttc.toFixed(2)}€</span>
                </div>
              </div>
            </Card>


          </div>
        )}
      </div>

      {/* Bottom Action - FIXED for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-primary/20 p-4 pb-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto max-w-lg">
          {step === 'info' && (
            <Button
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98]"
              onClick={() => validateInfo() && setStep('payment')}
              disabled={!isCartValid}
            >
              Continuer
            </Button>
          )}
          {step === 'payment' && (
            <Button
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98]"
              onClick={() => {
                // If not already scheduled, go to schedule-confirm step first
                if (!scheduledInfo.isScheduled && !scheduleAsked) {
                  setStep('schedule-confirm');
                } else {
                  setStep('confirm');
                }
              }}
              disabled={!isCartValid}
            >
              Continuer - {ttc.toFixed(2)}€
            </Button>
          )}
          {step === 'schedule-confirm' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 text-sm sm:text-lg font-bold rounded-xl border-2 active:scale-[0.98]"
                onClick={() => {
                  setScheduleAsked(true);
                  setStep('confirm');
                }}
              >
                Commander maintenant
              </Button>
              <Button
                className="flex-1 h-14 text-sm sm:text-lg font-bold bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md active:scale-[0.98]"
                onClick={() => {
                  // User wants to schedule - they'll pick date in the step view
                  setScheduleAsked(true);
                }}
              >
                Choisir horaire
              </Button>
            </div>
          )}
          {step === 'confirm' && (
            <Button
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] bg-green-600 hover:bg-green-700"
              onClick={handleConfirmOrder}
              disabled={isProcessing || orderSubmitted || !isCartValid}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  {paymentMethod === 'en_ligne' ? 'Redirection...' : 'Envoi en cours...'}
                </>
              ) : (
                paymentMethod === 'en_ligne'
                  ? `Payer maintenant - ${ttc.toFixed(2)}€`
                  : `Confirmer - ${ttc.toFixed(2)}€`
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
