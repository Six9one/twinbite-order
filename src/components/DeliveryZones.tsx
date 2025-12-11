import { MapPin, Clock, Truck } from 'lucide-react';
import { deliveryZones } from '@/data/menu';

export function DeliveryZones() {
  return (
    <section className="py-12 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold mb-2">
            Zones de <span className="text-primary">Livraison</span>
          </h2>
          <p className="text-muted-foreground">Nous livrons dans toute la ville et ses environs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {deliveryZones.map((zone) => (
            <div
              key={zone.id}
              className="bg-background rounded-xl p-5 border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{zone.name}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{zone.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      <span>
                        {zone.deliveryFee === 0 
                          ? 'Livraison gratuite' 
                          : `Frais: ${zone.deliveryFee.toFixed(2)} €`}
                      </span>
                    </div>
                    <p className="text-xs mt-2 text-primary font-medium">
                      Min. commande: {zone.minOrder} €
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Livraison gratuite à partir de 25€ en centre-ville
        </p>
      </div>
    </section>
  );
}
