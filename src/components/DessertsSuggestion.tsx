import { useDesserts } from '@/hooks/useSupabaseData';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DessertsSuggestionProps {
  selectedDesserts: string[];
  onToggleDessert: (dessertId: string, dessertName: string, dessertPrice: number) => void;
}

export function DessertsSuggestion({ selectedDesserts, onToggleDessert }: DessertsSuggestionProps) {
  const { data: desserts, isLoading } = useDesserts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">🍰 Un dessert pour finir ?</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 w-24 bg-muted rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">🍰 Un dessert pour finir ?</h4>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {desserts?.map((dessert) => {
          const isSelected = selectedDesserts.includes(dessert.id);
          return (
            <button
              key={dessert.id}
              type="button"
              onClick={() => onToggleDessert(dessert.id, dessert.name, dessert.price)}
              className={cn(
                "flex-shrink-0 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                {isSelected ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{dessert.name}</span>
                <span className="font-semibold">{dessert.price}€</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
