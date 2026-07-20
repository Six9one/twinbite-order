import { useState } from 'react';
import { MenuItem } from '@/types/order';
import { pizzaIngredientSupplements } from '@/data/menu';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, X, Plus, Check, Pizza } from 'lucide-react';

export interface PizzaExtra {
  id: string;
  name: string;
  price: number;
}

interface PizzaIngredientCustomizerProps {
  pizza: MenuItem;
  basePrice: number;
  formatLabel: string;
  initialBase?: 'tomate' | 'creme';
  onConfirm: (removedIngredients: string[], addedExtras: PizzaExtra[], note: string, base: 'tomate' | 'creme') => void;
  onBack: () => void;
  isKiosk?: boolean;
}

/**
 * Parse a pizza description string into individual ingredient chips.
 * e.g. "Sauce tomate, Mozzarella, merguez, poivron, œuf" → ["Sauce tomate", "Mozzarella", "merguez", "poivron", "œuf"]
 */
function parseIngredients(description: string): string[] {
  return description
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export function PizzaIngredientCustomizer({
  pizza,
  basePrice,
  formatLabel,
  initialBase,
  onConfirm,
  onBack,
  isKiosk = false,
}: PizzaIngredientCustomizerProps) {
  const ingredients = parseIngredients(pizza.description || '');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedExtras, setAddedExtras] = useState<PizzaExtra[]>([]);
  const [note, setNote] = useState('');
  const [selectedBase, setSelectedBase] = useState<'tomate' | 'creme'>(initialBase || 'tomate');

  const toggleIngredient = (ingredient: string) => {
    setRemovedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const toggleExtra = (extra: typeof pizzaIngredientSupplements[0]) => {
    setAddedExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, { id: extra.id, name: extra.name, price: extra.price }];
    });
  };

  const extrasTotal = addedExtras.reduce((sum, e) => sum + e.price, 0);
  const totalPrice = basePrice + extrasTotal;

  const isExtraSelected = (id: string) => addedExtras.some(e => e.id === id);
  const isIngredientRemoved = (ing: string) => removedIngredients.includes(ing);

  // Kiosk-specific large-touch styles
  const kioskCard = isKiosk ? 'min-h-[80px] text-lg' : 'min-h-[56px] text-sm';
  const kioskIngChip = isKiosk ? 'text-base px-5 py-3' : 'text-sm px-3 py-1.5';
  const kioskBtn = isKiosk ? 'h-20 text-xl' : 'h-14 text-base';

  return (
    <div className={`flex flex-col bg-background ${isKiosk ? 'min-h-screen pb-6' : 'min-h-screen pb-24'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size={isKiosk ? 'default' : 'icon'} onClick={onBack}
              className={isKiosk ? 'h-14 w-14' : 'h-10 w-10'}>
              <ArrowLeft className={isKiosk ? 'w-7 h-7' : 'w-5 h-5'} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`font-display font-bold truncate ${isKiosk ? 'text-3xl' : 'text-xl'}`}>
                🍕 {pizza.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {formatLabel}
                </Badge>
              </div>
            </div>
            <span className={`font-bold text-primary flex-shrink-0 ${isKiosk ? 'text-3xl' : 'text-xl'}`}>
              {totalPrice.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-4 py-6 space-y-8 ${isKiosk ? 'max-w-4xl' : ''}`}>

        {/* Pizza Image */}
        <div className="flex justify-center">
          <div className={`rounded-full overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 border-4 border-orange-200 shadow-xl flex items-center justify-center ${isKiosk ? 'w-44 h-44' : 'w-36 h-36'}`}>
            {pizza.imageUrl ? (
              <img src={pizza.imageUrl} alt={pizza.name} className="w-full h-full object-contain animate-spin-slow" />
            ) : (
              <Pizza className={`text-orange-300 ${isKiosk ? 'w-20 h-20' : 'w-16 h-16'}`} />
            )}
          </div>
        </div>

        {/* BASE SAUCE TOGGLE */}
        <div className={`rounded-2xl border-2 p-4 space-y-3 ${selectedBase !== (initialBase || 'tomate') ? 'border-amber-400 bg-amber-50/60' : 'border-border bg-muted/20'}`}>
          <div className="flex items-center gap-2">
            <span className={isKiosk ? 'text-2xl' : 'text-base'}>🫙</span>
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>Base de sauce</h2>
            {selectedBase !== (initialBase || 'tomate') && (
              <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-3 py-1">Modifiée</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedBase('tomate')}
              className={`rounded-xl border-2 font-semibold transition-all flex flex-col items-center justify-center gap-1 ${isKiosk ? 'py-5 text-lg' : 'py-4 text-sm'} ${
                selectedBase === 'tomate'
                  ? 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-200'
                  : 'border-border hover:border-red-300 hover:bg-red-50/30'
              }`}
            >
              <span className={isKiosk ? 'text-4xl' : 'text-3xl'}>🍅</span>
              Sauce Tomate
              {selectedBase === 'tomate' && <span className="text-xs">✓ Sélectionné</span>}
            </button>
            <button
              onClick={() => setSelectedBase('creme')}
              className={`rounded-xl border-2 font-semibold transition-all flex flex-col items-center justify-center gap-1 ${isKiosk ? 'py-5 text-lg' : 'py-4 text-sm'} ${
                selectedBase === 'creme'
                  ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200'
                  : 'border-border hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <span className={isKiosk ? 'text-4xl' : 'text-3xl'}>🥛</span>
              Crème Fraîche
              {selectedBase === 'creme' && <span className="text-xs">✓ Sélectionné</span>}
            </button>
          </div>
        </div>

        {/* SECTION 1: Removable Ingredients */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>
              Retirer des ingrédients
            </h2>
            <span className={`text-muted-foreground ${isKiosk ? 'text-base' : 'text-sm'}`}>(gratuit)</span>
          </div>
          <p className={`text-muted-foreground ${isKiosk ? 'text-base' : 'text-sm'}`}>
            Appuyez pour retirer un ingrédient ✕
          </p>
          <div className="flex flex-wrap gap-2">
            {ingredients.length > 0 ? (
              ingredients.map(ingredient => {
                const removed = isIngredientRemoved(ingredient);
                return (
                  <button
                    key={ingredient}
                    onClick={() => toggleIngredient(ingredient)}
                    className={`rounded-full border-2 font-medium transition-all ${kioskIngChip} ${
                      removed
                        ? 'border-red-400 bg-red-50 text-red-400 line-through opacity-60'
                        : 'border-green-400 bg-green-50 text-green-800 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    {removed ? '✕ ' : '✓ '}{ingredient}
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm italic">Aucun ingrédient listé.</p>
            )}
          </div>
          {removedIngredients.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <span className="font-semibold">Sans :</span> {removedIngredients.join(', ')}
            </div>
          )}
        </div>

        {/* SECTION 2: Addable Extras */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h2 className={`font-bold ${isKiosk ? 'text-2xl' : 'text-lg'}`}>
              Ajouter des extras
            </h2>
          </div>
          <div className={`grid gap-3 ${isKiosk ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {pizzaIngredientSupplements.map(extra => {
              const selected = isExtraSelected(extra.id);
              return (
                <Card
                  key={extra.id}
                  onClick={() => toggleExtra(extra)}
                  className={`cursor-pointer transition-all select-none ${kioskCard} p-3 flex flex-col items-center justify-center gap-1 border-2 ${
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <span className={isKiosk ? 'text-3xl' : 'text-2xl'}>{extra.emoji}</span>
                  <span className={`font-semibold text-center leading-tight ${isKiosk ? 'text-base' : 'text-xs'}`}>
                    {extra.name}
                  </span>
                  <span className={`font-bold text-primary ${isKiosk ? 'text-base' : 'text-xs'}`}>
                    +{extra.price.toFixed(2)}€
                  </span>
                  {selected && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {addedExtras.length > 0 && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <span className="font-semibold">Extras :</span>{' '}
              {addedExtras.map(e => `${e.name} (+${e.price.toFixed(2)}€)`).join(', ')}
              <span className="ml-2 font-bold">= +{extrasTotal.toFixed(2)}€</span>
            </div>
          )}
        </div>

        {/* SECTION 3: Note */}
        {!isKiosk && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold">📝 Notes / Remarques</h2>
            <Textarea
              placeholder="Ex: bien cuite, sauce à part, sans origan..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Kiosk note field */}
        {isKiosk && (
          <div className="space-y-2">
            <h2 className="text-xl font-bold">📝 Remarque</h2>
            <Textarea
              placeholder="Ex: bien cuite, sauce à part..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="resize-none text-lg h-20"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
        <div className={`mx-auto ${isKiosk ? 'max-w-4xl' : 'container'}`}>
          <Button
            className={`w-full rounded-xl font-bold ${kioskBtn}`}
            onClick={() => onConfirm(removedIngredients, addedExtras, note, selectedBase)}
          >
            ✅ Ajouter au panier — {totalPrice.toFixed(2)}€
          </Button>
        </div>
      </div>
    </div>
  );
}
