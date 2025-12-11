import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { CustomerInfo, PaymentMethod, PizzaCustomization } from '@/types/order';
import { applyPizzaPromotions, calculateTVA } from '@/utils/promotions';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, CreditCard, Banknote, PartyPopper } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NewCheckoutProps {
  onBack: () => void;
  onComplete: () => void;
}

export function NewCheckout({ onBack, onComplete }: NewCheckoutProps) {
  const { cart, orderType, clearCart, getTotal } = useOrder();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState<'info' | 'payment' | 'confirm' | 'success'>('info');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate totals with promotions
  const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
  const otherItems = cart.filter(item => item.item.category !== 'pizzas');
  
  const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
  const otherTotal = otherItems.reduce((sum, item) => 
    sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);
  
  const subtotal = pizzaPromo.discountedTotal + otherTotal;
  const { ht, tva, ttc } = calculateTVA(subtotal);

  const orderTypeLabels = {
    emporter: 'À emporter',
    livraison: 'Livraison',
    surplace: 'Sur place',
  };

  const validateInfo = () => {
    if (!customerInfo.name.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre nom', variant: 'destructive' });
      return false;
    }
    if (!customerInfo.phone.trim() || customerInfo.phone.length < 10) {
      toast({ title: 'Erreur', description: 'Veuillez entrer un numéro de téléphone valide', variant: 'destructive' });
      return false;
    }
    if (orderType === 'livraison' && !customerInfo.address?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre adresse de livraison', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleConfirmOrder = async () => {
    if (!orderType) {
      toast({ title: 'Erreur', description: 'Type de commande non sélectionné', variant: 'destructive' });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create order in database
      await createOrder.mutateAsync({
        order_number: generateOrderNumber(),
        order_type: orderType,
        items: cart as unknown as import('@/integrations/supabase/types').Json,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || null,
        customer_notes: customerInfo.notes || null,
        payment_method: paymentMethod,
        subtotal: ht,
        tva,
        total: ttc,
        delivery_fee: 0,
        status: 'pending',
      });
      
      clearCart();
      setStep('success');
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de créer la commande. Veuillez réessayer.', 
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center animate-scale-in">
          <PartyPopper className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Commande Confirmée!</h1>
          <p className="text-muted-foreground mb-6">
            Merci {customerInfo.name}! Votre commande a été envoyée.
            {paymentMethod === 'especes' && ' Paiement à la réception.'}
          </p>
          <Button onClick={onComplete} className="w-full">
            Retour à l'accueil
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => step === 'info' ? onBack() : setStep(step === 'confirm' ? 'payment' : 'info')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Finaliser la commande</h1>
              <p className="text-sm text-muted-foreground">
                {step === 'info' ? 'Vos informations' : step === 'payment' ? 'Paiement' : 'Confirmation'}
              </p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex gap-2 mt-4">
            {['info', 'payment', 'confirm'].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ['info', 'payment', 'confirm'].indexOf(step) >= i ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {step === 'info' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="Votre nom"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="06 XX XX XX XX"
                className="mt-1"
              />
            </div>
            {orderType === 'livraison' && (
              <div>
                <Label htmlFor="address">Adresse de livraison *</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  placeholder="Votre adresse complète"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                placeholder="Instructions spéciales..."
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Mode de paiement</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`p-4 cursor-pointer transition-all ${paymentMethod === 'cb' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => setPaymentMethod('cb')}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Carte Bancaire</h3>
                    <p className="text-xs text-muted-foreground">
                      {orderType === 'livraison' ? 'À la livraison' : 'Sur place'}
                    </p>
                  </div>
                </div>
                {paymentMethod === 'cb' && <Check className="w-5 h-5 text-primary mt-2" />}
              </Card>
              <Card
                className={`p-4 cursor-pointer transition-all ${paymentMethod === 'especes' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => setPaymentMethod('especes')}
              >
                <div className="flex items-center gap-3">
                  <Banknote className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Espèces</h3>
                    <p className="text-xs text-muted-foreground">
                      {orderType === 'livraison' ? 'À la livraison' : 'Sur place'}
                    </p>
                  </div>
                </div>
                {paymentMethod === 'especes' && <Check className="w-5 h-5 text-primary mt-2" />}
              </Card>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
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
                  <span>{paymentMethod === 'cb' ? 'Carte Bancaire' : 'Espèces'}</span>
                </div>
              </div>
            </Card>

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

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container mx-auto">
          {step === 'info' && (
            <Button 
              className="w-full h-14 text-lg" 
              onClick={() => validateInfo() && setStep('payment')}
            >
              Continuer
            </Button>
          )}
          {step === 'payment' && (
            <Button 
              className="w-full h-14 text-lg" 
              onClick={() => setStep('confirm')}
            >
              Continuer - {ttc.toFixed(2)}€
            </Button>
          )}
          {step === 'confirm' && (
            <Button 
              className="w-full h-14 text-lg" 
              onClick={handleConfirmOrder}
              disabled={isProcessing}
            >
              {isProcessing ? 'Envoi en cours...' : `Confirmer la commande - ${ttc.toFixed(2)}€`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
