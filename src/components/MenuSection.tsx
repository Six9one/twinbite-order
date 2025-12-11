import { useState } from 'react';
import { menuItems, categoryLabels } from '@/data/menu';
import { MenuCategory } from '@/types/order';
import { MenuCard } from './MenuCard';

const categories: MenuCategory[] = ['pizzas', 'soufflets', 'makloub', 'tacos', 'sandwiches', 'panini', 'boissons'];

interface MenuSectionProps {
  onCustomizeSoufflet: () => void;
}

export function MenuSection({ onCustomizeSoufflet }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('pizzas');

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  return (
    <section className="py-12" id="menu">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold mb-2">
            Notre <span className="text-primary">Menu</span>
          </h2>
          <p className="text-muted-foreground">Découvrez nos délicieuses spécialités</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide justify-start md:justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border'
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {filteredItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              onCustomize={item.category === 'soufflets' ? onCustomizeSoufflet : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
