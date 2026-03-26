import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceModal } from './InvoiceModal';
import type { Order } from '@/hooks/useSupabaseData';
import {
    Search,
    Printer,
    FileText,
    Download,
    RefreshCw,
    Calendar,
    Clock,
    User,
    Phone,
    ChefHat,
    CheckCircle,
    XCircle,
    Package,
    Filter,
    History,
} from 'lucide-react';

const statusConfig: Record<
    string,
    { label: string; color: string; icon: any }
> = {
    pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
    preparing: { label: 'En préparation', color: 'bg-blue-500', icon: ChefHat },
    ready: { label: 'Prêt', color: 'bg-green-500', icon: Package },
    completed: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
    cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

export function OrdersHistoryManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [orderTypeFilter, setOrderTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
    const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders((data as Order[]) || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Erreur lors du chargement des commandes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [startDate, endDate]);

    // Filter orders
    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            searchQuery === '' ||
            order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer_phone.includes(searchQuery);
        const matchesStatus =
            statusFilter === 'all' || order.status === statusFilter;
        const matchesType =
            orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    // Stats
    const totalRevenue = filteredOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(
        (o) => o.status === 'completed'
    ).length;

    // Direct print to thermal printer (via window.open to bypass HTTPS mixed content)
    const handleDirectPrint = (order: Order) => {
        setPrintingOrderId(order.id);
        const url = `http://localhost:3001/reprint/${encodeURIComponent(order.order_number)}`;
        window.open(url, '_blank', 'width=400,height=300');
        toast.success(`🖨️ Commande ${order.order_number} envoyée à l'imprimante`);
        setTimeout(() => setPrintingOrderId(null), 2000);
    };

    // Export CSV
    const exportCSV = () => {
        if (filteredOrders.length === 0) {
            toast.error('Aucune commande à exporter');
            return;
        }

        const csv = [
            [
                'N° Commande',
                'Date',
                'Heure',
                'Client',
                'Téléphone',
                'Type',
                'Total',
                'Paiement',
                'Statut',
            ].join(';'),
            ...filteredOrders.map((o) =>
                [
                    o.order_number,
                    new Date(o.created_at).toLocaleDateString('fr-FR'),
                    new Date(o.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    o.customer_name,
                    o.customer_phone,
                    o.order_type,
                    o.total.toFixed(2) + '€',
                    o.payment_method === 'en_ligne'
                        ? 'En ligne (PAYÉ)'
                        : o.payment_method === 'cb'
                            ? 'Carte'
                            : 'Espèces',
                    statusConfig[o.status]?.label || o.status,
                ].join(';')
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historique-commandes-${startDate}-${endDate}.csv`;
        link.click();
        toast.success('Export téléchargé!');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                        <History className="w-6 h-6 text-amber-500" />
                        Historique des Commandes
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Consultez, imprimez et générez des factures pour toutes vos
                        commandes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        className="gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualiser
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCSV}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 border-none bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
                        Chiffre d'affaires
                    </p>
                    <p className="text-2xl font-black mt-1">
                        {totalRevenue.toFixed(2)} €
                    </p>
                    <p className="text-xs text-emerald-200 mt-1">
                        {totalOrders} commandes
                    </p>
                </Card>
                <Card className="p-4 border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">
                        Terminées
                    </p>
                    <p className="text-2xl font-black mt-1">{completedOrders}</p>
                    <p className="text-xs text-blue-200 mt-1">
                        {totalOrders > 0
                            ? ((completedOrders / totalOrders) * 100).toFixed(0)
                            : 0}
                        % du total
                    </p>
                </Card>
                <Card className="p-4 border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                    <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">
                        Panier moyen
                    </p>
                    <p className="text-2xl font-black mt-1">
                        {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}{' '}
                        €
                    </p>
                    <p className="text-xs text-amber-200 mt-1">Par commande</p>
                </Card>
            </div>

            {/* Filters  */}
            <div className="bg-card rounded-xl p-4 border space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    Filtres
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Date range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-auto"
                        />
                        <span className="text-muted-foreground text-sm">→</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-auto"
                        />
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par n°, client, téléphone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border bg-background text-sm"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="preparing">En préparation</option>
                        <option value="ready">Prêt</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                    </select>

                    {/* Type filter */}
                    <select
                        value={orderTypeFilter}
                        onChange={(e) => setOrderTypeFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border bg-background text-sm"
                    >
                        <option value="all">Tous les types</option>
                        <option value="surplace">Sur place</option>
                        <option value="emporter">À emporter</option>
                        <option value="livraison">Livraison</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/60">
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    N° Commande
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Date / Heure
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Client
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Type
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Total
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Paiement
                                </th>
                                <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Statut
                                </th>
                                <th className="text-center p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="text-center py-12 text-muted-foreground"
                                    >
                                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                                        Chargement...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="text-center py-12 text-muted-foreground"
                                    >
                                        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        Aucune commande trouvée
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const status = statusConfig[order.status] || statusConfig.pending;
                                    const isPrinting = printingOrderId === order.id;

                                    return (
                                        <tr
                                            key={order.id}
                                            className="border-t hover:bg-muted/30 transition-colors group"
                                        >
                                            {/* Order number */}
                                            <td className="p-3">
                                                <span className="font-mono font-bold text-sm">
                                                    {order.order_number}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="p-3">
                                                <div className="text-sm font-medium">
                                                    {new Date(order.created_at).toLocaleDateString(
                                                        'fr-FR'
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleTimeString(
                                                        'fr-FR',
                                                        { hour: '2-digit', minute: '2-digit' }
                                                    )}
                                                </div>
                                            </td>

                                            {/* Client */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        {order.customer_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {order.customer_phone}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="p-3">
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs font-semibold"
                                                >
                                                    {order.order_type === 'livraison'
                                                        ? '🚗 Livraison'
                                                        : order.order_type === 'emporter'
                                                            ? '🛍️ Emporter'
                                                            : '🍽️ Sur place'}
                                                </Badge>
                                            </td>

                                            {/* Total */}
                                            <td className="p-3">
                                                <span className="font-bold text-sm">
                                                    {order.total.toFixed(2)} €
                                                </span>
                                            </td>

                                            {/* Payment */}
                                            <td className="p-3">
                                                {order.payment_method === 'en_ligne' ? (
                                                    <Badge className="bg-green-500 text-white text-[10px]">
                                                        PAYÉ ✓
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="destructive"
                                                        className="text-[10px]"
                                                    >
                                                        {order.payment_method === 'cb'
                                                            ? 'CB'
                                                            : 'ESPÈCES'}
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-3">
                                                <Badge
                                                    className={`${status.color} text-white text-[10px]`}
                                                >
                                                    {status.label}
                                                </Badge>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Direct Print */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDirectPrint(order)}
                                                        disabled={isPrinting}
                                                        title="Imprimer sur imprimante thermique"
                                                        className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                                                    >
                                                        <Printer
                                                            className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`}
                                                        />
                                                    </Button>

                                                    {/* Invoice */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setInvoiceOrder(order)}
                                                        title="Générer une facture"
                                                        className="h-8 w-8 p-0 hover:bg-amber-500/10 hover:text-amber-600"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Results summary */}
                {!loading && filteredOrders.length > 0 && (
                    <div className="px-4 py-3 bg-muted/30 border-t text-xs text-muted-foreground flex items-center justify-between">
                        <span>
                            {filteredOrders.length} commande
                            {filteredOrders.length > 1 ? 's' : ''} trouvée
                            {filteredOrders.length > 1 ? 's' : ''}
                        </span>
                        <span>
                            Total:{' '}
                            <strong className="text-foreground">
                                {totalRevenue.toFixed(2)} €
                            </strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Invoice Modal */}
            {invoiceOrder && (
                <InvoiceModal
                    order={invoiceOrder}
                    onClose={() => setInvoiceOrder(null)}
                />
            )}
        </div>
    );
}
