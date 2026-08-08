import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/context/TenantContext';
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
  items: any;
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
  const { tenant } = useTenant();

  // Extract order number from any possible query parameter name or localStorage fallback
  const orderNumber = useMemo(() => {
    const fromUrl = (
      searchParams.get('order') ||
      searchParams.get('order_number') ||
      searchParams.get('order_id') ||
      searchParams.get('orderNo') ||
      searchParams.get('orderId') ||
      searchParams.get('session_id') ||
      searchParams.get('id') ||
      ''
    );

    if (fromUrl) return fromUrl;

    try {
      return localStorage.getItem('last_order_number') || '';
    } catch (e) {
      return '';
    }
  }, [searchParams]);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Try querying orders by order_number
      let { data } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();

      // 2. If not found by order_number, try querying by id or transaction_id
      if (!data) {
        const fallbackRes = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${orderNumber},transaction_id.eq.${orderNumber}`)
          .maybeSingle();
        data = fallbackRes.data;
      }

      if (data) {
        setOrder(data as unknown as OrderDetail);
      }
    } catch (err) {
      console.error('[PaymentSuccess] Error fetching order:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  // Initial fetch, polling, and iframe breakout for mobile 3DS redirects
  useEffect(() => {
    try {
      if (window.self !== window.top && window.top) {
        window.top.location.href = window.location.href;
        return;
      }
    } catch (e) {
      console.warn('[PaymentSuccess] Iframe breakout check:', e);
    }

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

  // Safely parse order.items array (whether array or JSON string)
  const parsedItems = useMemo<OrderItem[]>(() => {
    if (!order || !order.items) return [];
    if (Array.isArray(order.items)) return order.items;
    if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [order]);

  const orderTypeLabels: Record<string, string> = {
    livraison: 'Livraison à domicile',
    emporter: 'À emporter au restaurant',
    surplace: 'Sur place',
  };

  const renderCustomization = (cust: Record<string, any> | undefined) => {
    if (!cust || typeof cust !== 'object' || Object.keys(cust).length === 0) return null;
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
      <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
        {details.join(' • ')}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4 flex justify-center items-start font-sans">
      <div className="w-full max-w-lg space-y-4">
        {/* Header Confirmation Card */}
        <Card className="p-6 text-center border-emerald-900 bg-stone-900 shadow-2xl text-white">
          <div className="w-16 h-16 mx-auto bg-emerald-950/80 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <Badge className="mb-2 bg-emerald-600 text-white font-semibold text-xs px-3 py-1 border-none">
            Paiement Réussi
          </Badge>

          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Merci pour votre commande !
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Votre paiement a été validé avec succès pour <span className="text-amber-400 font-bold">{tenant?.name || 'Twin Pizza'}</span>.
          </p>

          {orderNumber && (
            <div className="mt-4 p-3 bg-stone-950 rounded-xl border border-stone-800">
              <span className="text-xs text-stone-400 uppercase font-medium tracking-wider block">
                Numéro de Commande
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-400">
                #{orderNumber}
              </span>
            </div>
          )}

          {/* Webhook Status Alert */}
          <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center justify-center gap-2 font-medium">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Paiement en ligne confirmé ✓</span>
          </div>

          {/* Preparation Time Notification */}
          <div className="mt-4 p-3 bg-stone-950 rounded-xl flex items-center justify-between text-xs font-medium text-stone-200 border border-stone-800">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" /> Temps de préparation estimé:
            </span>
            <span className="font-bold text-emerald-400 text-sm">
              15 - 25 min
            </span>
          </div>
        </Card>

        {/* Order Recap Card */}
        <Card className="p-6 space-y-4 border-stone-800 bg-stone-900 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2 text-white">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              Récapitulatif de la Commande
            </h2>
            {order && (
              <Badge variant="outline" className="font-medium text-xs border-stone-700 text-stone-300">
                {orderTypeLabels[order.order_type] || order.order_type}
              </Badge>
            )}
          </div>

          <Separator className="bg-stone-800" />

          {/* Customer Details */}
          {order && (
            <div className="space-y-1.5 text-xs text-stone-300 bg-stone-950 p-3 rounded-lg border border-stone-800">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-semibold text-white">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
              {order.customer_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{order.customer_address}</span>
                </div>
              )}
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Articles
            </h3>

            {isLoading ? (
              <div className="py-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Chargement du détail...
              </div>
            ) : parsedItems.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {parsedItems.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const name = item.name || item.item?.name || 'Article';
                  const unitPrice = Number(item.calculatedPrice || item.price || item.item?.price || 0);
                  const totalPrice = unitPrice * qty;

                  return (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-white leading-tight">
                          <span className="font-bold text-amber-400 mr-1.5">
                            {qty}x
                          </span>
                          {name}
                        </p>
                        {renderCustomization(item.customization)}
                      </div>
                      <span className="font-semibold font-mono text-stone-200 shrink-0">
                        {totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic py-2">
                Votre commande #{orderNumber || 'récente'} a bien été enregistrée et est transmise en cuisine.
              </p>
            )}
          </div>

          <Separator className="bg-stone-800" />

          {/* Total Breakdown */}
          {order && (
            <div className="space-y-1.5 text-xs text-stone-300 pt-1">
              {Number(order.subtotal) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Sous-total:</span>
                  <span className="font-mono">{Number(order.subtotal).toFixed(2)} €</span>
                </div>
              )}
              {Number(order.delivery_fee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Frais de livraison:</span>
                  <span className="font-mono">{Number(order.delivery_fee).toFixed(2)} €</span>
                </div>
              )}
              {Number(order.tva) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">TVA:</span>
                  <span className="font-mono">{Number(order.tva).toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-bold text-white pt-2 border-t border-stone-800">
                <span>TOTAL PAYÉ:</span>
                <span className="font-mono text-emerald-400 text-lg">
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
            className="flex-1 h-12 gap-2 text-sm rounded-xl border-stone-800 bg-stone-900 text-white hover:bg-stone-800"
          >
            <Printer className="w-4 h-4" />
            Imprimer Reçu
          </Button>
          <Button
            onClick={() => navigate(tenant?.slug ? `/?tenant=${tenant.slug}` : '/')}
            className="flex-1 h-12 gap-2 text-sm rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
