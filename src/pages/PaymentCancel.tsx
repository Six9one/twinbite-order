import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Paiement Annulé</h1>
        <p className="text-muted-foreground font-medium mb-1">
          Payment cancelled.
        </p>
        <p className="text-sm text-destructive font-semibold mb-6">
          Your order has not been confirmed. (Votre commande n'a pas été confirmée.)
        </p>
        {orderNumber && (
          <p className="text-xs text-muted-foreground mb-6 font-mono">
            Commande #{orderNumber}
          </p>
        )}
        <div className="space-y-3">
          <Button onClick={() => navigate('/')} className="w-full gap-2 h-12 text-base rounded-xl bg-primary">
            <RefreshCw className="w-5 h-5" />
            Réessayer le paiement (Retry Payment)
          </Button>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full gap-2 h-12 text-base rounded-xl">
            <ArrowLeft className="w-5 h-5" />
            Retour au panier (Back to Cart)
          </Button>
        </div>
      </Card>
    </div>
  );
}
