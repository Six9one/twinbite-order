import { useState } from 'react';
import { useDeliveryZones, DeliveryZone } from '@/hooks/useSupabaseData';
import { MapPin, Clock, Truck, ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DeliveryZoneSelectorProps {
  selectedZone: DeliveryZone | null;
  onZoneSelect: (zone: DeliveryZone) => void;
  address: string;
  onAddressChange: (address: string) => void;
}

export function DeliveryZoneSelector({
  selectedZone,
  onZoneSelect,
  address,
  onAddressChange
}: DeliveryZoneSelectorProps) {
  const { data: zones, isLoading } = useDeliveryZones();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address" className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Adresse de livraison
        </Label>
        <Input
          id="address"
          placeholder="Entrez votre adresse..."
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          Zone de livraison
        </Label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between",
              selectedZone 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            {selectedZone ? (
              <div>
                <p className="font-medium">{selectedZone.name}</p>
                <p className="text-sm text-muted-foreground">
                  Min. {selectedZone.min_order}€ • {selectedZone.delivery_fee > 0 ? `${selectedZone.delivery_fee}€ livraison` : 'Livraison gratuite'} • {selectedZone.estimated_time}
                </p>
              </div>
            ) : (
              <span className="text-muted-foreground">Sélectionnez votre zone...</span>
            )}
            <ChevronDown className={cn(
              "w-5 h-5 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-lg overflow-hidden z-50">
              {zones?.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    onZoneSelect(zone);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-b last:border-b-0",
                    selectedZone?.id === zone.id && "bg-primary/5"
                  )}
                >
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Min. {zone.min_order}€</span>
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {zone.delivery_fee > 0 ? `${zone.delivery_fee}€` : 'Gratuit'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {zone.estimated_time}
                      </span>
                    </div>
                  </div>
                  {selectedZone?.id === zone.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedZone && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>📍 {selectedZone.name}</strong><br />
            Commande minimum: <strong>{selectedZone.min_order}€</strong><br />
            Frais de livraison: <strong>{selectedZone.delivery_fee > 0 ? `${selectedZone.delivery_fee}€` : 'Gratuit'}</strong><br />
            Délai estimé: <strong>{selectedZone.estimated_time}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
