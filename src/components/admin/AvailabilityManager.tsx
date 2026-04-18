import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDisabledCategories } from '@/hooks/useDisabledCategories';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

// All categories that can be toggled on/off — matches CategoryMenu order
const ALL_CATEGORIES = [
    { slug: 'pizzas', label: '🍕 Pizzas', section: 'Produits' },
    { slug: 'soufflets', label: '🥙 Soufflet', section: 'Produits' },
    { slug: 'makloub', label: '🌯 Makloub', section: 'Produits' },
    { slug: 'mlawi', label: '🫓 Mlawi', section: 'Produits' },
    { slug: 'sandwiches', label: '🥖 Sandwich', section: 'Produits' },
    { slug: 'tacos', label: '🌮 Tacos', section: 'Produits' },
    { slug: 'panini', label: '🥪 Panini', section: 'Produits' },
    { slug: 'croques', label: '🧀 Croques', section: 'Produits' },
    { slug: 'texmex', label: '🌶️ Tex-Mex', section: 'Produits' },
    { slug: 'frites', label: '🍟 Frites', section: 'Produits' },
    { slug: 'salades', label: '🥗 Salade', section: 'Produits' },
    { slug: 'milkshakes', label: '🥤 Milkshakes', section: 'Desserts & Boissons' },
    { slug: 'crepes', label: '🥞 Crêpes', section: 'Desserts & Boissons' },
    { slug: 'gaufres', label: '🧇 Gaufres', section: 'Desserts & Boissons' },
    { slug: 'boissons', label: '🥤 Boissons', section: 'Desserts & Boissons' },
];

export function AvailabilityManager() {
    const { disabledCategories, loading, toggleCategory, isCategoryDisabled } = useDisabledCategories();
    const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

    const handleToggle = async (slug: string) => {
        setTogglingSlug(slug);
        try {
            await toggleCategory(slug);
            const wasDisabled = isCategoryDisabled(slug);
            toast.success(
                wasDisabled
                    ? `✅ ${ALL_CATEGORIES.find(c => c.slug === slug)?.label} est maintenant DISPONIBLE`
                    : `🚫 ${ALL_CATEGORIES.find(c => c.slug === slug)?.label} est maintenant INDISPONIBLE`
            );
        } catch (error) {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setTogglingSlug(null);
        }
    };

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    const disabledCount = disabledCategories.length;
    const productCategories = ALL_CATEGORIES.filter(c => c.section === 'Produits');
    const dessertCategories = ALL_CATEGORIES.filter(c => c.section === 'Desserts & Boissons');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-amber-500" />
                        Disponibilité des Produits
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Désactivez les catégories qui ne sont pas disponibles. Elles disparaîtront du menu client.
                    </p>
                </div>
            </div>

            {/* Status Summary */}
            <Card className={`p-4 ${disabledCount > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                <div className="flex items-center gap-3">
                    {disabledCount > 0 ? (
                        <>
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <EyeOff className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-red-700">
                                    {disabledCount} catégorie{disabledCount > 1 ? 's' : ''} désactivée{disabledCount > 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-red-600/70">
                                    {disabledCategories.map(slug =>
                                        ALL_CATEGORIES.find(c => c.slug === slug)?.label || slug
                                    ).join(', ')}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-700">Tous les produits sont disponibles</p>
                                <p className="text-sm text-green-600/70">Toutes les catégories sont visibles pour les clients</p>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Products Section */}
            <div>
                <h3 className="text-lg font-semibold mb-3">🍽️ Produits</h3>
                <div className="grid gap-2">
                    {productCategories.map((category) => {
                        const isDisabled = isCategoryDisabled(category.slug);
                        const isToggling = togglingSlug === category.slug;

                        return (
                            <Card
                                key={category.slug}
                                className={`p-4 transition-all ${isDisabled
                                        ? 'opacity-50 bg-red-500/5 border-red-500/20'
                                        : 'bg-green-500/5 border-green-500/20'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{category.label.split(' ')[0]}</span>
                                        <div>
                                            <h4 className="font-semibold">{category.label.split(' ').slice(1).join(' ')}</h4>
                                            <Badge
                                                variant={isDisabled ? "destructive" : "default"}
                                                className={`text-xs mt-0.5 ${!isDisabled ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                            >
                                                {isDisabled ? (
                                                    <><EyeOff className="w-3 h-3 mr-1" /> Indisponible</>
                                                ) : (
                                                    <><Eye className="w-3 h-3 mr-1" /> Disponible</>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isToggling && (
                                            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                                        )}
                                        <Switch
                                            checked={!isDisabled}
                                            onCheckedChange={() => handleToggle(category.slug)}
                                            disabled={isToggling}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Desserts & Drinks Section */}
            <div>
                <h3 className="text-lg font-semibold mb-3">🍨 Desserts & Boissons</h3>
                <div className="grid gap-2">
                    {dessertCategories.map((category) => {
                        const isDisabled = isCategoryDisabled(category.slug);
                        const isToggling = togglingSlug === category.slug;

                        return (
                            <Card
                                key={category.slug}
                                className={`p-4 transition-all ${isDisabled
                                        ? 'opacity-50 bg-red-500/5 border-red-500/20'
                                        : 'bg-green-500/5 border-green-500/20'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{category.label.split(' ')[0]}</span>
                                        <div>
                                            <h4 className="font-semibold">{category.label.split(' ').slice(1).join(' ')}</h4>
                                            <Badge
                                                variant={isDisabled ? "destructive" : "default"}
                                                className={`text-xs mt-0.5 ${!isDisabled ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                            >
                                                {isDisabled ? (
                                                    <><EyeOff className="w-3 h-3 mr-1" /> Indisponible</>
                                                ) : (
                                                    <><Eye className="w-3 h-3 mr-1" /> Disponible</>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isToggling && (
                                            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                                        )}
                                        <Switch
                                            checked={!isDisabled}
                                            onCheckedChange={() => handleToggle(category.slug)}
                                            disabled={isToggling}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Info */}
            <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                <p className="text-sm text-amber-700">
                    💡 <strong>Astuce:</strong> Quand un produit n&apos;est plus disponible (plus de stock, problème de matière première...),
                    désactivez-le ici. Il disparaîtra immédiatement du menu client. Réactivez-le quand il est de nouveau disponible.
                </p>
            </Card>
        </div>
    );
}
