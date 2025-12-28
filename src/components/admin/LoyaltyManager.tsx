import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, Gift, Search, Plus, Minus, History, Settings, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ============================================
// V1 ADMIN LOYALTY MANAGER
// - Uses loyalty_customers table (euro-based points)
// - Manual add/remove points
// - Reward management
// - Transaction history view
// ============================================

interface LoyaltyCustomer {
  id: string;
  phone: string;
  name: string;
  points: number;
  total_spent: number;
  total_orders: number;
  first_order_done: boolean;
  created_at: string;
  updated_at: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  type: string;
  value: number;
  is_active: boolean;
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

export function LoyaltyManager() {
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showPointsDialog, setShowPointsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [isAddingPoints, setIsAddingPoints] = useState(true);
  const [customerHistory, setCustomerHistory] = useState<LoyaltyTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchRewards();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_customers' as any)
        .select('*')
        .order('points', { ascending: false });

      if (!error && data) {
        setCustomers(data as unknown as LoyaltyCustomer[]);
      } else if (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les clients. Vérifiez que la migration a été appliquée.',
          variant: 'destructive'
        });
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_rewards' as any)
        .select('*')
        .order('points_cost', { ascending: true });

      if (!error && data) {
        setRewards(data as unknown as LoyaltyReward[]);
      }
    } catch (e) {
      console.error('Fetch rewards error:', e);
    }
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
      }
    } catch (e) {
      console.error('Fetch history error:', e);
    }
    setHistoryLoading(false);
  };

  const handleAddRemovePoints = async () => {
    if (!selectedCustomer || !pointsToAdd) return;

    const points = parseInt(pointsToAdd);
    if (isNaN(points) || points <= 0) {
      toast({ title: 'Erreur', description: 'Entrez un nombre de points valide', variant: 'destructive' });
      return;
    }

    const actualPoints = isAddingPoints ? points : -points;
    const newTotal = selectedCustomer.points + actualPoints;

    if (newTotal < 0) {
      toast({ title: 'Erreur', description: 'Le client n\'a pas assez de points', variant: 'destructive' });
      return;
    }

    setSavingPoints(true);
    try {
      // Update customer points
      const { error: updateError } = await supabase
        .from('loyalty_customers' as any)
        .update({
          points: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Add transaction record
      const { error: txError } = await supabase
        .from('loyalty_transactions' as any)
        .insert({
          customer_id: selectedCustomer.id,
          type: isAddingPoints ? 'earn' : 'redeem',
          points: actualPoints,
          description: pointsReason || (isAddingPoints ? 'Ajout manuel (Admin)' : 'Retrait manuel (Admin)')
        });

      if (txError) throw txError;

      toast({
        title: 'Succès',
        description: `${Math.abs(points)} points ${isAddingPoints ? 'ajoutés' : 'retirés'} pour ${selectedCustomer.name}`
      });

      // Refresh data
      await fetchCustomers();
      setShowPointsDialog(false);
      setPointsToAdd('');
      setPointsReason('');
    } catch (e) {
      console.error('Error updating points:', e);
      toast({ title: 'Erreur', description: 'Impossible de modifier les points', variant: 'destructive' });
    }
    setSavingPoints(false);
  };

  const handleToggleReward = async (rewardId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('loyalty_rewards' as any)
        .update({ is_active: isActive })
        .eq('id', rewardId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Récompense ${isActive ? 'activée' : 'désactivée'}`
      });

      await fetchRewards();
    } catch (e) {
      console.error('Error toggling reward:', e);
      toast({ title: 'Erreur', description: 'Impossible de modifier la récompense', variant: 'destructive' });
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.phone.includes(search) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Star className="w-6 h-6 text-amber-500" />
        Programme de Fidélité V1
      </h2>

      {/* Info box */}
      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <h3 className="font-semibold text-amber-700 mb-2">📊 Règles V1 Simplifiées</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>1 point par €1</strong> dépensé</li>
          <li>• <strong>+10 points</strong> bonus par commande en ligne</li>
          <li>• <strong>+30 points</strong> bonus première commande</li>
          <li>• Récompenses: 50pts boisson, 100pts -10%, 150pts accompagnement, 200pts pizza</li>
        </ul>
      </Card>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="gap-2">
            <Phone className="w-4 h-4" />
            Clients ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="w-4 h-4" />
            Récompenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4 mt-4">
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
              <p className="text-muted-foreground text-center py-8">
                {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
              </p>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">{customer.phone}</span>
                        <span className="text-sm text-muted-foreground">({customer.name})</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>💰 {customer.total_spent?.toFixed(2) || 0}€ dépensés</span>
                        <span>📦 {customer.total_orders || 0} commandes</span>
                        {customer.first_order_done && (
                          <Badge variant="secondary" className="text-xs">1ère commande ✓</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-2xl font-bold text-primary">{customer.points}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsAddingPoints(true);
                          setShowPointsDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsAddingPoints(false);
                          setShowPointsDialog(true);
                        }}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          fetchCustomerHistory(customer.id);
                          setShowHistoryDialog(true);
                        }}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4 mt-4">
          {rewards.map((reward) => (
            <Card key={reward.id} className={`p-4 ${!reward.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {reward.id === 'free-drink' && '🥤'}
                    {reward.id === 'discount-10-percent' && '💰'}
                    {reward.id === 'free-side' && '🍟'}
                    {reward.id === 'free-pizza' && '🍕'}
                  </div>
                  <div>
                    <h4 className="font-semibold">{reward.name}</h4>
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: {reward.type} | Valeur: {reward.value}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{reward.points_cost}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`reward-${reward.id}`} className="text-sm">
                      {reward.is_active ? 'Actif' : 'Inactif'}
                    </Label>
                    <Switch
                      id={`reward-${reward.id}`}
                      checked={reward.is_active}
                      onCheckedChange={(checked) => handleToggleReward(reward.id, checked)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add/Remove Points Dialog */}
      <Dialog open={showPointsDialog} onOpenChange={setShowPointsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddingPoints ? 'Ajouter des points' : 'Retirer des points'}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                <p className="text-sm">Points actuels: <strong>{selectedCustomer.points}</strong></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Nombre de points</Label>
                <Input
                  id="points"
                  type="number"
                  placeholder="Ex: 50"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(e.target.value)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input
                  id="reason"
                  placeholder="Ex: Geste commercial"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPointsDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddRemovePoints}
              disabled={savingPoints || !pointsToAdd}
              className={isAddingPoints ? '' : 'bg-red-500 hover:bg-red-600'}
            >
              {savingPoints ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isAddingPoints ? 'Ajouter' : 'Retirer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des points</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedCustomer.name} - {selectedCustomer.phone}</p>
                <p className="text-sm">Total: <strong>{selectedCustomer.points} points</strong></p>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : customerHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucune transaction</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {customerHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                          {tx.type === 'earn' ? '+' : '-'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${tx.type === 'earn' ? 'text-green-600' : 'text-orange-600'
                        }`}>
                        {tx.type === 'earn' ? '+' : ''}{tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}