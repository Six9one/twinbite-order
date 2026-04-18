import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Star, Phone, Gift, Search, Users, TrendingUp, Edit2, Save, X,
  Trash2, CheckCircle, Plus, Minus, History, Settings, Loader2,
  RefreshCw, AlertTriangle, Award, Stamp, ArrowUpDown, Eye,
  UserPlus, Eraser, Crown, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// STAMP CENTER — Dedicated Fidelity Admin Page
// Full stamp management: view, fix, add, remove,
// offer, history, bulk actions, settings
// ============================================

const STAMPS_FOR_FREE = 10;

interface LoyaltyCustomer {
  id: string;
  phone: string;
  name: string;
  points: number; // synced with total_stamps
  stamps: number; // current cycle stamps (0-9)
  total_stamps: number;
  free_items_available: number;
  total_spent: number;
  total_orders: number;
  first_order_done: boolean;
  created_at: string;
  updated_at: string;
}

interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  order_id: string | null;
  created_at: string;
}

type SortField = 'stamps' | 'name' | 'phone' | 'created_at' | 'total_orders';
type SortDir = 'asc' | 'desc';

export function StampCenter() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('stamps');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'has-free' | 'new'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Detail view / editing
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<LoyaltyTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit mode inside detail
  const [editMode, setEditMode] = useState(false);
  const [editStamps, setEditStamps] = useState(0);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFreeItems, setEditFreeItems] = useState(0);

  // Quick stamp add/remove dialog
  const [showStampDialog, setShowStampDialog] = useState(false);
  const [stampAction, setStampAction] = useState<'add' | 'remove'>('add');
  const [stampAmount, setStampAmount] = useState(1);
  const [stampReason, setStampReason] = useState('');

  // Create new customer
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newStamps, setNewStamps] = useState(0);

  // Confirm dangerous action
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; customer: LoyaltyCustomer | null; callback: () => void }>({ type: '', customer: null, callback: () => {} });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_customers' as any)
        .select('*')
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching loyalty customers:', error);
        toast.error('Erreur chargement clients fidélité');
      }

      if (data) {
        setCustomers((data as any[]).map((c: any) => ({
          ...c,
          stamps: c.stamps ?? (c.points % STAMPS_FOR_FREE),
          total_stamps: c.total_stamps ?? c.points,
          free_items_available: c.free_items_available ?? 0,
        })) as LoyaltyCustomer[]);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  // --- Sorting & Filtering ---
  const filteredAndSorted = useMemo(() => {
    let list = [...customers];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.phone.includes(q) ||
        c.name?.toLowerCase().includes(q)
      );
    }

    // Filter mode
    switch (filterMode) {
      case 'ready':
        list = list.filter(c => (c.total_stamps ?? c.points) >= STAMPS_FOR_FREE);
        break;
      case 'has-free':
        list = list.filter(c => (c.free_items_available ?? 0) > 0);
        break;
      case 'new':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        list = list.filter(c => new Date(c.created_at) > sevenDaysAgo);
        break;
    }

    // Sort
    list.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'stamps':
          aVal = a.total_stamps ?? a.points;
          bVal = b.total_stamps ?? b.points;
          break;
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'phone':
          aVal = a.phone;
          bVal = b.phone;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'total_orders':
          aVal = a.total_orders || 0;
          bVal = b.total_orders || 0;
          break;
      }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return list;
  }, [customers, search, filterMode, sortField, sortDir]);

  // --- Stats ---
  const stats = useMemo(() => {
    const total = customers.length;
    const totalStamps = customers.reduce((sum, c) => sum + (c.total_stamps ?? c.points ?? 0), 0);
    const readyForFree = customers.filter(c => {
      const currentCycleStamps = (c.total_stamps ?? c.points) % STAMPS_FOR_FREE;
      return currentCycleStamps >= (STAMPS_FOR_FREE - 1); // At 9+ stamps → ready
    }).length;
    const pendingFreeItems = customers.reduce((sum, c) => sum + (c.free_items_available ?? 0), 0);
    const avgStamps = total > 0 ? Math.round(totalStamps / total) : 0;

    return { total, totalStamps, readyForFree, pendingFreeItems, avgStamps };
  }, [customers]);

  // --- Customer Detail ---
  const openCustomerDetail = async (customer: LoyaltyCustomer) => {
    setSelectedCustomer(customer);
    setEditMode(false);
    setShowDetailDialog(true);
    await fetchCustomerHistory(customer.id);
  };

  const fetchCustomerHistory = async (customerId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_transactions' as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setCustomerHistory(data as unknown as LoyaltyTransaction[]);
      } else {
        setCustomerHistory([]);
      }
    } catch (e) {
      console.error('History fetch error:', e);
      setCustomerHistory([]);
    }
    setHistoryLoading(false);
  };

  const startEditMode = () => {
    if (!selectedCustomer) return;
    setEditMode(true);
    setEditStamps(selectedCustomer.total_stamps ?? selectedCustomer.points ?? 0);
    setEditName(selectedCustomer.name || '');
    setEditPhone(selectedCustomer.phone || '');
    setEditFreeItems(selectedCustomer.free_items_available ?? 0);
  };

  const saveCustomerEdit = async () => {
    if (!selectedCustomer) return;

    const newTotalStamps = editStamps;
    const newCycleStamps = newTotalStamps % STAMPS_FOR_FREE;

    const { error } = await supabase
      .from('loyalty_customers' as any)
      .update({
        name: editName,
        phone: editPhone,
        total_stamps: newTotalStamps,
        stamps: newCycleStamps,
        points: newTotalStamps, // keep synced
        free_items_available: editFreeItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedCustomer.id);

    if (error) {
      toast.error('Erreur sauvegarde: ' + error.message);
    } else {
      // Log the manual edit
      await supabase.from('loyalty_transactions' as any).insert({
        customer_id: selectedCustomer.id,
        type: 'earn',
        points: 0,
        description: `✏️ Modification manuelle admin (Tampons: ${selectedCustomer.total_stamps ?? selectedCustomer.points} → ${newTotalStamps}, Gratuits: ${selectedCustomer.free_items_available} → ${editFreeItems})`
      });

      toast.success('Client mis à jour ✓');
      setEditMode(false);
      setShowDetailDialog(false);
      await fetchData();
    }
  };

  // --- Quick Stamp Add/Remove ---
  const openStampDialog = (customer: LoyaltyCustomer, action: 'add' | 'remove') => {
    setSelectedCustomer(customer);
    setStampAction(action);
    setStampAmount(1);
    setStampReason('');
    setShowStampDialog(true);
  };

  const executeStampAction = async () => {
    if (!selectedCustomer || stampAmount <= 0) return;

    const currentTotal = selectedCustomer.total_stamps ?? selectedCustomer.points ?? 0;
    const currentFreeItems = selectedCustomer.free_items_available ?? 0;

    let newTotal: number;
    let newFreeItems = currentFreeItems;

    if (stampAction === 'add') {
      newTotal = currentTotal + stampAmount;
      // Check for new free items earned
      const prevCycles = Math.floor(currentTotal / STAMPS_FOR_FREE);
      const newCycles = Math.floor(newTotal / STAMPS_FOR_FREE);
      newFreeItems = currentFreeItems + (newCycles - prevCycles);
    } else {
      newTotal = Math.max(0, currentTotal - stampAmount);
    }

    const newCycleStamps = newTotal % STAMPS_FOR_FREE;

    const { error } = await supabase
      .from('loyalty_customers' as any)
      .update({
        total_stamps: newTotal,
        stamps: newCycleStamps,
        points: newTotal,
        free_items_available: newFreeItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedCustomer.id);

    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }

    // Log transaction
    await supabase.from('loyalty_transactions' as any).insert({
      customer_id: selectedCustomer.id,
      type: stampAction === 'add' ? 'earn' : 'redeem',
      points: stampAction === 'add' ? stampAmount : -stampAmount,
      description: stampReason || (stampAction === 'add'
        ? `+${stampAmount} tampon(s) ajouté(s) manuellement (Admin)`
        : `-${stampAmount} tampon(s) retiré(s) manuellement (Admin)`)
    });

    toast.success(
      stampAction === 'add'
        ? `+${stampAmount} tampon(s) ajouté(s) à ${selectedCustomer.name || selectedCustomer.phone}`
        : `-${stampAmount} tampon(s) retiré(s) de ${selectedCustomer.name || selectedCustomer.phone}`
    );
    setShowStampDialog(false);
    await fetchData();
  };

  // --- Offer / Redeem ---
  const offerFreeItem = (customer: LoyaltyCustomer) => {
    setConfirmAction({
      type: 'offer',
      customer,
      callback: async () => {
        const currentFreeItems = customer.free_items_available ?? 0;
        if (currentFreeItems <= 0) {
          toast.error('Aucun produit gratuit disponible');
          return;
        }

        // Reset stamps (total_stamps back from a completed cycle) and consume free item
        const { error } = await supabase
          .from('loyalty_customers' as any)
          .update({
            free_items_available: currentFreeItems - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (error) {
          toast.error('Erreur: ' + error.message);
          return;
        }

        await supabase.from('loyalty_transactions' as any).insert({
          customer_id: customer.id,
          type: 'redeem',
          points: -STAMPS_FOR_FREE,
          description: '🎁 Produit offert réclamé (Carte fidélité complète)'
        });

        toast.success(`🎁 Produit offert validé pour ${customer.name || customer.phone}!`);
        await fetchData();
      }
    });
    setShowConfirmDialog(true);
  };

  const resetStamps = (customer: LoyaltyCustomer) => {
    setConfirmAction({
      type: 'reset',
      customer,
      callback: async () => {
        const { error } = await supabase
          .from('loyalty_customers' as any)
          .update({
            total_stamps: 0,
            stamps: 0,
            points: 0,
            free_items_available: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

        if (error) {
          toast.error('Erreur: ' + error.message);
          return;
        }

        await supabase.from('loyalty_transactions' as any).insert({
          customer_id: customer.id,
          type: 'redeem',
          points: -(customer.total_stamps ?? customer.points),
          description: '🗑️ Remise à zéro complète (Admin)'
        });

        toast.success(`Tampons remis à zéro pour ${customer.name || customer.phone}`);
        await fetchData();
      }
    });
    setShowConfirmDialog(true);
  };

  const deleteCustomer = (customer: LoyaltyCustomer) => {
    setConfirmAction({
      type: 'delete',
      customer,
      callback: async () => {
        // Delete transactions first
        await supabase
          .from('loyalty_transactions' as any)
          .delete()
          .eq('customer_id', customer.id);

        const { error } = await supabase
          .from('loyalty_customers' as any)
          .delete()
          .eq('id', customer.id);

        if (error) {
          toast.error('Erreur suppression: ' + error.message);
          return;
        }

        toast.success(`Client ${customer.name || customer.phone} supprimé`);
        setShowDetailDialog(false);
        await fetchData();
      }
    });
    setShowConfirmDialog(true);
  };

  // --- Create Customer ---
  const createCustomer = async () => {
    if (!newPhone || newPhone.length < 10) {
      toast.error('Numéro de téléphone invalide');
      return;
    }

    const normalizedPhone = newPhone.replace(/\s+/g, '').replace(/^(\+33|0033)/, '0');

    // Check duplicate
    const { data: existing } = await supabase
      .from('loyalty_customers' as any)
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      toast.error('Ce numéro existe déjà !');
      return;
    }

    const totalStamps = newStamps;
    const cycleStamps = totalStamps % STAMPS_FOR_FREE;
    const freeItems = Math.floor(totalStamps / STAMPS_FOR_FREE);

    const { error } = await supabase
      .from('loyalty_customers' as any)
      .insert({
        phone: normalizedPhone,
        name: newName || 'Client',
        points: totalStamps,
        stamps: cycleStamps,
        total_stamps: totalStamps,
        free_items_available: freeItems,
        total_spent: 0,
        total_orders: 0,
        first_order_done: false,
      });

    if (error) {
      toast.error('Erreur création: ' + error.message);
      return;
    }

    toast.success(`Client ${newName || normalizedPhone} créé avec ${totalStamps} tampon(s)`);
    setShowCreateDialog(false);
    setNewPhone('');
    setNewName('');
    setNewStamps(0);
    await fetchData();
  };

  // --- Render helpers ---
  const getStampDisplay = (customer: LoyaltyCustomer) => {
    const total = customer.total_stamps ?? customer.points ?? 0;
    const cycle = total % STAMPS_FOR_FREE;
    const freeItems = customer.free_items_available ?? 0;
    return { total, cycle, freeItems };
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // ============================
  // RENDER
  // ============================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-muted-foreground font-medium">Chargement des données fidélité...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
              <Stamp className="w-7 h-7 text-white" />
            </div>
            Centre Fidélité
          </h1>
          <p className="text-muted-foreground mt-1">Gestion complète des tampons clients — 9 achats = 10ème OFFERT (valeur 10€)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 border-0">
            <UserPlus className="w-4 h-4" />
            Nouveau Client
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4 border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.total}</p>
              <p className="text-xs font-medium text-blue-100">Clients</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.totalStamps}</p>
              <p className="text-xs font-medium text-amber-100">Tampons totaux</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-none bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-xl shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.avgStamps}</p>
              <p className="text-xs font-medium text-purple-100">Moyenne / client</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-none bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.readyForFree}</p>
              <p className="text-xs font-medium text-green-100">Cartes presque pleines</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-none bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/20 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.pendingFreeItems}</p>
              <p className="text-xs font-medium text-rose-100">Cadeaux en attente</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Gift className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-1">Comment ça marche ?</p>
          <p>Chaque achat qualifiant (pizza, sandwich, soufflé, makloub, tacos, panini, salade, menu midi) = <strong>1 tampon</strong>.</p>
          <p>Au <strong>10ème tampon</strong>, le client gagne un <strong>produit GRATUIT (valeur 10€)</strong>. La carte se remet à zéro et recommence.</p>
          <p className="mt-1 text-amber-700">Vous pouvez <strong>ajouter/retirer des tampons manuellement</strong>, <strong>offrir un cadeau</strong>, ou <strong>corriger des erreurs</strong> ci-dessous.</p>
        </div>
      </div>

      {/* Search + Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par téléphone ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as typeof filterMode)}>
            <SelectTrigger className="w-[170px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              <SelectItem value="ready">🎯 Carte presque pleine</SelectItem>
              <SelectItem value="has-free">🎁 Cadeau en attente</SelectItem>
              <SelectItem value="new">🆕 Nouveaux (7j)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => { setSortField(v as SortField); }}>
            <SelectTrigger className="w-[150px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stamps">Tampons</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="phone">Téléphone</SelectItem>
              <SelectItem value="created_at">Date inscription</SelectItem>
              <SelectItem value="total_orders">Commandes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} title={sortDir === 'asc' ? 'Croissant' : 'Décroissant'}>
            {sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Badge variant="secondary">{filteredAndSorted.length}</Badge>
        client{filteredAndSorted.length !== 1 ? 's' : ''} affiché{filteredAndSorted.length !== 1 ? 's' : ''}
        {search && <span className="text-xs">(filtre: "{search}")</span>}
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredAndSorted.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowCreateDialog(true)}>
                <UserPlus className="w-4 h-4" />
                Créer le premier client
              </Button>
            )}
          </Card>
        ) : (
          filteredAndSorted.map((customer) => {
            const { total, cycle, freeItems } = getStampDisplay(customer);
            const canRedeem = freeItems > 0;
            const isAlmostFull = cycle >= 8;

            return (
              <Card
                key={customer.id}
                className={`p-4 transition-all hover:shadow-md cursor-pointer group ${canRedeem ? 'border-green-300 bg-green-50/50' : isAlmostFull ? 'border-amber-200 bg-amber-50/30' : ''}`}
                onClick={() => openCustomerDetail(customer)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="font-bold text-lg">{customer.phone}</span>
                      {customer.name && customer.name !== 'Client' && (
                        <span className="text-muted-foreground truncate">({customer.name})</span>
                      )}
                      {canRedeem && (
                        <Badge className="bg-green-500 text-white border-0 animate-pulse text-xs">
                          🎁 {freeItems} CADEAU{freeItems > 1 ? 'X' : ''}
                        </Badge>
                      )}
                      {isAlmostFull && !canRedeem && (
                        <Badge className="bg-amber-500 text-white border-0 text-xs">
                          🔥 Presque pleine !
                        </Badge>
                      )}
                    </div>

                    {/* Stamp progress bar */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 relative h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        {/* Segment markers */}
                        <div className="absolute top-0 left-0 w-full h-full flex">
                          {[...Array(STAMPS_FOR_FREE)].map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 border-r border-white/60 last:border-r-0 transition-all duration-300 ${
                                i < cycle
                                  ? cycle >= 9 ? 'bg-green-500' : 'bg-amber-500'
                                  : i === STAMPS_FOR_FREE - 1
                                    ? 'bg-amber-100'
                                    : ''
                              }`}
                            />
                          ))}
                        </div>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[10px] font-black text-black/60 z-10 tracking-wider">
                          {cycle}/{STAMPS_FOR_FREE}
                        </div>
                      </div>

                      <Badge variant="outline" className="text-xs font-mono whitespace-nowrap flex-shrink-0">
                        Total: {total}
                      </Badge>
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 px-2"
                      onClick={() => openStampDialog(customer, 'add')}
                      title="Ajouter tampons"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 px-2"
                      onClick={() => openStampDialog(customer, 'remove')}
                      title="Retirer tampons"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    {canRedeem && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md shadow-green-500/30 px-3 gap-1.5 border-0"
                        onClick={() => offerFreeItem(customer)}
                        title="Offrir le cadeau"
                      >
                        <Gift className="w-4 h-4" />
                        OFFRIR
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground px-2"
                      onClick={() => openCustomerDetail(customer)}
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Customer Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Stamp className="w-5 h-5 text-amber-500" />
              Fiche Client Fidélité
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (() => {
            const { total, cycle, freeItems } = getStampDisplay(selectedCustomer);
            return (
              <div className="space-y-6">
                {/* Customer Info */}
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  {editMode ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-amber-700">Nom</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom du client" />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-amber-700">Téléphone</Label>
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="06..." />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-amber-700">Tampons totaux</Label>
                          <Input type="number" min={0} value={editStamps} onChange={(e) => setEditStamps(parseInt(e.target.value) || 0)} />
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            = {editStamps % STAMPS_FOR_FREE}/10 sur la carte actuelle + {Math.floor(editStamps / STAMPS_FOR_FREE)} cycle(s) complet(s)
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-amber-700">Cadeaux disponibles</Label>
                          <Input type="number" min={0} value={editFreeItems} onChange={(e) => setEditFreeItems(parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                          <X className="w-4 h-4 mr-1" /> Annuler
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={saveCustomerEdit}>
                          <Save className="w-4 h-4 mr-1" /> Sauvegarder
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xl font-black">{selectedCustomer.name || 'Client'}</p>
                          <p className="text-sm text-amber-700 font-mono flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {selectedCustomer.phone}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Inscrit le {new Date(selectedCustomer.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' · '}{selectedCustomer.total_orders || 0} commande(s)
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={startEditMode} title="Modifier">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => resetStamps(selectedCustomer)} title="RAZ tampons">
                            <Eraser className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" className="opacity-60 hover:opacity-100" onClick={() => deleteCustomer(selectedCustomer)} title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Big stamp display */}
                      <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-amber-800">Carte de fidélité actuelle</span>
                          <span className="text-sm font-mono text-muted-foreground">Tampons totaux: {total}</span>
                        </div>

                        {/* Visual stamp circles */}
                        <div className="grid grid-cols-10 gap-2">
                          {[...Array(STAMPS_FOR_FREE)].map((_, i) => {
                            const isStamped = i < cycle;
                            const isLast = i === STAMPS_FOR_FREE - 1;
                            return (
                              <div
                                key={i}
                                className={`aspect-square rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${
                                  isStamped
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                    : isLast
                                      ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-400 border-dashed'
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {isStamped ? '🍕' : isLast ? <Gift className="w-3.5 h-3.5 text-green-600" /> : <span className="text-gray-300 text-xs">{i + 1}</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-center">
                          {cycle >= 9 ? (
                            <p className="text-sm font-bold text-green-600 animate-pulse">🎉 Plus qu'1 achat pour le cadeau !</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-amber-600">{cycle}</strong> / 10 tampons · Plus que <strong>{10 - cycle}</strong> pour le cadeau
                            </p>
                          )}
                        </div>

                        {freeItems > 0 && (
                          <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                            <p className="text-green-700 font-bold">
                              🎁 {freeItems} produit{freeItems > 1 ? 's' : ''} GRATUIT{freeItems > 1 ? 'S' : ''} disponible{freeItems > 1 ? 's' : ''} !
                            </p>
                            <Button
                              size="sm"
                              className="mt-2 bg-green-600 hover:bg-green-700 gap-1.5"
                              onClick={() => { setShowDetailDialog(false); offerFreeItem(selectedCustomer); }}
                            >
                              <Gift className="w-4 h-4" /> Valider le cadeau
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Quick stamp actions */}
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          onClick={() => { setShowDetailDialog(false); openStampDialog(selectedCustomer, 'add'); }}
                        >
                          <Plus className="w-4 h-4" /> Ajouter tampons
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                          onClick={() => { setShowDetailDialog(false); openStampDialog(selectedCustomer, 'remove'); }}
                        >
                          <Minus className="w-4 h-4" /> Retirer tampons
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Transaction History */}
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Historique des tampons
                  </h3>

                  {historyLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : customerHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Aucune transaction enregistrée
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {customerHistory.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {tx.type === 'earn' ? '+' : '-'}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-tight">{tx.description}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`font-bold text-sm ${tx.type === 'earn' ? 'text-green-600' : 'text-orange-600'}`}>
                            {tx.type === 'earn' ? '+' : ''}{tx.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Quick Stamp Add/Remove Dialog */}
      <Dialog open={showStampDialog} onOpenChange={setShowStampDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stampAction === 'add' ? (
                <><Plus className="w-5 h-5 text-green-500" /> Ajouter des tampons</>
              ) : (
                <><Minus className="w-5 h-5 text-red-500" /> Retirer des tampons</>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (() => {
            const { total, cycle } = getStampDisplay(selectedCustomer);
            return (
              <div className="space-y-4">
                <Card className="p-3 bg-muted/50">
                  <p className="font-bold">{selectedCustomer.name || 'Client'}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  <p className="text-sm mt-1">Tampons actuels: <strong>{cycle}/10</strong> (total: {total})</p>
                </Card>

                <div>
                  <Label className="font-medium">Nombre de tampons</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setStampAmount(Math.max(1, stampAmount - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={stampAction === 'remove' ? total : 20}
                      value={stampAmount}
                      onChange={(e) => setStampAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center font-bold text-lg"
                    />
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setStampAmount(stampAmount + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="font-medium">Raison (optionnel)</Label>
                  <Input
                    placeholder="Ex: Client a oublié sa carte, geste commercial..."
                    value={stampReason}
                    onChange={(e) => setStampReason(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {stampAction === 'add' && (() => {
                  const newTotal = total + stampAmount;
                  const prevCycles = Math.floor(total / STAMPS_FOR_FREE);
                  const newCycles = Math.floor(newTotal / STAMPS_FOR_FREE);
                  const newFreeItems = newCycles - prevCycles;
                  if (newFreeItems > 0) {
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                        <Gift className="w-4 h-4 flex-shrink-0" />
                        <span>Cet ajout complète {newFreeItems} carte(s) → <strong>{newFreeItems} cadeau(x) débloqué(s)</strong> !</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStampDialog(false)}>Annuler</Button>
            <Button
              onClick={executeStampAction}
              className={stampAction === 'add'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {stampAction === 'add' ? `+ Ajouter ${stampAmount} tampon(s)` : `- Retirer ${stampAmount} tampon(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Nouveau Client Fidélité
            </DialogTitle>
            <DialogDescription>
              Créez un client et attribuez-lui des tampons initiaux si besoin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="font-medium">Numéro de téléphone *</Label>
              <Input
                placeholder="06 12 34 56 78"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="font-medium">Nom</Label>
              <Input
                placeholder="Prénom / Nom (optionnel)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="font-medium">Tampons initiaux</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newStamps}
                onChange={(e) => setNewStamps(parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
              {newStamps > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {newStamps % STAMPS_FOR_FREE}/10 sur la carte + {Math.floor(newStamps / STAMPS_FOR_FREE)} cadeau(x)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button
              onClick={createCustomer}
              disabled={!newPhone || newPhone.length < 10}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmation
            </DialogTitle>
          </DialogHeader>

          {confirmAction.customer && (
            <div className="space-y-4">
              {confirmAction.type === 'offer' && (
                <p className="text-sm">
                  Confirmer l'échange du cadeau pour <strong>{confirmAction.customer.name || confirmAction.customer.phone}</strong> ?
                  <br />
                  <span className="text-muted-foreground">1 produit gratuit sera consommé de son compte.</span>
                </p>
              )}
              {confirmAction.type === 'reset' && (
                <p className="text-sm">
                  <strong className="text-red-600">Remettre à zéro</strong> tous les tampons et cadeaux de <strong>{confirmAction.customer.name || confirmAction.customer.phone}</strong> ?
                  <br />
                  <span className="text-muted-foreground">Cette action est irréversible.</span>
                </p>
              )}
              {confirmAction.type === 'delete' && (
                <p className="text-sm">
                  <strong className="text-red-600">Supprimer définitivement</strong> le client <strong>{confirmAction.customer.name || confirmAction.customer.phone}</strong> et tout son historique ?
                  <br />
                  <span className="text-muted-foreground">Cette action est irréversible.</span>
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Annuler</Button>
            <Button
              variant={confirmAction.type === 'offer' ? 'default' : 'destructive'}
              onClick={() => {
                confirmAction.callback();
                setShowConfirmDialog(false);
              }}
              className={confirmAction.type === 'offer' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {confirmAction.type === 'offer' ? '🎁 Offrir' : confirmAction.type === 'reset' ? '🗑️ Remettre à zéro' : '❌ Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
