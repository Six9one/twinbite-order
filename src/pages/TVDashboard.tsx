import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, Order } from '@/hooks/useSupabaseData';
import { 
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Truck, Store, Utensils,
  Volume2, VolumeX, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: Clock },
  preparing: { label: 'En préparation', color: 'bg-blue-500', textColor: 'text-blue-500', icon: ChefHat },
  ready: { label: 'PRÊT', color: 'bg-green-500', textColor: 'text-green-500', icon: Package },
  completed: { label: 'Terminé', color: 'bg-gray-600', textColor: 'text-gray-400', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500', textColor: 'text-red-500', icon: XCircle },
};

const orderTypeConfig = {
  livraison: { icon: Truck, label: 'Livraison', color: 'bg-blue-600' },
  emporter: { icon: Store, label: 'À emporter', color: 'bg-orange-600' },
  surplace: { icon: Utensils, label: 'Sur place', color: 'bg-green-600' },
};

// Sound alert
const playOrderSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 200, 400].forEach((delay, i) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800 + (i * 200);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }, delay);
    });
  } catch (error) {
    console.log('Audio not supported');
  }
};

export default function TVDashboard() {
  const [dateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousOrdersCount = useRef(0);

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      refetch().then(() => {
        setLastRefresh(new Date());
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tv-orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        refetch();
        setLastRefresh(new Date());
        if (soundEnabled) playOrderSound();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        refetch();
        setLastRefresh(new Date());
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch, soundEnabled]);

  // Check for new orders
  useEffect(() => {
    if (orders && orders.length > previousOrdersCount.current && previousOrdersCount.current > 0) {
      if (soundEnabled) playOrderSound();
    }
    previousOrdersCount.current = orders?.length || 0;
  }, [orders, soundEnabled]);

  // Filter orders
  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => o.status === 'completed').slice(0, 8) || [];
  
  // Sort active orders: pending first, then preparing, then ready
  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const priority: Record<string, number> = { pending: 0, preparing: 1, ready: 2 };
    return (priority[a.status] || 3) - (priority[b.status] || 3);
  });

  const pendingCount = activeOrders.filter(o => o.status === 'pending').length;
  const preparingCount = activeOrders.filter(o => o.status === 'preparing').length;
  const readyCount = activeOrders.filter(o => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col">
      {/* Compact Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/50 border-b border-white/10">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold">
            <span className="text-amber-500">TWIN</span> PIZZA
          </h1>
          
          {/* Status counters */}
          <div className="flex gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${pendingCount > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-500/30'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-bold">{pendingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${preparingCount > 0 ? 'bg-blue-500' : 'bg-blue-500/30'}`}>
              <ChefHat className="w-4 h-4" />
              <span className="font-bold">{preparingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${readyCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-green-500/30'}`}>
              <Package className="w-4 h-4" />
              <span className="font-bold">{readyCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-1"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-green-400' : ''}`} />
            <span>{lastRefresh.toLocaleTimeString('fr-FR')}</span>
          </div>

          <div className="text-2xl font-mono bg-amber-500 text-black px-4 py-1 rounded-lg">
            <CurrentTime />
          </div>
        </div>
      </header>

      {/* Main content - split layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP SECTION - Active Orders (larger) */}
        <div className="flex-[3] p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white/80">Commandes en cours</h2>
            <Badge className="bg-amber-500 text-black">{activeOrders.length}</Badge>
          </div>

          {isLoading ? (
            <div className="text-center text-2xl py-10 text-white/50">Chargement...</div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-8xl mb-4">🍕</div>
              <div className="text-3xl text-white/40">Aucune commande active</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 h-full overflow-y-auto pb-4">
              {sortedActiveOrders.map((order, idx) => (
                <ActiveOrderCard key={order.id} order={order} orderNumber={idx + 1} />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-8" />

        {/* BOTTOM SECTION - Completed Orders (smaller) */}
        <div className="flex-1 p-4 bg-black/30">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-white/60">Terminées</h2>
          </div>

          {completedOrders.length === 0 ? (
            <div className="text-center text-white/30 py-4">Aucune commande terminée</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {completedOrders.map((order) => (
                <CompletedOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return <>{time.toLocaleTimeString('fr-FR')}</>;
}

// Active order card - Large, clear font
function ActiveOrderCard({ order, orderNumber }: { order: Order; orderNumber: number }) {
  const config = statusConfig[order.status];
  const Icon = config.icon;
  const typeConfig = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig];
  const TypeIcon = typeConfig?.icon || Store;
  const isNew = order.status === 'pending';
  const isReady = order.status === 'ready';

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col ${
      isNew ? 'ring-4 ring-yellow-400 animate-pulse' : 
      isReady ? 'ring-4 ring-green-400' : ''
    }`}>
      {/* Header with order number */}
      <div className={`${config.color} text-white px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6" />
          <span className="text-2xl font-black">#{orderNumber}</span>
        </div>
        <div className={`flex items-center gap-1 ${typeConfig?.color} px-2 py-1 rounded-lg text-sm font-semibold`}>
          <TypeIcon className="w-4 h-4" />
          {typeConfig?.label}
        </div>
      </div>

      <div className="bg-white/5 p-4 flex-1 flex flex-col gap-3">
        {/* Customer name only - NO phone number for privacy */}
        <div className="text-2xl font-bold text-white truncate">
          {order.customer_name}
        </div>

        {/* Address for delivery orders */}
        {order.order_type === 'livraison' && order.customer_address && (
          <div className="flex items-start gap-2 text-amber-300 bg-amber-500/10 rounded-lg p-2">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm leading-tight">{order.customer_address}</span>
          </div>
        )}

        {/* Items - compact view */}
        <div className="bg-black/40 rounded-lg p-3 space-y-2 flex-1 overflow-y-auto max-h-40">
          {Array.isArray(order.items) && order.items.map((cartItem: any, idx: number) => {
            const productName = cartItem.item?.name || cartItem.name || 'Produit';
            const customization = cartItem.customization;
            const note = cartItem.note || customization?.note;
            
            return (
              <div key={idx} className="border-b border-white/10 pb-2 last:border-0 last:pb-0">
                <div className="text-lg font-bold text-white">
                  {cartItem.quantity}x {productName}
                </div>
                
                {/* Compact customization display */}
                <div className="text-xs text-white/70 space-y-0.5 ml-3">
                  {customization?.size && (
                    <span className="inline-block bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded mr-1">
                      {customization.size.toUpperCase()}
                    </span>
                  )}
                  {customization?.meats?.length > 0 && (
                    <p>🥩 {customization.meats.join(', ')}</p>
                  )}
                  {customization?.sauces?.length > 0 && (
                    <p>🥫 {customization.sauces.join(', ')}</p>
                  )}
                  {customization?.garnitures?.length > 0 && (
                    <p>🥬 {customization.garnitures.join(', ')}</p>
                  )}
                  {customization?.supplements?.length > 0 && (
                    <p>➕ {customization.supplements.join(', ')}</p>
                  )}
                  {customization?.menuOption && customization.menuOption !== 'none' && (
                    <p>🍟 {customization.menuOption}</p>
                  )}
                </div>
                
                {/* Note highlighted */}
                {note && (
                  <div className="text-amber-300 text-sm mt-1 bg-amber-500/20 rounded px-2 py-1">
                    📝 {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer - minimal pricing */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            {order.payment_method === 'en_ligne' ? (
              <Badge className="bg-green-600 text-white text-xs">PAYÉ ✓</Badge>
            ) : (
              <Badge className="bg-red-600 text-white text-xs animate-pulse">À PAYER</Badge>
            )}
            <span className="text-xs text-white/50">
              {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <span className="text-xl font-bold text-amber-400">{order.total.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  );
}

// Completed order card - Smaller, minimal info
function CompletedOrderCard({ order }: { order: Order }) {
  const typeConfig = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig];
  const TypeIcon = typeConfig?.icon || Store;

  return (
    <div className="bg-gray-800/50 rounded-lg px-4 py-3 min-w-[200px] flex-shrink-0 border border-gray-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white/80">{order.customer_name}</div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <TypeIcon className="w-3 h-3" />
            <span>{typeConfig?.label}</span>
            <span>•</span>
            <span>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <CheckCircle className="w-5 h-5 text-green-500" />
      </div>
    </div>
  );
}
