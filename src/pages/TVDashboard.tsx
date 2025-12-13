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
  CreditCard, Banknote, Play, ArrowRight, Printer,
  CalendarClock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.png';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Admin authentication check hook
const useAdminAuth = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) navigate('/admin');
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
          if (mounted) navigate('/admin');
          return;
        }
        
        if (mounted) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false);
          navigate('/admin');
        }
      }
    };
    checkAuth();
    
    return () => { mounted = false; };
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

// Soft "glass" notification sound - Apple-like tan tan
const playOrderSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Soft glass-like sound: two gentle chimes
    const playChime = (startTime: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine'; // Soft sine wave
      
      // Gentle envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.8);
    };
    
    // First chime
    playChime(audioContext.currentTime, 1046.5); // C6
    // Second chime (slightly lower, delayed)
    playChime(audioContext.currentTime + 0.15, 880); // A5
    
    // Repeat after short pause
    setTimeout(() => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playSecond = (startTime: number, frequency: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      };
      playSecond(ctx.currentTime, 1046.5);
      playSecond(ctx.currentTime + 0.15, 880);
    }, 600);
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
        <div style="font-weight:bold;">${cartItem.quantity}x ${productName} - ${cartItem.totalPrice?.toFixed(2) || '0.00'}€</div>
        ${details.length > 0 ? `<div style="color:#555;">${details.join(' | ')}</div>` : ''}
      </div>
    `;
  }).join('');

  const orderTypeLabels: Record<string, string> = {
    livraison: 'LIVRAISON',
    emporter: 'À EMPORTER',
    surplace: 'SUR PLACE'
  };

  const paymentLabels: Record<string, string> = {
    en_ligne: 'PAYÉE',
    cb: 'CB',
    especes: 'ESP'
  };
  
  // Get font settings from localStorage
  const fontFamily = localStorage.getItem('ticketFontFamily') || 'monospace';
  const fontSize = localStorage.getItem('ticketFontSize') || '12';
  const headerSize = localStorage.getItem('ticketHeaderSize') || '20';

  printWindow.document.write(`
    <html><head><title>Ticket ${order.order_number}</title>
    <style>
      body { font-family: ${fontFamily}; font-size: ${fontSize}px; padding: 10px; max-width: 300px; margin: 0 auto; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .divider { border-top: 2px dashed #000; margin: 10px 0; }
      h2 { font-size: ${headerSize}px; }
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [showNewOrderOverlay, setShowNewOrderOverlay] = useState(false);
  const [newOrderInfo, setNewOrderInfo] = useState<{ orderNumber: string; orderType: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const previousOrdersCount = useRef(0);
  const printedOrders = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);
  const updateStatus = useUpdateOrderStatus();

  // Save auto-print preference
  useEffect(() => {
    localStorage.setItem('autoPrintEnabled', autoPrintEnabled.toString());
  }, [autoPrintEnabled]);

  // Auto-refresh every 10 seconds (fallback)
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

  // Real-time subscription with auto-print and auto-reconnect
  useEffect(() => {
    const setupChannel = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel('tv-orders-changes-' + Date.now())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          refetch();
          setLastRefresh(new Date());
          
          const newOrder = payload.new as Order;
          const orderTypeLabels: Record<string, string> = {
            livraison: 'LIVRAISON',
            emporter: 'À EMPORTER',
            surplace: 'SUR PLACE'
          };
          
          if (soundEnabled) {
            // Play loud alarm
            playOrderSound();
            
            // Show full-screen white overlay
            setNewOrderInfo({
              orderNumber: newOrder.order_number,
              orderType: orderTypeLabels[newOrder.order_type] || newOrder.order_type
            });
            setShowNewOrderOverlay(true);
            
            // Hide overlay after 3 seconds
            setTimeout(() => {
              setShowNewOrderOverlay(false);
              setNewOrderInfo(null);
            }, 3000);
          }
          
          setFlashEffect(true);
          setTimeout(() => setFlashEffect(false), 1000);
          
          // Auto-print new order
          if (autoPrintEnabled && payload.new) {
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
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            // Auto-reconnect after 5 seconds
            setTimeout(setupChannel, 5000);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
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

  // Show loading while checking auth - AFTER all hooks
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Vérification des accès...</div>
      </div>
    );
  }

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Statut: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Filter orders - separate scheduled from live
  const liveOrders = orders?.filter(o => !o.is_scheduled && !['completed', 'cancelled'].includes(o.status)) || [];
  const scheduledOrders = orders?.filter(o => o.is_scheduled === true && !['completed', 'cancelled'].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => o.status === 'completed') || [];
  const allHistoryOrders = orders?.filter(o => ['completed', 'cancelled'].includes(o.status)) || [];

  // Filter live orders by type
  const surplaceOrders = liveOrders.filter(o => o.order_type === 'surplace');
  const emporterOrders = liveOrders.filter(o => o.order_type === 'emporter');
  const livraisonOrders = liveOrders.filter(o => o.order_type === 'livraison');

  // Get all orders sorted by creation time for global sequential numbering
  const allOrdersSorted = [...(orders || [])].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Create a map of order id to global sequential number
  const orderNumberMap = new Map<string, number>();
  allOrdersSorted.forEach((order, idx) => {
    orderNumberMap.set(order.id, idx + 1);
  });

  const pendingCount = liveOrders.filter(o => o.status === 'pending').length;
  const preparingCount = liveOrders.filter(o => o.status === 'preparing').length;
  const readyCount = liveOrders.filter(o => o.status === 'ready').length;
  const scheduledCount = scheduledOrders.length;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col ${flashEffect ? 'animate-pulse bg-amber-500/20' : ''}`}>
      {/* Full-screen NEW ORDER overlay */}
      {showNewOrderOverlay && newOrderInfo && (
        <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center animate-pulse">
          <div className="text-center">
            <div className="text-8xl mb-8">🍕</div>
            <h1 className="text-6xl md:text-8xl font-bold text-amber-500 mb-4">
              NOUVELLE COMMANDE
            </h1>
            <h2 className="text-4xl md:text-6xl font-bold text-black mb-8">
              REÇUE !
            </h2>
            <div className="bg-black text-white px-12 py-6 rounded-2xl inline-block">
              <p className="text-3xl font-bold">{newOrderInfo.orderType}</p>
              <p className="text-5xl font-mono font-bold mt-2">N° {newOrderInfo.orderNumber}</p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/tv" className="hover:opacity-80 transition-opacity flex items-center gap-3">
            <img src={logoImage} alt="Twin Pizza" className="w-10 h-10 rounded-full" />
            <h1 className="text-2xl font-bold">
              <span className="text-amber-500">TWIN</span> <span className="text-white/80">TV</span>
            </h1>
          </Link>
          
          {/* Status counters */}
          <div className="flex gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${pendingCount > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-500/30'}`}>
              <Clock className="w-4 h-4" />
              <span>{pendingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${preparingCount > 0 ? 'bg-blue-500' : 'bg-blue-500/30'}`}>
              <ChefHat className="w-4 h-4" />
              <span>{preparingCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${readyCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-green-500/30'}`}>
              <Package className="w-4 h-4" />
              <span>{readyCount}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${scheduledCount > 0 ? 'bg-purple-500' : 'bg-purple-500/30'}`}>
              <CalendarClock className="w-4 h-4" />
              <span>{scheduledCount}</span>
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

      {/* Main content - 4 Column Layout */}
      {activeTab === 'live' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Column 1: Sur Place (25%) */}
          <OrderColumn 
            title="Sur Place" 
            icon={Utensils}
            orders={surplaceOrders}
            orderNumberMap={orderNumberMap}
            onStatusUpdate={handleStatusUpdate}
            colorClass="bg-green-600"
            emptyIcon="🍴"
          />

          {/* Divider */}
          <div className="w-0.5 bg-white/10" />

          {/* Column 2: À Emporter (25%) */}
          <OrderColumn 
            title="À Emporter" 
            icon={Store}
            orders={emporterOrders}
            orderNumberMap={orderNumberMap}
            onStatusUpdate={handleStatusUpdate}
            colorClass="bg-orange-600"
            emptyIcon="🥡"
          />

          {/* Divider */}
          <div className="w-0.5 bg-white/10" />

          {/* Column 3: Livraison (25%) */}
          <OrderColumn 
            title="Livraison" 
            icon={Truck}
            orders={livraisonOrders}
            orderNumberMap={orderNumberMap}
            onStatusUpdate={handleStatusUpdate}
            colorClass="bg-blue-600"
            emptyIcon="🚗"
          />

          {/* Divider */}
          <div className="w-0.5 bg-purple-500/50" />

          {/* Column 4: Plus Tard (25%) - Scheduled Orders */}
          <ScheduledOrderColumn 
            orders={scheduledOrders}
            orderNumberMap={orderNumberMap}
            onStatusUpdate={handleStatusUpdate}
          />
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

      {/* Bottom Completed Strip */}
      {activeTab === 'live' && completedOrders.length > 0 && (
        <div className="h-16 px-4 py-2 bg-black/50 border-t border-white/10">
          <div className="flex items-center gap-2 h-full overflow-x-auto">
            <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-white/50 flex-shrink-0">Terminées:</span>
            {completedOrders.slice(0, 15).map((order) => (
              <div key={order.id} className="bg-gray-800/50 rounded px-2 py-1 text-xs text-white/60 flex-shrink-0">
                #{orderNumberMap.get(order.id) || '?'} {order.customer_name.split(' ')[0]}
              </div>
            ))}
          </div>
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

// Order Column Component for the 4-column layout
function OrderColumn({ 
  title, 
  icon: Icon, 
  orders, 
  orderNumberMap,
  onStatusUpdate,
  colorClass,
  emptyIcon
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  orders: Order[];
  orderNumberMap: Map<string, number>;
  onStatusUpdate: (id: string, status: Order['status']) => void;
  colorClass: string;
  emptyIcon: string;
}) {
  // Sort orders: pending first, then preparing, then ready
  const sortedOrders = [...orders].sort((a, b) => {
    const priority: Record<string, number> = { pending: 0, preparing: 1, ready: 2 };
    return (priority[a.status] || 3) - (priority[b.status] || 3);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Column Header */}
      <div className={`${colorClass} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-bold text-lg">{title}</span>
        </div>
        <Badge className="bg-white/20 text-white">{orders.length}</Badge>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-black/20">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <span className="text-4xl mb-2">{emptyIcon}</span>
            <span className="text-sm">Aucune commande</span>
          </div>
        ) : (
          sortedOrders.map((order) => (
            <ColumnOrderCard 
              key={order.id} 
              order={order} 
              orderNumber={orderNumberMap.get(order.id) || 0}
              onStatusUpdate={onStatusUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Scheduled Order Column (Plus Tard)
function ScheduledOrderColumn({ 
  orders, 
  orderNumberMap,
  onStatusUpdate 
}: { 
  orders: Order[];
  orderNumberMap: Map<string, number>;
  onStatusUpdate: (id: string, status: Order['status']) => void;
}) {
  // Sort by scheduled time
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.scheduled_for && b.scheduled_for) {
      return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
    }
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-purple-950/30">
      {/* Column Header */}
      <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          <span className="font-bold text-lg">Plus Tard</span>
        </div>
        <Badge className="bg-white/20 text-white">{orders.length}</Badge>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <span className="text-4xl mb-2">📅</span>
            <span className="text-sm">Aucune commande programmée</span>
          </div>
        ) : (
          sortedOrders.map((order) => (
            <ScheduledOrderCard 
              key={order.id} 
              order={order} 
              orderNumber={orderNumberMap.get(order.id) || 0}
              onStatusUpdate={onStatusUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Compact order card for columns
function ColumnOrderCard({ 
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
  const isNew = order.status === 'pending';
  const isReady = order.status === 'ready';

  const items = Array.isArray(order.items) ? order.items : [];
  const orderTime = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded-lg overflow-hidden ${
      isNew ? 'ring-2 ring-yellow-400 animate-pulse' : 
      isReady ? 'ring-2 ring-green-400' : ''
    } bg-white/5`}>
      {/* Header */}
      <div className={`${config.color} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-bold">#{String(orderNumber).padStart(3, '0')}</span>
        </div>
        <div className="flex items-center gap-2">
          {order.payment_method === 'en_ligne' ? (
            <Badge className="bg-green-700 text-white text-xs px-2 py-0.5 font-bold">
              PAYÉE
            </Badge>
          ) : (
            <Badge className="bg-red-700 text-white text-xs px-2 py-0.5 font-bold animate-pulse">
              {order.payment_method === 'cb' ? 'CB' : 'ESP'}
            </Badge>
          )}
          <span className="text-xs opacity-80">{orderTime}</span>
        </div>
      </div>

      <div className="p-2 space-y-1.5">
        {/* Customer - smaller and lighter */}
        <div className="text-sm text-white/60 truncate">{order.customer_name}</div>
        
        {/* Address for delivery */}
        {order.order_type === 'livraison' && order.customer_address && (
          <div className="flex items-start gap-1 text-amber-300 text-xs bg-amber-500/10 rounded px-2 py-1">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{order.customer_address}</span>
          </div>
        )}

        {/* Items - BIGGER and BOLD */}
        <div className="bg-black/30 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
          {items.slice(0, 5).map((item: any, idx: number) => {
            const customization = item.customization;
            const customParts: string[] = [];
            if (customization?.size) customParts.push(customization.size.toUpperCase());
            if (customization?.meats?.length) customParts.push(customization.meats.join(', '));
            if (customization?.sauces?.length) customParts.push(customization.sauces.join(', '));
            if (customization?.garnitures?.length) customParts.push(customization.garnitures.join(', '));
            if (customization?.supplements?.length) customParts.push(customization.supplements.join(', '));
            
            return (
              <div key={idx} className="text-white">
                <div className="font-bold text-base">
                  {item.quantity}x {item.item?.name || item.name || 'Produit'}
                </div>
                {customParts.length > 0 && (
                  <div className="text-xs text-white/60 pl-2">└ {customParts.join(' • ')}</div>
                )}
                {customization?.note && (
                  <div className="text-xs text-amber-300 pl-2">📝 {customization.note}</div>
                )}
              </div>
            );
          })}
          {items.length > 5 && (
            <div className="text-xs text-amber-400 font-semibold">+{items.length - 5} autres</div>
          )}
        </div>

        {/* Status Buttons */}
        <div className="flex gap-1 pt-1">
          {order.status === 'pending' && (
            <Button 
              size="sm" 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              <ChefHat className="w-3 h-3" /> Préparer
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button 
              size="sm" 
              className="flex-1 bg-green-500 hover:bg-green-600 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'ready')}
            >
              <Package className="w-3 h-3" /> Prêt
            </Button>
          )}
          {order.status === 'ready' && (
            <Button 
              size="sm" 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'completed')}
            >
              <CheckCircle className="w-3 h-3" /> Terminé
            </Button>
          )}
          {['pending', 'preparing'].includes(order.status) && (
            <Button 
              variant="destructive" 
              size="sm"
              className="text-xs py-1 h-auto px-2"
              onClick={() => onStatusUpdate(order.id, 'cancelled')}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Scheduled Order Card with delivery mode indicator
function ScheduledOrderCard({ 
  order, 
  orderNumber,
  onStatusUpdate 
}: { 
  order: Order; 
  orderNumber: number;
  onStatusUpdate: (id: string, status: Order['status']) => void;
}) {
  const typeConfig = orderTypeConfig[order.order_type as keyof typeof orderTypeConfig];
  const TypeIcon = typeConfig?.icon || Store;
  const config = statusConfig[order.status];
  const scheduledTime = order.scheduled_for ? new Date(order.scheduled_for) : null;
  const orderTime = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="rounded-lg overflow-hidden bg-purple-900/40 ring-1 ring-purple-500/50">
      {/* Scheduled Time Banner */}
      {scheduledTime && (
        <div className="bg-purple-500 px-3 py-1.5 flex items-center justify-center gap-2 text-sm">
          <CalendarClock className="w-4 h-4" />
          <span className="font-bold">{format(scheduledTime, "EEE d MMM 'à' HH:mm", { locale: fr })}</span>
        </div>
      )}

      {/* Order Type + Number Header */}
      <div className={`${typeConfig?.color || 'bg-gray-600'} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4" />
          <span className="font-semibold text-sm">{typeConfig?.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">#{String(orderNumber).padStart(3, '0')}</span>
          {order.payment_method === 'en_ligne' ? (
            <Badge className="bg-green-700 text-white text-xs px-2 py-0.5 font-bold">PAYÉE</Badge>
          ) : (
            <Badge className="bg-red-700 text-white text-xs px-2 py-0.5 font-bold">
              {order.payment_method === 'cb' ? 'CB' : 'ESP'}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-2 space-y-1.5">
        {/* Customer + Order entry time - smaller text */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60 truncate flex-1">{order.customer_name}</span>
          <span className="text-xs text-white/50">reçu {orderTime}</span>
        </div>

        {/* Address for delivery */}
        {order.order_type === 'livraison' && order.customer_address && (
          <div className="flex items-start gap-1 text-amber-300 text-xs bg-amber-500/10 rounded px-2 py-1">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{order.customer_address}</span>
          </div>
        )}

        {/* Items - BIGGER and BOLD */}
        <div className="bg-black/30 rounded p-2 space-y-1 max-h-24 overflow-y-auto">
          {items.slice(0, 4).map((item: any, idx: number) => {
            const customization = item.customization;
            const customParts: string[] = [];
            if (customization?.size) customParts.push(customization.size.toUpperCase());
            if (customization?.meats?.length) customParts.push(customization.meats.join(', '));
            if (customization?.sauces?.length) customParts.push(customization.sauces.join(', '));
            if (customization?.garnitures?.length) customParts.push(customization.garnitures.join(', '));
            if (customization?.supplements?.length) customParts.push(customization.supplements.join(', '));
            
            return (
              <div key={idx} className="text-white">
                <div className="font-bold text-sm">
                  {item.quantity}x {item.item?.name || item.name || 'Produit'}
                </div>
                {customParts.length > 0 && (
                  <div className="text-xs text-white/60 pl-2">└ {customParts.join(' • ')}</div>
                )}
              </div>
            );
          })}
          {items.length > 4 && (
            <div className="text-xs text-purple-300 font-semibold">+{items.length - 4} autres</div>
          )}
        </div>

        {/* Status indicator + button */}
        <div className="flex items-center gap-2 pt-1">
          <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
          {order.status === 'pending' && (
            <Button 
              size="sm" 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              <ChefHat className="w-3 h-3" /> Préparer
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button 
              size="sm" 
              className="flex-1 bg-green-500 hover:bg-green-600 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'ready')}
            >
              <Package className="w-3 h-3" /> Prêt
            </Button>
          )}
          {order.status === 'ready' && (
            <Button 
              size="sm" 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-xs py-1 h-auto gap-1"
              onClick={() => onStatusUpdate(order.id, 'completed')}
            >
              <CheckCircle className="w-3 h-3" /> Terminé
            </Button>
          )}
        </div>
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