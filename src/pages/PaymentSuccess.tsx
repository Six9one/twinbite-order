import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Clock,
  Home,
  Printer,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  CreditCard,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
  calculatedPrice?: number;
  item?: {
    name?: string;
    price?: number;
  };
  customization?: Record<string, any>;
}

interface OrderDetail {
  id: string;
  order_number: string;
  order_type: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string | null;
  customer_notes?: string | null;
  items: OrderItem[];
  subtotal: number;
  tva: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string | null;
  status: string;
  created_at: string;
  paid_at?: string | null;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (error) {
        console.error('[PaymentSuccess] Error fetching order:', error);
      } else if (data) {
        setOrder(data as unknown as OrderDetail);
      }
    } catch (err) {
      console.error('[PaymentSuccess] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  // Initial fetch and polling every 2s for 30s if payment_status is not 'Paid' yet
  useEffect(() => {
    fetchOrder();

    const interval = setInterval(() => {
      setPollCount((prev) => {
        if (prev < 15) {
          fetchOrder();
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchOrder]);

  const isPaid = order?.payment_status === 'Paid';
  const orderTypeLabels: Record<string, string> = {
    livraison: 'Livraison à domicile',
    emporter: 'À emporter au restaurant',
    surplace: 'Sur place',
  };

  const renderCustomization = (cust: Record<string, any> | undefined) => {
    if (!cust || Object.keys(cust).length === 0) return null;
    const details: string[] = [];

    if (cust.size) details.push(`Taille: ${cust.size}`);
    if (cust.base) details.push(`Base: ${cust.base}`);
    if (cust.toppings && Array.isArray(cust.toppings) && cust.toppings.length > 0) {
      details.push(`Ingrédients: ${cust.toppings.join(', ')}`);
    }
    if (cust.extraToppings && Array.isArray(cust.extraToppings) && cust.extraToppings.length > 0) {
      details.push(`Suppléments: ${cust.extraToppings.join(', ')}`);
    }
    if (cust.sauces && Array.isArray(cust.sauces) && cust.sauces.length > 0) {
      details.push(`Sauces: ${cust.sauces.join(', ')}`);
    }
    if (cust.drinks && Array.isArray(cust.drinks) && cust.drinks.length > 0) {
      details.push(`Boissons: ${cust.drinks.join(', ')}`);
    }
    if (cust.note) details.push(`Note: ${cust.note}`);

    if (details.length === 0) return null;

    return (
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
        {details.join(' • ')}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-8 px-4 flex justify-center items-start">
      <div className="w-full max-w-lg space-y-4">
        {/* Header Confirmation Card */}
        <Card className="p-6 text-center border-emerald-200 dark:border-emerald-900 bg-white dark:bg-stone-900 shadow-md">
          <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <Badge className="mb-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1">
            Paiement Réussi
          </Badge>

          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Merci pour votre commande !
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Votre paiement a été validé et transmis à notre équipe en cuisine.
          </p>

          {orderNumber && (
            <div className="mt-4 p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
              <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider block">
                Numéro de Commande
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
                #{orderNumber}
              </span>
            </div>
          )}

          {/* Webhook Status Alert */}
          {!isPaid && isLoading ? (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Confirmation de la transaction en cours...</span>
            </div>
          ) : isPaid ? (
            <div className="mt-4 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Paiement en ligne confirmé ✓</span>
            </div>
          ) : (
            <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Paiement enregistré en attente de synchro</span>
            </div>
          )}

          {/* Preparation Time Notification */}
          <div className="mt-4 p-3 bg-stone-100 dark:bg-stone-800/80 rounded-xl flex items-center justify-between text-xs font-medium text-stone-800 dark:text-stone-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Temps de préparation estimé:
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              15 - 25 min
            </span>
          </div>
        </Card>

        {/* Order Recap Card */}
        <Card className="p-6 space-y-4 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2 text-stone-900 dark:text-white">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Récapitulatif de la Commande
            </h2>
            {order && (
              <Badge variant="outline" className="font-medium text-xs">
                {orderTypeLabels[order.order_type] || order.order_type}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Customer Details */}
          {order && (
            <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 p-3 rounded-lg border border-stone-200/80 dark:border-stone-700/50">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-stone-900 dark:text-white">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{order.customer_phone}</span>
              </div>
              {order.customer_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{order.customer_address}</span>
                </div>
              )}
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Articles
            </h3>

            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement du détail...
              </div>
            ) : order && order.items && order.items.length > 0 ? (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {order.items.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const name = item.name || item.item?.name || 'Article';
                  const unitPrice = Number(item.calculatedPrice || item.price || item.item?.price || 0);
                  const totalPrice = unitPrice * qty;

                  return (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 dark:text-white leading-tight">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
                            {qty}x
                          </span>
                          {name}
                        </p>
                        {renderCustomization(item.customization)}
                      </div>
                      <span className="font-semibold font-mono text-stone-800 dark:text-stone-200 shrink-0">
                        {totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                Détail des articles enregistré dans votre commande #{orderNumber}.
              </p>
            )}
          </div>

          <Separator />

          {/* Total Breakdown */}
          {order && (
            <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300 pt-1">
              {order.subtotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total:</span>
                  <span className="font-mono">{Number(order.subtotal).toFixed(2)} €</span>
                </div>
              )}
              {Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de livraison:</span>
                  <span className="font-mono">{Number(order.delivery_fee).toFixed(2)} €</span>
                </div>
              )}
              {order.tva > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA (10%):</span>
                  <span className="font-mono">{Number(order.tva).toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-bold text-stone-900 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-800">
                <span>TOTAL PAYÉ:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                  {Number(order.total || 0).toFixed(2)} €
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Navigation & Print Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex-1 h-12 gap-2 text-sm rounded-xl border-stone-300 dark:border-stone-700"
          >
            <Printer className="w-4 h-4" />
            Imprimer Reçu
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="flex-1 h-12 gap-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
