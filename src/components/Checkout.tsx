import { useState } from 'react';
import { ArrowLeft, CreditCard, Banknote, Check } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CheckoutProps {
  onBack: () => void;
}

export function Checkout({ onBack }: CheckoutProps) {
  const { orderType, cart, getTotal, clearCart } = useOrder();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const orderTypeLabels = {
    emporter: 'À Emporter',
    livraison: 'Livraison',
    surplace: 'Sur Place',
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

  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-accent-foreground" />
        </div>
        <h2 className="font-display text-3xl font-bold mb-4 text-center">Commande confirmée !</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          {orderType === 'livraison' 
            ? 'Votre commande sera livrée dans 30-45 minutes.'
            : orderType === 'emporter'
            ? 'Votre commande sera prête dans 20-30 minutes.'
            : 'Votre commande est en préparation.'
          }
        </p>
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
        <div className="max-w-lg mx-auto space-y-8">
          {/* Order Summary */}
          <div className="bg-card rounded-xl p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Récapitulatif</h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.item.name}</span>
                  <span className="font-medium">{(item.item.price * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{getTotal().toFixed(2)} €</span>
              </div>
            </div>
            <div className="mt-4 px-3 py-2 bg-muted rounded-lg text-sm">
              <span className="font-medium">Mode : </span>
              {orderType && orderTypeLabels[orderType]}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-xl p-6">
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
                <label className="text-sm font-medium mb-2 block">Téléphone</label>
                <Input
                  placeholder="Votre numéro"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                />
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
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-xl p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Paiement</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CreditCard className="w-8 h-8" />
                <span className="font-medium">Carte</span>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Banknote className="w-8 h-8" />
                <span className="font-medium">Espèces</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full btn-primary py-4 rounded-full text-lg font-semibold"
          >
            {isProcessing ? 'Traitement en cours...' : `Confirmer - ${getTotal().toFixed(2)} €`}
          </Button>
        </div>
      </div>
    </div>
  );
}
