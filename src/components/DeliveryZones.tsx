import { useDeliveryZones } from '@/hooks/useSupabaseData';
import { MapPin, Clock, Truck, CheckCircle } from 'lucide-react';

export function DeliveryZones() {
  const { data: zones, isLoading } = useDeliveryZones();

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64 mx-auto" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            <span className="text-amber-500">Zones</span> de Livraison
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nous livrons dans Grand-Couronne et les communes environnantes. 
            Vérifiez votre zone et les conditions de livraison.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones?.map((zone) => (
            <div
              key={zone.id}
              className="bg-card rounded-xl p-5 border hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-lg">{zone.name}</h3>
                </div>
                {zone.delivery_fee === 0 && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-1 rounded-full">
                    Gratuit
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{zone.estimated_time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  <span>
                    {zone.delivery_fee > 0 
                      ? `Frais: ${zone.delivery_fee}€` 
                      : 'Livraison gratuite'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4" />
                  <span>Minimum: {zone.min_order}€</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Astuce:</strong> Livraison gratuite à Grand-Couronne Centre dès 15€ de commande!
          </p>
        </div>
      </div>
    </section>
  );
}
