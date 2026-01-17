import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, ChevronDown, ChevronUp, Ticket, Phone, ArrowLeft } from 'lucide-react';
import { LoyaltyStampCard } from '@/components/LoyaltyStampCard';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    total: number;
    order_type: string;
    payment_method: string;
    items: any[];
    created_at: string;
    status: string;
    loyalty_card_image_url?: string;
}

interface LoyaltyInfo {
    stamps: number;
    total_stamps: number;
    free_items_available: number;
}

export default function TicketPortal() {
    const [searchParams] = useSearchParams();
    const [phone, setPhone] = useState(searchParams.get('phone') || '');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');

    // Format phone number for display
    const formatPhoneDisplay = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
        if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhone(raw);
    };

    const searchOrders = async () => {
        if (phone.length < 10) return;

        setLoading(true);
        setSearched(true);

        try {
            // Fetch orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_phone', phone)
                .order('created_at', { ascending: false });

            let totalStampsFromOrders = 0;

            if (ordersError) {
                console.error('Error fetching orders:', ordersError);
            } else if (ordersData) {
                const mappedOrders: Order[] = ordersData.map((o: any) => ({
                    id: o.id,
                    order_number: o.order_number,
                    customer_name: o.customer_name,
                    customer_phone: o.customer_phone,
                    total: o.total,
                    order_type: o.order_type,
                    payment_method: o.payment_method,
                    items: Array.isArray(o.items) ? o.items : [],
                    created_at: o.created_at,
                    status: o.status,
                    loyalty_card_image_url: o.loyalty_card_image_url,
                }));
                setOrders(mappedOrders.slice(0, 20));
                if (mappedOrders.length > 0) {
                    setCustomerName(mappedOrders[0].customer_name || '');
                }

                // HARD FIX: Calculate stamps directly from ALL orders
                // Qualifying categories for stamps
                const qualifyingCategories = ['pizzas', 'soufflets', 'makloub', 'tacos', 'panini', 'salades', 'sandwiches', 'menus-midi'];

                for (const order of ordersData) {
                    const items = Array.isArray(order.items) ? order.items : [];
                    for (const item of items) {
                        // Handle both old format (item.item.category) and new format (item.category)
                        const category = (item.item?.category || item.category || '').toLowerCase();
                        const quantity = item.quantity || 1;

                        if (qualifyingCategories.some(cat => category.includes(cat))) {
                            totalStampsFromOrders += quantity;
                        }
                    }
                }
                console.log('[LOYALTY] Calculated stamps from orders:', totalStampsFromOrders);
            }

            // Fetch Loyalty from loyalty_customers table
            const { data: loyaltyData, error: loyaltyError } = await supabase
                .from('loyalty_customers')
                .select('points, stamps, total_stamps, free_items_available')
                .eq('phone', phone)
                .single();

            const STAMPS_FOR_FREE = 9;

            // Use the MAXIMUM between database value and calculated value from orders
            // This ensures we never show less than what's actually earned
            let stampsFromDB = 0;
            let freeItemsFromDB = 0;

            if (loyaltyData) {
                stampsFromDB = loyaltyData.points || loyaltyData.stamps || loyaltyData.total_stamps || 0;
                freeItemsFromDB = loyaltyData.free_items_available || 0;
            }

            // Use calculated stamps if database shows 0 or less than calculated
            const finalStamps = Math.max(stampsFromDB, totalStampsFromOrders);
            const freeItems = freeItemsFromDB || Math.floor(finalStamps / STAMPS_FOR_FREE);

            console.log('[LOYALTY] Final stamps:', finalStamps, '(DB:', stampsFromDB, ', Calculated:', totalStampsFromOrders, ')');

            setLoyaltyInfo({
                stamps: finalStamps,
                total_stamps: finalStamps,
                free_items_available: freeItems
            });

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Real-time subscription for loyalty points
    useEffect(() => {
        if (!searched || phone.length < 10) return;

        const channel = supabase
            .channel('loyalty-updates-' + phone)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'loyalty_customers',
                    filter: `phone=eq.${phone}`
                },
                (payload) => {
                    console.log('🔔 Loyalty update received:', payload);
                    if (payload.new) {
                        const newData = payload.new as any;
                        // Check both points and stamps fields
                        const stampsValue = newData.points || newData.stamps || 0;
                        const freeItems = newData.free_items_available || (stampsValue >= 9 ? 1 : 0);
                        setLoyaltyInfo({
                            stamps: stampsValue,
                            total_stamps: stampsValue,
                            free_items_available: freeItems
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searched, phone]);

    // Auto-search if phone is in URL
    useEffect(() => {
        if (searchParams.get('phone') && phone.length === 10) {
            searchOrders();
        }
    }, []);

    const getOrderTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            emporter: 'À emporter',
            livraison: 'Livraison',
            surplace: 'Sur place',
        };
        return labels[type] || type;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            preparing: 'bg-blue-100 text-blue-800',
            ready: 'bg-green-100 text-green-800',
            delivered: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
            {/* Header */}
            <div className="bg-primary text-white p-4 text-center">
                <h1 className="text-2xl font-bold font-display">🍕 TWIN PIZZA</h1>
                <p className="text-sm opacity-90">Mes Commandes</p>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Phone Input */}
                {!searched && (
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="text-center">
                                <Phone className="w-12 h-12 mx-auto text-primary mb-2" />
                                <h2 className="text-lg font-semibold">Voir mes commandes</h2>
                                <p className="text-sm text-muted-foreground">Entrez votre numéro de téléphone</p>
                            </div>

                            <Input
                                type="tel"
                                placeholder="06 12 34 56 78"
                                value={formatPhoneDisplay(phone)}
                                onChange={handlePhoneChange}
                                className="text-center text-lg h-12"
                            />

                            <Button
                                onClick={searchOrders}
                                className="w-full h-12"
                                disabled={phone.length < 10 || loading}
                            >
                                {loading ? 'Recherche...' : 'Voir mes commandes'}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Results */}
                {searched && (
                    <>
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearched(false);
                                setOrders([]);
                                setLoyaltyInfo(null);
                            }}
                            className="mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Changer de numéro
                        </Button>

                        {/* Customer Welcome */}
                        {customerName && (
                            <div className="text-center py-2">
                                <p className="text-lg">Bonjour <span className="font-bold">{customerName}</span> 👋</p>
                                <p className="text-sm text-muted-foreground">{formatPhoneDisplay(phone)}</p>
                            </div>
                        )}

                        {/* Loyalty Card */}
                        {loyaltyInfo && (
                            <div className="mb-4">
                                <LoyaltyStampCard
                                    currentStamps={loyaltyInfo.stamps}
                                    customerName={customerName}
                                    customerPhone={phone}
                                />
                                {loyaltyInfo.free_items_available > 0 && (
                                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <p className="text-green-700 font-semibold">
                                            🎁 Vous avez {loyaltyInfo.free_items_available} article(s) gratuit(s)!
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Orders List */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Historique ({orders.length})
                            </h3>

                            {orders.length === 0 ? (
                                <Card className="p-6 text-center text-muted-foreground">
                                    <p>Aucune commande trouvée</p>
                                    <p className="text-sm">pour ce numéro de téléphone</p>
                                </Card>
                            ) : (
                                orders.map((order) => (
                                    <Card key={order.id} className="overflow-hidden">
                                        {/* Order Header */}
                                        <div
                                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg">#{order.order_number}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(order.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                                    </p>
                                                </div>
                                                <div className="text-right flex items-center gap-2">
                                                    <div>
                                                        <p className="font-bold text-primary">{order.total.toFixed(2)}€</p>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                                                            {getOrderTypeLabel(order.order_type)}
                                                        </span>
                                                    </div>
                                                    {expandedOrder === order.id ? (
                                                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedOrder === order.id && (
                                            <>
                                                <Separator />
                                                <div className="p-4 bg-muted/30 space-y-3">
                                                    {/* Items */}
                                                    <div>
                                                        <p className="text-sm font-medium mb-2">Articles:</p>
                                                        <div className="space-y-1 text-sm">
                                                            {(order.items || []).map((item: any, i: number) => (
                                                                <div key={i} className="flex justify-between">
                                                                    <span>{item.quantity}x {item.name}</span>
                                                                    <span className="text-muted-foreground">{item.price?.toFixed(2)}€</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Payment */}
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Paiement:</span>
                                                        <span>{order.payment_method === 'cb' ? 'Carte bancaire' : 'Espèces'}</span>
                                                    </div>

                                                    {/* Ticket Image */}
                                                    {order.loyalty_card_image_url && (
                                                        <div className="mt-3">
                                                            <a
                                                                href={order.loyalty_card_image_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg text-primary hover:bg-primary/20 transition-colors"
                                                            >
                                                                <Ticket className="w-5 h-5" />
                                                                Voir le ticket complet
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground py-8">
                    <p>Twin Pizza 🍕</p>
                    <p>Merci de votre fidélité!</p>
                </div>
            </div>
        </div>
    );
}
