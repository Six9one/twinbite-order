import React, { useMemo } from 'react';
import { StackedCarousel, StackedCarouselItem } from '@/components/ui/stacked-carousel';
import { useBestSellerPrices } from '@/hooks/useBestSellerPrices';

export type BestSellerType = 'pizza' | 'soufflet' | 'tacos' | 'makloub';

export interface BestSellerPreset {
  id: string;
  name: string;
  price: number;
  type: BestSellerType;
  image: string;
  rank: number;
  /** Pizza-only: id of the existing pizza in src/data/menu.ts to open directly. */
  pizzaId?: string;
  /** Soufflet/Tacos/Makloub-only: wizard size id ('solo' | 'double' | 'triple'). */
  size?: string;
  /** Soufflet/Tacos/Makloub-only: pre-selected meat names (matched by name in the wizard). */
  meats?: string[];
  /** Soufflet/Tacos/Makloub-only: pre-selected sauce names (matched by name in the wizard). */
  sauces?: string[];
  /** Pizza-only: display-only topping list (pizzas are pre-composed, nothing to pre-select). */
  composition?: string[];
}

export const BEST_SELLERS: BestSellerPreset[] = [
  {
    id: 'pizza-royale',
    name: 'Pizza Royale',
    price: 18,
    type: 'pizza',
    // Real product photo from the DB (Menu Digital > Pizzas > Royale), not the generic category icon.
    image: 'https://hsylnrzxeyqxczdalurj.supabase.co/storage/v1/object/public/product-images/products/f4eda3fc-d268-4039-9fa6-586052b51e95-1783335629898.jpg',
    rank: 1,
    pizzaId: 'pizza-t-14',
    composition: ['Base Tomate', 'Mozzarella', 'Viande hachée', 'Merguez', 'Poivrons'],
  },
  {
    id: 'pizza-4fromages',
    name: 'Pizza 4 Fromages',
    price: 18,
    type: 'pizza',
    image: 'https://hsylnrzxeyqxczdalurj.supabase.co/storage/v1/object/public/product-images/products/9d250a2f-03ba-4226-ba46-94301076ca30-1766440507578.png',
    rank: 2,
    pizzaId: 'pizza-t-9',
    composition: ['Base Tomate', 'Mozzarella', 'Bleu', 'Chèvre', 'Parmesan'],
  },
  {
    id: 'pizza-tartiflette',
    name: 'Pizza Tartiflette',
    price: 18,
    type: 'pizza',
    image: 'https://hsylnrzxeyqxczdalurj.supabase.co/storage/v1/object/public/product-images/products/8fdfec47-2d9c-4a13-a62c-2b5a1c8f4b8c-1766452039692.png',
    rank: 3,
    pizzaId: 'pizza-c-1',
    composition: ['Base Crème', 'Lardons', 'Reblochon', 'Pomme de terre'],
  },
  {
    id: 'soufflet-double-best',
    name: 'Soufflet Double',
    price: 9.0,
    type: 'soufflet',
    image: '/cat_soufflet_3d.webp',
    rank: 4,
    size: 'double',
    meats: ['Escalope marinée', 'Tenders'],
    sauces: ['Mayonnaise', 'Algérienne'],
  },
  {
    id: 'tacos-double-best',
    name: 'Tacos Double',
    price: 9.0,
    type: 'tacos',
    image: '/cat_tacos_3d.webp',
    rank: 5,
    size: 'double',
    meats: ['Tenders', 'Viande hachée'],
    sauces: ['Sauce fromagère', 'Algérienne'],
  },
  {
    id: 'makloub-solo-best',
    name: 'Makloub Solo',
    price: 7.5,
    type: 'makloub',
    image: '/cat_makloub_3d.webp',
    rank: 6,
    size: 'solo',
    meats: ['Escalope marinée'],
    sauces: ['Mayonnaise', 'Harissa'],
  },
];

interface BestSellerSliderProps {
  onSelect: (preset: BestSellerPreset) => void;
}

export function BestSellerSlider({ onSelect }: BestSellerSliderProps) {
  // Prices come from the DB (products / product_size_prices); the values on BEST_SELLERS
  // are only the offline fallback. Keeping them in sync by hand meant the carousel could
  // advertise a price the wizard then contradicted at checkout.
  const prices = useBestSellerPrices(BEST_SELLERS);

  const carouselItems: StackedCarouselItem[] = useMemo(
    () =>
      BEST_SELLERS.map((b) => ({
        id: b.id,
        image: b.image,
        title: b.name,
        subtitle: `${(prices[b.id] ?? b.price).toFixed(2)} €`,
        badge: (
          <span className="absolute top-1.5 left-1.5 z-10 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full shadow-md ring-2 ring-white/85 flex items-center justify-center pointer-events-none">
            {b.rank}
          </span>
        ),
      })),
    [prices]
  );

  return (
    <div>
      <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-1 px-5 flex items-center gap-1.5">
        🔥 Top Ventes
      </h2>
      <StackedCarousel
        items={carouselItems}
        className="h-[190px]"
        cardClassName="w-[132px] h-[156px]"
        onSelect={(item) => {
          const preset = BEST_SELLERS.find((b) => b.id === item.id);
          if (preset) onSelect({ ...preset, price: prices[preset.id] ?? preset.price });
        }}
      />
      <p className="text-center text-[10px] text-[#8C7A6B]/70 -mt-1">Glissez, puis touchez pour choisir</p>
    </div>
  );
}
