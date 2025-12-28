import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Banknote, Check, Star, Gift, Loader2, Sparkles } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useLoyalty } from '@/context/LoyaltyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ============================================
// V1 CHECKOUT WITH LOYALTY INTEGRATION
// - Shows points to earn breakdown
// - Allows reward redemption before checkout
// - Prevents combining rewards with promo codes
// ============================================

interface CheckoutProps {
  onBack: () => void;
}

export function Checkout({ onBack }: CheckoutProps) {
  const { orderType, cart, getTotal, clearCart } = useOrder();
  const {
    customer,
    isLoading: loyaltyLoading,
    findOrCreateCustomer,
    calculatePointsToEarn,
    earnPoints,
    rewards,
    selectedReward,
    selectReward,
    canUseReward,
    redeemReward,
    getNextReward
  } = useLoyalty();

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
  const [hasPromoCode] = useState(false); // For future promo code integration
  const [earnedPoints, setEarnedPoints] = useState(0);

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
        const points = calculatePointsToEarn(total);
        if (foundCustomer.points > 0) {
          toast.success(`Bienvenue ! Vous avez ${foundCustomer.points} points fidélité`);
        } else if (!foundCustomer.firstOrderDone) {
          toast.success(`Bienvenue ! Vous gagnerez ${points.total} points sur cette commande! 🎉`);
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

    try {
      // Generate order ID
      const orderId = `ORDER-${Date.now()}`;

      // Redeem selected reward if any
      if (selectedReward) {
        const redeemResult = await redeemReward(selectedReward.id);
        if (!redeemResult.success) {
          toast.error('Erreur lors de l\'application de la récompense');
          setIsProcessing(false);
          return;
        }
      }

      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Award loyalty points if customer is registered
      if (customer && pointsBreakdown.total > 0) {
        const success = await earnPoints(orderId, finalTotal, `Commande ${orderId}`);
        if (success) {
          setEarnedPoints(pointsBreakdown.total);
          console.log(`Awarded ${pointsBreakdown.total} loyalty points for order ${orderId}`);
        }
      }

      setIsProcessing(false);
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      console.error('Order processing error:', error);
      setIsProcessing(false);
      toast.error('Erreur lors du traitement de la commande');
    }
  };

  const total = getTotal();

  // Calculate discount from selected reward
  let discountAmount = 0;
  let discountLabel = '';
  if (selectedReward) {
    if (selectedReward.type === 'percentage') {
      discountAmount = (total * selectedReward.value) / 100;
      discountLabel = `-${selectedReward.value}%`;
    } else if (selectedReward.type === 'discount') {
      discountAmount = selectedReward.value;
      discountLabel = `-${selectedReward.value}€`;
    } else if (selectedReward.type === 'free_item') {
      discountLabel = selectedReward.name;
    }
  }

  const finalTotal = Math.max(0, total - discountAmount);
  const pointsBreakdown = calculatePointsToEarn(finalTotal);
  const nextReward = getNextReward();

  // Get available rewards for this customer
  const availableRewards = rewards.filter(r => canUseReward(r.id, hasPromoCode));

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

        {/* Points earned summary */}
        {customer && earnedPoints > 0 && (
          <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800 mb-6 max-w-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-900" />
              </div>
              <div>
                <p className="font-bold text-lg">+{earnedPoints} points gagnés !</p>
                <p className="text-sm text-muted-foreground">
                  Total: {(customer.points)} points
                </p>
              </div>
            </div>
            {/* Breakdown */}
            <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Commande (1pt/€)</span>
                <span>+{pointsBreakdown.base}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Bonus en ligne 🌐</span>
                <span>+{pointsBreakdown.online}</span>
              </div>
              {pointsBreakdown.firstOrder > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>1ère commande 🎉</span>
                  <span>+{pointsBreakdown.firstOrder}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Reward applied */}
        {selectedReward && (
          <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 mb-6 max-w-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center">
                <Gift className="w-5 h-5 text-green-900" />
              </div>
              <div>
                <p className="font-bold">🎁 Récompense appliquée</p>
                <p className="text-sm text-muted-foreground">{selectedReward.name}</p>
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

              {/* Reward discount line */}
              {selectedReward && discountAmount > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm text-green-600">
                    <div className="flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      <span>{selectedReward.name}</span>
                    </div>
                    <span className="font-medium">-{discountAmount.toFixed(2)} €</span>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{finalTotal.toFixed(2)} €</span>
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
                  Fidélité
                </h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {customer.points} pts
                </Badge>
              </div>

              {/* Progress to next reward */}
              {nextReward && (
                <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{customer.points} pts</span>
                    <span>{nextReward.reward.pointsCost} pts</span>
                  </div>
                  <Progress
                    value={(customer.points / nextReward.reward.pointsCost) * 100}
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Plus que <strong>{nextReward.pointsNeeded}</strong> pts pour {nextReward.reward.name.toLowerCase()}! 🎁
                  </p>
                </div>
              )}

              {/* Available rewards to redeem */}
              {!hasPromoCode && availableRewards.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Utiliser une récompense:</p>
                  {availableRewards.map((reward) => (
                    <button
                      key={reward.id}
                      onClick={() => selectReward(selectedReward?.id === reward.id ? null : reward)}
                      className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all text-left ${selectedReward?.id === reward.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                          : 'border-white/50 dark:border-white/10 hover:border-primary/50 bg-white/30 dark:bg-black/10'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedReward?.id === reward.id ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Gift className="w-5 h-5" />
                        )}
                        <div>
                          <span className="font-medium">{reward.name}</span>
                          <p className="text-xs text-muted-foreground">{reward.description}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{reward.pointsCost} pts</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Promo code warning */}
              {hasPromoCode && (
                <p className="text-sm text-muted-foreground mb-4 bg-white/50 dark:bg-black/20 p-2 rounded">
                  ⚠️ Les récompenses ne sont pas cumulables avec les codes promo
                </p>
              )}

              {/* Points to earn */}
              <div className="flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <Sparkles className="w-4 h-4 text-green-600" />
                <div>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    +{pointsBreakdown.total} points sur cette commande
                  </span>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {pointsBreakdown.base} (commande) + {pointsBreakdown.online} (en ligne)
                    {pointsBreakdown.firstOrder > 0 && ` + ${pointsBreakdown.firstOrder} (1ère commande)`}
                  </p>
                </div>
              </div>
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
              <>
                Confirmer - {finalTotal.toFixed(2)} €
                {selectedReward && <Gift className="w-4 h-4 ml-2" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
