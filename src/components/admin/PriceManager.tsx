import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, RefreshCcw, Search, Euro, Package, Loader2 } from 'lucide-react';

interface PriceItem {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    table: string;
    priceField: string;
    category?: string;
    isModified: boolean;
}

interface TableConfig {
    name: string;
    label: string;
    priceField: string;
    nameField: string;
    icon: string;
}

const tableConfigs: TableConfig[] = [
    { name: 'products', label: 'Produits (Pizzas, Tacos, etc.)', priceField: 'base_price', nameField: 'name', icon: '🍕' },
    { name: 'product_size_prices', label: 'Tailles (Soufflet, Makloub...)', priceField: 'price', nameField: 'size_label', icon: '📏' },
    { name: 'sandwich_types', label: 'Sandwiches', priceField: 'base_price', nameField: 'name', icon: '🥖' },
    { name: 'meat_options', label: 'Viandes', priceField: 'price', nameField: 'name', icon: '🥩' },
    { name: 'sauce_options', label: 'Sauces', priceField: 'price', nameField: 'name', icon: '🍅' },
    { name: 'garniture_options', label: 'Garnitures', priceField: 'price', nameField: 'name', icon: '🥬' },
    { name: 'supplement_options', label: 'Suppléments', priceField: 'price', nameField: 'name', icon: '➕' },
    { name: 'crudites_options', label: 'Crudités', priceField: 'price', nameField: 'name', icon: '🥗' },
    { name: 'drinks', label: 'Boissons', priceField: 'price', nameField: 'name', icon: '🥤' },
    { name: 'desserts', label: 'Desserts', priceField: 'price', nameField: 'name', icon: '🍰' },
    { name: 'delivery_zones', label: 'Frais Livraison', priceField: 'delivery_fee', nameField: 'name', icon: '🚗' },
];

export function PriceManager() {
    const [items, setItems] = useState<PriceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    // Fetch all prices from all tables
    const fetchAllPrices = async () => {
        setLoading(true);
        const allItems: PriceItem[] = [];

        try {
            for (const config of tableConfigs) {
                const { data, error } = await supabase
                    .from(config.name as any)
                    .select('*')
                    .order(config.nameField);

                if (error) {
                    console.error(`Error fetching ${config.name}:`, error);
                    continue;
                }

                if (data) {
                    data.forEach((item: any) => {
                        // For product_size_prices, include the product type in the name
                        let displayName = item[config.nameField];
                        if (config.name === 'product_size_prices' && item.product_type) {
                            const productTypeLabel = item.product_type.charAt(0).toUpperCase() + item.product_type.slice(1);
                            displayName = `${productTypeLabel} - ${item.size_label} (${item.max_meats} viande${item.max_meats > 1 ? 's' : ''})`;
                        }

                        allItems.push({
                            id: item.id,
                            name: displayName,
                            price: item[config.priceField] || 0,
                            originalPrice: item[config.priceField] || 0,
                            table: config.name,
                            priceField: config.priceField,
                            category: config.label,
                            isModified: false,
                        });
                    });
                }
            }

            setItems(allItems);
        } catch (err) {
            console.error('Error fetching prices:', err);
            toast.error('Erreur lors du chargement des prix');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPrices();
    }, []);

    // Update a single item's price
    const handlePriceChange = (id: string, newPrice: number) => {
        setItems(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, price: newPrice, isModified: newPrice !== item.originalPrice }
                    : item
            )
        );
    };

    // Save all modified prices
    const saveAllChanges = async () => {
        const modifiedItems = items.filter(item => item.isModified);

        if (modifiedItems.length === 0) {
            toast.info('Aucune modification à sauvegarder');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const item of modifiedItems) {
                const { error } = await supabase
                    .from(item.table as any)
                    .update({ [item.priceField]: item.price })
                    .eq('id', item.id);

                if (error) {
                    console.error(`Error updating ${item.name}:`, error);
                    errorCount++;
                } else {
                    successCount++;
                }
            }

            if (errorCount > 0) {
                toast.warning(`${successCount} prix mis à jour, ${errorCount} erreurs`);
            } else {
                toast.success(`${successCount} prix mis à jour avec succès!`);
            }

            // Refresh prices
            await fetchAllPrices();
        } catch (err) {
            console.error('Error saving prices:', err);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    // Reset all changes
    const resetChanges = () => {
        setItems(prev =>
            prev.map(item => ({
                ...item,
                price: item.originalPrice,
                isModified: false,
            }))
        );
        toast.info('Modifications annulées');
    };

    // Filter items based on search and active tab
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || item.table === activeTab;
        return matchesSearch && matchesTab;
    });

    // Group items by category for display
    const groupedItems = filteredItems.reduce((acc, item) => {
        const category = item.category || 'Autres';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, PriceItem[]>);

    // Count modified items
    const modifiedCount = items.filter(item => item.isModified).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2">Chargement des prix...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Euro className="w-6 h-6 text-primary" />
                        Gestion des Prix
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {items.length} articles • {modifiedCount > 0 && (
                            <span className="text-amber-500 font-medium">{modifiedCount} modification(s) en attente</span>
                        )}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={resetChanges}
                        disabled={modifiedCount === 0 || saving}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Annuler
                    </Button>
                    <Button
                        onClick={saveAllChanges}
                        disabled={modifiedCount === 0 || saving}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Sauvegarder ({modifiedCount})
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Category Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                        Tous ({items.length})
                    </TabsTrigger>
                    {tableConfigs.map(config => {
                        const count = items.filter(i => i.table === config.name).length;
                        if (count === 0) return null;
                        return (
                            <TabsTrigger key={config.name} value={config.name} className="text-xs sm:text-sm">
                                {config.icon} {config.label.split(' ')[0]} ({count})
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {Object.keys(groupedItems).length === 0 ? (
                        <Card className="p-8 text-center text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Aucun article trouvé</p>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedItems).map(([category, categoryItems]) => (
                                <div key={category}>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        {tableConfigs.find(c => c.label === category)?.icon}
                                        {category}
                                        <Badge variant="secondary">{categoryItems.length}</Badge>
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {categoryItems.map(item => (
                                            <Card
                                                key={item.id}
                                                className={`p-3 transition-all ${item.isModified ? 'ring-2 ring-amber-500 bg-amber-50/50' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate" title={item.name}>
                                                            {item.name}
                                                        </p>
                                                        {item.isModified && (
                                                            <p className="text-xs text-muted-foreground line-through">
                                                                {item.originalPrice.toFixed(2)}€
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.price}
                                                            onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-8 text-right text-sm font-semibold"
                                                        />
                                                        <span className="text-sm font-medium">€</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
