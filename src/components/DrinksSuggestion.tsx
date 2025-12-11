import { useDrinks } from '@/hooks/useSupabaseData';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrinksSuggestionProps {
  selectedDrinks: string[];
  onToggleDrink: (drinkId: string, drinkName: string, drinkPrice: number) => void;
}

export function DrinksSuggestion({ selectedDrinks, onToggleDrink }: DrinksSuggestionProps) {
  const { data: drinks, isLoading } = useDrinks();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">🥤 Ajouter une boisson ?</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-16 w-24 bg-muted rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">🥤 Ajouter une boisson ?</h4>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {drinks?.slice(0, 6).map((drink) => {
          const isSelected = selectedDrinks.includes(drink.id);
          return (
            <button
              key={drink.id}
              type="button"
              onClick={() => onToggleDrink(drink.id, drink.name, drink.price)}
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
                <span>{drink.name}</span>
                <span className="font-semibold">{drink.price}€</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
