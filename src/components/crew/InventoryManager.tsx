import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Package,
    ShoppingCart,
    AlertTriangle,
    Send,
    Plus,
    Minus,
    Check,
    Trash2,
    MessageSquare,
    FileText,
    Loader2,
} from 'lucide-react';
import {
    useInventoryCategories,
    useInventoryItems,
    useCreateSupplierOrder,
    generateSupplierMessage,
    InventoryItem,
    SupplierOrderItem,
} from '@/hooks/useInventory';

interface CartItem extends SupplierOrderItem {
    categoryColor?: string;
}

export function InventoryManager() {
    const { data: categories, isLoading: loadingCategories } = useInventoryCategories();
    const { data: items, isLoading: loadingItems } = useInventoryItems();
    const createOrder = useCreateSupplierOrder();

    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');

    // Group items by category
    const groupedItems = useMemo(() => {
        if (!items || !categories) return {};

        const groups: Record<string, InventoryItem[]> = {};
        categories.forEach(cat => {
            groups[cat.slug] = items.filter(item =>
                (item.category as any)?.slug === cat.slug
            );
        });
        return groups;
    }, [items, categories]);

    // Filter items based on search and category
    const filteredItems = useMemo(() => {
        if (!items) return [];

        let result = items;

        if (activeCategory !== 'all') {
            result = result.filter(item => (item.category as any)?.slug === activeCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query)
            );
        }

        return result;
    }, [items, activeCategory, searchQuery]);

    // Add item to cart
    const addToCart = (item: InventoryItem) => {
        const qty = quantities[item.id] || 1;

        const existingIndex = cart.findIndex(c => c.item_id === item.id);
        if (existingIndex >= 0) {
            // Update quantity
            const newCart = [...cart];
            newCart[existingIndex].quantity += qty;
            setCart(newCart);
        } else {
            // Add new item
            setCart([...cart, {
                item_id: item.id,
                item_name: item.name,
                quantity: qty,
                unit: item.unit,
                categoryColor: (item.category as any)?.color,
            }]);
        }

        // Reset quantity input
        setQuantities(prev => ({ ...prev, [item.id]: 1 }));
        toast.success(`${item.name} ajouté à la commande`);
    };

    // Remove from cart
    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(c => c.item_id !== itemId));
    };

    // Update cart item quantity
    const updateCartQuantity = (itemId: string, delta: number) => {
        const newCart = cart.map(c => {
            if (c.item_id === itemId) {
                const newQty = Math.max(1, c.quantity + delta);
                return { ...c, quantity: newQty };
            }
            return c;
        });
        setCart(newCart);
    };

    // Generate and copy WhatsApp message
    const handleGenerateMessage = () => {
        if (cart.length === 0) {
            toast.error('Ajoutez des produits à la commande d\'abord');
            return;
        }

        const message = generateSupplierMessage(cart);
        navigator.clipboard.writeText(message);
        toast.success('Message copié dans le presse-papiers ! 📋');
    };

    // Save order to database
    const handleSaveOrder = async () => {
        if (cart.length === 0) {
            toast.error('Ajoutez des produits à la commande d\'abord');
            return;
        }

        try {
            await createOrder.mutateAsync({
                items: cart,
                status: 'draft',
                created_by: 'Safouane',
            });
            toast.success('Commande sauvegardée ! ✅');
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
        }
    };

    // Clear cart
    const handleClearCart = () => {
        setCart([]);
        toast.info('Panier vidé');
    };

    const isLoading = loadingCategories || loadingItems;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-orange-500" />
                        Gestion des Stocks
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Sélectionnez les produits à commander
                    </p>
                </div>

                {/* Cart Summary */}
                <Card className="bg-orange-500/10 border-orange-500/20 px-4 py-2">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-500">{cart.length}</p>
                            <p className="text-xs text-gray-400">Produits</p>
                        </div>
                        <div className="h-8 w-px bg-orange-500/20" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-500">
                                {cart.reduce((sum, c) => sum + c.quantity, 0)}
                            </p>
                            <p className="text-xs text-gray-400">Unités</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Product List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <Input
                        placeholder="🔍 Rechercher un produit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border-white/10"
                    />

                    {/* Category Tabs */}
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                        <ScrollArea className="w-full">
                            <TabsList className="inline-flex h-auto p-1 bg-white/5 gap-1">
                                <TabsTrigger
                                    value="all"
                                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white px-3 py-1.5 text-xs"
                                >
                                    Tout
                                </TabsTrigger>
                                {categories?.map(cat => (
                                    <TabsTrigger
                                        key={cat.slug}
                                        value={cat.slug}
                                        className="data-[state=active]:text-white px-3 py-1.5 text-xs whitespace-nowrap"
                                        style={{
                                            backgroundColor: activeCategory === cat.slug ? cat.color : undefined,
                                        }}
                                    >
                                        {cat.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </ScrollArea>

                        <TabsContent value={activeCategory} className="mt-4">
                            <Card className="bg-[#161618] border-white/5 overflow-hidden">
                                <ScrollArea className="h-[500px]">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-[#1a1a1c] z-10">
                                            <tr className="text-left text-xs text-gray-500 uppercase">
                                                <th className="p-3 font-medium">Produit</th>
                                                <th className="p-3 font-medium text-center w-32">Quantité</th>
                                                <th className="p-3 font-medium text-right w-24">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredItems.map(item => (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-2 h-8 rounded-full"
                                                                style={{ backgroundColor: (item.category as any)?.color || '#666' }}
                                                            />
                                                            <div>
                                                                <p className="font-medium">{item.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {(item.category as any)?.name} • {item.unit}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 hover:bg-white/10"
                                                                onClick={() => setQuantities(prev => ({
                                                                    ...prev,
                                                                    [item.id]: Math.max(1, (prev[item.id] || 1) - 1)
                                                                }))}
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={quantities[item.id] || 1}
                                                                onChange={(e) => setQuantities(prev => ({
                                                                    ...prev,
                                                                    [item.id]: parseInt(e.target.value) || 1
                                                                }))}
                                                                className="w-16 text-center bg-white/5 border-white/10"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 hover:bg-white/10"
                                                                onClick={() => setQuantities(prev => ({
                                                                    ...prev,
                                                                    [item.id]: (prev[item.id] || 1) + 1
                                                                }))}
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            className="bg-orange-500 hover:bg-orange-600"
                                                            onClick={() => addToCart(item)}
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Ajouter
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right: Cart */}
                <div className="space-y-4">
                    <Card className="bg-[#161618] border-orange-500/20 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-orange-500" />
                                Bon de Commande
                            </h3>
                            {cart.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                    onClick={handleClearCart}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Aucun produit sélectionné</p>
                                <p className="text-xs mt-1">Ajoutez des produits depuis la liste</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[300px] pr-2">
                                <div className="space-y-2">
                                    {cart.map((item) => (
                                        <div
                                            key={item.item_id}
                                            className="flex items-center justify-between bg-white/5 rounded-lg p-3 group"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.item_name}</p>
                                                <p className="text-xs text-gray-500">{item.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => updateCartQuantity(item.item_id, -1)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <Badge
                                                    className="min-w-[2rem] justify-center"
                                                    style={{ backgroundColor: item.categoryColor }}
                                                >
                                                    {item.quantity}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => updateCartQuantity(item.item_id, 1)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-red-400 opacity-0 group-hover:opacity-100"
                                                    onClick={() => removeFromCart(item.item_id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}

                        {/* Action Buttons */}
                        {cart.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={handleGenerateMessage}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Copier Message WhatsApp
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full border-orange-500/20 text-orange-500 hover:bg-orange-500/10"
                                    onClick={handleSaveOrder}
                                    disabled={createOrder.isPending}
                                >
                                    {createOrder.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Sauvegarder
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Low Stock Alerts */}
                    {items && items.filter(i => i.is_low_stock).length > 0 && (
                        <Card className="bg-red-950/20 border-red-500/20 p-4">
                            <h4 className="font-bold text-red-400 flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4" />
                                Alertes Stock Bas
                            </h4>
                            <div className="space-y-2">
                                {items.filter(i => i.is_low_stock).slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                        <span className="text-red-300">{item.name}</span>
                                        <Badge variant="destructive" className="text-xs">
                                            {item.current_stock} {item.unit}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
