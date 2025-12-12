import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, Gift, Search } from 'lucide-react';

interface LoyaltyPoint {
  id: string;
  customer_phone: string;
  customer_email: string | null;
  total_purchases: number;
  soufflet_count: number;
  pizza_count: number;
  free_items_redeemed: number;
  last_order_at: string | null;
}

export function LoyaltyManager() {
  const [customers, setCustomers] = useState<LoyaltyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loyalty_points' as any)
      .select('*')
      .order('total_purchases', { ascending: false });
    
    if (!error && data) {
      setCustomers(data as unknown as LoyaltyPoint[]);
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_phone.includes(search) || 
    c.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const getProgress = (count: number, target: number = 10) => {
    return Math.min((count / target) * 100, 100);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Star className="w-6 h-6 text-amber-500" />
        Programme de Fidélité
      </h2>

      {/* Info box */}
      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <h3 className="font-semibold text-amber-700 mb-2">🎁 Règles de fidélité</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 10 soufflés achetés = 1 soufflé gratuit sur la prochaine commande</li>
          <li>• 10 pizzas achetées = 1 pizza gratuite sur la prochaine commande</li>
          <li>• Les points sont suivis automatiquement par numéro de téléphone</li>
        </ul>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par téléphone ou email..."
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
            const souffletProgress = getProgress(customer.soufflet_count % 10);
            const pizzaProgress = getProgress(customer.pizza_count % 10);
            const souffletEarned = Math.floor(customer.soufflet_count / 10);
            const pizzaEarned = Math.floor(customer.pizza_count / 10);

            return (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold">{customer.customer_phone}</span>
                      {customer.customer_email && (
                        <span className="text-sm text-muted-foreground">({customer.customer_email})</span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-3">
                      {/* Soufflet progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Soufflés</span>
                          <span className="font-medium">{customer.soufflet_count % 10}/10</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${souffletProgress}%` }}
                          />
                        </div>
                        {souffletEarned > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Gift className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600">{souffletEarned} gratuit(s) gagné(s)</span>
                          </div>
                        )}
                      </div>

                      {/* Pizza progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Pizzas</span>
                          <span className="font-medium">{customer.pizza_count % 10}/10</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all"
                            style={{ width: `${pizzaProgress}%` }}
                          />
                        </div>
                        {pizzaEarned > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Gift className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600">{pizzaEarned} gratuite(s) gagnée(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant="secondary" className="mb-2">
                      {customer.total_purchases} commandes
                    </Badge>
                    {customer.last_order_at && (
                      <p className="text-xs text-muted-foreground">
                        Dernière: {new Date(customer.last_order_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}