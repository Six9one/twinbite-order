import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit2, Save, X, ExternalLink, RefreshCw, Trash2, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    customization?: any;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    total: number;
    status: string;
    created_at: string;
    items: OrderItem[];
    order_type: string;
    payment_method: string;
}

export function TicketManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // Edit states
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editTotal, setEditTotal] = useState(0);
    const [editStatus, setEditStatus] = useState('');
    const [editItems, setEditItems] = useState<OrderItem[]>([]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (searchQuery) {
                query = query.or(`customer_phone.ilike.%${searchQuery}%,order_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Erreur lors du chargement des commandes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [searchQuery]);

    const handleEditClick = (order: Order) => {
        setEditingOrder(order);
        setEditName(order.customer_name);
        setEditPhone(order.customer_phone);
        setEditTotal(order.total);
        setEditStatus(order.status);
        setEditItems(Array.isArray(order.items) ? [...order.items] : []);
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    customer_name: editName,
                    customer_phone: editPhone,
                    total: editTotal,
                    status: editStatus,
                    items: editItems as any
                })
                .eq('id', editingOrder.id);

            if (error) throw error;

            toast.success('Commande mise à jour avec succès');
            setEditingOrder(null);
            fetchOrders();
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...editItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditItems(newItems);

        // Auto recalculate total? Optional, but helpful
        // recalculateTotal(newItems);
    };

    const deleteItem = (index: number) => {
        const newItems = editItems.filter((_, i) => i !== index);
        setEditItems(newItems);
    };

    const addItem = () => {
        setEditItems([...editItems, { name: 'Nouvel Article', quantity: 1, price: 0 }]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Gestion des Tickets Clients</h2>
                    <p className="text-muted-foreground">Recherchez et modifiez les commandes visibles par les clients</p>
                </div>
                <Button onClick={fetchOrders} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par N°, Nom ou Téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Orders List */}
            <div className="grid gap-4">
                {orders.map((order) => (
                    <Card key={order.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-lg">#{order.order_number}</span>
                                <Badge variant={order.status === 'completed' ? 'secondary' : 'default'} className="uppercase">
                                    {order.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(order.created_at), "d MMM HH:mm", { locale: fr })}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">{order.customer_name}</span> • {order.customer_phone}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                {order.items?.length || 0} articles • Total: <strong>{order.total}€</strong>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href={`/tickets?phone=${order.customer_phone}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-4 w-4" /> Voir Ticket
                                </a>
                            </Button>
                            <Dialog open={editingOrder?.id === order.id} onOpenChange={(open) => !open && setEditingOrder(null)}>
                                <DialogTrigger asChild>
                                    <Button variant="default" size="sm" onClick={() => handleEditClick(order)}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Modifier
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Modifier Commande #{order.order_number}</DialogTitle>
                                    </DialogHeader>

                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Nom Client</label>
                                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Téléphone</label>
                                                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Total (€)</label>
                                                <Input type="number" step="0.01" value={editTotal} onChange={(e) => setEditTotal(parseFloat(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Statut</label>
                                                <Select value={editStatus} onValueChange={setEditStatus}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">En attente</SelectItem>
                                                        <SelectItem value="preparing">En préparation</SelectItem>
                                                        <SelectItem value="ready">Prêt</SelectItem>
                                                        <SelectItem value="completed">Terminé</SelectItem>
                                                        <SelectItem value="cancelled">Annulé</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">Articles</label>
                                                <Button size="sm" variant="ghost" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="space-y-2 border rounded-md p-2 max-h-[200px] overflow-y-auto">
                                                {editItems.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <Input
                                                            className="w-16"
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))}
                                                        />
                                                        <Input
                                                            className="flex-1"
                                                            value={item.name}
                                                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                        />
                                                        <Input
                                                            className="w-20"
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value))}
                                                        />
                                                        <Button size="icon" variant="ghost" onClick={() => deleteItem(idx)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setEditingOrder(null)}>Annuler</Button>
                                        <Button onClick={handleSaveEdit}>Enregistrer les modifications</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
