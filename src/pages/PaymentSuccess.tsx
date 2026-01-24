import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper, Check, Home } from 'lucide-react';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center animate-scale-in">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <PartyPopper className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Paiement Réussi!</h1>
        <p className="text-muted-foreground mb-2">
          Merci pour votre commande!
        </p>
        {orderNumber && (
          <p className="text-lg font-semibold text-primary mb-6">
            Commande {orderNumber}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          Votre commande a été confirmée et est en cours de préparation.
        </p>
        <Button onClick={() => navigate('/')} className="w-full gap-2">
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Button>
      </Card>
    </div>
  );
}
