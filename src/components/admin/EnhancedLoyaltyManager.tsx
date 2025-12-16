import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, Gift, Search, Settings, Users, TrendingUp, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyPoint {
    id: string;
    customer_phone: string;
    customer_name: string | null;
    customer_email: string | null;
    total_points: number;
    total_purchases: number;
    soufflet_count: number;
    pizza_count: number;
    texmex_count: number;
    free_items_redeemed: number;
    pending_rewards: any[];
    last_order_at: string | null;
}

interface LoyaltyRule {
    id: string;
    rule_name: string;
    product_type: string;
    points_required: number;
    reward_type: string;
    reward_value: number;
    is_active: boolean;
    description: string | null;
}

export function EnhancedLoyaltyManager() {
    const [customers, setCustomers] = useState<LoyaltyPoint[]>([]);
    const [rules, setRules] = useState<LoyaltyRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingRule, setEditingRule] = useState<string | null>(null);
    const [editedRule, setEditedRule] = useState<Partial<LoyaltyRule>>({});
    const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
    const [customerEdits, setCustomerEdits] = useState<Partial<LoyaltyPoint>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
            .from('loyalty_points' as any)
            .select('*')
            .order('total_purchases', { ascending: false });

        if (!customersError && customersData) {
            setCustomers(customersData as unknown as LoyaltyPoint[]);
        }

        // Fetch rules
        const { data: rulesData, error: rulesError } = await supabase
            .from('loyalty_rules' as any)
            .select('*')
            .order('product_type');

        if (!rulesError && rulesData) {
            setRules(rulesData as unknown as LoyaltyRule[]);
        }

        setLoading(false);
    };

    const filteredCustomers = customers.filter(c =>
        c.customer_phone.includes(search) ||
        c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_email?.toLowerCase().includes(search.toLowerCase())
    );

    const getProgress = (count: number, target: number = 10) => {
        return Math.min((count / target) * 100, 100);
    };

    // Rule management
    const handleEditRule = (rule: LoyaltyRule) => {
        setEditingRule(rule.id);
        setEditedRule(rule);
    };

    const handleSaveRule = async () => {
        if (!editingRule || !editedRule) return;

        const { error } = await supabase
            .from('loyalty_rules' as any)
            .update({
                rule_name: editedRule.rule_name,
                points_required: editedRule.points_required,
                reward_type: editedRule.reward_type,
                reward_value: editedRule.reward_value,
                is_active: editedRule.is_active,
                description: editedRule.description,
            })
            .eq('id', editingRule);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Règle mise à jour');
            setEditingRule(null);
            fetchData();
        }
    };

    const handleAddRule = async () => {
        const { error } = await supabase
            .from('loyalty_rules' as any)
            .insert({
                rule_name: 'Nouvelle règle',
                product_type: 'general',
                points_required: 10,
                reward_type: 'free_item',
                reward_value: 1,
                is_active: false,
                description: '',
            });

        if (error) {
            toast.error('Erreur lors de la création');
        } else {
            toast.success('Règle créée');
            fetchData();
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Supprimer cette règle ?')) return;

        const { error } = await supabase
            .from('loyalty_rules' as any)
            .delete()
            .eq('id', ruleId);

        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Règle supprimée');
            fetchData();
        }
    };

    // Customer editing
    const handleEditCustomer = (customer: LoyaltyPoint) => {
        setEditingCustomer(customer.id);
        setCustomerEdits({
            soufflet_count: customer.soufflet_count,
            pizza_count: customer.pizza_count,
            texmex_count: customer.texmex_count,
            total_points: customer.total_points,
        });
    };

    const handleSaveCustomer = async () => {
        if (!editingCustomer) return;

        const { error } = await supabase
            .from('loyalty_points' as any)
            .update(customerEdits)
            .eq('id', editingCustomer);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Client mis à jour');
            setEditingCustomer(null);
            fetchData();
        }
    };

    const handleResetCustomer = async (customerId: string) => {
        if (!confirm('Remettre à zéro les points de ce client ?')) return;

        const { error } = await supabase
            .from('loyalty_points' as any)
            .update({
                soufflet_count: 0,
                pizza_count: 0,
                texmex_count: 0,
                total_points: 0,
                free_items_redeemed: 0,
            })
            .eq('id', customerId);

        if (error) {
            toast.error('Erreur lors de la remise à zéro');
        } else {
            toast.success('Points remis à zéro');
            fetchData();
        }
    };

    // Stats
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => {
        const lastOrder = c.last_order_at ? new Date(c.last_order_at) : null;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastOrder && lastOrder > thirtyDaysAgo;
    }).length;
    const totalRedeemed = customers.reduce((sum, c) => sum + c.free_items_redeemed, 0);

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" />
                Programme de Fidélité
            </h2>

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
                <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">{activeCustomers}</p>
                            <p className="text-sm text-muted-foreground">Actifs (30j)</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <div className="flex items-center gap-3">
                        <Gift className="w-8 h-8 text-amber-500" />
                        <div>
                            <p className="text-2xl font-bold">{totalRedeemed}</p>
                            <p className="text-sm text-muted-foreground">Récompenses réclamées</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Tabs defaultValue="customers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="customers">
                        <Users className="w-4 h-4 mr-2" />
                        Clients
                    </TabsTrigger>
                    <TabsTrigger value="rules">
                        <Settings className="w-4 h-4 mr-2" />
                        Règles
                    </TabsTrigger>
                </TabsList>

                {/* Customers Tab */}
                <TabsContent value="customers" className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par téléphone, nom ou email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Customer list */}
                    <div className="space-y-3">
                        {filteredCustomers.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                            </p>
                        ) : (
                            filteredCustomers.map((customer) => {
                                const isEditing = editingCustomer === customer.id;
                                const souffletRule = rules.find(r => r.product_type === 'soufflet');
                                const pizzaRule = rules.find(r => r.product_type === 'pizza');
                                const souffletTarget = souffletRule?.points_required || 10;
                                const pizzaTarget = pizzaRule?.points_required || 10;

                                const displaySoufflet = isEditing ? (customerEdits.soufflet_count ?? 0) : customer.soufflet_count;
                                const displayPizza = isEditing ? (customerEdits.pizza_count ?? 0) : customer.pizza_count;

                                return (
                                    <Card key={customer.id} className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Phone className="w-4 h-4 text-amber-500" />
                                                    <span className="font-semibold">{customer.customer_phone}</span>
                                                    {customer.customer_name && (
                                                        <span className="text-muted-foreground">({customer.customer_name})</span>
                                                    )}
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4 mt-3">
                                                    {/* Soufflet progress */}
                                                    <div>
                                                        <div className="flex items-center justify-between text-sm mb-1">
                                                            <span>Soufflés</span>
                                                            {isEditing ? (
                                                                <Input
                                                                    type="number"
                                                                    value={displaySoufflet}
                                                                    onChange={(e) => setCustomerEdits({ ...customerEdits, soufflet_count: parseInt(e.target.value) || 0 })}
                                                                    className="w-16 h-6 text-xs"
                                                                />
                                                            ) : (
                                                                <span className="font-medium">{displaySoufflet % souffletTarget}/{souffletTarget}</span>
                                                            )}
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-amber-500 transition-all"
                                                                style={{ width: `${getProgress(displaySoufflet % souffletTarget, souffletTarget)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Pizza progress */}
                                                    <div>
                                                        <div className="flex items-center justify-between text-sm mb-1">
                                                            <span>Pizzas</span>
                                                            {isEditing ? (
                                                                <Input
                                                                    type="number"
                                                                    value={displayPizza}
                                                                    onChange={(e) => setCustomerEdits({ ...customerEdits, pizza_count: parseInt(e.target.value) || 0 })}
                                                                    className="w-16 h-6 text-xs"
                                                                />
                                                            ) : (
                                                                <span className="font-medium">{displayPizza % pizzaTarget}/{pizzaTarget}</span>
                                                            )}
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500 transition-all"
                                                                style={{ width: `${getProgress(displayPizza % pizzaTarget, pizzaTarget)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="secondary">
                                                    {customer.total_purchases} commandes
                                                </Badge>
                                                {isEditing ? (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingCustomer(null)}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" onClick={handleSaveCustomer}>
                                                            <Save className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleEditCustomer(customer)}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleResetCustomer(customer.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={handleAddRule} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouvelle règle
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {rules.map((rule) => {
                            const isEditing = editingRule === rule.id;

                            return (
                                <Card key={rule.id} className={`p-4 ${!rule.is_active ? 'opacity-60' : ''}`}>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <Input
                                                value={editedRule.rule_name || ''}
                                                onChange={(e) => setEditedRule({ ...editedRule, rule_name: e.target.value })}
                                                placeholder="Nom de la règle"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-sm text-muted-foreground">Points requis</label>
                                                    <Input
                                                        type="number"
                                                        value={editedRule.points_required || 0}
                                                        onChange={(e) => setEditedRule({ ...editedRule, points_required: parseInt(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-muted-foreground">Valeur récompense</label>
                                                    <Input
                                                        type="number"
                                                        value={editedRule.reward_value || 0}
                                                        onChange={(e) => setEditedRule({ ...editedRule, reward_value: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>
                                            <Input
                                                value={editedRule.description || ''}
                                                onChange={(e) => setEditedRule({ ...editedRule, description: e.target.value })}
                                                placeholder="Description"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={editedRule.is_active}
                                                    onCheckedChange={(checked) => setEditedRule({ ...editedRule, is_active: checked })}
                                                />
                                                <span className="text-sm">Actif</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={() => setEditingRule(null)}>Annuler</Button>
                                                <Button onClick={handleSaveRule}>Sauvegarder</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{rule.rule_name}</h3>
                                                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                                                        {rule.product_type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {rule.points_required} achats → {rule.reward_value} {rule.reward_type === 'free_item' ? 'gratuit(s)' : '€'}
                                                </p>
                                                {rule.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleEditRule(rule)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteRule(rule.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
