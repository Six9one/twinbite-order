import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, Gift, Search, Users, TrendingUp, Edit2, Save, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyCustomer {
    id: string;
    phone: string;
    name: string;
    points: number;
    total_spent: number;
    total_orders: number;
    first_order_done: boolean;
    created_at: string;
}

interface LoyaltyTransaction {
    id: string;
    customer_id: string;
    type: 'earn' | 'redeem';
    points: number;
    description: string;
    created_at: string;
}

export function SimpleLoyaltyManager() {
    const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
    const [editPoints, setEditPoints] = useState<number>(0);
    const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch customers from loyalty_customers table
        const { data: customersData, error: customersError } = await supabase
            .from('loyalty_customers' as any)
            .select('*')
            .order('points', { ascending: false });

        if (customersError) {
            console.error('Error fetching loyalty customers:', customersError);
            toast.error('Erreur lors du chargement des clients fidélité');
        }

        if (customersData) {
            setCustomers(customersData as unknown as LoyaltyCustomer[]);
        }

        setLoading(false);
    };

    const fetchTransactions = async (customerId: string) => {
        const { data, error } = await supabase
            .from('loyalty_transactions' as any)
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setTransactions(data as unknown as LoyaltyTransaction[]);
        }
    };

    const handleEditPoints = (customer: LoyaltyCustomer) => {
        setEditingCustomer(customer.id);
        setEditPoints(customer.points);
    };

    const handleSavePoints = async () => {
        if (!editingCustomer) return;

        const { error } = await supabase
            .from('loyalty_customers' as any)
            .update({ points: editPoints })
            .eq('id', editingCustomer);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Points mis à jour');
            setEditingCustomer(null);
            fetchData();
        }
    };

    const handleResetPoints = async (customerId: string) => {
        if (!confirm('Remettre à zéro les points de ce client ?')) return;

        const { error } = await supabase
            .from('loyalty_customers' as any)
            .update({ points: 0 })
            .eq('id', customerId);

        if (error) {
            toast.error('Erreur lors de la remise à zéro');
        } else {
            toast.success('Points remis à zéro');
            fetchData();
        }
    };

    const handleViewTransactions = (customer: LoyaltyCustomer) => {
        setSelectedCustomer(customer);
        fetchTransactions(customer.id);
    };

    const filteredCustomers = customers.filter(c =>
        c.phone.includes(search) ||
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const totalCustomers = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);
    const avgPoints = totalCustomers > 0 ? Math.round(totalPoints / totalCustomers) : 0;

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" />
                Programme de Fidélité
            </h2>

            <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 text-amber-800">
                <p className="font-semibold">💡 Règle Simple:</p>
                <p>1 point par €1 dépensé • 100 points = 5€ de réduction</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{totalCustomers}</p>
                            <p className="text-sm text-muted-foreground">Clients fidèles</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <div className="flex items-center gap-3">
                        <Star className="w-8 h-8 text-amber-500" />
                        <div>
                            <p className="text-2xl font-bold">{totalPoints}</p>
                            <p className="text-sm text-muted-foreground">Points totaux</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">{avgPoints}</p>
                            <p className="text-sm text-muted-foreground">Points moyens/client</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par téléphone ou nom..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Customer list */}
            <div className="space-y-3">
                {filteredCustomers.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            {search ? 'Aucun client trouvé' : 'Aucun client enregistré dans le programme fidélité'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Les clients sont ajoutés automatiquement après leur première commande.
                        </p>
                    </Card>
                ) : (
                    filteredCustomers.map((customer) => {
                        const isEditing = editingCustomer === customer.id;
                        const canRedeem = customer.points >= 100;

                        return (
                            <Card key={customer.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Phone className="w-4 h-4 text-amber-500" />
                                            <span className="font-semibold">{customer.phone}</span>
                                            {customer.name && (
                                                <span className="text-muted-foreground">({customer.name})</span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge variant="secondary" className="gap-1">
                                                <Star className="w-3 h-3" />
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        value={editPoints}
                                                        onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                                                        className="w-16 h-5 text-xs"
                                                    />
                                                ) : (
                                                    <span>{customer.points} pts</span>
                                                )}
                                            </Badge>
                                            <Badge variant="outline">
                                                {customer.total_orders} commandes
                                            </Badge>
                                            <Badge variant="outline">
                                                {customer.total_spent?.toFixed(2) || 0}€ dépensés
                                            </Badge>
                                            {canRedeem && (
                                                <Badge className="bg-green-500">
                                                    🎁 Peut échanger 100 pts
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" onClick={handleSavePoints}>
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="sm" variant="ghost" onClick={() => handleEditPoints(customer)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleResetPoints(customer.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar to next reward */}
                                {customer.points < 100 && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Progression vers 5€ de réduction</span>
                                            <span>{customer.points}/100 pts</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 transition-all"
                                                style={{ width: `${Math.min(customer.points, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
