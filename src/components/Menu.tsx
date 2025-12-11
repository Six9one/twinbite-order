import { useState } from 'react';
import { menuItems, categoryLabels } from '@/data/menu';
import { MenuCategory } from '@/types/order';
import { MenuCard } from './MenuCard';
import { SouffletBuilder } from './SouffletBuilder';

const categories: MenuCategory[] = ['pizzas', 'soufflets', 'makloub', 'tacos', 'sandwiches', 'panini', 'boissons'];

export function Menu() {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('pizzas');
  const [showSouffletBuilder, setShowSouffletBuilder] = useState(false);

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  if (showSouffletBuilder) {
    return <SouffletBuilder onClose={() => setShowSouffletBuilder(false)} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Category Tabs */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur-sm py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="font-display text-3xl font-bold mb-6">{categoryLabels[activeCategory]}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              onCustomize={item.category === 'soufflets' ? () => setShowSouffletBuilder(true) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
