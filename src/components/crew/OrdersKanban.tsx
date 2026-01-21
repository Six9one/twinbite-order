import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
    Clock,
    ChefHat,
    Package,
    CheckCircle,
    XCircle,
    Phone,
    MapPin,
    User,
    RefreshCw,
    Printer,
    Volume2,
    VolumeX,
    Loader2,
} from 'lucide-react';
import { useOrders, useUpdateOrderStatus, Order } from '@/hooks/useSupabaseData';

const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-500', textColor: 'text-yellow-500', borderColor: 'border-yellow-500/30' },
    preparing: { label: 'En préparation', color: 'bg-blue-500', textColor: 'text-blue-500', borderColor: 'border-blue-500/30' },
    ready: { label: 'Prêt', color: 'bg-green-500', textColor: 'text-green-500', borderColor: 'border-green-500/30' },
    completed: { label: 'Terminé', color: 'bg-gray-500', textColor: 'text-gray-500', borderColor: 'border-gray-500/30' },
    cancelled: { label: 'Annulé', color: 'bg-red-500', textColor: 'text-red-500', borderColor: 'border-red-500/30' },
};

const orderTypeLabels: Record<string, string> = {
    livraison: '🚗 Livraison',
    emporter: '🛍️ À emporter',
    surplace: '🍽️ Sur place',
};

export function OrdersKanban() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: orders, isLoading, refetch } = useOrders(today);
    const updateStatus = useUpdateOrderStatus();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
            setLastUpdate(new Date());
        }, 10000);
        return () => clearInterval(interval);
    }, [refetch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setLastUpdate(new Date());
        setIsRefreshing(false);
    };

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        try {
            await updateStatus.mutateAsync({ id: orderId, status: newStatus });
            toast.success(`Statut mis à jour: ${statusConfig[newStatus].label}`);
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    // Group orders by status
    const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
    const preparingOrders = orders?.filter(o => o.status === 'preparing') || [];
    const readyOrders = orders?.filter(o => o.status === 'ready') || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ChefHat className="w-6 h-6 text-orange-500" />
                        Commandes en cours
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={soundEnabled ? 'border-green-500/20 text-green-400' : 'border-gray-500/20'}
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="En attente" value={pendingOrders.length} color="yellow" />
                <StatCard label="En préparation" value={preparingOrders.length} color="blue" />
                <StatCard label="Prêt" value={readyOrders.length} color="green" />
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pending Column */}
                <KanbanColumn
                    title="En attente"
                    icon={<Clock className="w-5 h-5" />}
                    color="yellow"
                    orders={pendingOrders}
                    onStatusChange={handleStatusChange}
                    nextStatus="preparing"
                    nextStatusLabel="Commencer"
                />

                {/* Preparing Column */}
                <KanbanColumn
                    title="En préparation"
                    icon={<ChefHat className="w-5 h-5" />}
                    color="blue"
                    orders={preparingOrders}
                    onStatusChange={handleStatusChange}
                    nextStatus="ready"
                    nextStatusLabel="Prêt !"
                />

                {/* Ready Column */}
                <KanbanColumn
                    title="Prêt"
                    icon={<Package className="w-5 h-5" />}
                    color="green"
                    orders={readyOrders}
                    onStatusChange={handleStatusChange}
                    nextStatus="completed"
                    nextStatusLabel="Terminé"
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorClasses = {
        yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
        green: 'bg-green-500/10 border-green-500/20 text-green-500',
    };

    return (
        <Card className={`p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm opacity-80">{label}</p>
        </Card>
    );
}

function KanbanColumn({
    title,
    icon,
    color,
    orders,
    onStatusChange,
    nextStatus,
    nextStatusLabel,
}: {
    title: string;
    icon: React.ReactNode;
    color: string;
    orders: Order[];
    onStatusChange: (orderId: string, status: Order['status']) => void;
    nextStatus: Order['status'];
    nextStatusLabel: string;
}) {
    const colorClasses = {
        yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-500' },
        blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-500' },
        green: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-500' },
    };

    const classes = colorClasses[color as keyof typeof colorClasses];

    return (
        <div className={`rounded-xl border ${classes.border} ${classes.bg} p-4`}>
            <div className="flex items-center gap-2 mb-4">
                <div className={classes.text}>{icon}</div>
                <h3 className="font-bold">{title}</h3>
                <Badge className={`ml-auto ${classes.text} bg-white/10`}>{orders.length}</Badge>
            </div>

            <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-3">
                    {orders.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Aucune commande</p>
                    ) : (
                        orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onStatusChange={onStatusChange}
                                nextStatus={nextStatus}
                                nextStatusLabel={nextStatusLabel}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function OrderCard({
    order,
    onStatusChange,
    nextStatus,
    nextStatusLabel,
}: {
    order: Order;
    onStatusChange: (orderId: string, status: Order['status']) => void;
    nextStatus: Order['status'];
    nextStatusLabel: string;
}) {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

    return (
        <Card className="p-4 bg-[#161618] border-white/10 hover:border-orange-500/30 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-500">{order.order_number}</span>
                    <Badge variant="outline" className="text-xs">
                        {orderTypeLabels[order.order_type] || order.order_type}
                    </Badge>
                </div>
                <span className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Customer Info */}
            <div className="space-y-1 mb-3 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                    <User className="w-3 h-3" />
                    <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-3 h-3" />
                    <span>{order.customer_phone}</span>
                </div>
                {order.customer_address && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{order.customer_address}</span>
                    </div>
                )}
            </div>

            {/* Items Summary */}
            <div className="text-sm text-gray-500 mb-3">
                {itemsCount} article{itemsCount > 1 ? 's' : ''} • <span className="text-orange-500 font-bold">{order.total?.toFixed(2)}€</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    onClick={() => onStatusChange(order.id, nextStatus)}
                >
                    {nextStatusLabel}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    onClick={() => {
                        // Print functionality
                        toast.info('Impression en cours...');
                    }}
                >
                    <Printer className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
}
