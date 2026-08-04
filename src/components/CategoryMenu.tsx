import { useState, useEffect, useRef } from 'react';
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
import { StreamlinedPizzaWizard } from '@/components/wizards/StreamlinedPizzaWizard';
import { useAdminSetting } from '@/hooks/useAdminSettings';
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
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { isMenuMidiTime } from '@/utils/promotions';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { MenuItem, MenuCategory } from '@/types/order';
import { useProductsByCategory, Product } from '@/hooks/useProducts';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import { useDisabledCategories } from '@/hooks/useDisabledCategories';
import { useDrinks } from '@/hooks/useSupabaseData';

function mapDrinksToMenuItems(
  drinks: any[] | undefined,
  fallback: MenuItem[],
): MenuItem[] {
  if (!drinks || drinks.length === 0) return fallback;
  return drinks.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.name.toLowerCase().includes('canette')
      ? "Ex: Coca-Cola, Fanta, Sprite…"
      : d.name.toLowerCase().includes('bouteille')
      ? "Ex: Coca 1.5L, eau gazeuse…"
      : "Eau minérale",
    price: Number(d.price),
    category: 'boissons',
    imageUrl: d.image_url ?? undefined,
  }));
}

interface CategoryMenuProps {
  onBack: () => void;
  onOpenCart: () => void;
  lockedPizzaSize?: 'senior' | 'mega' | null;
  onClearLockedSize?: () => void;
  initialCategory?: string | null;
}

// Product category labels (ordered as requested)
const productCategoryLabels: Record<string, string> = {
  pizzas: "🍕 Pizzas",
  soufflets: "🥙 Soufflet",
  makloub: "🌯 Makloub",
  mlawi: "🫓 Mlawi",
  sandwiches: "🥖 Sandwich",
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

export function CategoryMenu({ onBack, onOpenCart, lockedPizzaSize, onClearLockedSize, initialCategory }: CategoryMenuProps) {
  const { orderType, getItemCount, getTotal } = useOrder();
  const { data: pizzaOrderingModeSetting } = useAdminSetting('pizza_ordering_mode');
  const pizzaOrderingMode = (pizzaOrderingModeSetting?.setting_value as { mode?: 'classic' | 'streamlined' })?.mode ?? 'classic';
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const itemCount = getItemCount();
  const { getImageOrEmoji, getDisplayName } = useCategoryImages();
  const { isCategoryDisabled } = useDisabledCategories();
  const prevItemCount = useRef(itemCount);
  const [badgePulse, setBadgePulse] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger 1 Lottie animation cycle on new item added, then freeze on final frame
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setBadgePulse(true);
      setAnimationKey(prev => prev + 1);
      const t = setTimeout(() => setBadgePulse(false), 700);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  // Auto-redirect to pizzas if coming from checkout to pick a free pizza
  useEffect(() => {
    if (lockedPizzaSize && !selectedCategory) {
      setSelectedCategory('pizzas');
    }
  }, [lockedPizzaSize]);

  // Load products from backend for simple categories (fallback to static data)
  const { data: croquesProducts } = useProductsByCategory('croques');
  const { data: fritesProducts } = useProductsByCategory('frites');
  const { data: crepeProducts } = useProductsByCategory('crepes');
  const { data: gaufreProducts } = useProductsByCategory('gaufres');
  const { data: dbDrinksData } = useDrinks();
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
        if (pizzaOrderingMode === 'streamlined') {
          return (
            <StreamlinedPizzaWizard
              onClose={() => {
                setSelectedCategory(null);
                if (onClearLockedSize) onClearLockedSize();
              }}
              lockedSize={lockedPizzaSize}
            />
          );
        }
        return (
          <PizzaWizard
            onClose={() => {
              setSelectedCategory(null);
              if (onClearLockedSize) onClearLockedSize();
            }}
            lockedSize={lockedPizzaSize}
          />
        );
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
            items={mapDrinksToMenuItems(dbDrinksData, boissons)}
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

  // Floating cart button component - always visible
  const FloatingCartButton = () => (
    <Button
      onClick={onOpenCart}
      className="fixed top-4 right-4 z-50 btn-primary shadow-xl rounded-full h-12 sm:h-14 px-4 sm:px-5 flex items-center gap-2"
    >
      <ShoppingCart className="w-5 h-5" />
      <span className="font-semibold text-sm sm:text-base">{getTotal().toFixed(2)}€</span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-bold flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </Button>
  );

  if (selectedCategory) {
    return (
      <>
        <FloatingCartButton />
        {renderWizard()}
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="w-10 h-10 sm:w-11 sm:h-11">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold">Notre Menu</h1>
                {orderType && (
                  <Badge variant="outline" className="mt-1">
                    {orderTypeLabels[orderType]}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              onClick={onOpenCart}
              className="relative h-11 px-3 sm:px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
            >
              <div className="w-8 h-8 overflow-hidden flex items-center justify-center -ml-1">
                <DotLottieReact
                  key={animationKey}
                  src="https://lottie.host/80a95770-b2ba-4007-857d-5258ad6242f8/DYZ5mGoQPV.lottie"
                  loop={false}
                  autoplay
                  className="w-9 h-9"
                />
              </div>
              <span className="font-extrabold text-sm sm:text-base">{getTotal().toFixed(2)} €</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs flex items-center justify-center font-black border-2 border-background animate-in zoom-in">
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
                  ☀️ Menu Midi disponible (11h-minuit)
                </Badge>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="mt-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {(() => {
          const query = searchQuery.trim().toLowerCase();
          const filteredProducts = query
            ? productCategoryOrder.filter(cat => {
                const label = (getDisplayName(cat) || allCategoryLabels[cat] || '').toLowerCase();
                return label.includes(query);
              })
            : productCategoryOrder;
          const filteredDesserts = query
            ? dessertCategoryOrder.filter(cat => {
                const label = (getDisplayName(cat) || allCategoryLabels[cat] || '').toLowerCase();
                return label.includes(query);
              })
            : dessertCategoryOrder;

          return (
            <>
              {filteredProducts.length > 0 && (
                <>
                  <h2 className="text-lg sm:text-xl font-display font-bold mb-3 sm:mb-4 text-foreground">🍽️ Nos Produits</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {filteredProducts.map((category) => {
            const imageData = getImageOrEmoji(category);
            const displayName = getDisplayName(category) || allCategoryLabels[category]?.split(' ').slice(1).join(' ');
            const isUnavailable = isCategoryDisabled(category);

            return (
              <Card
                key={category}
                className={`p-3 sm:p-5 transition-all border-2 text-center overflow-hidden relative ${
                  isUnavailable
                    ? 'opacity-40 cursor-not-allowed border-transparent grayscale'
                    : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-transparent hover:border-primary/30'
                }`}
                onClick={() => !isUnavailable && handleCategoryClick(category)}
              >
                {/* Unavailable overlay badge */}
                {isUnavailable && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <span className="bg-red-500/90 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      Indisponible
                    </span>
                  </div>
                )}

                {/* Image or Emoji */}
                <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 rounded-full overflow-hidden border-3 sm:border-4 border-amber-400/30 bg-gradient-to-br from-amber-100 to-brand-100 flex items-center justify-center">
                  {imageData.type === 'image' ? (
                    <OptimizedImage
                      src={imageData.value}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                      showSkeleton={true}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl md:text-4xl">{imageData.value}</span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-xs sm:text-sm md:text-base truncate">
                  {displayName}
                </h3>
                {category === 'pizzas' && promoText && !isUnavailable && (
                  <p className="text-[10px] sm:text-xs text-primary mt-1 truncate">{promoText}</p>
                )}
              </Card>
            );
          })}
                  </div>
                </>
              )}

              {filteredDesserts.length > 0 && (
                <>
                  <h2 className="text-lg sm:text-xl font-display font-bold mb-3 sm:mb-4 text-foreground">🍨 Desserts & Boissons</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {filteredDesserts.map((category) => {
            const imageData = getImageOrEmoji(category);
            const displayName = getDisplayName(category) || allCategoryLabels[category]?.split(' ').slice(1).join(' ');
            const isUnavailable = isCategoryDisabled(category);

            return (
              <Card
                key={category}
                className={`p-3 sm:p-5 transition-all border-2 text-center overflow-hidden relative ${
                  isUnavailable
                    ? 'opacity-40 cursor-not-allowed border-transparent grayscale'
                    : 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-transparent hover:border-primary/30'
                }`}
                onClick={() => !isUnavailable && handleCategoryClick(category)}
              >
                {/* Unavailable overlay badge */}
                {isUnavailable && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <span className="bg-red-500/90 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      Indisponible
                    </span>
                  </div>
                )}

                {/* Image or Emoji */}
                <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 rounded-full overflow-hidden border-3 sm:border-4 border-amber-400/30 bg-gradient-to-br from-amber-100 to-brand-100 flex items-center justify-center">
                  {imageData.type === 'image' ? (
                    <OptimizedImage
                      src={imageData.value}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                      showSkeleton={true}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl md:text-4xl">{imageData.value}</span>
                  )}
                </div>

                <h3 className="font-display font-semibold text-xs sm:text-sm md:text-base truncate">
                  {displayName}
                </h3>
              </Card>
            );
          })}
                  </div>
                </>
              )}

              {filteredProducts.length === 0 && filteredDesserts.length === 0 && (
                <div className="text-center py-16 text-muted-foreground col-span-full">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="font-medium">Aucun résultat pour "{searchQuery}"</p>
                  <p className="text-sm mt-1">Essayez pizzas, tacos, sandwich...</p>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* CategoryMenu bottom unblocked */}
    </div>
  );
}
