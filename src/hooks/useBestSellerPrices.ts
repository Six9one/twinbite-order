import { useMemo } from 'react';
import { pizzasTomate, pizzasCreme } from '@/data/menu';
import { useProductsByCategory } from './useProducts';
import { useProductSizePrices } from './useProductSizePrices';

/**
 * Minimal shape needed to price a best-seller. Declared structurally on purpose:
 * importing BestSellerPreset from the component would create a circular import,
 * since the component is what calls this hook.
 */
export interface PricablePreset {
  id: string;
  /** Hardcoded fallback, used when the DB has no matching row. */
  price: number;
  type: string;
  /** Pizza-only: id of the item in src/data/menu.ts. */
  pizzaId?: string;
  /** Wizard products: 'solo' | 'double' | 'triple'. */
  size?: string;
}

/** Accent- and case-insensitive, so "Pecheur" matches "Pêcheur". */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Resolves live prices for the Top Ventes carousel.
 *
 * Pizzas come from `products.base_price` (matched by name via their menu.ts entry);
 * soufflet/tacos/makloub come from `product_size_prices` keyed by product_type + size_id --
 * the same table the wizards price from, so the carousel can no longer drift from checkout.
 * Any preset without a DB match keeps its hardcoded price, so the slider never renders blank.
 */
export function useBestSellerPrices(presets: PricablePreset[]): Record<string, number> {
  const { data: dbPizzas = [] } = useProductsByCategory('pizzas');
  const { data: dbSizePrices = [] } = useProductSizePrices();

  return useMemo(() => {
    const menuPizzas = [...pizzasTomate, ...pizzasCreme];

    const pizzaByName = new Map<string, number>();
    for (const p of dbPizzas) {
      if (p?.name && typeof p.base_price === 'number') {
        pizzaByName.set(norm(p.name), p.base_price);
      }
    }

    const sizeByKey = new Map<string, number>();
    for (const s of dbSizePrices) {
      if (typeof s.price === 'number') {
        sizeByKey.set(`${s.product_type}:${s.size_id}`, s.price);
      }
    }

    const resolved: Record<string, number> = {};
    for (const preset of presets) {
      let live: number | undefined;

      if (preset.pizzaId) {
        const item = menuPizzas.find((m) => m.id === preset.pizzaId);
        if (item) live = pizzaByName.get(norm(item.name));
      } else if (preset.size) {
        live = sizeByKey.get(`${preset.type}:${preset.size}`);
      }

      resolved[preset.id] = typeof live === 'number' && live > 0 ? live : preset.price;
    }

    return resolved;
  }, [presets, dbPizzas, dbSizePrices]);
}
