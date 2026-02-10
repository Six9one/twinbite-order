import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit2, Save, X, ExternalLink, RefreshCw, Trash2, Plus, User, Phone, Ticket, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    // Edit states
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editTotal, setEditTotal] = useState(0);
    const [editStatus, setEditStatus] = useState('');
    const [editItems, setEditItems] = useState<OrderItem[]>([]);
    const [printing, setPrinting] = useState(false);

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
            setOrders((data as any) || []);
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
                    status: editStatus as any,
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
    };

    const deleteItem = (index: number) => {
        const newItems = editItems.filter((_, i) => i !== index);
        setEditItems(newItems);
    };

    const addItem = () => {
        setEditItems([...editItems, { name: 'Nouvel Article', quantity: 1, price: 0 }]);
    };

    const handleDirectPrint = async (order: Order) => {
        setPrinting(true);
        try {
            const response = await fetch(`http://localhost:3001/reprint/${order.order_number}`, {
                method: 'POST',
            });
            const result = await response.json();
            if (result.success) {
                toast.success(`Ticket #${order.order_number} envoyé à l'imprimante !`);
            } else {
                toast.error(result.error || 'Erreur lors de l\'impression');
            }
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Impossible de contacter le serveur d\'impression. Vérifiez qu\'il est en marche.');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Gestion des Tickets Clients</h2>
                    <p className="text-muted-foreground">Visualisez et modifiez tous les tickets sans quitter l'interface</p>
                </div>
                <Button onClick={fetchOrders} variant="outline" size="sm">
                    <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Actualiser
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="N° Commande, Nom ou Téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Orders List */}
            <div className="grid gap-3">
                {orders.length === 0 && !loading ? (
                    <div className="p-12 text-center border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">Aucune commande trouvée</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                            <div className="flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold text-sm">#{order.order_number}</span>
                                    <Badge variant={order.status === 'completed' ? 'secondary' : 'default'} className="uppercase text-[10px]">
                                        {order.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(order.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-lg">
                                        <User className="w-4 h-4 text-primary" />
                                        {order.customer_name || "Client Anonyme"}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Phone className="w-3.5 h-3.5" />
                                        {order.customer_phone}
                                    </div>
                                </div>
                                <div className="text-sm mt-1 flex items-center gap-3">
                                    <span className="text-primary font-bold">{order.total.toFixed(2)}€</span>
                                    <span className="text-muted-foreground">• {order.items?.length || 0} articles</span>
                                    <span className="text-muted-foreground capitalize">• {order.order_type}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 md:flex-none gap-2"
                                    onClick={() => setViewingOrder(order)}
                                >
                                    <Ticket className="h-4 w-4" /> Voir Ticket
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="flex-1 md:flex-none gap-2 bg-amber-500 hover:bg-amber-600 text-black border-none"
                                    onClick={() => handleEditClick(order)}
                                >
                                    <Edit2 className="h-4 w-4" /> Modifier
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* View Ticket Dialog */}
            <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="flex items-center justify-between">
                            Détail du Ticket #{viewingOrder?.order_number}
                            <Badge className="bg-amber-500">{viewingOrder?.status}</Badge>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4 bg-muted/30">
                        {viewingOrder && (
                            <div className="bg-white border shadow-sm rounded-lg p-6 font-mono text-sm space-y-4">
                                <div className="text-center border-b pb-4">
                                    <h3 className="font-bold text-xl">TWIN PIZZA</h3>
                                    <p className="text-xs">Grand-Couronne</p>
                                    <p className="text-xs">{format(new Date(viewingOrder.created_at), "dd/MM/yyyy HH:mm")}</p>
                                </div>

                                <div className="space-y-1 pb-4 border-b">
                                    <p><strong>Client:</strong> {viewingOrder.customer_name}</p>
                                    <p><strong>Tél:</strong> {viewingOrder.customer_phone}</p>
                                    <p><strong>Type:</strong> {viewingOrder.order_type.toUpperCase()}</p>
                                    <p><strong>Paiement:</strong> {viewingOrder.payment_method.toUpperCase()}</p>
                                </div>

                                <div className="space-y-3 pb-4 border-b">
                                    <p className="font-bold underline">Articles:</p>
                                    {viewingOrder.items.map((item: any, idx) => {
                                        // Extract name from various possible structures
                                        const itemName = item.item?.name || item.name || 'Article';
                                        // Extract price from various possible structures
                                        const unitPrice = item.item?.price || item.calculatedPrice || item.totalPrice || item.price || 0;
                                        const quantity = item.quantity || 1;
                                        const lineTotal = typeof item.totalPrice === 'number' ? item.totalPrice : (unitPrice * quantity);
                                        const customization = item.customization;

                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between font-bold">
                                                    <span>{quantity}x {itemName}</span>
                                                    <span>{lineTotal.toFixed(2)}€</span>
                                                </div>
                                                {customization && (
                                                    <div className="text-[10px] text-muted-foreground ml-4 space-y-0.5">
                                                        {customization.size && <div>Taille: {customization.size}</div>}
                                                        {customization.meat && <div>Viande: {customization.meat}</div>}
                                                        {customization.meats?.length > 0 && <div>Viandes: {customization.meats.join(', ')}</div>}
                                                        {customization.sauces?.length > 0 && <div>Sauces: {customization.sauces.join(', ')}</div>}
                                                        {customization.garnitures?.length > 0 && <div>Garnitures: {customization.garnitures.join(', ')}</div>}
                                                        {customization.supplements?.length > 0 && <div>Suppléments: {customization.supplements.join(', ')}</div>}
                                                        {customization.menuOption && customization.menuOption !== 'none' && (
                                                            <div className="text-green-600 font-bold">🍟 {customization.menuOption.toUpperCase()}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-1 text-right">
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                        <span>TOTAL:</span>
                                        <span>{viewingOrder.total.toFixed(2)}€</span>
                                    </div>
                                </div>

                                <div className="text-center pt-4 border-t text-xs italic">
                                    Merci de votre confiance!
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-muted/30 flex justify-end">
                        <Button
                            className="gap-2 bg-amber-500 hover:bg-amber-600 text-black border-none font-bold"
                            onClick={() => viewingOrder && handleDirectPrint(viewingOrder)}
                            disabled={printing}
                        >
                            {printing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="h-4 w-4" />
                            )}
                            {printing ? 'Impression...' : 'Imprimer le Ticket'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Modifier Commande #{editingOrder?.order_number}</DialogTitle>
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

                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <label className="font-bold">Modifier les Articles</label>
                                <Button size="sm" variant="outline" className="gap-1" onClick={addItem}>
                                    <Plus className="h-4 w-4" /> Ajouter un article
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {editItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-start bg-muted/20 p-2 rounded-lg border">
                                        <div className="w-16">
                                            <label className="text-[10px] text-muted-foreground uppercase">Qté</label>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground uppercase">Nom</label>
                                            <Input
                                                value={item.name}
                                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] text-muted-foreground uppercase">Prix Unitaire</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={item.price}
                                                onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="mt-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => deleteItem(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 mt-4">
                        <Button variant="outline" onClick={() => setEditingOrder(null)}>Annuler</Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-black border-none"
                            onClick={handleSaveEdit}
                        >
                            Enregistrer les modifications
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
