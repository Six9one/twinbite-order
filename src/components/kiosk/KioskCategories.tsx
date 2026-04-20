import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCategoryImages } from '@/hooks/useCategoryImages';
import { useDisabledCategories } from '@/hooks/useDisabledCategories';

interface KioskCategoriesProps {
    onSelectCategory: (category: string) => void;
    onBack: () => void;
}

const productCategoryOrder = [
    'pizzas', 'soufflets', 'makloub', 'mlawi', 'sandwiches',
    'tacos', 'panini', 'croques', 'texmex', 'frites', 'salades',
];

const dessertCategoryOrder = [
    'milkshakes', 'crepes', 'gaufres', 'boissons',
];

const categoryLabels: Record<string, string> = {
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
    milkshakes: "🥤 Milkshakes",
    crepes: "🥞 Crêpes",
    gaufres: "🧇 Gaufres",
    boissons: "🥤 Boissons",
};

export function KioskCategories({ onSelectCategory, onBack }: KioskCategoriesProps) {
    const { getImageOrEmoji, getDisplayName } = useCategoryImages();
    const { isCategoryDisabled } = useDisabledCategories();

    const renderCategoryCard = (category: string) => {
        const imageData = getImageOrEmoji(category);
        const displayName = getDisplayName(category) || categoryLabels[category]?.split(' ').slice(1).join(' ');
        const isUnavailable = isCategoryDisabled(category);

        return (
            <Card
                key={category}
                className={`p-4 transition-all border-2 text-center overflow-hidden relative ${
                    isUnavailable
                        ? 'opacity-30 cursor-not-allowed border-transparent grayscale'
                        : 'cursor-pointer hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] border-transparent hover:border-amber-400/50'
                }`}
                onClick={() => !isUnavailable && onSelectCategory(category)}
            >
                {/* Unavailable badge */}
                {isUnavailable && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <span className="bg-red-500/90 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                            Indisponible
                        </span>
                    </div>
                )}

                {/* Image */}
                <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-3 border-amber-400/30 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    {imageData.type === 'image' ? (
                        <img
                            src={imageData.value}
                            alt={displayName}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-4xl">{imageData.value}</span>
                    )}
                </div>

                <h3 className="font-bold text-slate-900 text-base truncate">
                    {displayName}
                </h3>
            </Card>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-auto p-6">
            {/* Back button */}
            <div className="flex items-center mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="text-white/70 hover:text-white hover:bg-white/10 h-10 px-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /> Retour
                </Button>
                <h2 className="text-2xl font-bold text-white ml-4">🍽️ Choisissez une catégorie</h2>
            </div>

            {/* Products Grid */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-amber-400 mb-3">Nos Produits</h3>
                <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
                    {productCategoryOrder.map(renderCategoryCard)}
                </div>
            </div>

            {/* Desserts Grid */}
            <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-3">Desserts & Boissons</h3>
                <div className="grid grid-cols-4 gap-3">
                    {dessertCategoryOrder.map(renderCategoryCard)}
                </div>
            </div>
        </div>
    );
}
