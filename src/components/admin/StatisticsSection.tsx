import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/hooks/useSupabaseData';
import { calculateBusinessStats, detectOrderSource, getSourceBadgeProps } from '@/lib/orderUtils';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CreditCard,
  Pizza,
  ShoppingBag,
  Store,
  Wifi,
  Utensils,
  Receipt,
  Euro
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface StatisticsSectionProps {
  orders: Order[];
}

export function StatisticsSection({ orders }: StatisticsSectionProps) {
  const stats = useMemo(() => {
    const bizStats = calculateBusinessStats(orders);
    const validOrders = bizStats.validOrders;

    // Orders by hour
    const ordersByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) ordersByHour[i] = 0;
    validOrders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      ordersByHour[hour]++;
    });

    const peakHours = Object.entries(ordersByHour)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .filter(([, count]) => count > 0)
      .map(([hour]) => `${hour}h`);

    const hourData = Object.entries(ordersByHour).map(([hour, count]) => ({
      hour: `${hour}h`,
      count
    }));

    const paymentData = [
      { name: 'En ligne', value: bizStats.payments.enLigne.count, amount: bizStats.payments.enLigne.total, color: '#10b981' },
      { name: 'Carte Bancaire', value: bizStats.payments.cb.count, amount: bizStats.payments.cb.total, color: '#3b82f6' },
      { name: 'Espèces', value: bizStats.payments.especes.count, amount: bizStats.payments.especes.total, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    const sourceData = [
      { name: 'Borne tactile', key: 'borne', value: bizStats.bySource.borne.count, amount: bizStats.bySource.borne.revenue, color: '#a855f7', icon: Utensils },
      { name: 'Caisse (POS)', key: 'pos', value: bizStats.bySource.pos.count, amount: bizStats.bySource.pos.revenue, color: '#10b981', icon: Store },
      { name: 'Site Web', key: 'web', value: bizStats.bySource.web.count, amount: bizStats.bySource.web.revenue, color: '#3b82f6', icon: Wifi },
    ].filter(d => d.value > 0);

    const orderTypesData = [
      { name: 'Sur place', value: bizStats.byType.surplace?.count || 0, amount: bizStats.byType.surplace?.revenue || 0, color: '#10b981' },
      { name: 'À emporter', value: bizStats.byType.emporter?.count || 0, amount: bizStats.byType.emporter?.revenue || 0, color: '#f97316' },
      { name: 'Livraison', value: bizStats.byType.livraison?.count || 0, amount: bizStats.byType.livraison?.revenue || 0, color: '#3b82f6' },
    ].filter(d => d.value > 0);

    return {
      ...bizStats,
      peakHours: peakHours.length ? peakHours : ['—'],
      ordersByHourData: hourData,
      paymentData,
      sourceData,
      orderTypesData,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          Statistiques & Analyse des Ventes
        </h2>
        <div className="text-xs text-muted-foreground bg-card border px-3 py-1.5 rounded-lg">
          Toutes origines incluses : <strong className="text-foreground">Web + Borne + Caisse POS</strong>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chiffre d'Affaires</div>
          <div className="text-3xl font-black text-emerald-500 mt-1">{stats.totalRevenue.toFixed(2)}€</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            HT: {stats.taxes.ht.toFixed(2)}€ | TVA: {stats.taxes.tva.toFixed(2)}€
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/20 to-transparent border-amber-500/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commandes</div>
          <div className="text-3xl font-black text-amber-500 mt-1">{stats.totalOrdersCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.items.totalCount} articles vendus
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Panier Moyen</div>
          <div className="text-3xl font-black text-blue-500 mt-1">{stats.avgOrderValue.toFixed(2)}€</div>
          <div className="text-[11px] text-muted-foreground mt-1">Par commande valide</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-transparent border-purple-500/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Heures de Pointe</div>
          <div className="text-xl font-bold text-purple-500 mt-2">{stats.peakHours.join(', ')}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Pics d'affluence</div>
        </Card>
      </div>

      {/* Multi-Channel Distribution Banner */}
      <Card className="p-5 border bg-card/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b mb-4 gap-2">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Répartition du Chiffre d'Affaires par Origine (Canal)
            </h3>
            <p className="text-xs text-muted-foreground">Ventilation du CA entre les commandes Borne tactile, Caisse POS et Site Web</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Borne */}
          <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <span className="font-bold text-sm text-purple-600 dark:text-purple-400">Borne Tactile</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                {stats.bySource.borne.percentage.toFixed(0)}%
              </Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-foreground">{stats.bySource.borne.revenue.toFixed(2)}€</div>
              <div className="text-xs text-muted-foreground">{stats.bySource.borne.count} commande{stats.bySource.borne.count > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* POS */}
          <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💻</span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Caisse (POS)</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {stats.bySource.pos.percentage.toFixed(0)}%
              </Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-foreground">{stats.bySource.pos.revenue.toFixed(2)}€</div>
              <div className="text-xs text-muted-foreground">{stats.bySource.pos.count} commande{stats.bySource.pos.count > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Web */}
          <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">Site Web (En Ligne)</span>
              </div>
              <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                {stats.bySource.web.percentage.toFixed(0)}%
              </Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-foreground">{stats.bySource.web.revenue.toFixed(2)}€</div>
              <div className="text-xs text-muted-foreground">{stats.bySource.web.count} commande{stats.bySource.web.count > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Items & Sold Products */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Pizza className="w-5 h-5 text-amber-500" />
              Produits les plus vendus (Détail)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Total de {stats.items.totalCount} articles vendus sur la période</p>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {stats.items.list.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune vente enregistrée</p>
            ) : (
              stats.items.list.slice(0, 12).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-card/60 border text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-amber-500 font-black w-5 text-center">#{idx + 1}</span>
                    <div className="truncate">
                      <span className="font-semibold text-foreground truncate block">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className="font-bold">{item.quantity} vendus</Badge>
                    <span className="font-bold text-foreground w-16 text-right">{item.revenue.toFixed(2)}€</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Moyens de Règlement
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Répartition des encaissements (Espèces, CB, En ligne)</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            {stats.paymentData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun encaissement</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {stats.paymentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`${Number(value).toFixed(2)} €`, 'Montant']}
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t text-center text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">💵 Espèces</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">{stats.payments.especes.total.toFixed(2)}€</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">💳 Carte CB</span>
              <strong className="text-blue-600 dark:text-blue-400 font-black">{stats.payments.cb.total.toFixed(2)}€</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">🌐 En Ligne</span>
              <strong className="text-purple-600 dark:text-purple-400 font-black">{stats.payments.enLigne.total.toFixed(2)}€</strong>
            </div>
          </div>
        </Card>

        {/* Order Types */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              Types de Commandes
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Sur place, À emporter, Livraison</p>
          </div>
          <div className="space-y-4 my-auto">
            {stats.orderTypesData.map((type) => {
              const total = stats.totalOrdersCount || 1;
              const pct = ((type.value / total) * 100).toFixed(0);
              return (
                <div key={type.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{type.name}</span>
                    <span className="text-muted-foreground">{type.value} cmd ({type.amount.toFixed(2)}€ — {pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${pct}%`,
                        backgroundColor: type.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Orders by Hour Chart */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Activité par Heure
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Répartition des commandes sur la journée</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.ordersByHourData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hour" 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }}
                  labelStyle={{ fontWeight: 'bold', color: '#f59e0b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Commandes"
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}