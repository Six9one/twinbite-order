import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, Gift, Search, Users, TrendingUp, Edit2, Save, X, Trash2, CheckCircle } from 'lucide-react';
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
    const [editName, setEditName] = useState<string>('');
    const [editPhone, setEditPhone] = useState<string>('');
    const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

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

    const handleEditCustomer = (customer: LoyaltyCustomer) => {
        setEditingCustomer(customer.id);
        setEditPoints(customer.points);
        setEditName(customer.name || '');
        setEditPhone(customer.phone || '');
    };

    const handleSaveCustomer = async () => {
        if (!editingCustomer) return;

        const { error } = await supabase
            .from('loyalty_customers' as any)
            .update({
                points: editPoints,
                name: editName,
                phone: editPhone
            })
            .eq('id', editingCustomer);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Client mis à jour');
            setEditingCustomer(null);
            fetchData();
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client définitivement ?')) return;

        const { error } = await supabase
            .from('loyalty_customers' as any)
            .delete()
            .eq('id', customerId);

        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Client supprimé');
            fetchData();
        }
    };

    const handleRedeemReward = async (customer: LoyaltyCustomer) => {
        if (!confirm(`Offrir la commande à ${customer.name || customer.phone} et remettre les tampons à 0 ?`)) return;

        // Reset points to 0
        const { error } = await supabase
            .from('loyalty_customers' as any)
            .update({ points: 0 })
            .eq('id', customer.id);

        // Log transaction (optional, creates history content)
        await supabase.from('loyalty_transactions' as any).insert({
            customer_id: customer.id,
            type: 'redeem',
            points: -customer.points,
            description: 'Commande offerte (Reset tampons)'
        });

        if (error) {
            toast.error('Erreur lors de l\'échange');
        } else {
            toast.success('Récompense validée ! Tampons remis à zéro.');
            fetchData();
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.phone.includes(search) ||
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

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
                Fidélité (Tampons)
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 flex items-start gap-3">
                <Gift className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                    <p className="font-bold">Gestion des Tampons</p>
                    <p className="text-sm">Gérez les tampons clients. <br />10 Tampons = 1 Pizza/Offre (au choix). <br />Utilisez <CheckCircle className="w-3 h-3 inline text-green-600" /> pour valider une carte pleine.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-white border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalCustomers}</p>
                            <p className="text-sm text-muted-foreground">Clients</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-white border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalPoints}</p>
                            <p className="text-sm text-muted-foreground">Tampons totaux</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-white border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{avgPoints}</p>
                            <p className="text-sm text-muted-foreground">Moyenne tampons</p>
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
                    <Card className="p-8 text-center text-muted-foreground">
                        {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                    </Card>
                ) : (
                    filteredCustomers.map((customer) => {
                        const isEditing = editingCustomer === customer.id;
                        const canRedeem = customer.points >= 10; // Target is 10 stamps

                        return (
                            <Card key={customer.id} className="p-4 transition-all hover:shadow-md">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Phone className="w-4 h-4 text-amber-500" />
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={editPhone}
                                                        onChange={(e) => setEditPhone(e.target.value)}
                                                        className="h-9 w-36 text-sm font-medium"
                                                        placeholder="Tél"
                                                    />
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="h-9 w-48 text-sm font-medium"
                                                        placeholder="Nom"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-lg">{customer.phone}</span>
                                                    {customer.name && (
                                                        <span className="text-muted-foreground">({customer.name})</span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 pl-3 pr-3 py-1">
                                                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-semibold mr-1">Tampons:</span>
                                                        <Input
                                                            type="number"
                                                            value={editPoints}
                                                            onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                                                            className="w-16 h-7 text-sm font-bold bg-white text-center p-1"
                                                            min="0"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-base">{customer.points} Tampons</span>
                                                )}
                                            </Badge>

                                            {canRedeem && !isEditing && (
                                                <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">
                                                    🎉 CARTE PLEINE !
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)} title="Annuler">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleSaveCustomer} title="Sauvegarder">
                                                    <Save className="w-4 h-4 mr-1" />
                                                    OK
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Edit Button */}
                                                <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)} title="Modifier">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>

                                                {/* Redeem Button (Only if points > 0) */}
                                                {(customer.points > 0) && (
                                                    <Button
                                                        size="sm"
                                                        className={`${canRedeem ? 'bg-green-600 hover:bg-green-700 shadow-md' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                                        onClick={() => handleRedeemReward(customer)}
                                                        title={canRedeem ? "Valider la carte pleine" : "Remettre à zéro"}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        {canRedeem ? "OFFRIR" : "RAZ"}
                                                    </Button>
                                                )}

                                                {/* Delete Button */}
                                                <Button size="sm" variant="destructive" className="px-2 opacity-50 hover:opacity-100 transition-opacity" onClick={() => handleDeleteCustomer(customer.id)} title="Supprimer le client">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {!isEditing && (
                                    <div className="mt-3 relative h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        {/* Background markers for stamps */}
                                        <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className="h-full w-px bg-white/50 z-10"></div>
                                            ))}
                                        </div>
                                        <div
                                            className={`absolute top-0 left-0 h-full ${canRedeem ? 'bg-green-500' : 'bg-amber-500'} transition-all duration-500`}
                                            style={{ width: `${Math.min((customer.points / 10) * 100, 100)}%` }}
                                        />
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[9px] font-bold text-black/50 tracking-widest z-20">
                                            {customer.points}/10
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
