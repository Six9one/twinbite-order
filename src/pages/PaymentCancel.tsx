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
        <p className="text-muted-foreground mb-6">
          Votre paiement a été annulé. Aucun montant n'a été débité.
        </p>
        {orderNumber && (
          <p className="text-sm text-muted-foreground mb-6">
            Commande #{orderNumber}
          </p>
        )}
        <div className="space-y-3">
          <Button onClick={() => navigate('/')} variant="outline" className="w-full gap-2">
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </Button>
          <Button onClick={() => navigate('/')} className="w-full gap-2">
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </Button>
        </div>
      </Card>
    </div>
  );
}
