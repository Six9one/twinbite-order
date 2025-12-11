import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useSupabaseData';
import { 
  LogOut, Home, Search, RefreshCw, Download, Printer, 
  Clock, CheckCircle, XCircle, ChefHat, Package,
  MapPin, Phone, User, MessageSquare, CreditCard, Banknote,
  Utensils, Droplet, Leaf, Plus, Trash2, Edit2, Tv
} from 'lucide-react';

type AdminTab = 'orders' | 'zones' | 'meats' | 'sauces' | 'garnitures' | 'supplements' | 'drinks' | 'desserts';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'En préparation', color: 'bg-blue-500', icon: ChefHat },
  ready: { label: 'Prêt', color: 'bg-green-500', icon: Package },
  completed: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: orders, isLoading, refetch } = useOrders(dateFilter);
  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
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
        navigate('/admin');
        return;
      }
      
      setIsAuthenticated(true);
    };
    checkAuth();

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        refetch();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Nouvelle commande!', { body: 'Une nouvelle commande a été reçue.' });
        }
      })
      .subscribe();

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
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

  const printTicket = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
          <p><strong>N°:</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Type:</strong> ${escapeHtml(order.order_type.toUpperCase())}</p>
          <p><strong>Client:</strong> ${escapeHtml(order.customer_name)}</p>
          <p><strong>Tél:</strong> ${escapeHtml(order.customer_phone)}</p>
          ${order.customer_address ? `<p><strong>Adresse:</strong> ${escapeHtml(order.customer_address)}</p>` : ''}
          <p><strong>Heure:</strong> ${new Date(order.created_at).toLocaleString('fr-FR')}</p>
        </div>
        <div class="items">
          ${Array.isArray(order.items) ? order.items.map((item: any) => `
            <div class="item">
              <span>${item.quantity}x ${escapeHtml(item.name)}</span>
              <span>${item.price}€</span>
            </div>
            ${item.note ? `<div class="note">📝 ${escapeHtml(item.note)}</div>` : ''}
          `).join('') : ''}
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-bold">
              <span className="text-amber-500">TWIN</span> Admin
            </h1>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Site
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tv" target="_blank">
              <Button variant="outline" size="sm" className="gap-2 bg-amber-500 text-black hover:bg-amber-600">
                <Tv className="w-4 h-4" />
                Mode TV
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="zones" className="gap-2">
              <MapPin className="w-4 h-4" />
              Zones
            </TabsTrigger>
            <TabsTrigger value="meats" className="gap-2">
              <Utensils className="w-4 h-4" />
              Viandes
            </TabsTrigger>
            <TabsTrigger value="sauces" className="gap-2">
              <Droplet className="w-4 h-4" />
              Sauces
            </TabsTrigger>
            <TabsTrigger value="garnitures" className="gap-2">
              <Leaf className="w-4 h-4" />
              Garnitures
            </TabsTrigger>
            <TabsTrigger value="supplements" className="gap-2">
              <Plus className="w-4 h-4" />
              Suppléments
            </TabsTrigger>
            <TabsTrigger value="drinks">🥤 Boissons</TabsTrigger>
            <TabsTrigger value="desserts">🍰 Desserts</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
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
          </TabsContent>

          <TabsContent value="zones">
            <AdminTable tableName="delivery_zones" title="Zones de livraison" />
          </TabsContent>
          <TabsContent value="meats">
            <AdminTable tableName="meat_options" title="Options viandes" />
          </TabsContent>
          <TabsContent value="sauces">
            <AdminTable tableName="sauce_options" title="Options sauces" />
          </TabsContent>
          <TabsContent value="garnitures">
            <AdminTable tableName="garniture_options" title="Options garnitures" />
          </TabsContent>
          <TabsContent value="supplements">
            <AdminTable tableName="supplement_options" title="Options suppléments" />
          </TabsContent>
          <TabsContent value="drinks">
            <AdminTable tableName="drinks" title="Boissons" />
          </TabsContent>
          <TabsContent value="desserts">
            <AdminTable tableName="desserts" title="Desserts" />
          </TabsContent>
        </Tabs>
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
        </div>
        <span className="text-sm">
          {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{order.customer_name}</span>
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

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
            <div key={idx}>
              <div className="flex justify-between">
                <span className="font-medium">{item.quantity}x {item.name}</span>
                <span>{item.price}€</span>
              </div>
              {item.note && (
                <p className="text-xs text-amber-600 ml-4 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {item.note}
                </p>
              )}
            </div>
          ))}
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
                placeholder="Min. commande"
                value={newItem.min_order || ''}
                onChange={(e) => setNewItem({ ...newItem, min_order: parseFloat(e.target.value) })}
                className="w-28"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Frais livraison"
                value={newItem.delivery_fee || ''}
                onChange={(e) => setNewItem({ ...newItem, delivery_fee: parseFloat(e.target.value) })}
                className="w-28"
              />
              <Input
                placeholder="Délai (ex: 20-30 min)"
                value={newItem.estimated_time || ''}
                onChange={(e) => setNewItem({ ...newItem, estimated_time: e.target.value })}
                className="w-28"
              />
              <Input
                type="number"
                step="0.000001"
                placeholder="Latitude"
                value={newItem.latitude || ''}
                onChange={(e) => setNewItem({ ...newItem, latitude: parseFloat(e.target.value) })}
                className="w-28"
              />
              <Input
                type="number"
                step="0.000001"
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

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Nom</th>
              {tableName !== 'delivery_zones' && <th className="text-left p-3">Prix</th>}
              {tableName === 'delivery_zones' && (
                <>
                  <th className="text-left p-3">Min.</th>
                  <th className="text-left p-3">Frais</th>
                  <th className="text-left p-3">Délai</th>
                  <th className="text-left p-3">Latitude</th>
                  <th className="text-left p-3">Longitude</th>
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
                        <Input
                          type="number"
                          value={item.min_order}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, min_order: parseFloat(e.target.value) } : i))}
                          className="w-20"
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
                          className="w-20"
                        />
                      ) : (
                        item.delivery_fee > 0 ? `${item.delivery_fee}€` : 'Gratuit'
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          value={item.estimated_time}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, estimated_time: e.target.value } : i))}
                          className="w-24"
                        />
                      ) : (
                        item.estimated_time
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.000001"
                          value={item.latitude || ''}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, latitude: parseFloat(e.target.value) } : i))}
                          className="w-24"
                        />
                      ) : (
                        item.latitude ? item.latitude.toFixed(4) : '-'
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          step="0.000001"
                          value={item.longitude || ''}
                          onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, longitude: parseFloat(e.target.value) } : i))}
                          className="w-24"
                        />
                      ) : (
                        item.longitude ? item.longitude.toFixed(4) : '-'
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
