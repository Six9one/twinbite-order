import { useState } from 'react';
import { MenuCategory } from '@/types/order';
import { 
  categoryLabels, 
  categoryOrder,
  mlawi,
  panini,
  croques,
  frites,
  milkshakes,
  crepes,
  gaufres,
  boissons,
} from '@/data/menu';
import { useOrder } from '@/context/OrderContext';
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { SouffletWizard } from '@/components/wizards/SouffletWizard';
import { MakloubWizard } from '@/components/wizards/MakloubWizard';
import { SandwichWizard } from '@/components/wizards/SandwichWizard';
import { SimpleProductWizard } from '@/components/wizards/SimpleProductWizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { isMenuMidiTime } from '@/utils/promotions';

interface CategoryMenuProps {
  onBack: () => void;
  onOpenCart: () => void;
}

// Product category labels (ordered as requested)
const productCategoryLabels: Record<string, string> = {
  pizzas: "🍕 Pizzas",
  soufflets: "🥙 Soufflé",
  makloub: "🌯 Makloub",
  mlawi: "🫓 Mlawi",
  sandwiches: "🥖 Sandwich (Pain Maison)",
  tacos: "🌮 Tacos",
  panini: "🥪 Panini",
  croques: "🧀 Croques & Tex-Mex",
  frites: "🍟 Frites",
};

// Dessert category labels
const dessertCategoryLabels: Record<string, string> = {
  milkshakes: "🥤 Milkshakes",
  crepes: "🥞 Crêpes",
  gaufres: "🧇 Gaufres",
  boissons: "🥤 Boissons",
};

// Combined labels for rendering
const allCategoryLabels: Record<string, string> = {
  ...productCategoryLabels,
  ...dessertCategoryLabels,
};

// Product category order (exactly as specified)
const productCategoryOrder: string[] = [
  'pizzas',
  'soufflets',
  'makloub',
  'mlawi',
  'sandwiches',
  'tacos',
  'panini',
  'croques',
  'frites',
];

// Dessert category order
const dessertCategoryOrder: string[] = [
  'milkshakes',
  'crepes',
  'gaufres',
  'boissons',
];

export function CategoryMenu({ onBack, onOpenCart }: CategoryMenuProps) {
  const { orderType, getItemCount, getTotal } = useOrder();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const itemCount = getItemCount();

  const orderTypeLabels = {
    emporter: 'À emporter',
    livraison: 'Livraison',
    surplace: 'Sur place',
  };

  const promoText = orderType === 'livraison' 
    ? '2 achetées = 1 offerte' 
    : orderType ? '1 achetée = 1 offerte' : null;

  const showMenuMidi = isMenuMidiTime();

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const renderWizard = () => {
    switch (selectedCategory) {
      case 'pizzas':
        return <PizzaWizard onClose={() => setSelectedCategory(null)} />;
      case 'sandwiches':
        return <SandwichWizard onClose={() => setSelectedCategory(null)} />;
      case 'tacos':
        return <TacosWizard onClose={() => setSelectedCategory(null)} />;
      case 'soufflets':
        return <SouffletWizard onClose={() => setSelectedCategory(null)} />;
      case 'makloub':
        return <MakloubWizard onClose={() => setSelectedCategory(null)} />;
      case 'mlawi':
        return (
          <SimpleProductWizard 
            items={mlawi} 
            title="Mlawi" 
            showMenuOption 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'panini':
        return (
          <SimpleProductWizard 
            items={panini} 
            title="Panini" 
            showMenuOption 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'croques':
        return (
          <SimpleProductWizard 
            items={croques} 
            title="Croques & Tex-Mex" 
            showMenuOption 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'frites':
        return (
          <SimpleProductWizard 
            items={frites} 
            title="Frites" 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'milkshakes':
        return (
          <SimpleProductWizard 
            items={milkshakes} 
            title="Milkshakes" 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'crepes':
        return (
          <SimpleProductWizard 
            items={crepes} 
            title="Crêpes" 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'gaufres':
        return (
          <SimpleProductWizard 
            items={gaufres} 
            title="Gaufres" 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      case 'boissons':
        return (
          <SimpleProductWizard 
            items={boissons} 
            title="Boissons" 
            onClose={() => setSelectedCategory(null)} 
          />
        );
      default:
        return null;
    }
  };

  if (selectedCategory) {
    return renderWizard();
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-display font-bold">Notre Menu</h1>
                {orderType && (
                  <Badge variant="outline" className="mt-1">
                    {orderTypeLabels[orderType]}
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="default" 
              className="relative"
              onClick={onOpenCart}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {getTotal().toFixed(2)}€
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </div>

          {/* Promo Banner */}
          {(promoText || showMenuMidi) && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {promoText && (
                <Badge className="bg-primary/10 text-primary whitespace-nowrap">
                  🍕 Pizzas: {promoText}
                </Badge>
              )}
              {showMenuMidi && (
                <Badge className="bg-yellow-500/10 text-yellow-600 whitespace-nowrap">
                  ☀️ Menu Midi disponible (11h-15h)
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-display font-bold mb-4 text-foreground">🍽️ Nos Produits</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {productCategoryOrder.map((category) => (
            <Card
              key={category}
              className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30 text-center overflow-hidden relative"
              onClick={() => handleCategoryClick(category)}
            >
              {category === 'sandwiches' && (
                <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">NEW</Badge>
              )}
              <span className="text-3xl sm:text-4xl mb-3 block">
                {allCategoryLabels[category]?.split(' ')[0]}
              </span>
              <h3 className="font-display font-semibold text-sm sm:text-base truncate">
                {allCategoryLabels[category]?.split(' ').slice(1).join(' ')}
              </h3>
              {category === 'pizzas' && promoText && (
                <p className="text-xs text-primary mt-1 truncate">{promoText}</p>
              )}
            </Card>
          ))}
        </div>

        {/* Desserts Grid */}
        <h2 className="text-xl font-display font-bold mb-4 text-foreground">🍨 Desserts & Boissons</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dessertCategoryOrder.map((category) => (
            <Card
              key={category}
              className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30 text-center overflow-hidden relative"
              onClick={() => handleCategoryClick(category)}
            >
              <span className="text-3xl sm:text-4xl mb-3 block">
                {allCategoryLabels[category]?.split(' ')[0]}
              </span>
              <h3 className="font-display font-semibold text-sm sm:text-base truncate">
                {allCategoryLabels[category]?.split(' ').slice(1).join(' ')}
              </h3>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden">
          <Button 
            className="w-full h-14 text-lg shadow-lg"
            onClick={onOpenCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Voir le panier ({itemCount}) - {getTotal().toFixed(2)}€
          </Button>
        </div>
      )}
    </div>
  );
}
