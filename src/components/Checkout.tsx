import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Banknote, Check, Star, Gift, Loader2 } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useLoyalty } from '@/context/LoyaltyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface CheckoutProps {
  onBack: () => void;
}

export function Checkout({ onBack }: CheckoutProps) {
  const { orderType, cart, getTotal, clearCart } = useOrder();
  const { customer, isLoading: loyaltyLoading, findOrCreateCustomer, calculatePointsToEarn, getTierInfo } = useLoyalty();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const orderTypeLabels = {
    emporter: 'À Emporter',
    livraison: 'Livraison',
    surplace: 'Sur Place',
  };

  // Check loyalty when phone number is entered (10 digits)
  useEffect(() => {
    const phoneDigits = customerInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length >= 10 && !phoneChecked) {
      handleCheckLoyalty();
    }
  }, [customerInfo.phone]);

  const handleCheckLoyalty = async () => {
    const phoneDigits = customerInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) return;

    setPhoneChecked(true);

    try {
      const foundCustomer = await findOrCreateCustomer(phoneDigits, customerInfo.name || 'Client');
      if (foundCustomer) {
        setShowLoyalty(true);
        if (foundCustomer.points > 0) {
          toast.success(`Bienvenue ! Vous avez ${foundCustomer.points} points fidélité`);
        } else {
          toast.success('Compte fidélité créé ! Vous allez gagner des points sur cette commande');
        }
      }
    } catch (e) {
      console.error('Error checking loyalty:', e);
    }
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner un mode de paiement');
      return;
    }

    if (orderType === 'livraison' && !customerInfo.address) {
      toast.error('Veuillez entrer votre adresse de livraison');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Veuillez remplir vos informations');
      return;
    }

    setIsProcessing(true);

    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setOrderComplete(true);
    clearCart();
  };

  const total = getTotal();
  const pointsToEarn = calculatePointsToEarn(total);
  const tierInfo = getTierInfo();

  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-accent-foreground" />
        </div>
        <h2 className="font-display text-3xl font-bold mb-4 text-center">Commande confirmée !</h2>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          {orderType === 'livraison'
            ? 'Votre commande sera livrée dans 30-45 minutes.'
            : orderType === 'emporter'
              ? 'Votre commande sera prête dans 20-30 minutes.'
              : 'Votre commande est en préparation.'
          }
        </p>

        {/* Points earned */}
        {customer && pointsToEarn > 0 && (
          <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800 mb-6 max-w-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-900" />
              </div>
              <div>
                <p className="font-bold text-lg">+{pointsToEarn} points gagnés !</p>
                <p className="text-sm text-muted-foreground">
                  Total: {(customer.points + pointsToEarn)} points
                </p>
              </div>
            </div>
          </Card>
        )}

        <Button onClick={onBack} className="btn-primary px-8 py-4 rounded-full">
          Nouvelle commande
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="sticky top-[73px] z-40 bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-bold">Finaliser la commande</h2>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Order Summary */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Récapitulatif</h3>
            <div className="space-y-3">
              {cart.map((item) => {
                const itemPrice = item.calculatedPrice || item.item.price;
                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span>{item.quantity}x {item.item.name}</span>
                      {item.customization?.size && (
                        <span className="text-muted-foreground ml-1">
                          ({item.customization.size})
                        </span>
                      )}
                    </div>
                    <span className="font-medium">{(itemPrice * item.quantity).toFixed(2)} €</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{total.toFixed(2)} €</span>
              </div>
            </div>
            <div className="mt-4 px-3 py-2 bg-muted rounded-lg text-sm">
              <span className="font-medium">Mode : </span>
              {orderType && orderTypeLabels[orderType]}
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Vos informations</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nom</label>
                <Input
                  placeholder="Votre nom"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Téléphone
                  {!phoneChecked && (
                    <span className="text-xs text-muted-foreground ml-2">(pour votre fidélité)</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    placeholder="Votre numéro"
                    value={customerInfo.phone}
                    onChange={(e) => {
                      setCustomerInfo({ ...customerInfo, phone: e.target.value });
                      setPhoneChecked(false);
                    }}
                  />
                  {loyaltyLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              {orderType === 'livraison' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Adresse de livraison</label>
                  <Input
                    placeholder="Votre adresse complète"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Loyalty Section - Shows when phone is verified */}
          {showLoyalty && customer && (
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Programme Fidélité
                </h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {tierInfo?.name || 'Bronze'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{customer.points}</p>
                  <p className="text-xs text-muted-foreground">Points actuels</p>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">+{pointsToEarn}</p>
                  <p className="text-xs text-muted-foreground">Points à gagner</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="w-4 h-4" />
                <span>
                  {tierInfo?.multiplier && tierInfo.multiplier > 1
                    ? `Bonus x${tierInfo.multiplier} grâce à votre niveau ${tierInfo.name}!`
                    : `Gagnez ${Math.floor((tierInfo?.multiplier || 1))} point par euro dépensé`
                  }
                </span>
              </div>

              {customer.points >= 50 && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    🎁 Vous avez assez de points pour des récompenses !
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Payment Method */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Paiement</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <CreditCard className="w-8 h-8" />
                <span className="font-medium">Carte</span>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <Banknote className="w-8 h-8" />
                <span className="font-medium">Espèces</span>
              </button>
            </div>
          </Card>

          {/* Points to earn reminder */}
          {showLoyalty && customer && pointsToEarn > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg text-sm">
              <Star className="w-4 h-4 text-yellow-600" />
              <span>Vous allez gagner <strong>{pointsToEarn} points</strong> sur cette commande !</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full btn-primary py-4 rounded-full text-lg font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Traitement en cours...
              </>
            ) : (
              `Confirmer - ${total.toFixed(2)} €`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
