import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrder } from '@/context/OrderContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Minus, ShoppingCart, Flame, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface TexMexProduct {
    id: string;
    name: string;
    description: string | null;
    unit_price: number;
    image_url: string | null;
    category?: 'snack' | 'frites' | 'croque';
}

interface TexMexOffer {
    id: string;
    quantity: number;
    price: number;
}

interface SelectedItem {
    product: TexMexProduct;
    quantity: number;
}

interface TexMexWizardProps {
    onClose: () => void;
}

const FALLBACK_SNACKS: TexMexProduct[] = [
    { id: 'wings', name: 'Wings', description: 'Ailes de poulet croustillantes', unit_price: 1.40, image_url: null, category: 'snack' },
    { id: 'tenders', name: 'Tenders', description: 'Tendres de poulet marinés', unit_price: 1.40, image_url: null, category: 'snack' },
    { id: 'nuggets', name: 'Nuggets', description: 'Nuggets de poulet dorés', unit_price: 1.40, image_url: null, category: 'snack' },
    { id: 'mozzastick', name: 'Mozza Stick', description: 'Bâtonnets de mozzarella fondante', unit_price: 1.20, image_url: null, category: 'snack' },
    { id: 'jalapenos', name: 'Jalapeños', description: 'Piments jalapeños farcis au fromage', unit_price: 1.20, image_url: null, category: 'snack' },
    { id: 'onionrings', name: 'Onion Rings', description: "Rondelles d'oignons croustillantes", unit_price: 1.20, image_url: null, category: 'snack' },
];

const FALLBACK_FRITES: TexMexProduct[] = [
    { id: 'petite-barquette', name: 'Petite Barquette', description: null, unit_price: 3.00, image_url: null, category: 'frites' },
    { id: 'grande-barquette', name: 'Grande Barquette', description: null, unit_price: 5.00, image_url: null, category: 'frites' },
];

const FALLBACK_CROQUES: TexMexProduct[] = [
    { id: 'croque-monsieur', name: 'Croque Monsieur', description: null, unit_price: 3.00, image_url: null, category: 'croque' },
    { id: 'croque-madame', name: 'Croque Madame', description: null, unit_price: 4.00, image_url: null, category: 'croque' },
];

const CATEGORY_EMOJI: Record<string, string> = {
    snack: '🌶️',
    frites: '🍟',
    croque: '🥪',
};

export function TexMexWizard({ onClose }: TexMexWizardProps) {
    const { addToCart } = useOrder();
    const [products, setProducts] = useState<TexMexProduct[]>([]);
    const [offers, setOffers] = useState<TexMexOffer[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: productsData, error: productsError } = await supabase
                .from('texmex_products' as any)
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (productsError) throw productsError;

            const { data: offersData, error: offersError } = await supabase
                .from('texmex_offers' as any)
                .select('*')
                .eq('is_active', true)
                .order('quantity');

            if (offersError) throw offersError;

            const fetched = (productsData as unknown as TexMexProduct[]) || [];

            const hasSnack = fetched.some(p => (p.category ?? 'snack') === 'snack');
            const hasFrites = fetched.some(p => p.category === 'frites');
            const hasCroque = fetched.some(p => p.category === 'croque');

            const merged = [
                ...(hasSnack ? fetched.filter(p => (p.category ?? 'snack') === 'snack') : FALLBACK_SNACKS),
                ...(hasFrites ? fetched.filter(p => p.category === 'frites') : FALLBACK_FRITES),
                ...(hasCroque ? fetched.filter(p => p.category === 'croque') : FALLBACK_CROQUES),
            ];

            setProducts(merged);
            setOffers((offersData as unknown as TexMexOffer[]) || []);
        } catch (error) {
            console.error('Error fetching tex-mex data:', error);
            setProducts([...FALLBACK_SNACKS, ...FALLBACK_FRITES, ...FALLBACK_CROQUES]);
            setOffers([
                { id: 'offer-5', quantity: 5, price: 7 },
                { id: 'offer-10', quantity: 10, price: 13 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getProductGroup = (name: string): 'A' | 'B' => {
        const norm = name.toLowerCase().replace(/[^a-z]/g, '');
        if (['wings', 'tenders', 'nuggets'].includes(norm)) return 'A';
        return 'B';
    };

    const calculateGroupPrice = (qty: number, group: 'A' | 'B'): number => {
        if (qty <= 0) return 0;

        const unitPrice = group === 'A' ? 1.40 : 1.20;
        const price5 = group === 'A' ? 7.00 : 6.00;
        const price10 = group === 'A' ? 13.00 : 10.00;

        let tempQty = qty;
        let totalPrice = 0;

        const num10s = Math.floor(tempQty / 10);
        totalPrice += num10s * price10;
        tempQty %= 10;

        const num5s = Math.floor(tempQty / 5);
        totalPrice += num5s * price5;
        tempQty %= 5;

        totalPrice += tempQty * unitPrice;

        return totalPrice;
    };

    const calculatePrice = (): number => {
        let qtyA = 0;
        let qtyB = 0;
        let fixedTotal = 0;

        selectedItems.forEach(item => {
            const cat = item.product.category ?? 'snack';
            if (cat === 'frites' || cat === 'croque') {
                fixedTotal += item.product.unit_price * item.quantity;
            } else {
                const grp = getProductGroup(item.product.name);
                if (grp === 'A') qtyA += item.quantity;
                else qtyB += item.quantity;
            }
        });

        return calculateGroupPrice(qtyA, 'A') + calculateGroupPrice(qtyB, 'B') + fixedTotal;
    };

    const getSnackRegularPrice = (): number => {
        return selectedItems.reduce((sum, item) => {
            const cat = item.product.category ?? 'snack';
            if (cat !== 'snack') return sum;
            const unitPrice = getProductGroup(item.product.name) === 'A' ? 1.40 : 1.20;
            return sum + item.quantity * unitPrice;
        }, 0);
    };

    const getTotalQuantity = () => selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    const updateQuantity = (product: TexMexProduct, delta: number) => {
        setSelectedItems(prev => {
            const existingIndex = prev.findIndex(item => item.product.id === product.id);

            if (existingIndex >= 0) {
                const newQuantity = prev[existingIndex].quantity + delta;
                if (newQuantity <= 0) {
                    return prev.filter((_, i) => i !== existingIndex);
                }
                return prev.map((item, i) =>
                    i === existingIndex ? { ...item, quantity: newQuantity } : item
                );
            } else if (delta > 0) {
                return [...prev, { product, quantity: delta }];
            }
            return prev;
        });
    };

    const getItemQuantity = (productId: string): number => {
        const item = selectedItems.find(i => i.product.id === productId);
        return item?.quantity || 0;
    };

    const handleAddToCart = () => {
        if (getTotalQuantity() === 0) {
            toast.error('Sélectionnez au moins un article');
            return;
        }

        const price = calculatePrice();
        const itemNames = selectedItems
            .filter(i => i.quantity > 0)
            .map(i => `${i.quantity}x ${i.product.name}`)
            .join(', ');

        const snackQty = selectedItems
            .filter(i => (i.product.category ?? 'snack') === 'snack')
            .reduce((s, i) => s + i.quantity, 0);

        const texMexItem = {
            id: `texmex-${Date.now()}`,
            name: itemNames,
            description: snackQty > 0 ? `${snackQty} pièces` : undefined,
            price: price,
            category: 'texmex' as any,
        };

        addToCart(texMexItem, 1, undefined, price);
        toast.success('Tex-Mex ajouté au panier !');
        onClose();
    };

    const snacks = products.filter(p => (p.category ?? 'snack') === 'snack');
    const frites = products.filter(p => p.category === 'frites');
    const croques = products.filter(p => p.category === 'croque');

    const totalQty = getTotalQuantity();
    const totalPrice = calculatePrice();
    const snackRegularPrice = getSnackRegularPrice();
    const snackDiscountedPrice = (() => {
        let qtyA = 0; let qtyB = 0;
        selectedItems.forEach(item => {
            if ((item.product.category ?? 'snack') !== 'snack') return;
            const grp = getProductGroup(item.product.name);
            if (grp === 'A') qtyA += item.quantity; else qtyB += item.quantity;
        });
        return calculateGroupPrice(qtyA, 'A') + calculateGroupPrice(qtyB, 'B');
    })();
    const savings = Math.max(0, snackRegularPrice - snackDiscountedPrice);

    const renderProductCard = (product: TexMexProduct) => {
        const qty = getItemQuantity(product.id);
        const cat = product.category ?? 'snack';
        const emoji = CATEGORY_EMOJI[cat] ?? '🌶️';

        return (
            <Card
                key={product.id}
                className={`p-4 transition-all ${qty > 0 ? 'ring-2 ring-orange-500 bg-orange-500/5' : ''}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-3xl">
                                {emoji}
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            {product.description && (
                                <p className="text-sm text-muted-foreground">{product.description}</p>
                            )}
                            {(cat === 'frites' || cat === 'croque') && (
                                <p className="text-sm font-semibold text-orange-600">{product.unit_price.toFixed(2)}€</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(product, -1)}
                            disabled={qty === 0}
                            className="h-10 w-10"
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{qty}</span>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={() => updateQuantity(product, 1)}
                            className="h-10 w-10 bg-orange-500 hover:bg-orange-600"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-4 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                                <Flame className="w-6 h-6 text-orange-500" />
                                Tex-Mex
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Composez votre sélection
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offers Banner */}
            <div className="container mx-auto px-4 py-4">
                <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-orange-700">Offres Spéciales Snacks</h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Wings, Tenders, Nuggets</p>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none">5 pièces = 7.00€</Badge>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-none">10 pièces = 13.00€</Badge>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Mozza Stick, Jalapeños, Onion Rings</p>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none">5 pièces = 6.00€</Badge>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none">10 pièces = 10.00€</Badge>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="container mx-auto px-4 space-y-6 py-2">
                {/* Snacks Section */}
                {snacks.length > 0 && (
                    <div>
                        <h2 className="text-base font-bold uppercase tracking-widest text-orange-600 mb-3 flex items-center gap-2">
                            🌶️ Snacks
                        </h2>
                        <div className="grid gap-4">
                            {snacks.map(renderProductCard)}
                        </div>
                    </div>
                )}

                {/* Frites Section */}
                {frites.length > 0 && (
                    <div>
                        <h2 className="text-base font-bold uppercase tracking-widest text-yellow-600 mb-3 flex items-center gap-2">
                            🍟 Frites
                        </h2>
                        <div className="grid gap-4">
                            {frites.map(renderProductCard)}
                        </div>
                    </div>
                )}

                {/* Croques Section */}
                {croques.length > 0 && (
                    <div>
                        <h2 className="text-base font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-2">
                            🥪 Croques
                        </h2>
                        <div className="grid gap-4">
                            {croques.map(renderProductCard)}
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-sm text-muted-foreground">Total: {totalQty} article(s)</span>
                            {savings > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
                                    Économie: {savings.toFixed(2)}€
                                </Badge>
                            )}
                        </div>
                        <div className="text-right">
                            {savings > 0 && (
                                <span className="text-xs text-gray-400 line-through mr-2">
                                    {(snackRegularPrice + totalPrice - snackDiscountedPrice).toFixed(2)}€
                                </span>
                            )}
                            <span className="text-2xl font-bold text-orange-500">
                                {totalPrice.toFixed(2)}€
                            </span>
                        </div>
                    </div>
                    <Button
                        className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 gap-2"
                        onClick={handleAddToCart}
                        disabled={totalQty === 0}
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Ajouter au panier
                    </Button>
                </div>
            </div>
        </div>
    );
}
