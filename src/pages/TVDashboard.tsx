import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, useUpdateOrderStatus, Order, useDrinks, useDesserts } from '@/hooks/useSupabaseData';
import { useAllProducts } from '@/hooks/useProducts';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import {
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Truck, Store, Utensils,
  Volume2, VolumeX, RefreshCw, History, Home,
  CreditCard, Banknote, Play, ArrowRight, Printer,
  CalendarClock, Wifi, AlertTriangle, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
const logoImage = '/favicon.png';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNetworkPrinter } from '@/hooks/useNetworkPrinter';

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

// Notification sound - LOUD attention-grabbing alert
// Plays multiple times to ensure it's heard
const playOrderSound = () => {
  try {
    // Custom shop notification sound uploaded to Supabase
    const soundUrls = [
      'https://hsylnrzxeyqxczdalurj.supabase.co/storage/v1/object/public/sound/shop-notification-355746.mp3',
      'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // fallback
    ];

    let soundPlayed = false;

    // Try to play sound from URLs
    const tryPlaySound = (urlIndex: number) => {
      if (soundPlayed || urlIndex >= soundUrls.length) {
        // If all URLs fail, use Web Audio API fallback
        if (!soundPlayed) {
          playFallbackSound();
        }
        return;
      }

      const audio = new Audio(soundUrls[urlIndex]);
      audio.volume = 1.0;

      audio.play()
        .then(() => {
          soundPlayed = true;
          console.log('🔔 Notification sound played successfully');
          // Play 2 more times for emphasis
          setTimeout(() => {
            const audio2 = new Audio(soundUrls[urlIndex]);
            audio2.volume = 1.0;
            audio2.play().catch(() => { });
          }, 400);
          setTimeout(() => {
            const audio3 = new Audio(soundUrls[urlIndex]);
            audio3.volume = 1.0;
            audio3.play().catch(() => { });
          }, 800);
        })
        .catch(() => {
          console.log('Sound URL failed, trying next...');
          tryPlaySound(urlIndex + 1);
        });
    };

    tryPlaySound(0);

  } catch (error) {
    console.log('Audio playback error, using fallback');
    playFallbackSound();
  }
};

// Fallback sound using Web Audio API (in case audio files don't load)
const playFallbackSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine'; // Softer sine wave
      oscillator.frequency.setValueAtTime(frequency, startTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;

    // iOS-like "Chord" sound pattern - pleasant repeating ding
    for (let i = 0; i < 3; i++) {
      playTone(880, now + i * 0.5, 0.3, 0.5);   // A5
      playTone(1108, now + i * 0.5 + 0.05, 0.25, 0.4); // C#6
      playTone(1318, now + i * 0.5 + 0.1, 0.2, 0.3);  // E6
    }

    console.log('🔔 Fallback sound played');
  } catch (error) {
    console.log('Audio not supported');
  }
};

// Auto-print ticket function - PLAIN TEXT format for thermal printers
const printOrderTicket = (order: Order) => {
  console.log('🖨️ Starting print process for order:', order.order_number);

  const header = localStorage.getItem('ticketHeader') || 'TWIN PIZZA';
  const subheader = localStorage.getItem('ticketSubheader') || 'Grand-Couronne';
  const phone = localStorage.getItem('ticketPhone') || '02 32 11 26 13';
  const footer = localStorage.getItem('ticketFooter') || 'Merci de votre visite!';

  const orderTypeLabels: Record<string, string> = {
    livraison: '🚗 LIVRAISON',
    emporter: '🛍️ A EMPORTER',
    surplace: '🍽️ SUR PLACE'
  };

  const paymentLabels: Record<string, string> = {
    en_ligne: '✅ PAYEE EN LIGNE',
    cb: '💳 CB - A PAYER',
    especes: '💵 ESPECES - A PAYER'
  };

  // Build items text
  const items = Array.isArray(order.items) ? order.items : [];
  let itemsText = '';
  items.forEach((cartItem: any) => {
    const productName = cartItem.item?.name || cartItem.name || 'Produit';
    const price = cartItem.totalPrice?.toFixed(2) || '0.00';
    const customization = cartItem.customization;
    let details: string[] = [];
    // Show pizza SIZE prominently (MEGA uppercase) - ONLY FOR PIZZAS
    const category = (cartItem.item?.category || cartItem.category || '').toLowerCase();
    const isPizza = category.includes('pizza');
    if (isPizza && customization?.size) {
      details.push(customization.size.toUpperCase());
    }
    if (customization?.meats?.length) details.push(customization.meats.join(', '));
    if (customization?.sauces?.length) details.push(customization.sauces.join(', '));
    if (customization?.supplements?.length) details.push(customization.supplements.join(', '));
    if (customization?.menuOption && customization.menuOption !== 'none') details.push(customization.menuOption);

    itemsText += `${cartItem.quantity}x ${productName} - ${price}€\n`;
    if (details.length > 0) {
      itemsText += `   ${details.join(' | ')}\n`;
    }
  });

  const dateStr = new Date(order.created_at || '').toLocaleString('fr-FR');
  const line = '================================';
  const dash = '--------------------------------';

  // Build plain text ticket
  const ticketText = `
${line}
        ${header}
      ${subheader}
       ${phone}
${line}
${order.order_number}
${dateStr}
${line}
    ${orderTypeLabels[order.order_type] || order.order_type.toUpperCase()}
${line}
Client: ${order.customer_name}
Tel: ${order.customer_phone || '-'}
${order.customer_address ? `Adresse: ${order.customer_address}` : ''}
${order.customer_notes ? `Note: ${order.customer_notes}` : ''}
${dash}
${itemsText}${dash}
Sous-total: ${order.subtotal?.toFixed(2) || '0.00'}€
TVA (10%): ${order.tva?.toFixed(2) || '0.00'}€
TOTAL: ${order.total?.toFixed(2) || '0.00'}€
${line}
   ${paymentLabels[order.payment_method] || order.payment_method}
${line}
${footer}
🍕 ${header} 🍕




`;

  const ticketHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket ${order.order_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        @media print { body { width: 80mm; margin: 0; } }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 14px; 
          font-weight: bold;
          color: #000000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          width: 80mm; 
          margin: 0;
          padding: 2mm;
          white-space: pre-wrap;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>${ticketText}</body>
    </html>
  `;

  // Create hidden iframe for printing
  const existingFrame = document.getElementById('print-frame');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('❌ Failed to create print iframe');
    return;
  }

  doc.open();
  doc.write(ticketHtml);
  doc.close();

  // Wait for content to load, then print ONCE
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      console.log('✅ Print command sent for order:', order.order_number);
    } catch (e) {
      console.error('❌ Print error:', e);
    }
    // Remove iframe after printing
    setTimeout(() => iframe.remove(), 3000);
  }, 500);
};

export default function TVDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [dateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    return localStorage.getItem('autoPrintEnabled') === 'true';
  });
  const [useNetworkPrint, setUseNetworkPrint] = useState(() => {
    return localStorage.getItem('useNetworkPrint') === 'true';
  });
  const [showPrices, setShowPrices] = useState(false); // Default to false for kitchen-friendly view
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [printerStatus, setPrinterStatus] = useState<'ready' | 'printing' | 'error'>('ready');
  const [lastPrintTime, setLastPrintTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [showNewOrderOverlay, setShowNewOrderOverlay] = useState(false);
  const [newOrderInfo, setNewOrderInfo] = useState<{ orderNumber: string; orderType: string } | null>(null);
  
  // Real-time states
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'scheduled' | 'history'>('live');
  
  const previousOrdersCount = useRef(0);
  const processedOrders = useRef<Set<string>>(new Set());
  const autoPrintRef = useRef(autoPrintEnabled);
  const useNetworkPrintRef = useRef(useNetworkPrint);

  // Network printer hook
  const { printOrder, isPrinting, lastError: networkPrintError } = useNetworkPrinter();

  // Load products, drinks, desserts, and category images
  const { data: allProducts } = useAllProducts();
  const { data: drinks } = useDrinks();
  const { data: desserts } = useDesserts();
  const { images: categoryImages } = useCategoryImages();

  // Create lookup map for images
  const itemImageMap = new Map<string, string>();
  if (allProducts) {
    allProducts.forEach((p: any) => {
      if (p.image_url) {
        itemImageMap.set(p.name.toLowerCase().trim(), p.image_url);
      }
    });
  }
  if (drinks) {
    drinks.forEach((d: any) => {
      if (d.image_url) {
        itemImageMap.set(d.name.toLowerCase().trim(), d.image_url);
      }
    });
  }
  if (desserts) {
    desserts.forEach((des: any) => {
      if (des.image_url) {
        itemImageMap.set(des.name.toLowerCase().trim(), des.image_url);
      }
    });
  }

  const resolveItemImage = (itemName: string, category: string) => {
    const nameKey = itemName.toLowerCase().trim();
    if (itemImageMap.has(nameKey)) {
      return { type: 'image', value: itemImageMap.get(nameKey) };
    }

    const catSlug = (category || '').toLowerCase().trim();
    const matchedCategory = categoryImages[catSlug];
    if (matchedCategory?.image_url) {
      return { type: 'image', value: matchedCategory.image_url };
    }

    // Keyword fallbacks
    if (catSlug.includes('pizza') || nameKey.includes('pizza')) {
      const pizzaImg = categoryImages['pizzas']?.image_url;
      if (pizzaImg) return { type: 'image', value: pizzaImg };
      return { type: 'emoji', value: '🍕' };
    }
    if (catSlug.includes('tacos') || nameKey.includes('tacos')) {
      const tacosImg = categoryImages['tacos']?.image_url;
      if (tacosImg) return { type: 'image', value: tacosImg };
      return { type: 'emoji', value: '🌮' };
    }
    if (catSlug.includes('tex') || nameKey.includes('tex') || catSlug.includes('mex') || nameKey.includes('mex') || catSlug.includes('frite') || nameKey.includes('frite')) {
      const texmexImg = categoryImages['tex-mex']?.image_url;
      if (texmexImg) return { type: 'image', value: texmexImg };
      return { type: 'emoji', value: '🍟' };
    }
    if (catSlug.includes('sandwich') || nameKey.includes('sandwich') || catSlug.includes('burger') || nameKey.includes('burger') || nameKey.includes('panini')) {
      const burgerImg = categoryImages['sandwichs']?.image_url;
      if (burgerImg) return { type: 'image', value: burgerImg };
      return { type: 'emoji', value: '🍔' };
    }
    if (catSlug.includes('boisson') || nameKey.includes('boisson') || catSlug.includes('drink') || nameKey.includes('drink')) {
      const boissonImg = categoryImages['boissons']?.image_url;
      if (boissonImg) return { type: 'image', value: boissonImg };
      return { type: 'emoji', value: '🥤' };
    }
    if (catSlug.includes('dessert') || nameKey.includes('dessert') || nameKey.includes('tiramisu')) {
      const dessertImg = categoryImages['desserts']?.image_url;
      if (dessertImg) return { type: 'image', value: dessertImg };
      return { type: 'emoji', value: '🍰' };
    }

    if (matchedCategory?.emoji_fallback) {
      return { type: 'emoji', value: matchedCategory.emoji_fallback };
    }

    return { type: 'emoji', value: '📦' };
  };

  // Keep refs in sync with state
  useEffect(() => {
    autoPrintRef.current = autoPrintEnabled;
  }, [autoPrintEnabled]);

  useEffect(() => {
    useNetworkPrintRef.current = useNetworkPrint;
    localStorage.setItem('useNetworkPrint', useNetworkPrint.toString());
  }, [useNetworkPrint]);

  // Update printer status
  useEffect(() => {
    if (isPrinting) {
      setPrinterStatus('printing');
    } else if (networkPrintError) {
      setPrinterStatus('error');
    } else {
      setPrinterStatus('ready');
    }
  }, [isPrinting, networkPrintError]);

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);
  const updateStatus = useUpdateOrderStatus();

  // Save preferences
  useEffect(() => {
    localStorage.setItem('autoPrintEnabled', autoPrintEnabled.toString());
  }, [autoPrintEnabled]);

  // WebSocket Subscription for Realtime
  useEffect(() => {
    console.log('🔌 Connecting Supabase Realtime channel for orders...');
    const channel = supabase
      .channel('kds-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('⚡ KDS Realtime update received:', payload);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log(`📶 KDS Realtime channel status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('🔌 Disconnecting KDS Realtime channel...');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Auto-refresh every 5 seconds (silent fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      refetch().then(() => {
        setLastRefresh(new Date());
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Notification triggers for new orders
  useEffect(() => {
    if (orders && orders.length > previousOrdersCount.current && previousOrdersCount.current > 0) {
      const newestOrder = orders[0];
      if (newestOrder && !processedOrders.current.has(newestOrder.id)) {
        processedOrders.current.add(newestOrder.id);
        
        // Show new order alert overlay
        setNewOrderInfo({
          orderNumber: newestOrder.order_number,
          orderType: newestOrder.order_type.toUpperCase()
        });
        setShowNewOrderOverlay(true);
        setFlashEffect(true);
        setTimeout(() => {
          setShowNewOrderOverlay(false);
          setNewOrderInfo(null);
          setFlashEffect(false);
        }, 4000);

        // Sound alert
        if (soundEnabled) {
          playOrderSound();
        }

        // Auto print trigger
        if (autoPrintRef.current) {
          if (useNetworkPrintRef.current) {
            printOrder(newestOrder);
            setLastPrintTime(new Date());
          } else {
            printOrderTicket(newestOrder);
            setLastPrintTime(new Date());
          }
        }
      }
    }
    previousOrdersCount.current = orders?.length || 0;
  }, [orders, soundEnabled, printOrder]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="animate-spin text-amber-500 w-6 h-6" />
          Vérification des accès...
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Statut mis à jour : ${statusConfig[newStatus]?.label}`);

      // WhatsApp trigger when order is completed
      if (newStatus === 'completed') {
        const order = orders?.find(o => o.id === orderId);
        if (order && order.customer_phone) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                  customerPhone: order.customer_phone,
                  customerName: order.customer_name,
                  orderNumber: order.order_number,
                  orderType: order.order_type,
                }),
              }
            );
            const result = await response.json();
            if (result.success) {
              toast.success('📱 WhatsApp envoyé au client');
            }
          } catch (whatsappError) {
            console.error('WhatsApp error:', whatsappError);
          }
        }
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  // Filter orders
  const liveOrders = orders?.filter(o => !o.is_scheduled && !['completed', 'cancelled'].includes(o.status)) || [];
  const scheduledOrders = orders?.filter(o => o.is_scheduled === true && !['completed', 'cancelled'].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => o.status === 'completed') || [];
  const allHistoryOrders = orders?.filter(o => ['completed', 'cancelled'].includes(o.status)) || [];

  // Generate order number maps
  const allOrdersSorted = [...(orders || [])].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const orderNumberMap = new Map<string, number>();
  allOrdersSorted.forEach((order, idx) => {
    orderNumberMap.set(order.id, idx + 1);
  });

  return (
    <div className={`h-screen overflow-hidden bg-[#0B0F17] text-white flex flex-col ${flashEffect ? 'bg-amber-500/10' : ''}`}>
      {/* Real-time Order Overlay alert */}
      {showNewOrderOverlay && newOrderInfo && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="text-center p-8 bg-[#161D2A] border border-[#242F41] rounded-3xl max-w-lg w-full shadow-2xl">
            <span className="text-7xl mb-4 block animate-bounce">🍕</span>
            <h1 className="text-4xl font-extrabold text-amber-500 mb-1">NOUVELLE COMMANDE</h1>
            <h2 className="text-2xl font-bold text-white mb-6">REÇUE !</h2>
            <div className="bg-black/50 border border-white/10 px-8 py-4 rounded-2xl inline-block">
              <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">{newOrderInfo.orderType}</p>
              <p className="text-5xl font-mono font-bold mt-1 text-white">#{newOrderInfo.orderNumber}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-[#1E293B] shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Twin Pizza" className="w-8 h-8 rounded-full" />
            <span className="text-xl font-bold tracking-tight">
              TWIN <span className="text-amber-500">KDS</span>
            </span>
          </div>

          {/* Real-time status indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-xs text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isConnected ? 'Temps réel connecté' : 'Mode synchro standard'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 px-3 py-1 rounded-md border border-white/5">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
            <span>MAJ {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="bg-slate-900 border border-white/5 p-1 rounded-lg">
            <TabsList className="bg-transparent h-8">
              <TabsTrigger value="live" className="gap-2 text-xs h-7 px-3 data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                <ChefHat className="w-4 h-4" /> Commandes Actives ({liveOrders.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2 text-xs h-7 px-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                <CalendarClock className="w-4 h-4" /> Planifiées ({scheduledOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 text-xs h-7 px-3 data-[state=active]:bg-slate-700 data-[state=active]:text-white font-bold">
                <History className="w-4 h-4" /> Historique ({allHistoryOrders.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Print configuration controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
              className={`h-8 w-8 rounded-md ${autoPrintEnabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'text-slate-400 hover:text-white'}`}
              title={autoPrintEnabled ? 'Auto-print activé' : 'Auto-print désactivé'}
            >
              <Printer className="w-4 h-4" />
            </Button>
            {autoPrintEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUseNetworkPrint(!useNetworkPrint)}
                className={`h-8 w-8 rounded-md ${useNetworkPrint ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                title={useNetworkPrint ? 'Impression Réseau direct' : 'Impression navigateur'}
              >
                <Wifi className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Sound Alert Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`h-8 w-8 bg-slate-900 border border-white/5 rounded-lg text-slate-400 hover:text-white`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Printer Status */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-white/5 px-3 py-1 rounded-lg text-xs">
            <Printer className={`w-3.5 h-3.5 ${printerStatus === 'printing' ? 'text-blue-400 animate-pulse' : printerStatus === 'error' ? 'text-red-400' : 'text-green-400'}`} />
            <span className={printerStatus === 'error' ? 'text-red-400 font-bold' : 'text-slate-300'}>
              {printerStatus === 'printing' ? 'IMPRIMANTE EN COURS...' : printerStatus === 'error' ? 'ERREUR IMPRIMANTE' : 'IMPRIMANTE PRÊTE'}
            </span>
          </div>

          {/* Clock */}
          <div className="text-base font-mono font-bold bg-amber-500 text-black px-3 py-1 rounded-lg flex items-center h-8 shadow-sm">
            <CurrentTime />
          </div>
        </div>
      </header>

      {/* Main KDS Board Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'live' && (
          <>
            {liveOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-4xl shadow-inner">
                  <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">Toutes les commandes sont prêtes !</p>
                  <p className="text-sm text-slate-400 mt-1">Les nouvelles commandes s'afficheront ici en temps réel.</p>
                </div>
              </div>
            ) : liveOrders.length === 1 ? (
              /* Split layout for single active order */
              <div className="w-full h-full p-6 bg-[#0B0F17] flex justify-center items-center">
                <KDSOrderCard
                  order={liveOrders[0]}
                  orderNumber={orderNumberMap.get(liveOrders[0].id) || 0}
                  onStatusUpdate={handleStatusUpdate}
                  resolveItemImage={resolveItemImage}
                  soundEnabled={soundEnabled}
                  layoutMode="single"
                  printOrderTicket={printOrderTicket}
                  printOrder={printOrder}
                  useNetworkPrint={useNetworkPrint}
                />
              </div>
            ) : liveOrders.length === 2 ? (
              /* 2 Columns split screen layout */
              <div className="grid grid-cols-2 gap-6 p-6 h-full overflow-hidden">
                {liveOrders.map(order => (
                  <KDSOrderCard
                    key={order.id}
                    order={order}
                    orderNumber={orderNumberMap.get(order.id) || 0}
                    onStatusUpdate={handleStatusUpdate}
                    resolveItemImage={resolveItemImage}
                    soundEnabled={soundEnabled}
                    layoutMode="split"
                    printOrderTicket={printOrderTicket}
                    printOrder={printOrder}
                    useNetworkPrint={useNetworkPrint}
                  />
                ))}
              </div>
            ) : (
              /* Grid layout for 3+ orders */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 p-6 h-full overflow-y-auto pb-12">
                {liveOrders.map(order => (
                  <KDSOrderCard
                    key={order.id}
                    order={order}
                    orderNumber={orderNumberMap.get(order.id) || 0}
                    onStatusUpdate={handleStatusUpdate}
                    resolveItemImage={resolveItemImage}
                    soundEnabled={soundEnabled}
                    layoutMode="grid"
                    printOrderTicket={printOrderTicket}
                    printOrder={printOrder}
                    useNetworkPrint={useNetworkPrint}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* PLANIFIEES TAB */}
        {activeTab === 'scheduled' && (
          <div className="p-6 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-300">Commandes planifiées (Plus tard)</h2>
            {scheduledOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Aucune commande planifiée</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {scheduledOrders.map(order => (
                  <KDSOrderCard
                    key={order.id}
                    order={order}
                    orderNumber={orderNumberMap.get(order.id) || 0}
                    onStatusUpdate={handleStatusUpdate}
                    resolveItemImage={resolveItemImage}
                    soundEnabled={soundEnabled}
                    layoutMode="grid"
                    printOrderTicket={printOrderTicket}
                    printOrder={printOrder}
                    useNetworkPrint={useNetworkPrint}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="p-6 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-300 font-sans">Historique des commandes terminées</h2>
            {allHistoryOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Aucune commande historique pour aujourd'hui</div>
            ) : (
              <div className="space-y-3">
                {allHistoryOrders.map((order) => (
                  <HistoryOrderRow key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Compact Bottom Completed Strip */}
      {activeTab === 'live' && completedOrders.length > 0 && (
        <div className="h-12 px-6 py-2 bg-[#111827] border-t border-[#1E293B] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>COMMANDE FINIE :</span>
            </div>
            <div className="flex items-center gap-2">
              {completedOrders.slice(0, 30).map((order) => (
                <div key={order.id} className="bg-slate-900 border border-white/5 text-white/70 font-mono font-bold px-3 py-1 rounded-lg text-sm shrink-0">
                  #{order.order_number}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Live counting-up timer showing elapsed preparation time
function LiveTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      setElapsed(Math.max(0, Math.floor(diffMs / 1000)));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Thresholds: Green (<8m), Orange (8-15m), Red (>15m)
  let colorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  if (elapsed >= 480 && elapsed < 900) {
    colorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  } else if (elapsed >= 900) {
    colorClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse';
  }

  return (
    <div className={`px-3 py-1 rounded-full border text-sm font-mono font-bold flex items-center gap-1.5 ${colorClass}`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{formatTime(elapsed)}</span>
    </div>
  );
}

// Current clock display
function CurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
}

// Get order source helper
const getOrderSource = (order: Order): 'pos' | 'borne' | 'web' => {
  const phone = (order.customer_phone || '').toLowerCase().trim();
  const name  = (order.customer_name  || '').toLowerCase().trim();
  const notes = (order.customer_notes || '').toLowerCase();
  if (phone === 'pos' || name.startsWith('[pos]'))  return 'pos';
  if (phone === 'borne' || notes.includes('[borne]')) return 'borne';
  return 'web';
};

// KDS Order Card
function KDSOrderCard({
  order,
  orderNumber,
  onStatusUpdate,
  resolveItemImage,
  soundEnabled,
  layoutMode,
  printOrderTicket,
  printOrder,
  useNetworkPrint
}: {
  order: Order;
  orderNumber: number;
  onStatusUpdate: (id: string, status: Order['status']) => void;
  resolveItemImage: (itemName: string, category: string) => { type: 'image' | 'emoji'; value: string };
  soundEnabled: boolean;
  layoutMode: 'single' | 'split' | 'grid';
  printOrderTicket: (order: Order) => void;
  printOrder: (order: Order) => Promise<boolean>;
  useNetworkPrint: boolean;
}) {
  const source = getOrderSource(order);
  const items = Array.isArray(order.items) ? order.items : [];

  // Source labels & colors
  const kdsSourceConfig = {
    pos: { label: 'CAISSE (POS)', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', icon: Store },
    borne: { label: 'BORNE', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400', icon: Utensils },
    web: { label: 'EN LIGNE', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', icon: Wifi },
  };
  const sConf = kdsSourceConfig[source];
  const SourceIcon = sConf.icon;

  // Type labels & colors
  const kdsTypeConfig = {
    surplace: { label: 'SUR PLACE', color: 'bg-green-500/20 border-green-500/30 text-green-400' },
    emporter: { label: 'A EMPORTER', color: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
    livraison: { label: 'LIVRAISON', color: 'bg-rose-500/20 border-rose-500/30 text-rose-400' }
  };
  const tConf = kdsTypeConfig[order.order_type as keyof typeof kdsTypeConfig] || { label: order.order_type.toUpperCase(), color: 'bg-slate-700 border-white/10 text-white' };

  // Manual Print reprint triggers
  const [printingTicket, setPrintingTicket] = useState(false);
  const handleReprint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingTicket(true);
    try {
      if (useNetworkPrint) {
        await printOrder(order);
      } else {
        printOrderTicket(order);
      }
      toast.success('Ticket réimprimé');
    } catch (err) {
      toast.error('Erreur réimpression');
    } finally {
      setPrintingTicket(false);
    }
  };

  const handleProgress = () => {
    if (order.status === 'pending') {
      onStatusUpdate(order.id, 'preparing');
    } else if (order.status === 'preparing') {
      onStatusUpdate(order.id, 'ready');
    } else if (order.status === 'ready') {
      onStatusUpdate(order.id, 'completed');
    }
  };

  const isSingle = layoutMode === 'single';

  return (
    <div className={`flex flex-col bg-[#161D2A] border ${order.status === 'ready' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-[#242F41]'} rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 w-full h-full`}>
      
      {/* Card Header */}
      <div className="flex items-center justify-between p-4 bg-[#1E293B] border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-mono font-extrabold tracking-tight text-white">
            #{order.order_number}
          </span>
          <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${sConf.color}`}>
            <SourceIcon className="w-3.5 h-3.5" />
            <span>{sConf.label}</span>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${tConf.color}`}>
            {tConf.label}
          </div>
          {order.is_scheduled && order.scheduled_for && (
            <div className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{format(new Date(order.scheduled_for), "HH:mm")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LiveTimer createdAt={order.created_at} />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReprint}
            disabled={printingTicket}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
            title="Réimprimer le ticket"
          >
            <Printer className={`w-4 h-4 ${printingTicket ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main card body - split if single, vertical if grid */}
      <div className={`flex-1 overflow-hidden flex ${isSingle ? 'flex-row' : 'flex-col'}`}>
        
        {/* Left pane: metadata & customer info */}
        <div className={`${isSingle ? 'w-2/5 border-r border-[#242F41]' : 'w-full'} p-4 flex flex-col gap-4 overflow-y-auto`}>
          
          {/* Customer Name */}
          <div>
            <span className="text-slate-400 text-xs tracking-wider uppercase block font-bold">Client</span>
            <span className={`text-white font-extrabold tracking-tight block ${isSingle ? 'text-3xl' : 'text-xl'}`}>
              {order.customer_name}
            </span>
            <span className="text-slate-400 text-sm mt-0.5 block">{order.customer_phone}</span>
          </div>

          {/* Delivery address */}
          {order.customer_address && (
            <div>
              <span className="text-slate-400 text-xs tracking-wider uppercase block font-bold">Adresse de livraison</span>
              <span className="text-slate-200 text-sm block leading-relaxed">{order.customer_address}</span>
            </div>
          )}

          {/* Preparation Notes Alert box */}
          {order.customer_notes && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-extrabold uppercase text-xs block mb-0.5 tracking-widest">Note Cuisine</span>
                <span className="block font-bold leading-normal">{order.customer_notes.replace(/^\[BORNE\]\s*/i, '').trim()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right pane / Items list */}
        <div className="flex-1 overflow-y-auto p-4 border-t border-[#242F41]/30">
          <span className="text-slate-400 text-xs tracking-wider uppercase block font-bold mb-3">Articles à préparer</span>
          <div className="space-y-4">
            {items.map((item: any, idx: number) => {
              const name = item.item?.name || item.name || 'Produit';
              const qty = item.quantity || 1;
              const cat = (item.item?.category || item.category || 'Articles').toLowerCase();
              const c = item.customization;
              const imgResult = resolveItemImage(name, cat);

              return (
                <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex gap-4 items-start shadow-inner">
                  {/* Product image resolver display */}
                  <div className="shrink-0">
                    {imgResult.type === 'image' ? (
                      <img src={imgResult.value} alt={name} className="w-16 h-16 rounded-xl object-cover border border-[#242F41] bg-slate-950" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center text-3xl border border-[#242F41] shadow-inner select-none">
                        {imgResult.value}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-black px-2.5 py-0.5 rounded-lg shrink-0">
                        x{qty}
                      </span>
                      <h3 className="font-extrabold text-base tracking-tight text-white uppercase truncate">
                        {name}
                      </h3>
                    </div>

                    {/* Customization Options */}
                    {c && (
                      <div className="mt-2 space-y-1 text-sm font-semibold text-slate-300 pl-1 border-l-2 border-amber-500/30">
                        {c.size && (
                          <div className="text-amber-400 font-extrabold text-xs tracking-wider uppercase">Taille: {c.size.toUpperCase()}</div>
                        )}
                        {c.meats?.map((m: string) => <div key={m}>+ Viande: {m}</div>)}
                        {c.meat && <div>+ Viande: {c.meat}</div>}
                        {c.sauces?.map((s: string) => <div key={s}>Sauce: {s}</div>)}
                        {c.sauce && <div>Sauce: {c.sauce}</div>}
                        {c.garnitures?.map((g: string) => <div key={g}>Garniture: {g}</div>)}
                        {c.supplements?.map((s: string) => <div key={s} className="text-emerald-400 font-bold">+ Supplément: {s}</div>)}
                        {c.removedIngredients?.map((r: string) => <div key={r} className="text-rose-400 font-bold">SANS {r}</div>)}
                        {c.drink && <div className="text-blue-400">🥤 Boisson: {c.drink}</div>}
                        
                        {c.menuOption && c.menuOption !== 'none' && c.menuOption !== '' && (
                          <div className="text-amber-500 font-bold">🎁 Accompagnement: {c.menuOption}</div>
                        )}
                        {c.note && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded px-2 py-1 mt-1 text-xs font-black">
                            Note article: {c.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Action footer / Touch progresses */}
      <div className="p-4 bg-[#111827] border-t border-white/5">
        {order.status === 'pending' && (
          <Button
            onClick={handleProgress}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 rounded-xl text-base tracking-wider uppercase shadow-md flex items-center justify-center gap-2 h-14"
          >
            <ChefHat className="w-5 h-5 animate-pulse" />
            COMMENCER LA PRÉPARATION
          </Button>
        )}
        {order.status === 'preparing' && (
          <Button
            onClick={handleProgress}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-4 rounded-xl text-base tracking-wider uppercase shadow-md flex items-center justify-center gap-2 h-14"
          >
            <Package className="w-5 h-5" />
            MARQUER COMME PRÊT
          </Button>
        )}
        {order.status === 'ready' && (
          <Button
            onClick={handleProgress}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-xl text-base tracking-wider uppercase shadow-md flex items-center justify-center gap-2 h-14"
          >
            <CheckCircle className="w-5 h-5" />
            TERMINER LA COMMANDE
          </Button>
        )}
      </div>
    </div>
  );
}

// History order row showing completed orders
function HistoryOrderRow({ order }: { order: Order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#161D2A] rounded-xl border border-[#242F41] overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <Badge className="bg-slate-700 text-slate-300 font-mono text-sm px-2 py-0.5">#{order.order_number}</Badge>
          <span className="text-base font-extrabold text-white">{order.customer_name}</span>
          <Badge variant="outline" className="text-slate-400 capitalize">{order.order_type}</Badge>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90 text-white' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#242F41] pt-4 bg-[#0F141F] space-y-3">
          <div className="text-amber-500 font-bold">📞 Téléphone : {order.customer_phone}</div>
          {order.customer_address && (
            <div className="text-slate-300">📍 Adresse : {order.customer_address}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="bg-black/35 rounded-xl border border-white/5 p-3 text-sm">
                <span className="font-extrabold text-amber-400">x{item.quantity}</span> {item.item?.name || item.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}