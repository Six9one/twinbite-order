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

    return {
      totalOrders: completedOrders.length,
      totalRevenue,
      avgOrderValue,
      topItems,
      paymentMethods,
      ordersByHour,
      ordersByType,
      peakHours,
    };
  }, [orders]);

  const maxHourOrders = Math.max(...Object.values(stats.ordersByHour));

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
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            Moyens de paiement
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" />
                <span>Paiement en ligne</span>
              </div>
              <Badge className="bg-green-500">{stats.paymentMethods.en_ligne}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>Carte bancaire</span>
              </div>
              <Badge className="bg-blue-500">{stats.paymentMethods.cb}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-500" />
                <span>Espèces</span>
              </div>
              <Badge className="bg-amber-500">{stats.paymentMethods.especes}</Badge>
            </div>
          </div>
        </Card>

        {/* Order Types */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            Types de commandes
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>🚗 Livraison</span>
              <Badge className="bg-blue-500">{stats.ordersByType.livraison}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>🛍️ À emporter</span>
              <Badge className="bg-orange-500">{stats.ordersByType.emporter}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>🍽️ Sur place</span>
              <Badge className="bg-green-500">{stats.ordersByType.surplace}</Badge>
            </div>
          </div>
        </Card>

        {/* Orders by Hour Chart */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Commandes par heure
          </h3>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(stats.ordersByHour).map(([hour, count]) => (
              <div key={hour} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-amber-500 rounded-t transition-all"
                  style={{ 
                    height: maxHourOrders > 0 ? `${(count / maxHourOrders) * 100}%` : '0%',
                    minHeight: count > 0 ? '4px' : '0px'
                  }}
                />
                {parseInt(hour) % 3 === 0 && (
                  <span className="text-[10px] text-muted-foreground mt-1">{hour}h</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}