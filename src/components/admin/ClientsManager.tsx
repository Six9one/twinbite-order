import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Users,
  Phone,
  Search,
  Download,
  ShoppingBag,
  Clock,
  MapPin,
  TrendingUp,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Sparkles,
  Crown,
  CheckCircle2,
  Calendar,
  Utensils,
  RefreshCw,
  PhoneCall,
  Euro,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderItemDetail {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  details?: string;
}

export interface ClientOrder {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  order_type: string;
  payment_method: string;
  address?: string | null;
  items: OrderItemDetail[];
}

export interface ClientRecord {
  phone: string;
  name: string;
  hasRealName: boolean;
  sources: string[];
  orderCount: number;
  callCount: number;
  firstSeen: string;
  lastSeen: string;
  addresses: string[];
  totalSpent: number;
  isMobile: boolean;
  favoriteItems: { name: string; count: number }[];
  orders: ClientOrder[];
}

function cleanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let str = String(raw).trim().replace(/[\s.\-_/()]/g, '');
  if (str.startsWith('+33')) str = '0' + str.slice(3);
  if (str.startsWith('0033')) str = '0' + str.slice(4);
  if (str.startsWith('33') && str.length === 11) str = '0' + str.slice(2);
  if (/^0[1-9]\d{8}$/.test(str)) {
    if (str === '0232112613') return null; // Numéro du restaurant
    return str;
  }
  return null;
}

function formatPhoneDisplay(phone: string): string {
  if (!phone || phone.length !== 10) return phone || '—';
  return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

function formatItemSummary(rawItem: any): OrderItemDetail | null {
  if (!rawItem) return null;
  const name = rawItem.item?.name || rawItem.name || 'Article';
  const quantity = rawItem.quantity || 1;
  const price = rawItem.calculatedPrice || rawItem.price || (rawItem.item?.price ? rawItem.item.price * quantity : 0);

  const details: string[] = [];
  const cust = rawItem.customization || {};
  if (cust.sizeLabel || cust.size) details.push(`Taille: ${cust.sizeLabel || cust.size}`);
  if (cust.base) details.push(`Base: ${cust.base}`);
  if (Array.isArray(cust.meats) && cust.meats.length > 0) details.push(`Viandes: ${cust.meats.join(', ')}`);
  if (Array.isArray(cust.sauces) && cust.sauces.length > 0) details.push(`Sauces: ${cust.sauces.join(', ')}`);
  if (Array.isArray(cust.garnitures) && cust.garnitures.length > 0) details.push(`Garnitures: ${cust.garnitures.join(', ')}`);
  if (Array.isArray(cust.supplements) && cust.supplements.length > 0) {
    details.push(`Suppléments: ${cust.supplements.map((s: any) => s.name || s).join(', ')}`);
  }
  if (Array.isArray(cust.removedIngredients) && cust.removedIngredients.length > 0) {
    details.push(`Sans: ${cust.removedIngredients.join(', ')}`);
  }
  if (cust.note) details.push(`Note: ${cust.note}`);
  if (rawItem.notes) details.push(`Note: ${rawItem.notes}`);

  return {
    name,
    quantity,
    price: typeof price === 'number' ? Math.round(price * 100) / 100 : parseFloat(price) || 0,
    category: rawItem.item?.category || rawItem.category || '',
    details: details.join(' | ')
  };
}

export function ClientsManager() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'orders' | 'calls' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'spent-desc' | 'orders-desc' | 'recent' | 'name-asc'>('spent-desc');
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Load clients data
  const loadData = useCallback(async () => {
    try {
      // 1. Load compiled master database
      const res = await fetch('/clients_master.json?t=' + Date.now());
      let masterData: ClientRecord[] = [];
      if (res.ok) {
        masterData = await res.json();
      }

      // 2. Fetch live recent orders from Supabase (last 30 days) to ensure real-time accuracy
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: liveOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, customer_address, total, items, status, order_type, payment_method, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (liveOrders && liveOrders.length > 0) {
        const clientMap = new Map<string, ClientRecord>();
        masterData.forEach(c => clientMap.set(c.phone, { ...c }));

        liveOrders.forEach(o => {
          const p = cleanPhone(o.customer_phone);
          if (!p) return;

          const orderItems = Array.isArray(o.items) ? o.items.map(formatItemSummary).filter(Boolean) as OrderItemDetail[] : [];
          const formattedOrder: ClientOrder = {
            id: o.id,
            order_number: o.order_number,
            created_at: o.created_at,
            total: parseFloat(o.total as any) || 0,
            status: o.status,
            order_type: o.order_type || 'a_emporter',
            payment_method: o.payment_method || 'especes',
            items: orderItems,
            address: o.customer_address || null
          };

          if (!clientMap.has(p)) {
            clientMap.set(p, {
              phone: p,
              name: o.customer_name || 'Client ' + p.slice(-4),
              hasRealName: Boolean(o.customer_name && !o.customer_name.toLowerCase().includes('[pos]')),
              sources: ['Commande En Ligne / POS'],
              orderCount: 1,
              callCount: 0,
              firstSeen: o.created_at,
              lastSeen: o.created_at,
              addresses: o.customer_address ? [o.customer_address] : [],
              totalSpent: formattedOrder.total,
              isMobile: /^0[67]/.test(p),
              favoriteItems: [],
              orders: [formattedOrder]
            });
          } else {
            const rec = clientMap.get(p)!;
            const existingOrderIndex = rec.orders.findIndex(ord => ord.id === o.id || ord.order_number === o.order_number);
            if (existingOrderIndex === -1) {
              rec.orders.unshift(formattedOrder);
              rec.orderCount = rec.orders.length;
              rec.totalSpent = Math.round((rec.totalSpent + formattedOrder.total) * 100) / 100;
              if (new Date(o.created_at) > new Date(rec.lastSeen)) {
                rec.lastSeen = o.created_at;
              }
              if (o.customer_address && !rec.addresses.includes(o.customer_address)) {
                rec.addresses.push(o.customer_address);
              }
            }
          }
        });

        masterData = Array.from(clientMap.values());
      }

      setClients(masterData);
    } catch (err) {
      console.error('Erreur chargement base clients:', err);
      toast.error('Erreur de chargement de la base clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime for instant updates on new orders
    const channel = supabase
      .channel('clients-realtime-' + Date.now())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Overall Statistics KPIs
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalOrders = 0;
    let vipCount = 0;
    let withOrdersCount = 0;

    clients.forEach(c => {
      totalRevenue += c.totalSpent || 0;
      totalOrders += c.orderCount || 0;
      if ((c.totalSpent || 0) >= 50 || (c.orderCount || 0) >= 3) {
        vipCount++;
      }
      if ((c.orderCount || 0) > 0) {
        withOrdersCount++;
      }
    });

    const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalClients: clients.length,
      totalRevenue,
      totalOrders,
      avgBasket,
      vipCount,
      withOrdersCount
    };
  }, [clients]);

  // Filter and Sort clients
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[\s.\-_]/g, '');

    return clients
      .filter(c => {
        // Search filter
        if (q) {
          const matchPhone = c.phone.includes(cleanQ);
          const matchName = (c.name || '').toLowerCase().includes(q);
          const matchAddress = c.addresses.some(a => a.toLowerCase().includes(q));
          // Search inside client's past panier items!
          const matchOrderedItem = c.orders.some(ord =>
            ord.items.some(it => it.name.toLowerCase().includes(q) || (it.details && it.details.toLowerCase().includes(q)))
          );

          if (!matchPhone && !matchName && !matchAddress && !matchOrderedItem) {
            return false;
          }
        }

        // Category filter
        if (filterType === 'vip') {
          return (c.totalSpent >= 50 || c.orderCount >= 3);
        }
        if (filterType === 'orders') {
          return c.orderCount > 0;
        }
        if (filterType === 'calls') {
          return c.callCount > 0 && c.orderCount === 0;
        }
        if (filterType === 'delivery') {
          return c.addresses.length > 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spent-desc') return b.totalSpent - a.totalSpent;
        if (sortBy === 'orders-desc') return b.orderCount - a.orderCount;
        if (sortBy === 'recent') {
          const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return dateB - dateA;
        }
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [clients, search, filterType, sortBy]);

  // Paginated clients
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, sortBy]);

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Téléphone', 'Nom', 'Total Dépensé (€)', 'Nombre de Commandes', 'Nombre d\'Appels', 'Dernière Activité', 'Adresses', 'Top Produits'];
      const rows = filteredClients.map(c => [
        `"${c.phone}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        (c.totalSpent || 0).toFixed(2),
        c.orderCount || 0,
        c.callCount || 0,
        `"${c.lastSeen || ''}"`,
        `"${(c.addresses || []).join(' | ').replace(/"/g, '""')}"`,
        `"${(c.favoriteItems || []).map(f => `${f.name} (x${f.count})`).join(', ').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `base_clients_twinpizza_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${filteredClients.length} clients exportés en CSV`);
    } catch (e) {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  // Copy mobile numbers
  const handleCopyNumbers = () => {
    const mobiles = filteredClients
      .filter(c => c.isMobile)
      .map(c => c.phone);

    if (mobiles.length === 0) {
      toast.error('Aucun numéro de mobile dans cette liste');
      return;
    }

    navigator.clipboard.writeText(mobiles.join(', '));
    toast.success(`${mobiles.length} numéros mobiles copiés dans le presse-papiers`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Base de Données Clients
            </h2>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-2 py-0.5">
              {clients.length} Clients Enregistrés
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Consultez tous vos clients, leurs numéros, coordonnées, dépenses et <span className="font-semibold text-foreground">l'historique complet de leurs paniers & commandes passées</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="border-border hover:bg-muted font-bold text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyNumbers}
            className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copier Numéros ({filteredClients.filter(c => c.isMobile).length})
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm bg-card hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Total Clients</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.totalClients}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {stats.withOrdersCount} avec commandes ({Math.round((stats.withOrdersCount / (stats.totalClients || 1)) * 100)}%)
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Chiffre d'Affaires Clients</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.totalRevenue.toFixed(2)} €</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Sur {stats.totalOrders} commandes enregistrées
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Euro className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Panier Moyen</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.avgBasket.toFixed(2)} €</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Par commande client
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">Clients VIP / Fidèles</p>
              <h3 className="text-2xl font-black text-amber-500 mt-0.5">{stats.vipCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Dépenses &gt; 50€ ou ≥ 3 commandes
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Crown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par Nom, Téléphone, Adresse, ou Produit dans le panier (ex: Raclette, Wings)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 bg-background font-medium text-sm h-11"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort selection */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="h-11 px-3 py-2 rounded-md border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="spent-desc">💰 Plus grosses dépenses (€)</option>
                <option value="orders-desc">🛒 Plus de commandes</option>
                <option value="recent">⏱️ Plus récent d'abord</option>
                <option value="name-asc">🔤 Nom (A à Z)</option>
              </select>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filtres :
            </span>

            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className={`h-8 text-xs font-bold rounded-lg ${filterType === 'all' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-muted'}`}
            >
              Tous ({clients.length})
            </Button>

            <Button
              variant={filterType === 'vip' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('vip')}
              className={`h-8 text-xs font-bold rounded-lg ${filterType === 'vip' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'}`}
            >
              👑 VIP ({stats.vipCount})
            </Button>

            <Button
              variant={filterType === 'orders' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('orders')}
              className={`h-8 text-xs font-bold rounded-lg ${filterType === 'orders' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-muted'}`}
            >
              🛒 Avec Commandes ({stats.withOrdersCount})
            </Button>

            <Button
              variant={filterType === 'delivery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('delivery')}
              className={`h-8 text-xs font-bold rounded-lg ${filterType === 'delivery' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-muted'}`}
            >
              🛵 Avec Adresse ({clients.filter(c => c.addresses.length > 0).length})
            </Button>

            <Button
              variant={filterType === 'calls' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('calls')}
              className={`h-8 text-xs font-bold rounded-lg ${filterType === 'calls' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-muted'}`}
            >
              📞 Appels Uniquement ({clients.filter(c => c.callCount > 0 && c.orderCount === 0).length})
            </Button>

            <div className="ml-auto text-xs text-muted-foreground font-semibold">
              Affichage de <span className="text-foreground font-black">{filteredClients.length}</span> clients
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            Liste des Clients & Paniers
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm font-bold text-muted-foreground">Chargement de la base clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-bold text-muted-foreground">Aucun client trouvé pour cette recherche</p>
              {search && (
                <Button variant="link" size="sm" onClick={() => setSearch('')} className="mt-1 text-amber-500">
                  Effacer la recherche
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paginatedClients.map((client) => {
                const isVip = client.totalSpent >= 50 || client.orderCount >= 3;
                const formattedPhone = formatPhoneDisplay(client.phone);
                const hasOrders = (client.orders && client.orders.length > 0);

                return (
                  <div
                    key={client.phone}
                    className="p-4 hover:bg-muted/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
                    onClick={() => setSelectedClient(client)}
                  >
                    {/* Left: Client Identity */}
                    <div className="flex items-start gap-3.5 min-w-[280px]">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-sm flex-shrink-0 relative ${
                        isVip
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-amber-500/20'
                          : 'bg-muted text-foreground border border-border/60'
                      }`}>
                        {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                        {isVip && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-black shadow">
                            👑
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-foreground group-hover:text-amber-500 transition-colors">
                            {client.name || 'Client ' + client.phone.slice(-4)}
                          </h4>
                          {isVip && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black px-1.5 py-0">
                              VIP
                            </Badge>
                          )}
                          {client.hasRealName && (
                            <span title="Nom vérifié" className="text-emerald-500 text-xs">✓</span>
                          )}
                        </div>

                        {/* Phone & Quick Actions */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                            {formattedPhone}
                          </span>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            {/* Call button */}
                            <a
                              href={`tel:${client.phone}`}
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              title="Appeler"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            {/* WhatsApp button */}
                            {client.isMobile && (
                              <a
                                href={`https://wa.me/33${client.phone.slice(1)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500"
                                title="Envoyer WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Copy number button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(client.phone);
                                toast.success(`Numéro ${client.phone} copié`);
                              }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Copier le numéro"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Addresses preview */}
                        {client.addresses && client.addresses.length > 0 && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-sm">
                            <MapPin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="truncate">{client.addresses[0]}</span>
                            {client.addresses.length > 1 && (
                              <span className="text-[10px] bg-muted px-1 rounded font-bold">+{client.addresses.length - 1}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Favorite Items / Cart preview */}
                    <div className="flex-1 min-w-[200px] max-w-md hidden md:block">
                      {client.favoriteItems && client.favoriteItems.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Habitudes & Paniers Fréquents
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {client.favoriteItems.slice(0, 3).map((fav, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-[11px] font-semibold bg-muted/80 hover:bg-muted text-foreground border border-border/40 py-0.5"
                              >
                                🍕 {fav.name} <span className="text-amber-500 font-bold ml-1">x{fav.count}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : client.callCount > 0 ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
                          <span>{client.callCount} appels reçus (Livebox / Voice AI)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">
                          Client référencé dans les contacts
                        </div>
                      )}
                    </div>

                    {/* Right: Stats & Action Button */}
                    <div className="flex items-center justify-between lg:justify-end gap-6">
                      <div className="text-right">
                        <p className="text-base font-black text-foreground">
                          {client.totalSpent > 0 ? `${client.totalSpent.toFixed(2)} €` : '—'}
                        </p>
                        <div className="flex items-center gap-2 justify-end text-[11px] text-muted-foreground font-semibold">
                          <span>{client.orderCount} cmd</span>
                          {client.callCount > 0 && <span>• {client.callCount} appels</span>}
                        </div>
                        {client.lastSeen && (
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                            Dernier: {new Date(client.lastSeen).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-black font-black text-xs group-hover:border-amber-500 transition-all gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(client);
                        }}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Voir Panier</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              Affichage {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, filteredClients.length)} sur {filteredClients.length} clients
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs font-bold"
              >
                Précédent
              </Button>

              <span className="text-xs font-black px-2">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs font-bold"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Detailed Panier & History Sheet */}
      <Sheet open={Boolean(selectedClient)} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 z-[99999]">
          {selectedClient && (
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader className="pb-4 border-b border-border/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
                      {selectedClient.name ? selectedClient.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-xl font-black text-foreground">
                          {selectedClient.name || 'Client ' + selectedClient.phone.slice(-4)}
                        </SheetTitle>
                        {(selectedClient.totalSpent >= 50 || selectedClient.orderCount >= 3) && (
                          <Badge className="bg-amber-500 text-black font-black text-xs">
                            👑 VIP
                          </Badge>
                        )}
                      </div>
                      <SheetDescription className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {formatPhoneDisplay(selectedClient.phone)}
                      </SheetDescription>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedClient.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                      title="Appeler directement"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Appeler</span>
                    </a>

                    {selectedClient.isMobile && (
                      <a
                        href={`https://wa.me/33${selectedClient.phone.slice(1)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        title="Ouvrir WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total Dépensé</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedClient.totalSpent.toFixed(2)} €
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Commandes</p>
                  <p className="text-lg font-black text-foreground mt-0.5">
                    {selectedClient.orderCount}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Panier Moyen</p>
                  <p className="text-lg font-black text-amber-500 mt-0.5">
                    {selectedClient.orderCount > 0 ? (selectedClient.totalSpent / selectedClient.orderCount).toFixed(2) : '0.00'} €
                  </p>
                </div>
              </div>

              {/* Known Addresses */}
              {selectedClient.addresses && selectedClient.addresses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Adresses de Livraison ({selectedClient.addresses.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedClient.addresses.map((addr, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs font-medium text-foreground flex items-center justify-between gap-2">
                        <span>📍 {addr}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(addr);
                            toast.success("Adresse copiée");
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Favorite Items */}
              {selectedClient.favoriteItems && selectedClient.favoriteItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Produits Préférés du Client
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedClient.favoriteItems.map((fav, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                        <span className="text-xs font-bold truncate">🍕 {fav.name}</span>
                        <Badge className="bg-amber-500 text-black font-black text-[10px] ml-2">
                          {fav.count}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {selectedClient.sources && selectedClient.sources.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Canaux & Sources
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClient.sources.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-bold bg-muted/40 border-border">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Carts and Orders History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    Paniers & Historique des Commandes ({selectedClient.orders?.length || 0})
                  </h3>
                </div>

                {!selectedClient.orders || selectedClient.orders.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-bold text-muted-foreground">
                      Aucune commande détaillée enregistrée pour ce numéro.
                    </p>
                    {selectedClient.callCount > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                        Ce client a contacté le restaurant par appel téléphonique ({selectedClient.callCount} appel(s)).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedClient.orders.map((ord) => (
                      <div
                        key={ord.id || ord.order_number}
                        className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm"
                      >
                        {/* Order Header */}
                        <div className="p-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-black text-sm text-foreground">
                              Commande #{ord.order_number}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-muted-foreground/30">
                              {ord.order_type === 'livraison' ? '🛵 Livraison' : ord.order_type === 'sur_place' ? '🍽️ Sur Place' : '🛍️ À Emporter'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                              {ord.status}
                            </Badge>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {ord.total.toFixed(2)} €
                            </span>
                          </div>
                        </div>

                        {/* Order Meta */}
                        <div className="px-3.5 py-2 bg-muted/10 border-b border-border/40 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {new Date(ord.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="font-semibold">
                            Paiement: {ord.payment_method}
                          </span>
                          {ord.address && (
                            <span className="w-full text-[10px] truncate text-foreground font-medium">
                              📍 {ord.address}
                            </span>
                          )}
                        </div>

                        {/* Order Cart Items (Panier) */}
                        <div className="p-3.5 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Contenu du Panier :
                          </p>

                          {ord.items && ord.items.length > 0 ? (
                            <div className="space-y-2">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 flex flex-col gap-1">
                                  <div className="flex items-center justify-between font-bold text-xs">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black px-1.5 py-0">
                                        {it.quantity}x
                                      </Badge>
                                      <span className="text-foreground">{it.name}</span>
                                    </div>
                                    <span className="text-muted-foreground font-mono">
                                      {it.price > 0 ? `${it.price.toFixed(2)} €` : ''}
                                    </span>
                                  </div>

                                  {/* Customizations / Options details */}
                                  {it.details && (
                                    <div className="text-[11px] text-muted-foreground pl-6 leading-relaxed font-normal">
                                      {it.details.split(' | ').map((part, pIdx) => (
                                        <span key={pIdx} className="inline-block mr-2 bg-background/60 px-1.5 py-0.5 rounded border border-border/30 mb-0.5">
                                          {part}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Détails du panier non spécifiés</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
