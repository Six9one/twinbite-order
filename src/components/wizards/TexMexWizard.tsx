import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
            // Fetch Tex-Mex products
            const { data: productsData, error: productsError } = await supabase
                .from('texmex_products' as any)
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (productsError) throw productsError;

            // Fetch offers
            const { data: offersData, error: offersError } = await supabase
                .from('texmex_offers' as any)
                .select('*')
                .eq('is_active', true)
                .order('quantity');

            if (offersError) throw offersError;

            setProducts((productsData as unknown as TexMexProduct[]) || []);
            setOffers((offersData as unknown as TexMexOffer[]) || []);
        } catch (error) {
            console.error('Error fetching tex-mex data:', error);
            // Fallback data
            setProducts([
                { id: 'wings', name: 'Wings', description: 'Ailes de poulet croustillantes', unit_price: 1, image_url: null },
                { id: 'tenders', name: 'Tenders', description: 'Tendres de poulet marinés', unit_price: 1, image_url: null },
                { id: 'nuggets', name: 'Nuggets', description: 'Nuggets de poulet dorés', unit_price: 1, image_url: null },
                { id: 'mozzastick', name: 'Mozzastick', description: 'Bâtonnets de mozzarella fondante', unit_price: 1, image_url: null },
                { id: 'jalapenos', name: 'Jalapeños', description: 'Piments jalapeños farcis au fromage', unit_price: 1, image_url: null },
            ]);
            setOffers([
                { id: 'offer-5', quantity: 5, price: 5 },
                { id: 'offer-10', quantity: 10, price: 9 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getTotalQuantity = () => {
        return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    };

    const calculatePrice = (totalQty: number): number => {
        // Find the best applicable offer
        const applicableOffers = offers.filter(o => totalQty >= o.quantity);
        if (applicableOffers.length === 0) {
            // No offer applies, unit price (default 1€ per item)
            return totalQty * 1;
        }

        // Find the best deal (highest quantity)
        const bestOffer = applicableOffers.reduce((best, current) =>
            current.quantity > best.quantity ? current : best
        );

        // Calculate: (number of full offers * offer price) + (remaining * unit price)
        const numFullOffers = Math.floor(totalQty / bestOffer.quantity);
        const remaining = totalQty % bestOffer.quantity;

        // Check if remaining items can use a smaller offer
        let remainingPrice = remaining * 1;
        const smallerOffers = offers.filter(o => remaining >= o.quantity);
        if (smallerOffers.length > 0) {
            const smallOffer = smallerOffers.reduce((best, current) =>
                current.quantity > best.quantity ? current : best
            );
            const subOffers = Math.floor(remaining / smallOffer.quantity);
            const subRemaining = remaining % smallOffer.quantity;
            remainingPrice = (subOffers * smallOffer.price) + (subRemaining * 1);
        }

        return (numFullOffers * bestOffer.price) + remainingPrice;
    };

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

        const totalQty = getTotalQuantity();
        const price = calculatePrice(totalQty);
        const itemNames = selectedItems
            .filter(i => i.quantity > 0)
            .map(i => `${i.quantity}x ${i.product.name}`)
            .join(', ');

        // Add as items with just the product names (no "Tex-Mex Box" text)
        const texMexItem = {
            id: `texmex-${Date.now()}`,
            name: itemNames,
            description: `${totalQty} pièces`,
            price: price,
            category: 'texmex' as any,
        };

        addToCart(texMexItem, 1, undefined, price);

        toast.success('Tex-Mex ajouté au panier !');
        onClose();
    };

    const totalQty = getTotalQuantity();
    const totalPrice = calculatePrice(totalQty);

    // Calculate savings
    const regularPrice = totalQty * 1;
    const savings = regularPrice - totalPrice;

    // Find current/next offer
    const currentOffer = offers.find(o => totalQty >= o.quantity && totalQty < (offers.find(o2 => o2.quantity > o.quantity)?.quantity || Infinity));
    const nextOffer = offers.find(o => o.quantity > totalQty);

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
                                Composez votre box d'amuse-bouches
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offers Banner */}
            <div className="container mx-auto px-4 py-4">
                <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-orange-700">Offres Spéciales</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {offers.map(offer => (
                            <Badge
                                key={offer.id}
                                variant={totalQty >= offer.quantity ? "default" : "outline"}
                                className={totalQty >= offer.quantity ? "bg-orange-500" : ""}
                            >
                                {offer.quantity} pièces = {offer.price}€
                            </Badge>
                        ))}
                    </div>
                    {nextOffer && totalQty > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Ajoutez {nextOffer.quantity - totalQty} pièce(s) de plus pour {nextOffer.price}€ !
                        </p>
                    )}
                </Card>
            </div>

            {/* Products Grid */}
            <div className="container mx-auto px-4 py-4">
                <div className="grid gap-4">
                    {products.map(product => {
                        const qty = getItemQuantity(product.id);
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
                                                🌶️
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-lg">{product.name}</h3>
                                            <p className="text-sm text-muted-foreground">{product.description}</p>
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
                    })}
                </div>
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-sm text-muted-foreground">Total: {totalQty} pièce(s)</span>
                            {savings > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
                                    Économie: {savings.toFixed(2)}€
                                </Badge>
                            )}
                        </div>
                        <div className="text-right">
                            {savings > 0 && (
                                <span className="text-sm text-muted-foreground line-through mr-2">
                                    {regularPrice.toFixed(2)}€
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
