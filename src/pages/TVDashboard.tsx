import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useSupabaseData';
import { 
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Truck, Store, Utensils,
  Volume2, VolumeX, RefreshCw, History, Home,
  CreditCard, Banknote, Play, ArrowRight, Printer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.png';

// Admin authentication check hook
const useAdminAuth = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
        return;
      }
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleError || !roleData) {
        toast.error('Accès non autorisé');
        await supabase.auth.signOut();
        navigate('/admin');
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  return { isAuthenticated, isLoading };
};

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

// Sound alert with flash effect
const playOrderSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 150, 300].forEach((delay, i) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880 + (i * 220);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }, delay);
    });
  } catch (error) {
    console.log('Audio not supported');
  }
};

// Auto-print ticket function
const printOrderTicket = (order: Order) => {
  const ticketSettings = {
    header: localStorage.getItem('ticketHeader') || 'TWIN PIZZA',
    subheader: localStorage.getItem('ticketSubheader') || 'Grand-Couronne',
    phone: localStorage.getItem('ticketPhone') || '02 32 11 26 13',
    footer: localStorage.getItem('ticketFooter') || 'Merci de votre visite!',
  };

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items.map((cartItem: any) => {
    const productName = cartItem.item?.name || cartItem.name || 'Produit';
    const customization = cartItem.customization;
    let details = [];
    if (customization?.size) details.push(customization.size.toUpperCase());
    if (customization?.meats?.length) details.push(`Viandes: ${customization.meats.join(', ')}`);
    if (customization?.sauces?.length) details.push(`Sauces: ${customization.sauces.join(', ')}`);
    if (customization?.garnitures?.length) details.push(`Garnitures: ${customization.garnitures.join(', ')}`);
    if (customization?.supplements?.length) details.push(`Supp: ${customization.supplements.join(', ')}`);
    if (customization?.notes) details.push(`Note: ${customization.notes}`);
    
    return `
      <div style="margin-bottom:8px;border-bottom:1px dashed #ccc;padding-bottom:8px;">
        <div style="font-size:16px;font-weight:bold;">${cartItem.quantity}x ${productName} - ${cartItem.totalPrice?.toFixed(2) || '0.00'}€</div>
        ${details.length > 0 ? `<div style="font-size:12px;color:#555;">${details.join(' | ')}</div>` : ''}
      </div>
    `;
  }).join('');

  const orderTypeLabels: Record<string, string> = {
    livraison: 'LIVRAISON',
    emporter: 'À EMPORTER',
    surplace: 'SUR PLACE'
  };

  const paymentLabels: Record<string, string> = {
    en_ligne: 'PAYÉ EN LIGNE',
    cb: 'CB (À PAYER)',
    especes: 'ESPÈCES (À PAYER)'
  };

  printWindow.document.write(`
    <html><head><title>Ticket ${order.order_number}</title>
    <style>
      body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .divider { border-top: 2px dashed #000; margin: 10px 0; }
    </style></head><body>
      <div class="center">
        <h2 style="margin:5px 0;">${ticketSettings.header}</h2>
        <p style="margin:0;">${ticketSettings.subheader}</p>
        <p style="margin:0;">${ticketSettings.phone}</p>
      </div>
      <div class="divider"></div>
      <div class="center bold" style="font-size:20px;">N° ${order.order_number}</div>
      <div class="center" style="font-size:14px;margin:5px 0;">${new Date(order.created_at || '').toLocaleString('fr-FR')}</div>
      <div class="center bold" style="background:#000;color:#fff;padding:5px;margin:10px 0;">${orderTypeLabels[order.order_type] || order.order_type}</div>
      <div class="divider"></div>
      <div style="margin-bottom:5px;"><strong>Client:</strong> ${order.customer_name}</div>
      ${order.customer_address ? `<div style="margin-bottom:5px;"><strong>Adresse:</strong> ${order.customer_address}</div>` : ''}
      ${order.customer_notes ? `<div style="margin-bottom:5px;background:#ffe;padding:5px;"><strong>Note:</strong> ${order.customer_notes}</div>` : ''}
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div style="text-align:right;font-size:14px;">Sous-total: ${order.subtotal?.toFixed(2)}€</div>
      <div style="text-align:right;font-size:14px;">TVA (10%): ${order.tva?.toFixed(2)}€</div>
      <div style="text-align:right;font-size:20px;font-weight:bold;margin-top:5px;">TOTAL: ${order.total?.toFixed(2)}€</div>
      <div class="center bold" style="margin-top:10px;padding:5px;${order.payment_method === 'en_ligne' ? 'background:#d4edda;' : 'background:#f8d7da;'}">${paymentLabels[order.payment_method] || order.payment_method}</div>
      <div class="divider"></div>
      <div class="center">${ticketSettings.footer}</div>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

export default function TVDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [dateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    return localStorage.getItem('autoPrintEnabled') === 'true';
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Show loading while checking auth
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Vérification des accès...</div>
      </div>
    );
  }
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const previousOrdersCount = useRef(0);
  const printedOrders = useRef<Set<string>>(new Set());

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);
  const updateStatus = useUpdateOrderStatus();

  // Save auto-print preference
  useEffect(() => {
    localStorage.setItem('autoPrintEnabled', autoPrintEnabled.toString());
  }, [autoPrintEnabled]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      refetch().then(() => {
        setLastRefresh(new Date());
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Real-time subscription with auto-print
  useEffect(() => {
    const channel = supabase
      .channel('tv-orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        refetch();
        setLastRefresh(new Date());
        if (soundEnabled) {
          playOrderSound();
          setFlashEffect(true);
          setTimeout(() => setFlashEffect(false), 1000);
        }
        // Auto-print new order
        if (autoPrintEnabled && payload.new) {
          const newOrder = payload.new as Order;
          if (!printedOrders.current.has(newOrder.id)) {
            printedOrders.current.add(newOrder.id);
            setTimeout(() => printOrderTicket(newOrder), 500);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        refetch();
        setLastRefresh(new Date());
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch, soundEnabled, autoPrintEnabled]);

  // Check for new orders (fallback)
  useEffect(() => {
    if (orders && orders.length > previousOrdersCount.current && previousOrdersCount.current > 0) {
      if (soundEnabled) {
        playOrderSound();
        setFlashEffect(true);
        setTimeout(() => setFlashEffect(false), 1000);
      }
    }
    previousOrdersCount.current = orders?.length || 0;
  }, [orders, soundEnabled]);

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Statut: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Filter orders
  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => o.status === 'completed') || [];
  const allHistoryOrders = orders?.filter(o => ['completed', 'cancelled'].includes(o.status)) || [];
  
  // Sort active orders: pending first, then preparing, then ready
  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const priority: Record<string, number> = { pending: 0, preparing: 1, ready: 2 };
    return (priority[a.status] || 3) - (priority[b.status] || 3);
  });

  const pendingCount = activeOrders.filter(o => o.status === 'pending').length;
  const preparingCount = activeOrders.filter(o => o.status === 'preparing').length;
  const readyCount = activeOrders.filter(o => o.status === 'ready').length;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col ${flashEffect ? 'animate-pulse bg-amber-500/20' : ''}`}>
      {/* Compact Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-3">
            <img src={logoImage} alt="Twin Pizza" className="w-10 h-10 rounded-full" />
            <h1 className="text-2xl font-bold">
              <span className="text-amber-500">TWIN</span> <span className="text-white/80">TV</span>
            </h1>
          </Link>
          
          {/* Status counters - BIGGER */}
          <div className="flex gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${pendingCount > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-500/30'}`}>
              <Clock className="w-5 h-5" />
              <span>{pendingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${preparingCount > 0 ? 'bg-blue-500' : 'bg-blue-500/30'}`}>
              <ChefHat className="w-5 h-5" />
              <span>{preparingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${readyCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-green-500/30'}`}>
              <Package className="w-5 h-5" />
              <span>{readyCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'live' | 'history')}>
            <TabsList className="bg-black/50">
              <TabsTrigger value="live" className="gap-1 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                <Play className="w-4 h-4" /> Live
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 data-[state=active]:bg-gray-600">
                <History className="w-4 h-4" /> Historique
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={autoPrintEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
            className={`gap-1 ${autoPrintEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
            title="Impression automatique"
          >
            <Printer className="w-4 h-4" />
            {autoPrintEnabled ? 'Auto' : 'Off'}
          </Button>

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
          </div>

          <div className="text-xl font-mono bg-amber-500 text-black px-3 py-1 rounded-lg">
            <CurrentTime />
          </div>

          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      {activeTab === 'live' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TOP SECTION - Active Orders (MUCH larger) */}
          <div className="flex-[4] p-4 overflow-hidden">
            {isLoading ? (
              <div className="text-center text-4xl py-20 text-white/50">Chargement...</div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-9xl mb-6">🍕</div>
                <div className="text-5xl text-white/40 font-light">Aucune commande active</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-y-auto pb-4">
                {sortedActiveOrders.map((order, idx) => (
                  <ActiveOrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={idx + 1} 
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-8" />

          {/* BOTTOM SECTION - Completed Orders (smaller) */}
          <div className="flex-1 p-3 bg-black/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white/60">Terminées</span>
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-center text-white/30 py-2 text-sm">Aucune</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {completedOrders.slice(0, 10).map((order) => (
                  <CompletedOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-white/80">Historique du jour</h2>
          {allHistoryOrders.length === 0 ? (
            <div className="text-center text-white/40 py-12">Aucune commande terminée aujourd'hui</div>
          ) : (
            <div className="grid gap-3">
              {allHistoryOrders.map((order) => (
                <HistoryOrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
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
  return <>{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>;
}

// Active order card - MUCH BIGGER fonts, no prices, with controls
function ActiveOrderCard({ 
  order, 
  orderNumber,
  onStatusUpdate 
}: { 
  order: Order; 
  orderNumber: number;
  onStatusUpdate: (id: string, status: Order['status']) => void;
}) {
  const config = statusConfig[order.status];
  const Icon = config.icon;
  const typeConfig = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig];
  const TypeIcon = typeConfig?.icon || Store;
  const isNew = order.status === 'pending';
  const isReady = order.status === 'ready';

  // Get items for display (max 6, then show +N more)
  const items = Array.isArray(order.items) ? order.items : [];
  const displayItems = items.slice(0, 6);
  const moreCount = items.length - 6;

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col bg-white/5 ${
      isNew ? 'ring-4 ring-yellow-400 animate-pulse' : 
      isReady ? 'ring-4 ring-green-400' : ''
    }`}>
      {/* Header */}
      <div className={`${config.color} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8" />
          <span className="text-4xl font-black">#{orderNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Payment indicator */}
          {order.payment_method === 'en_ligne' ? (
            <Badge className="bg-green-700 text-white text-sm px-2 py-1">
              <CreditCard className="w-4 h-4 mr-1" /> PAYÉ
            </Badge>
          ) : (
            <Badge className="bg-red-700 text-white text-sm px-2 py-1 animate-pulse">
              {order.payment_method === 'cb' ? <CreditCard className="w-4 h-4 mr-1" /> : <Banknote className="w-4 h-4 mr-1" />}
              À PAYER
            </Badge>
          )}
          <div className={`${typeConfig?.color} px-2 py-1 rounded-lg text-sm font-semibold flex items-center gap-1`}>
            <TypeIcon className="w-4 h-4" />
            {typeConfig?.label}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Customer name - VERY BIG, no phone */}
        <div className="text-3xl font-bold text-white truncate">
          {order.customer_name}
        </div>

        {/* Address for delivery */}
        {order.order_type === 'livraison' && order.customer_address && (
          <div className="flex items-start gap-2 text-amber-300 bg-amber-500/10 rounded-lg p-2">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-lg leading-tight font-medium">{order.customer_address}</span>
          </div>
        )}

        {/* Items grid - no prices */}
        <div className="bg-black/40 rounded-lg p-3 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {displayItems.map((cartItem: any, idx: number) => {
              const productName = cartItem.item?.name || cartItem.name || 'Produit';
              const customization = cartItem.customization;
              
              return (
                <div key={idx} className="bg-white/5 rounded-lg p-2">
                  <div className="text-xl font-bold text-white">
                    {cartItem.quantity}x {productName}
                  </div>
                  {customization?.size && (
                    <span className="text-sm text-cyan-300">{customization.size.toUpperCase()}</span>
                  )}
                  {customization?.meats?.length > 0 && (
                    <p className="text-sm text-white/70">🥩 {customization.meats.join(', ')}</p>
                  )}
                </div>
              );
            })}
          </div>
          {moreCount > 0 && (
            <div className="text-center text-amber-400 font-bold mt-2 text-lg">
              +{moreCount} autres produits
            </div>
          )}
        </div>

        {/* Status Controls - BIG BUTTONS */}
        <div className="flex gap-2 pt-2">
          {order.status === 'pending' && (
            <Button 
              size="lg" 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-xl py-6 gap-2"
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              <ChefHat className="w-6 h-6" />
              Préparer
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button 
              size="lg" 
              className="flex-1 bg-green-500 hover:bg-green-600 text-xl py-6 gap-2"
              onClick={() => onStatusUpdate(order.id, 'ready')}
            >
              <Package className="w-6 h-6" />
              Prêt
            </Button>
          )}
          {order.status === 'ready' && (
            <Button 
              size="lg" 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-xl py-6 gap-2"
              onClick={() => onStatusUpdate(order.id, 'completed')}
            >
              <CheckCircle className="w-6 h-6" />
              Terminé
            </Button>
          )}
          {['pending', 'preparing'].includes(order.status) && (
            <Button 
              variant="destructive" 
              size="lg"
              className="py-6"
              onClick={() => onStatusUpdate(order.id, 'cancelled')}
            >
              <XCircle className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Completed order card - Minimal, just product names and small client name
function CompletedOrderCard({ order }: { order: Order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const productNames = items.map((item: any) => item.item?.name || item.name || 'Produit').slice(0, 3);

  return (
    <div className="bg-gray-800/50 rounded-lg px-3 py-2 min-w-[160px] flex-shrink-0 border border-gray-700">
      <div className="text-xs text-white/50 mb-1">{order.customer_name}</div>
      <div className="text-sm font-medium text-white/80">
        {productNames.join(', ')}
        {items.length > 3 && <span className="text-white/50"> +{items.length - 3}</span>}
      </div>
    </div>
  );
}

// History order row - Shows phone number only here
function HistoryOrderRow({ order }: { order: Order }) {
  const config = statusConfig[order.status];
  const typeConfig = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig];
  const items = Array.isArray(order.items) ? order.items : [];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 rounded-lg border border-white/10">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <Badge className={config.color}>{config.label}</Badge>
          <span className="text-lg font-bold">{order.customer_name}</span>
          <Badge variant="outline" className="text-white/60">{typeConfig?.label}</Badge>
        </div>
        <div className="flex items-center gap-4 text-white/60">
          <span>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          <ArrowRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>
      
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/10 pt-3 space-y-2">
          {/* Phone visible in history expanded view */}
          <div className="text-amber-400">📞 {order.customer_phone}</div>
          {order.customer_address && (
            <div className="text-white/60">📍 {order.customer_address}</div>
          )}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="bg-black/30 rounded p-2 text-sm">
                {item.quantity}x {item.item?.name || item.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}