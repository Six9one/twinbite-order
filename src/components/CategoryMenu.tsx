import { useState } from 'react';
import {
  croques,
  frites,
  crepes,
  gaufres,
  boissons,
  salades,
} from '@/data/menu';
import { useOrder } from '@/context/OrderContext';
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';
import { SandwichWizard } from '@/components/wizards/SandwichWizard';
import { PaniniWizard } from '@/components/wizards/PaniniWizard';
import { MilkshakeWizard } from '@/components/wizards/MilkshakeWizard';
import { SimpleProductWizard } from '@/components/wizards/SimpleProductWizard';
import { TexMexWizard } from '@/components/wizards/TexMexWizard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { isMenuMidiTime } from '@/utils/promotions';
import { MenuItem, MenuCategory } from '@/types/order';
import { useProductsByCategory, Product } from '@/hooks/useProducts';
import { useCategoryImages } from '@/hooks/useCategoryImages';

interface CategoryMenuProps {
  onBack: () => void;
  onOpenCart: () => void;
}

// Product category labels (ordered as requested)
const productCategoryLabels: Record<string, string> = {
  pizzas: "🍕 Pizzas",
  soufflets: "🥙 Soufflet",
  makloub: "🌯 Makloub",
  mlawi: "🫓 Mlawi",
  sandwiches: "🥖 Sandwich (Pain Maison)",
  tacos: "🌮 Tacos",
  panini: "🥪 Panini",
  croques: "🧀 Croques",
  texmex: "🌶️ Tex-Mex",
  frites: "🍟 Frites",
  salades: "🥗 Salade",
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
  'texmex',
  'frites',
  'salades',
];

// Dessert category order
const dessertCategoryOrder: string[] = [
  'milkshakes',
  'crepes',
  'gaufres',
  'boissons',
];

// Helper to map DB products to MenuItem format
function mapProductsToMenuItems(
  products: Product[] | undefined,
  category: MenuCategory,
  fallback: MenuItem[],
): MenuItem[] {
  if (!products || products.length === 0) return fallback;
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: Number(p.base_price),
    category,
    imageUrl: p.image_url ?? undefined,
  }));
}

export function CategoryMenu({ onBack, onOpenCart }: CategoryMenuProps) {
  const { orderType, getItemCount, getTotal } = useOrder();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const itemCount = getItemCount();
  const { getImageOrEmoji, getDisplayName } = useCategoryImages();

  // Load products from backend for simple categories (fallback to static data)
  const { data: croquesProducts } = useProductsByCategory('croques');
  const { data: fritesProducts } = useProductsByCategory('frites');
  const { data: crepeProducts } = useProductsByCategory('crepes');
  const { data: gaufreProducts } = useProductsByCategory('gaufres');
  const { data: boissonsProducts } = useProductsByCategory('boissons');
  const { data: saladesProducts } = useProductsByCategory('salades');


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
        return <UnifiedProductWizard productType="soufflet" onClose={() => setSelectedCategory(null)} />;
      case 'makloub':
        return <UnifiedProductWizard productType="makloub" onClose={() => setSelectedCategory(null)} />;
      case 'mlawi':
        return <UnifiedProductWizard productType="mlawi" onClose={() => setSelectedCategory(null)} />;
      case 'panini':
        return <PaniniWizard onClose={() => setSelectedCategory(null)} />;
      case 'croques':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(croquesProducts, 'croques', croques)}
            title="Croques"
            showMenuOption
            onClose={() => setSelectedCategory(null)}
          />
        );
      case 'texmex':
        return <TexMexWizard onClose={() => setSelectedCategory(null)} />;
      case 'frites':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(fritesProducts, 'frites', frites)}
            title="Frites"
            onClose={() => setSelectedCategory(null)}
          />
        );
      case 'milkshakes':
        return <MilkshakeWizard onClose={() => setSelectedCategory(null)} />;
      case 'crepes':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(crepeProducts, 'crepes', crepes)}
            title="Crêpes"
            onClose={() => setSelectedCategory(null)}
          />
        );
      case 'gaufres':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(gaufreProducts, 'gaufres', gaufres)}
            title="Gaufres"
            onClose={() => setSelectedCategory(null)}
          />
        );
      case 'boissons':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(boissonsProducts, 'boissons', boissons)}
            title="Boissons"
            onClose={() => setSelectedCategory(null)}
          />
        );
      case 'salades':
        return (
          <SimpleProductWizard
            items={mapProductsToMenuItems(saladesProducts, 'salades', salades)}
            title="Salade"
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
          {productCategoryOrder.map((category) => {
            const imageData = getImageOrEmoji(category);
            const displayName = getDisplayName(category) || allCategoryLabels[category]?.split(' ').slice(1).join(' ');

            return (
              <Card
                key={category}
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30 text-center overflow-hidden relative"
                onClick={() => handleCategoryClick(category)}
              >
                {category === 'sandwiches' && (
                  <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">Nouveau</Badge>
                )}

                {/* Image or Emoji */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full overflow-hidden border-4 border-amber-400/30 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  {imageData.type === 'image' ? (
                    <img
                      src={imageData.value}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{imageData.value}</span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-sm sm:text-base truncate">
                  {displayName}
                </h3>
                {category === 'pizzas' && promoText && (
                  <p className="text-xs text-primary mt-1 truncate">{promoText}</p>
                )}
              </Card>
            );
          })}
        </div>

        {/* Desserts Grid */}
        <h2 className="text-xl font-display font-bold mb-4 text-foreground">🍨 Desserts & Boissons</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dessertCategoryOrder.map((category) => {
            const imageData = getImageOrEmoji(category);
            const displayName = getDisplayName(category) || allCategoryLabels[category]?.split(' ').slice(1).join(' ');

            return (
              <Card
                key={category}
                className="p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30 text-center overflow-hidden relative"
                onClick={() => handleCategoryClick(category)}
              >
                {/* Image or Emoji */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full overflow-hidden border-4 border-amber-400/30 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  {imageData.type === 'image' ? (
                    <img
                      src={imageData.value}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{imageData.value}</span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-sm sm:text-base truncate">
                  {displayName}
                </h3>
              </Card>
            );
          })}
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
