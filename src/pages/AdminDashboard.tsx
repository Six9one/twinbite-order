import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useSupabaseData';
import { ProductCategoryManager } from '@/components/admin/ProductCategoryManager';
import { PizzaManager } from '@/components/admin/PizzaManager';
import { SandwichManager } from '@/components/admin/SandwichManager';
import { CruditesManager } from '@/components/admin/CruditesManager';
import { SettingsManager } from '@/components/admin/SettingsManager';
import { ImageUploadTable } from '@/components/admin/ImageUploadTable';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PromotionsManager } from '@/components/admin/PromotionsManager';
import { SimpleLoyaltyManager } from '@/components/admin/SimpleLoyaltyManager';
import { OpeningHoursManager } from '@/components/admin/OpeningHoursManager';
import { StatisticsSection } from '@/components/admin/StatisticsSection';
import { PaymentSettingsManager } from '@/components/admin/PaymentSettingsManager';
import { TicketTemplateManager } from '@/components/admin/TicketTemplateManager';
import { CarouselManager } from '@/components/admin/CarouselManager';
import { TexMexManager } from '@/components/admin/TexMexManager';
import { ReviewsManager } from '@/components/admin/ReviewsManager';
import { SiteContentManager } from '@/components/admin/SiteContentManager';
import { StoreStatusManager } from '@/components/admin/StoreStatusManager';
import { CategoryImagesManager } from '@/components/admin/CategoryImagesManager';
import { PriceManager } from '@/components/admin/PriceManager';
import { HACCPManager } from '@/components/admin/HACCPManager';
import { TicketManager } from '@/components/admin/TicketManager';
import {
  LogOut, Home, Search, RefreshCw, Download, Printer,
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Phone, User, MessageSquare, CreditCard, Banknote,
  Utensils, Droplet, Leaf, Plus, Trash2, Edit2, Tv, TrendingUp,
  Menu, Volume2, VolumeX, Bell
} from 'lucide-react';
import logoImage from '@/assets/logo.png';

type AdminTab = 'orders' | 'ventes' | 'zones' | 'pizzas' | 'sandwiches' | 'soufflet' | 'makloub' | 'mlawi' | 'tacos' | 'panini' | 'croques' | 'texmex' | 'frites' | 'milkshakes' | 'crepes' | 'gaufres' | 'crudites' | 'settings' | 'meats' | 'sauces' | 'garnitures' | 'supplements' | 'drinks' | 'desserts' | 'printer' | 'tickets' | 'promotions' | 'loyalty' | 'hours' | 'payments' | 'carousel' | 'reviews' | 'content' | 'store-status' | 'category-images' | 'prices' | 'haccp';



const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'En préparation', color: 'bg-blue-500', icon: ChefHat },
  ready: { label: 'Prêt', color: 'bg-green-500', icon: Package },
  completed: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

// Notification sound function
const playOrderSound = () => {
  try {
    // Custom shop notification sound uploaded to Supabase
    const soundUrls = [
      'https://hsylnrzxeyqxczdalurj.supabase.co/storage/v1/object/public/sound/shop-notification-355746.mp3',
      'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // fallback
    ];
    let soundPlayed = false;
    const tryPlaySound = (urlIndex: number) => {
      if (soundPlayed || urlIndex >= soundUrls.length) return;
      const audio = new Audio(soundUrls[urlIndex]);
      audio.volume = 1.0;
      audio.play()
        .then(() => {
          soundPlayed = true;
          console.log('🔔 Notification sound played!');
          // Play again for emphasis
          setTimeout(() => {
            const audio2 = new Audio(soundUrls[urlIndex]);
            audio2.volume = 1.0;
            audio2.play().catch(() => { });
          }, 500);
        })
        .catch(() => tryPlaySound(urlIndex + 1));
    };
    tryPlaySound(0);
  } catch (error) {
    console.log('Audio not supported');
  }
};

// Auto-print ticket function - PLAIN TEXT format for thermal printers
const autoPrintOrderTicket = (order: Order) => {
  console.log('🖨️ Auto-printing order:', order.order_number);

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
    // Size is NOT shown - it's already in product name
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
  const existingFrame = document.getElementById('admin-print-frame');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'admin-print-frame';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Failed to create print iframe');
    return;
  }

  doc.open();
  doc.write(ticketHtml);
  doc.close();

  // Wait for content to load, then print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      console.log('✅ Print sent for order:', order.order_number);
    } catch (e) {
      console.error('Print error:', e);
    }
    // Remove iframe after printing
    setTimeout(() => iframe.remove(), 3000);
  }, 500);
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-print states
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    return localStorage.getItem('adminAutoPrintEnabled') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('adminSoundEnabled') !== 'false';
  });
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState<string | null>(null);
  const processedOrders = useRef<Set<string>>(new Set());
  const autoPrintRef = useRef(autoPrintEnabled);
  const soundRef = useRef(soundEnabled);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);
  const updateStatus = useUpdateOrderStatus();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Keep refs in sync
  useEffect(() => {
    autoPrintRef.current = autoPrintEnabled;
    localStorage.setItem('adminAutoPrintEnabled', autoPrintEnabled.toString());
  }, [autoPrintEnabled]);

  useEffect(() => {
    soundRef.current = soundEnabled;
    localStorage.setItem('adminSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Auto-refresh every 3 seconds with new order detection (polling method - more reliable than WebSocket)
  const lastOrderCountRef = useRef<number>(0);
  const lastOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkForNewOrders = async () => {
      const previousCount = lastOrderCountRef.current;
      const previousLastId = lastOrderIdRef.current;

      await refetch();
      setLastUpdate(new Date());

      // Check if we have new orders
      if (orders && orders.length > 0) {
        const currentCount = orders.length;
        const currentLastId = orders[0]?.id;

        // Initialize on first load
        if (previousCount === 0) {
          lastOrderCountRef.current = currentCount;
          lastOrderIdRef.current = currentLastId;
          return;
        }

        // Detect new order
        if (currentLastId && currentLastId !== previousLastId) {
          const newOrder = orders[0];
          console.log('🆕 New order detected:', newOrder.order_number);

          // Skip if already processed
          if (!processedOrders.current.has(newOrder.id)) {
            processedOrders.current.add(newOrder.id);

            // Show visual alert
            setNewOrderNumber(newOrder.order_number);
            setShowNewOrderAlert(true);
            setTimeout(() => {
              setShowNewOrderAlert(false);
              setNewOrderNumber(null);
            }, 5000);

            // Play sound if enabled
            if (soundRef.current) {
              playOrderSound();
            }

            // Browser notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('🍕 Nouvelle commande!', {
                body: `Commande ${newOrder.order_number} - ${newOrder.order_type.toUpperCase()}`,
                icon: '/favicon.ico'
              });
            }

            // Auto-print if enabled
            if (autoPrintRef.current) {
              console.log('🖨️ Auto-print enabled, printing order:', newOrder.order_number);
              autoPrintOrderTicket(newOrder);
              toast.success(`🖨️ Impression automatique: ${newOrder.order_number}`);
            }
          }
        }

        lastOrderCountRef.current = currentCount;
        lastOrderIdRef.current = currentLastId;
      }
    };

    // Check immediately
    checkForNewOrders();

    // Then check every 3 seconds
    const interval = setInterval(checkForNewOrders, 3000);
    return () => clearInterval(interval);
  }, [refetch, orders]);

  // Request notification permission on page load
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
    console.log('🖨️ Auto-print status:', autoPrintEnabled ? 'ENABLED' : 'DISABLED');
    console.log('🔊 Sound status:', soundEnabled ? 'ENABLED' : 'DISABLED');
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) navigate('/admin');
          return;
        }

        // Verify admin role - redirect if not admin
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

        if (mounted) setIsAuthenticated(true);
      } catch (error) {
        if (mounted) navigate('/admin');
      }
    };
    checkAuth();

    // NOTE: Realtime WebSocket disabled - using polling instead (see checkForNewOrders above)
    // This is more reliable with the current Supabase configuration

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      mounted = false;
    };
  }, [navigate, refetch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status: newStatus });
      toast.success(`Statut mis à jour: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredOrders = orders?.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone.includes(searchQuery)
  );

  const exportOrders = () => {
    if (!filteredOrders) return;

    const csv = [
      ['N° Commande', 'Type', 'Client', 'Téléphone', 'Total', 'Statut', 'Heure'].join(';'),
      ...filteredOrders.map(o => [
        o.order_number,
        o.order_type,
        o.customer_name,
        o.customer_phone,
        `${o.total}€`,
        statusConfig[o.status].label,
        new Date(o.created_at).toLocaleTimeString('fr-FR')
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes-${dateFilter}.csv`;
    link.click();
    toast.success('Export téléchargé!');
  };

  // HTML escape function to prevent XSS attacks
  const escapeHtml = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (c) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[c] || c;
    });
  };

  const formatItemForPrint = (cartItem: any): string => {
    const productName = cartItem.item?.name || cartItem.name || 'Produit';
    const price = cartItem.calculatedPrice || cartItem.item?.price || cartItem.price || 0;
    const customization = cartItem.customization;
    const note = cartItem.note || customization?.note;

    let details: string[] = [];
    // Show pizza SIZE prominently (MEGA in bold) - ONLY FOR PIZZAS
    const category = (cartItem.item?.category || cartItem.category || '').toLowerCase();
    const isPizza = category.includes('pizza');
    if (isPizza && customization?.size) {
      const sizeText = customization.size.toUpperCase() === 'MEGA' ? '<b>MEGA</b>' : customization.size.toUpperCase();
      details.push(sizeText);
    }
    // Remove base sauce from display - not needed
    if (customization?.meats?.length) details.push(customization.meats.join(', '));
    if (customization?.meat) details.push(customization.meat);
    if (customization?.sauces?.length) details.push(customization.sauces.join(', '));
    if (customization?.garnitures?.length) details.push(customization.garnitures.join(', '));
    if (customization?.supplements?.length) details.push(customization.supplements.join(', '));
    if (customization?.cheeseSupplements?.length) details.push(customization.cheeseSupplements.join(', '));
    if (customization?.menuOption && customization.menuOption !== 'none') details.push(customization.menuOption);

    // Name bold, price small and gray on right
    let html = '<div class="item"><span style="font-weight:bold;">' + cartItem.quantity + 'x ' + escapeHtml(productName) + '</span><span style="font-size:10px;color:#666;">' + Number(price).toFixed(2) + '€</span></div>';
    if (details.length > 0) {
      // Details very small (8px)
      html += '<div style="font-size: 8px; margin-left: 10px; color: #888;">' + details.join(' | ') + '</div>';
    }
    if (note) {
      html += '<div class="note" style="font-size:9px;">📝 ' + escapeHtml(note) + '</div>';
    }
    return html;
  };

  const printTicket = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = Array.isArray(order.items) ? order.items.map(formatItemForPrint).join('') : '';

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket ${escapeHtml(order.order_number)}</title>
        <style>
          body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .info { margin: 10px 0; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
          .note { background: #f0f0f0; padding: 5px; margin: 5px 0; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TWIN PIZZA</h1>
          <p>Grand-Couronne</p>
        </div>
        <div class="info">
          <p><strong>Commande:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Type:</strong> ${escapeHtml(order.order_type.toUpperCase())}</p>
          <p><strong>Client:</strong> ${escapeHtml(order.customer_name)}</p>
          <p><strong>Tél:</strong> ${escapeHtml(order.customer_phone)}</p>
          ${order.customer_address ? `<p><strong>Adresse:</strong> ${escapeHtml(order.customer_address)}</p>` : ''}
          <p><strong>Heure:</strong> ${new Date(order.created_at).toLocaleString('fr-FR')}</p>
        </div>
        <div class="items">
          ${itemsHtml}
        </div>
        <div class="total">
          <p>Sous-total: ${order.subtotal.toFixed(2)}€</p>
          <p>TVA (10%): ${order.tva.toFixed(2)}€</p>
          ${order.delivery_fee > 0 ? `<p>Livraison: ${order.delivery_fee.toFixed(2)}€</p>` : ''}
          <p style="font-size: 24px;">TOTAL: ${order.total.toFixed(2)}€</p>
          <p>Paiement: ${order.payment_method === 'en_ligne' ? 'EN LIGNE (PAYÉ)' : order.payment_method === 'cb' ? 'Carte (NON PAYÉ)' : 'Espèces (NON PAYÉ)'}</p>
        </div>
        ${order.customer_notes ? `<div class="note"><strong>Note client:</strong> ${escapeHtml(order.customer_notes)}</div>` : ''}
        <div style="text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px;">
          <p>Merci de votre commande!</p>
          <p>🍕 TWIN PIZZA 🍕</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar with mobile overlay support */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as AdminTab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card border-b shadow-sm">
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
              {/* Auto-Print Toggle */}
              <Button
                variant={autoPrintEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
                className={`gap-1 sm:gap-2 px-2 sm:px-3 ${autoPrintEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                title={autoPrintEnabled ? 'Auto-impression activée' : 'Auto-impression désactivée'}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">{autoPrintEnabled ? 'Auto' : 'Manuel'}</span>
              </Button>

              {/* Sound Toggle */}
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-2 sm:px-3 ${soundEnabled ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                title={soundEnabled ? 'Son activé' : 'Son désactivé'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              {/* Desktop only buttons */}
              <Link to="/" target="_blank" className="hidden md:block">
                <Button variant="outline" size="sm" className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                  🌐 Voir le Site
                </Button>
              </Link>
              <Link to="/tv" target="_blank" className="hidden md:block">
                <Button variant="outline" size="sm" className="gap-2 bg-amber-500 text-black hover:bg-amber-600">
                  <Tv className="w-4 h-4" />
                  Mode TV
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={() => { refetch(); setLastUpdate(new Date()); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" className="px-2 sm:px-3" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Déconnexion</span>
              </Button>
            </div>
          </div>

          {/* New Order Alert Banner */}
          {showNewOrderAlert && newOrderNumber && (
            <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-3 animate-pulse">
              <Bell className="w-5 h-5" />
              <span className="font-bold text-lg">🍕 NOUVELLE COMMANDE: {newOrderNumber}</span>
              {autoPrintEnabled && (
                <span className="text-sm bg-white/20 px-2 py-0.5 rounded">🖨️ Impression en cours...</span>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = filteredOrders?.filter(o => o.status === key).length || 0;
                  const Icon = config.icon;
                  return (
                    <div key={key} className={`p-4 rounded-lg ${config.color} text-white`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-semibold">{count}</span>
                      </div>
                      <p className="text-sm opacity-90">{config.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-auto"
                />
                <Button variant="outline" onClick={exportOrders}>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = filteredOrders?.filter(o => o.status === key).length || 0;
                  const Icon = config.icon;
                  return (
                    <div key={key} className={`p-4 rounded-lg ${config.color} text-white`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-semibold">{count}</span>
                      </div>
                      <p className="text-sm opacity-90">{config.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">Chargement...</div>
                ) : filteredOrders?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune commande pour cette date
                  </div>
                ) : (
                  filteredOrders?.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusUpdate={handleStatusUpdate}
                      onPrint={printTicket}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Pizzas */}
          {activeTab === 'pizzas' && <PizzaManager />}

          {/* Sandwiches */}
          {activeTab === 'sandwiches' && <SandwichManager />}

          {/* Product Categories */}
          {activeTab === 'soufflet' && <ProductCategoryManager categorySlug="soufflets" title="Soufflé" />}
          {activeTab === 'makloub' && <ProductCategoryManager categorySlug="makloub" title="Makloub" />}
          {activeTab === 'mlawi' && <ProductCategoryManager categorySlug="mlawi" title="Mlawi" />}
          {activeTab === 'tacos' && <ProductCategoryManager categorySlug="tacos" title="Tacos" />}
          {activeTab === 'panini' && <ProductCategoryManager categorySlug="panini" title="Panini" />}
          {activeTab === 'croques' && <ProductCategoryManager categorySlug="croques" title="Croques" />}
          {activeTab === 'texmex' && <TexMexManager />}
          {activeTab === 'frites' && <ProductCategoryManager categorySlug="frites" title="Frites" />}

          {/* Desserts */}
          {activeTab === 'milkshakes' && <ProductCategoryManager categorySlug="milkshakes" title="Milkshakes" />}
          {activeTab === 'crepes' && <ProductCategoryManager categorySlug="crepes" title="Crêpes" />}
          {activeTab === 'gaufres' && <ProductCategoryManager categorySlug="gaufres" title="Gaufres" />}
          {activeTab === 'drinks' && <ImageUploadTable tableName="drinks" title="Boissons" hasImage />}
          {activeTab === 'desserts' && <ImageUploadTable tableName="desserts" title="Desserts (Autres)" hasImage />}

          {/* Zones */}
          {activeTab === 'zones' && <AdminTable tableName="delivery_zones" title="Zones de livraison" />}

          {/* Options & Extras */}
          {activeTab === 'meats' && <ImageUploadTable tableName="meat_options" title="Options viandes" hasImage />}
          {activeTab === 'sauces' && <ImageUploadTable tableName="sauce_options" title="Options sauces" hasImage />}
          {activeTab === 'garnitures' && <ImageUploadTable tableName="garniture_options" title="Options garnitures" hasImage />}
          {activeTab === 'crudites' && <CruditesManager />}
          {activeTab === 'supplements' && <ImageUploadTable tableName="supplement_options" title="Options suppléments" hasImage />}

          {/* Ventes */}
          {activeTab === 'ventes' && <VentesSection orders={orders || []} />}

          {/* Printer */}
          {activeTab === 'printer' && <PrinterConfig />}

          {/* Ticket Templates */}
          {/* Ticket Manager */}
          {activeTab === 'tickets' && <TicketManager />}

          {/* New Sections */}
          {activeTab === 'promotions' && <PromotionsManager />}
          {activeTab === 'carousel' && <CarouselManager />}
          {activeTab === 'loyalty' && <SimpleLoyaltyManager />}
          {activeTab === 'reviews' && <ReviewsManager />}
          {activeTab === 'hours' && <OpeningHoursManager />}
          {activeTab === 'store-status' && <StoreStatusManager />}
          {activeTab === 'stats' && <StatisticsSection orders={orders || []} />}

          {/* Payments */}
          {activeTab === 'payments' && <PaymentSettingsManager />}

          {/* Site Content */}
          {activeTab === 'content' && <SiteContentManager />}

          {/* Category Images */}
          {activeTab === 'category-images' && <CategoryImagesManager />}

          {/* Price Manager */}
          {activeTab === 'prices' && <PriceManager />}

          {/* HACCP Module */}
          {activeTab === 'haccp' && <HACCPManager />}

          {/* Settings */}
          {activeTab === 'settings' && <SettingsManager />}
        </main>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatusUpdate,
  onPrint
}: {
  order: Order;
  onStatusUpdate: (id: string, status: Order['status']) => void;
  onPrint: (order: Order) => void;
}) {
  const config = statusConfig[order.status];
  const Icon = config.icon;

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className={`${config.color} text-white px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold">{order.order_number}</span>
          <Badge variant="secondary" className="bg-white/20">
            {order.order_type.toUpperCase()}
          </Badge>
          {/* Payment method badge */}
          {order.payment_method === 'en_ligne' ? (
            <Badge className="bg-green-600 text-white">PAYÉ STRIPE ✓</Badge>
          ) : order.payment_method === 'cb' ? (
            <Badge className="bg-blue-600 text-white">CB</Badge>
          ) : (
            <Badge className="bg-amber-600 text-white">ESPÈCES</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{order.customer_phone}</span>
          </div>
          {order.customer_address && (
            <div className="col-span-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{order.customer_address}</span>
            </div>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-3">
          {Array.isArray(order.items) && order.items.map((cartItem: any, idx: number) => {
            const productName = cartItem.item?.name || cartItem.name || 'Produit';
            const price = cartItem.calculatedPrice || cartItem.item?.price || cartItem.price || 0;
            const customization = cartItem.customization;
            const note = cartItem.note || customization?.note;

            return (
              <div key={idx} className="border-b border-border/50 pb-2 last:border-0">
                <div className="flex justify-between font-medium">
                  <span>{cartItem.quantity}x {productName}</span>
                  <span>{Number(price).toFixed(2)}€</span>
                </div>
                {/* Show pizza SIZE prominently (MEGA in bold) - ONLY FOR PIZZAS */}
                {(() => {
                  const category = (cartItem.item?.category || cartItem.category || '').toLowerCase();
                  const isPizza = category.includes('pizza');
                  return isPizza && customization?.size ? (
                    <p className={`text-xs ml-4 font-bold ${customization.size.toUpperCase() === 'MEGA' ? 'text-red-600' : 'text-blue-600'}`}>
                      🍕 {customization.size.toUpperCase()}
                    </p>
                  ) : null;
                })()}
                {customization?.meats?.length > 0 && (
                  <p className="text-xs text-red-600 ml-4">🥩 {customization.meats.join(', ')}</p>
                )}
                {customization?.meat && (
                  <p className="text-xs text-red-600 ml-4">🥩 {customization.meat}</p>
                )}
                {customization?.sauces?.length > 0 && (
                  <p className="text-xs text-orange-600 ml-4">🥫 {customization.sauces.join(', ')}</p>
                )}
                {customization?.garnitures?.length > 0 && (
                  <p className="text-xs text-green-600 ml-4">🥬 {customization.garnitures.join(', ')}</p>
                )}
                {customization?.supplements?.length > 0 && (
                  <p className="text-xs text-yellow-600 ml-4">➕ {customization.supplements.join(', ')}</p>
                )}
                {customization?.cheeseSupplements?.length > 0 && (
                  <p className="text-xs text-yellow-600 ml-4">🧀 {customization.cheeseSupplements.join(', ')}</p>
                )}
                {customization?.menuOption && customization.menuOption !== 'none' && (
                  <p className="text-xs text-purple-600 ml-4">🍟 {customization.menuOption}</p>
                )}
                {note && (
                  <p className="text-xs text-amber-600 ml-4 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1 mt-1">
                    <MessageSquare className="w-3 h-3" />
                    {note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {order.customer_notes && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <MessageSquare className="w-4 h-4" />
              <span>{order.customer_notes}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {order.payment_method === 'en_ligne' ? (
              <>
                <CreditCard className="w-4 h-4 text-green-500" />
                <span className="text-sm">Paiement en ligne</span>
                <Badge className="bg-green-500 text-white">PAYÉ ✓</Badge>
              </>
            ) : order.payment_method === 'cb' ? (
              <>
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Carte</span>
                <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">NON PAYÉ</Badge>
              </>
            ) : (
              <>
                <Banknote className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Espèces</span>
                <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">NON PAYÉ</Badge>
              </>
            )}
          </div>
          <span className="text-2xl font-bold text-primary">{order.total.toFixed(2)}€</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onPrint(order)}>
            <Printer className="w-4 h-4 mr-1" />
            Imprimer
          </Button>

          {order.status === 'pending' && (
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => onStatusUpdate(order.id, 'preparing')}>
              <ChefHat className="w-4 h-4 mr-1" />
              Préparer
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => onStatusUpdate(order.id, 'ready')}>
              <Package className="w-4 h-4 mr-1" />
              Prêt
            </Button>
          )}
          {order.status === 'ready' && (
            <Button size="sm" className="bg-gray-500 hover:bg-gray-600" onClick={() => onStatusUpdate(order.id, 'completed')}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Terminé
            </Button>
          )}
          {['pending', 'preparing'].includes(order.status) && (
            <Button variant="destructive" size="sm" onClick={() => onStatusUpdate(order.id, 'cancelled')}>
              <XCircle className="w-4 h-4 mr-1" />
              Annuler
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTable({ tableName, title }: { tableName: string; title: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<any>({});

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const fetchItems = async () => {
    setLoading(true);
    const orderColumn = tableName === 'delivery_zones' ? 'min_order' : 'display_order';
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .order(orderColumn, { ascending: true });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string, updates: any) => {
    const { error } = await supabase
      .from(tableName as any)
      .update(updates)
      .eq('id', id);

    if (!error) {
      toast.success('Mis à jour!');
      fetchItems();
      setEditingId(null);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet élément?')) return;

    const { error } = await supabase
      .from(tableName as any)
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      toast.success('Supprimé!');
      fetchItems();
    }
  };

  const handleAdd = async () => {
    const { error } = await supabase
      .from(tableName as any)
      .insert({ ...newItem, is_active: true });

    if (!error) {
      toast.success('Ajouté!');
      fetchItems();
      setNewItem({});
    } else {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold">{title}</h2>

      {/* Help box for delivery zones */}
      {tableName === 'delivery_zones' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-amber-700 mb-2">📍 Comment trouver les coordonnées ?</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Allez sur <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">Google Maps</a></li>
            <li>Faites un clic droit sur le centre de la zone</li>
            <li>Cliquez sur les coordonnées pour les copier (ex: 49.3569, 1.0024)</li>
            <li>La première valeur = Latitude, la deuxième = Longitude</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            💡 <strong>Type de zone:</strong> "main" = cercle orange (1.5km), "near" = cercle jaune (1.2km), autre = cercle jaune clair (1km)
          </p>
        </div>
      )}

      <div className="bg-card rounded-lg p-4 border">
        <h3 className="font-semibold mb-3">Ajouter</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            placeholder="Nom"
            value={newItem.name || ''}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-40"
          />
          {tableName !== 'delivery_zones' && (
            <Input
              type="number"
              step="0.01"
              placeholder="Prix"
              value={newItem.price || ''}
              onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
              className="w-24"
            />
          )}
          {tableName === 'delivery_zones' && (
            <>
              <Input
                type="number"
                placeholder="Rayon (m)"
                value={newItem.radius || 800}
                onChange={(e) => setNewItem({ ...newItem, radius: parseInt(e.target.value) })}
                className="w-24"
              />
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={newItem.color || '#f59e0b'}
                  onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-input"
                />
              </div>
              <Input
                type="number"
                placeholder="Min. commande"
                value={newItem.min_order || ''}
                onChange={(e) => setNewItem({ ...newItem, min_order: parseFloat(e.target.value) })}
                className="w-24"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Frais"
                value={newItem.delivery_fee || ''}
                onChange={(e) => setNewItem({ ...newItem, delivery_fee: parseFloat(e.target.value) })}
                className="w-20"
              />
              <Input
                placeholder="Délai"
                value={newItem.estimated_time || ''}
                onChange={(e) => setNewItem({ ...newItem, estimated_time: e.target.value })}
                className="w-24"
              />
              <Input
                type="number"
                step="0.0001"
                placeholder="Latitude"
                value={newItem.latitude || ''}
                onChange={(e) => setNewItem({ ...newItem, latitude: parseFloat(e.target.value) })}
                className="w-28"
              />
              <Input
                type="number"
                step="0.0001"
                placeholder="Longitude"
                value={newItem.longitude || ''}
                onChange={(e) => setNewItem({ ...newItem, longitude: parseFloat(e.target.value) })}
                className="w-28"
              />
            </>
          )}
          <Button onClick={handleAdd} disabled={!newItem.name}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Nom</th>
              {tableName !== 'delivery_zones' && <th className="text-left p-3">Prix</th>}
              {tableName === 'delivery_zones' && (
                <>
                  <th className="text-left p-3">Couleur</th>
                  <th className="text-left p-3">Rayon</th>
                  <th className="text-left p-3">Min.</th>
                  <th className="text-left p-3">Frais</th>
                  <th className="text-left p-3">Lat</th>
                  <th className="text-left p-3">Lng</th>
                </>
              )}
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(i => i.is_active !== false).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">
                  {editingId === item.id ? (
                    <Input
                      value={item.name}
                      onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                      className="w-full"
                    />
                  ) : (
                    item.name
                  )}
                </td>
                {tableName !== 'delivery_zones' && (
                  <td className="p-3">
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, price: parseFloat(e.target.value) } : i))}
                        className="w-24"
                      />
                    ) : (
                      `${item.price}€`
                    )}
                  </td>
                )}
                {tableName === 'delivery_zones' && (
                  <>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <input
                          type="color"
                          value={item.color || '#f59e0b'}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, color: e.target.value } : i))}
                          className="w-8 h-8 rounded cursor-pointer border border-input"
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: item.color || '#f59e0b' }}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={item.radius || 800}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, radius: parseInt(e.target.value) } : i))}
                          className="w-20"
                        />
                      ) : (
                        `${item.radius || 800}m`
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          value={item.min_order}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, min_order: parseFloat(e.target.value) } : i))}
                          className="w-16"
                        />
                      ) : (
                        `${item.min_order}€`
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.delivery_fee}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, delivery_fee: parseFloat(e.target.value) } : i))}
                          className="w-16"
                        />
                      ) : (
                        item.delivery_fee > 0 ? `${item.delivery_fee}€` : 'Gratuit'
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={item.latitude || ''}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, latitude: parseFloat(e.target.value) } : i))}
                          className="w-24"
                        />
                      ) : (
                        item.latitude ? item.latitude.toFixed(4) : '⚠️'
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={item.longitude || ''}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, longitude: parseFloat(e.target.value) } : i))}
                          className="w-24"
                        />
                      ) : (
                        item.longitude ? item.longitude.toFixed(4) : '⚠️'
                      )}
                    </td>
                  </>
                )}
                <td className="p-3">
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <Button size="sm" onClick={() => handleUpdate(item.id, item)}>
                        Sauvegarder
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(item.id)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Ventes Section Component
function VentesSection({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
    const matchesDate = orderDate >= startDate && orderDate <= endDate;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && order.payment_method === 'en_ligne') ||
      (paymentFilter === 'unpaid' && order.payment_method !== 'en_ligne');
    return matchesDate && matchesStatus && matchesPayment;
  });

  // Calculate stats
  const totalRevenue = filteredOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const paidOnline = filteredOrders.filter(o => o.payment_method === 'en_ligne' && o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const unpaid = filteredOrders.filter(o => o.payment_method !== 'en_ligne' && o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const cancelledTotal = filteredOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const completedCount = filteredOrders.filter(o => o.status === 'completed').length;
  const cancelledCount = filteredOrders.filter(o => o.status === 'cancelled').length;

  const exportVentes = () => {
    const csv = [
      ['N° Commande', 'Date', 'Type', 'Client', 'Téléphone', 'Total', 'Paiement', 'Statut'].join(';'),
      ...filteredOrders.map(o => [
        o.order_number,
        new Date(o.created_at).toLocaleString('fr-FR'),
        o.order_type,
        o.customer_name,
        o.customer_phone,
        o.total.toFixed(2) + '€',
        o.payment_method === 'en_ligne' ? 'En ligne (PAYÉ)' : o.payment_method === 'cb' ? 'Carte' : 'Espèces',
        statusConfig[o.status].label
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventes-${startDate}-${endDate}.csv`;
    link.click();
    toast.success('Export des ventes téléchargé!');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-600 text-sm font-medium">CA Total</p>
          <p className="text-2xl font-bold text-green-700">{totalRevenue.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">{filteredOrders.length} commandes</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-600 text-sm font-medium">Payé en ligne</p>
          <p className="text-2xl font-bold text-blue-700">{paidOnline.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">{filteredOrders.filter(o => o.payment_method === 'en_ligne').length} paiements</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-600 text-sm font-medium">À encaisser</p>
          <p className="text-2xl font-bold text-amber-700">{unpaid.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">CB/Espèces</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-600 text-sm font-medium">Annulées</p>
          <p className="text-2xl font-bold text-red-700">{cancelledTotal.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">{cancelledCount} annulations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Du:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Au:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="preparing">En préparation</option>
          <option value="ready">Prêt</option>
          <option value="completed">Terminé</option>
          <option value="cancelled">Annulé</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background"
        >
          <option value="all">Tous les paiements</option>
          <option value="paid">Payé en ligne</option>
          <option value="unpaid">Non payé (CB/Espèces)</option>
        </select>
        <Button variant="outline" onClick={exportVentes}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">N°</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Paiement</th>
                <th className="text-left p-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune vente trouvée pour cette période
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-sm">{order.order_number}</td>
                    <td className="p-3 text-sm">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      <br />
                      <span className="text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {order.order_type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold">{order.total.toFixed(2)}€</td>
                    <td className="p-3">
                      {order.payment_method === 'en_ligne' ? (
                        <Badge className="bg-green-500 text-white text-xs">PAYÉ ✓</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          {order.payment_method === 'cb' ? 'CB' : 'ESPÈCES'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`${statusConfig[order.status].color} text-white text-xs`}
                      >
                        {statusConfig[order.status].label}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Résumé de la période</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Commandes totales:</span>
            <span className="ml-2 font-medium">{filteredOrders.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Terminées:</span>
            <span className="ml-2 font-medium text-green-600">{completedCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Annulées:</span>
            <span className="ml-2 font-medium text-red-600">{cancelledCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Taux de conversion:</span>
            <span className="ml-2 font-medium">
              {filteredOrders.length > 0 ? ((completedCount / filteredOrders.length) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Printer Configuration Component
function PrinterConfig() {
  const [printerName, setPrinterName] = useState(localStorage.getItem('printerName') || '');
  const [testPrinting, setTestPrinting] = useState(false);

  // Ticket customization
  const [ticketHeader, setTicketHeader] = useState(localStorage.getItem('ticketHeader') || 'TWIN PIZZA');
  const [ticketSubheader, setTicketSubheader] = useState(localStorage.getItem('ticketSubheader') || 'Grand-Couronne');
  const [ticketPhone, setTicketPhone] = useState(localStorage.getItem('ticketPhone') || '02 32 11 26 13');
  const [ticketFooter, setTicketFooter] = useState(localStorage.getItem('ticketFooter') || 'Merci de votre commande!');
  const [ticketLogo, setTicketLogo] = useState(localStorage.getItem('ticketLogo') || '🍕 TWIN PIZZA 🍕');

  // Font customization
  const [ticketFontFamily, setTicketFontFamily] = useState(localStorage.getItem('ticketFontFamily') || 'monospace');
  const [ticketFontSize, setTicketFontSize] = useState(localStorage.getItem('ticketFontSize') || '12');
  const [ticketHeaderSize, setTicketHeaderSize] = useState(localStorage.getItem('ticketHeaderSize') || '20');

  // Order number settings
  const [orderPrefix, setOrderPrefix] = useState(localStorage.getItem('orderPrefix') || 'TW');
  const [lastOrderNumber, setLastOrderNumber] = useState(localStorage.getItem('lastOrderNumber') || '0');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const savePrinterConfig = () => {
    localStorage.setItem('printerName', printerName);
    toast.success('Configuration sauvegardée!');
  };

  const saveTicketConfig = () => {
    localStorage.setItem('ticketHeader', ticketHeader);
    localStorage.setItem('ticketSubheader', ticketSubheader);
    localStorage.setItem('ticketPhone', ticketPhone);
    localStorage.setItem('ticketFooter', ticketFooter);
    localStorage.setItem('ticketLogo', ticketLogo);
    localStorage.setItem('ticketFontFamily', ticketFontFamily);
    localStorage.setItem('ticketFontSize', ticketFontSize);
    localStorage.setItem('ticketHeaderSize', ticketHeaderSize);
    toast.success('Configuration du ticket sauvegardée!');
  };

  const saveOrderConfig = () => {
    localStorage.setItem('orderPrefix', orderPrefix);
    toast.success('Préfixe de commande sauvegardé!');
  };

  const resetOrderNumber = () => {
    localStorage.setItem('lastOrderNumber', '0');
    setLastOrderNumber('0');
    setShowResetConfirm(false);
    toast.success('Numéro de commande réinitialisé à 0!');
  };

  const testPrint = () => {
    setTestPrinting(true);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      setTestPrinting(false);
      return;
    }

    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Imprimante</title>
        <style>
          body { font-family: ${ticketFontFamily}; font-size: ${ticketFontSize}px; width: 80mm; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: ${ticketHeaderSize}px; margin: 0; }
          .content { padding: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${ticketHeader}</h1>
          <p>${ticketSubheader}</p>
          ${ticketPhone ? `<p>📞 ${ticketPhone}</p>` : ''}
        </div>
        <div class="content">
          <p>✓ L'imprimante fonctionne correctement!</p>
          <p>${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px;">
          <p>${ticketFooter}</p>
          <p>${ticketLogo}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(testHTML);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();

    setTimeout(() => {
      setTestPrinting(false);
      toast.success("Test d'impression envoyé!");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold flex items-center gap-2">
        <Printer className="w-6 h-6" />
        Configuration Imprimante & Tickets
      </h2>

      {/* Ticket Customization */}
      <div className="bg-card rounded-lg p-6 border space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          🎫 Personnalisation du Ticket
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">En-tête principal</label>
            <Input
              placeholder="TWIN PIZZA"
              value={ticketHeader}
              onChange={(e) => setTicketHeader(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sous-titre</label>
            <Input
              placeholder="Grand-Couronne"
              value={ticketSubheader}
              onChange={(e) => setTicketSubheader(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Téléphone</label>
            <Input
              placeholder="02 32 11 26 13"
              value={ticketPhone}
              onChange={(e) => setTicketPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message de fin</label>
            <Input
              placeholder="Merci de votre commande!"
              value={ticketFooter}
              onChange={(e) => setTicketFooter(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Logo / Signature (avec émojis)</label>
            <Input
              placeholder="🍕 TWIN PIZZA 🍕"
              value={ticketLogo}
              onChange={(e) => setTicketLogo(e.target.value)}
            />
          </div>
        </div>

        {/* Font Customization */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">🔤 Police et Taille</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Police</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={ticketFontFamily}
                onChange={(e) => setTicketFontFamily(e.target.value)}
              >
                <option value="monospace">Monospace (par défaut)</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Lucida Console', monospace">Lucida Console</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Taille texte (px)</label>
              <Input
                type="number"
                min="8"
                max="24"
                value={ticketFontSize}
                onChange={(e) => setTicketFontSize(e.target.value)}
                placeholder="12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Taille en-tête (px)</label>
              <Input
                type="number"
                min="14"
                max="36"
                value={ticketHeaderSize}
                onChange={(e) => setTicketHeaderSize(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
        </div>

        <Button onClick={saveTicketConfig}>
          Sauvegarder le ticket
        </Button>
      </div>

      {/* Order Number Settings */}
      <div className="bg-card rounded-lg p-6 border space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          🔢 Numéro de Commande
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Préfixe</label>
            <Input
              placeholder="TW"
              value={orderPrefix}
              onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ex: TW → TW20251212-0001
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Dernier numéro utilisé</label>
            <div className="flex items-center gap-2">
              <Input
                value={lastOrderNumber}
                disabled
                className="bg-muted"
              />
              <Badge variant="secondary">Aujourd'hui</Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={saveOrderConfig}>
            Sauvegarder préfixe
          </Button>
          {showResetConfirm ? (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-destructive">Confirmer?</span>
              <Button variant="destructive" size="sm" onClick={resetOrderNumber}>
                Oui, réinitialiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
              Réinitialiser le compteur
            </Button>
          )}
        </div>
      </div>

      {/* Printer Setup */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <h3 className="font-semibold text-amber-700 mb-2">📋 Instructions de configuration</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Connectez votre imprimante thermique au PC via câble USB</li>
          <li>Installez le pilote de l'imprimante sur votre PC</li>
          <li>Assurez-vous que l'imprimante est définie comme imprimante par défaut</li>
          <li>Connectez le PC à l'écran TV via HDMI</li>
          <li>Ouvrez le Dashboard TV sur le navigateur du PC (<code className="bg-black/20 px-1 rounded">/tv</code>)</li>
          <li>Les tickets s'impriment automatiquement via le bouton "Imprimer" dans les commandes</li>
        </ol>
      </div>

      <div className="bg-card rounded-lg p-6 border space-y-4">
        <h3 className="font-semibold text-lg">🖨️ Imprimante</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Nom de l'imprimante (optionnel)</label>
          <Input
            placeholder="Ex: EPSON TM-T20III"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Pour référence uniquement. L'impression utilise l'imprimante par défaut du système.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={savePrinterConfig}>
            Sauvegarder
          </Button>
          <Button
            variant="outline"
            onClick={testPrint}
            disabled={testPrinting}
          >
            <Printer className="w-4 h-4 mr-2" />
            {testPrinting ? 'Impression...' : "Test d'impression"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg p-6 border">
        <h3 className="font-semibold mb-4">Imprimantes compatibles recommandées</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>• <strong>EPSON TM-T20III</strong> - Imprimante thermique USB 80mm</li>
          <li>• <strong>Star TSP143III</strong> - Compatible ESC/POS</li>
          <li>• <strong>Citizen CT-S310II</strong> - Thermique compacte</li>
          <li>• Toute imprimante thermique 80mm avec connexion USB</li>
        </ul>
      </div>
    </div>
  );
}
