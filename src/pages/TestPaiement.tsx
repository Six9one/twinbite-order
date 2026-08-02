import { useState, useEffect, useCallback } from 'react';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { initiateMyPosCheckout } from '@/services/mypos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Loader2, RefreshCw, CheckCircle2, Clock, XCircle, FlaskConical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const TEST_CUSTOMER_NAME = '🧪 TEST PAIEMENT — NE PAS PRÉPARER';
const QUICK_AMOUNTS = [0.1, 0.5, 1];

interface TestOrder {
  order_number: string;
  total: number;
  payment_status: string | null;
  payment_amount: number | null;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function TestPaiement() {
  const [amount, setAmount] = useState('0.10');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const createOrder = useCreateOrder();

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('order_number, total, payment_status, payment_amount, transaction_id, paid_at, created_at')
      .eq('customer_name', TEST_CUSTOMER_NAME)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[TestPaiement] load error:', error);
    } else {
      setOrders((data ?? []) as TestOrder[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handlePay = async () => {
    const value = Number(amount.replace(',', '.'));

    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: 'Montant invalide', description: 'Entrez un montant supérieur à 0.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      const rounded = Math.round(value * 100) / 100;
      const orderNumber = await generateOrderNumber();

      // Same sequence as the real checkout: the order must exist before myPOS is handed the
      // customer, otherwise the notification arrives with nothing to attach itself to.
      await createOrder.mutateAsync({
        order_number: orderNumber,
        order_type: 'emporter',
        items: [{ name: 'TEST PAIEMENT', quantity: 1, price: rounded, category: 'test' }] as never,
        customer_name: TEST_CUSTOMER_NAME,
        customer_phone: '0000000000',
        payment_method: 'en_ligne',
        subtotal: rounded,
        tva: 0,
        total: rounded,
        status: 'pending',
      } as never);

      await initiateMyPosCheckout({
        amount: rounded,
        customerName: TEST_CUSTOMER_NAME,
        customerPhone: '0000000000',
        customerEmail: null,
        orderNumber,
        items: [{ name: 'TEST PAIEMENT', quantity: 1, price: rounded }],
        orderType: 'emporter',
        subtotal: rounded,
        tva: 0,
      });
    } catch (error) {
      console.error('[TestPaiement] error:', error);
      toast({
        title: 'Échec du test',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const renderStatus = (status: string | null) => {
    if (status === 'Paid') {
      return (
        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-md text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Payé
        </span>
      );
    }
    if (status === 'Failed') {
      return (
        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-md text-xs font-semibold">
          <XCircle className="w-3.5 h-3.5" /> Échoué
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-md text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> En attente
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center">
      <div className="w-full max-w-lg space-y-4 py-6">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Test de paiement myPOS</h1>
        </div>

        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant à débiter (€)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14 font-mono"
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((quick) => (
              <Button
                key={quick}
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={() => setAmount(quick.toFixed(2))}
              >
                {quick.toFixed(2)} €
              </Button>
            ))}
          </div>

          <Button onClick={handlePay} disabled={isProcessing} className="w-full h-14 text-base gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirection vers myPOS...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Payer {amount || '0.00'} € par carte
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Ce bouton débite une <strong>vraie carte</strong> et encaisse sur ton compte myPOS.
            La commande est créée au nom « TEST PAIEMENT — NE PAS PRÉPARER » pour que la cuisine
            l'ignore. myPOS peut refuser les montants trop faibles : si le paiement échoue,
            essaie 0,50 € ou 1,00 €.
          </p>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Derniers tests</h2>
            <Button variant="ghost" size="sm" onClick={loadOrders} disabled={isLoading} className="gap-1.5">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            « Payé » ici signifie que myPOS a bien notifié le site et que le webhook a fait son
            travail. Si ça reste « En attente » alors que myPOS affiche « Réglé », c'est le webhook
            qui n'a pas abouti.
          </p>

          <Separator />

          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun test pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.order_number} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold">#{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(order.total).toFixed(2)} €
                      {' · '}
                      {new Date(order.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {order.transaction_id && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {order.transaction_id}
                      </p>
                    )}
                  </div>
                  {renderStatus(order.payment_status)}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
