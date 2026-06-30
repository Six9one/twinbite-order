import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/hooks/useSupabaseData';
import {
  BarChart3,
  TrendingUp,
  Clock,
  MapPin,
  CreditCard,
  Banknote,
  Pizza,
  ShoppingBag
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
    const completedOrders = orders.filter(o => o.status === 'completed');
    
    // Most sold items
    const itemCounts: Record<string, number> = {};
    completedOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.item?.name || item.name || 'Unknown';
          itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
        });
      }
    });
    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Payment methods
    const paymentMethods = {
      en_ligne: completedOrders.filter(o => o.payment_method === 'en_ligne').length,
      cb: completedOrders.filter(o => o.payment_method === 'cb').length,
      especes: completedOrders.filter(o => o.payment_method === 'especes').length,
    };

    // Orders by hour
    const ordersByHour: Record<number, number> = {};
    for (let i = 0; i < 24; i++) ordersByHour[i] = 0;
    completedOrders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      ordersByHour[hour]++;
    });

    // Orders by type
    const ordersByType = {
      livraison: completedOrders.filter(o => o.order_type === 'livraison').length,
      emporter: completedOrders.filter(o => o.order_type === 'emporter').length,
      surplace: completedOrders.filter(o => o.order_type === 'surplace').length,
    };

    // Peak hours (top 3)
    const peakHours = Object.entries(ordersByHour)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}h`);

    // Total revenue
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const hourData = Object.entries(ordersByHour).map(([hour, count]) => ({
      hour: `${hour}h`,
      count
    }));

    const paymentData = [
      { name: 'En ligne', value: paymentMethods.en_ligne, color: '#10b981' },
      { name: 'Carte Bancaire', value: paymentMethods.cb, color: '#3b82f6' },
      { name: 'Espèces', value: paymentMethods.especes, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    const orderTypesData = [
      { name: 'Livraison', value: ordersByType.livraison, color: '#3b82f6' },
      { name: 'À emporter', value: ordersByType.emporter, color: '#f97316' },
      { name: 'Sur place', value: ordersByType.surplace, color: '#10b981' },
    ];

    return {
      totalOrders: completedOrders.length,
      totalRevenue,
      avgOrderValue,
      topItems,
      paymentMethods,
      ordersByHour,
      ordersByHourData: hourData,
      paymentData,
      orderTypesData,
      ordersByType,
      peakHours,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-amber-500" />
        Statistiques
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-amber-500/20 to-transparent">
          <div className="text-sm text-muted-foreground">Commandes</div>
          <div className="text-3xl font-bold text-amber-500">{stats.totalOrders}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/20 to-transparent">
          <div className="text-sm text-muted-foreground">Chiffre d'affaires</div>
          <div className="text-3xl font-bold text-green-500">{stats.totalRevenue.toFixed(2)}€</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-transparent">
          <div className="text-sm text-muted-foreground">Panier moyen</div>
          <div className="text-3xl font-bold text-blue-500">{stats.avgOrderValue.toFixed(2)}€</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-transparent">
          <div className="text-sm text-muted-foreground">Heures de pointe</div>
          <div className="text-xl font-bold text-purple-500">{stats.peakHours.join(', ')}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Items */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Pizza className="w-5 h-5 text-amber-500" />
            Produits les plus vendus
          </h3>
          <div className="space-y-2">
            {stats.topItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée</p>
            ) : (
              stats.topItems.map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold w-6">#{idx + 1}</span>
                    <span className="truncate">{name}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Moyens de paiement
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Répartition du volume de commandes</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            {stats.paymentData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.paymentData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`${value} commandes`, 'Volume']}
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Order Types */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              Types de commandes
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Répartition par canal de distribution</p>
          </div>
          <div className="space-y-4 my-auto">
            {stats.orderTypesData.map((type) => {
              const total = stats.totalOrders || 1;
              const pct = ((type.value / total) * 100).toFixed(0);
              return (
                <div key={type.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{type.name}</span>
                    <span className="text-muted-foreground">{type.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
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
        <Card className="p-4 col-span-1 md:col-span-2">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Commandes par heure
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Activité et pics de commandes sur la journée</p>
          <div className="h-64 w-full">
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
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={11}
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