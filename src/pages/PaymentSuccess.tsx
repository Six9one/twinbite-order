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
        <h1 className="text-2xl font-display font-bold mb-2">✅ Paiement Réussi</h1>
        <p className="text-muted-foreground mb-4">
          Merci pour votre commande !
        </p>
        {orderNumber && (
          <div className="bg-muted/50 p-4 rounded-xl mb-4 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Numéro de Commande</p>
            <p className="text-xl font-bold font-mono text-primary">
              #{orderNumber}
            </p>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-6 text-sm text-amber-800 flex items-center justify-between">
          <span>⏰ Temps de préparation estimé:</span>
          <span className="font-bold">10 - 20 min</span>
        </div>
        <Button onClick={() => navigate('/')} className="w-full gap-2 h-12 text-base rounded-xl">
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Button>
      </Card>
    </div>
  );
}
