import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, Order } from '@/hooks/useSupabaseData';
import { 
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Phone, User, MessageSquare, CreditCard, Banknote,
  Volume2, VolumeX, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'En préparation', color: 'bg-blue-500', icon: ChefHat },
  ready: { label: 'Prêt', color: 'bg-green-500', icon: Package },
  completed: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

// Sound alert using Web Audio API
const playOrderSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play 3 ascending beeps
    [0, 200, 400].forEach((delay, i) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800 + (i * 200); // Ascending frequency
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

  // Auto-refresh every 10 seconds with visual indicator
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

  // Real-time subscription with sound alert
  useEffect(() => {
    const channel = supabase
      .channel('tv-orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        refetch();
        setLastRefresh(new Date());
        if (soundEnabled) {
          playOrderSound();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        refetch();
        setLastRefresh(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, soundEnabled]);

  // Check for new orders and play sound
  useEffect(() => {
    if (orders && orders.length > previousOrdersCount.current && previousOrdersCount.current > 0) {
      if (soundEnabled) {
        playOrderSound();
      }
    }
    previousOrdersCount.current = orders?.length || 0;
  }, [orders, soundEnabled]);

  // Filter active orders (not completed or cancelled)
  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const preparingOrders = activeOrders.filter(o => o.status === 'preparing');
  const readyOrders = activeOrders.filter(o => o.status === 'ready');

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header with refresh indicator */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold">
            <span className="text-amber-500">TWIN</span> PIZZA
          </h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            TV Dashboard
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Sound toggle */}
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="lg"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-2"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            {soundEnabled ? 'Son ON' : 'Son OFF'}
          </Button>

          {/* Refresh indicator */}
          <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2">
            <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin text-green-400' : 'text-white/60'}`} />
            <div className="text-sm">
              <div className="text-white/60">Dernière MAJ</div>
              <div className="font-mono text-lg">
                {lastRefresh.toLocaleTimeString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Current time */}
          <div className="text-3xl font-mono bg-amber-500 text-black px-4 py-2 rounded-lg">
            <CurrentTime />
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="En attente" 
          count={pendingOrders.length} 
          color="bg-yellow-500" 
          icon={Clock}
          pulse={pendingOrders.length > 0}
        />
        <StatCard 
          label="En préparation" 
          count={preparingOrders.length} 
          color="bg-blue-500" 
          icon={ChefHat}
        />
        <StatCard 
          label="Prêt" 
          count={readyOrders.length} 
          color="bg-green-500" 
          icon={Package}
          pulse={readyOrders.length > 0}
        />
        <StatCard 
          label="Total actif" 
          count={activeOrders.length} 
          color="bg-purple-500" 
          icon={CheckCircle}
        />
      </div>

      {/* Orders grid */}
      {isLoading ? (
        <div className="text-center text-4xl py-20">Chargement...</div>
      ) : activeOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍕</div>
          <div className="text-4xl text-white/50">Aucune commande active</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeOrders.map((order) => (
            <TVOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
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

function StatCard({ 
  label, 
  count, 
  color, 
  icon: Icon,
  pulse = false 
}: { 
  label: string; 
  count: number; 
  color: string; 
  icon: any;
  pulse?: boolean;
}) {
  return (
    <div className={`${color} rounded-xl p-4 ${pulse && count > 0 ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8" />
        <div>
          <div className="text-4xl font-bold">{count}</div>
          <div className="text-lg opacity-90">{label}</div>
        </div>
      </div>
    </div>
  );
}

function TVOrderCard({ order }: { order: Order }) {
  const config = statusConfig[order.status];
  const Icon = config.icon;
  const isNew = order.status === 'pending';

  return (
    <div className={`rounded-xl overflow-hidden ${isNew ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}>
      {/* Header */}
      <div className={`${config.color} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-6 h-6" />
          <span className="text-2xl font-bold">{order.order_number}</span>
        </div>
        <Badge variant="secondary" className="bg-white/20 text-lg">
          {order.order_type.toUpperCase()}
        </Badge>
      </div>

      <div className="bg-white/10 p-4 space-y-3">
        {/* Customer info */}
        <div className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-amber-400" />
          <span className="font-semibold">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-amber-400" />
          <span>{order.customer_phone}</span>
        </div>
        {order.customer_address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-5 h-5 text-amber-400" />
            <span className="truncate">{order.customer_address}</span>
          </div>
        )}

        {/* Items */}
        <div className="bg-black/30 rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto">
          {Array.isArray(order.items) && order.items.map((cartItem: any, idx: number) => {
            // Handle both nested structure (item.item.name) and flat structure (item.name)
            const productName = cartItem.item?.name || cartItem.name || 'Produit';
            const price = cartItem.calculatedPrice || cartItem.item?.price || cartItem.price || 0;
            const customization = cartItem.customization;
            const note = cartItem.note || customization?.note;
            
            return (
              <div key={idx} className="border-b border-white/10 pb-2 last:border-0">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">{cartItem.quantity}x {productName}</span>
                  <span className="text-amber-400">{Number(price).toFixed(2)}€</span>
                </div>
                
                {/* Size */}
                {customization?.size && (
                  <p className="text-cyan-300 text-sm ml-4">📏 Taille: {customization.size.toUpperCase()}</p>
                )}
                
                {/* Pizza base */}
                {customization?.base && (
                  <p className="text-pink-300 text-sm ml-4">🍕 Base: {customization.base}</p>
                )}
                
                {/* Meats */}
                {customization?.meats && customization.meats.length > 0 && (
                  <p className="text-red-300 text-sm ml-4">🥩 Viandes: {customization.meats.join(', ')}</p>
                )}
                {customization?.meat && (
                  <p className="text-red-300 text-sm ml-4">🥩 Viande: {customization.meat}</p>
                )}
                
                {/* Sauces */}
                {customization?.sauces && customization.sauces.length > 0 && (
                  <p className="text-orange-300 text-sm ml-4">🥫 Sauces: {customization.sauces.join(', ')}</p>
                )}
                {customization?.sauce && (
                  <p className="text-orange-300 text-sm ml-4">🥫 Sauce: {customization.sauce}</p>
                )}
                
                {/* Garnitures */}
                {customization?.garnitures && customization.garnitures.length > 0 && (
                  <p className="text-green-300 text-sm ml-4">🥬 Garnitures: {customization.garnitures.join(', ')}</p>
                )}
                {customization?.toppings && Object.keys(customization.toppings).filter(k => customization.toppings[k]).length > 0 && (
                  <p className="text-green-300 text-sm ml-4">🥬 Garnitures: {Object.keys(customization.toppings).filter(k => customization.toppings[k]).join(', ')}</p>
                )}
                
                {/* Supplements */}
                {customization?.supplements && customization.supplements.length > 0 && (
                  <p className="text-yellow-300 text-sm ml-4">➕ Supp: {customization.supplements.join(', ')}</p>
                )}
                {customization?.cheeseSupplements && customization.cheeseSupplements.length > 0 && (
                  <p className="text-yellow-300 text-sm ml-4">🧀 Fromages: {customization.cheeseSupplements.join(', ')}</p>
                )}
                
                {/* Menu option */}
                {customization?.menuOption && customization.menuOption !== 'none' && (
                  <p className="text-purple-300 text-sm ml-4">🍟 Menu: {customization.menuOption}</p>
                )}
                
                {/* Note */}
                {note && (
                  <p className="text-amber-300 text-sm ml-4 flex items-center gap-1 mt-1 bg-amber-500/20 rounded px-2 py-1">
                    <MessageSquare className="w-3 h-3" />
                    {note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {order.customer_notes && (
          <div className="bg-amber-500/20 rounded-lg p-2 text-amber-200 text-sm">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            {order.customer_notes}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <div className="flex items-center gap-2">
            {order.payment_method === 'en_ligne' ? (
              <Badge className="bg-green-500 text-white text-sm">PAYÉ ✓</Badge>
            ) : (
              <Badge className="bg-red-500 text-white animate-pulse text-sm">NON PAYÉ</Badge>
            )}
          </div>
          <span className="text-3xl font-bold text-amber-400">{order.total.toFixed(2)}€</span>
        </div>

        {/* Time */}
        <div className="text-center text-white/60 text-sm">
          {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
