import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Plus, Edit2, Trash2, Save, X, Upload, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface TexMexProduct {
    id: string;
    name: string;
    description: string | null;
    unit_price: number;
    image_url: string | null;
    is_active: boolean;
    display_order: number;
}

interface TexMexOffer {
    id: string;
    quantity: number;
    price: number;
    is_active: boolean;
}

export function TexMexManager() {
    const [products, setProducts] = useState<TexMexProduct[]>([]);
    const [offers, setOffers] = useState<TexMexOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<string | null>(null);
    const [editedProduct, setEditedProduct] = useState<Partial<TexMexProduct>>({});
    const [editingOffer, setEditingOffer] = useState<string | null>(null);
    const [editedOffer, setEditedOffer] = useState<Partial<TexMexOffer>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        const { data: productsData } = await supabase
            .from('texmex_products' as any)
            .select('*')
            .order('display_order');

        const { data: offersData } = await supabase
            .from('texmex_offers' as any)
            .select('*')
            .order('quantity');

        setProducts((productsData as unknown as TexMexProduct[]) || []);
        setOffers((offersData as unknown as TexMexOffer[]) || []);
        setLoading(false);
    };

    // Product management
    const handleAddProduct = async () => {
        const { error } = await supabase
            .from('texmex_products' as any)
            .insert({
                name: 'Nouveau produit',
                description: '',
                unit_price: 1.00,
                is_active: false,
                display_order: products.length + 1,
            });

        if (error) {
            toast.error('Erreur lors de la création');
        } else {
            toast.success('Produit créé');
            fetchData();
        }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct) return;

        const { error } = await supabase
            .from('texmex_products' as any)
            .update(editedProduct)
            .eq('id', editingProduct);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Produit mis à jour');
            setEditingProduct(null);
            fetchData();
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Supprimer ce produit ?')) return;

        const { error } = await supabase
            .from('texmex_products' as any)
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Produit supprimé');
            fetchData();
        }
    };

    const handleImageUpload = async (productId: string, file: File) => {
        try {
            const { uploadToCloudinary } = await import('@/utils/cloudinary');
            const imageUrl = await uploadToCloudinary(file);

            if (!imageUrl) {
                toast.error('Erreur upload image');
                return;
            }

            const { error: updateError } = await supabase
                .from('texmex_products' as any)
                .update({ image_url: imageUrl })
                .eq('id', productId);

            if (updateError) {
                toast.error('Erreur mise à jour image');
            } else {
                toast.success('Image mise à jour');
                fetchData();
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Erreur upload image');
        }
    };

    // Offer management
    const handleAddOffer = async () => {
        const { error } = await supabase
            .from('texmex_offers' as any)
            .insert({
                quantity: 1,
                price: 1.00,
                is_active: false,
            });

        if (error) {
            toast.error('Erreur lors de la création');
        } else {
            toast.success('Offre créée');
            fetchData();
        }
    };

    const handleSaveOffer = async () => {
        if (!editingOffer) return;

        const { error } = await supabase
            .from('texmex_offers' as any)
            .update(editedOffer)
            .eq('id', editingOffer);

        if (error) {
            toast.error('Erreur lors de la sauvegarde');
        } else {
            toast.success('Offre mise à jour');
            setEditingOffer(null);
            fetchData();
        }
    };

    const handleDeleteOffer = async (id: string) => {
        if (!confirm('Supprimer cette offre ?')) return;

        const { error } = await supabase
            .from('texmex_offers' as any)
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Offre supprimée');
            fetchData();
        }
    };

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                Gestion Tex-Mex
            </h2>

            {/* Products Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Produits</h3>
                    <Button onClick={handleAddProduct} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </Button>
                </div>

                <div className="grid gap-3">
                    {products.map((product) => {
                        const isEditing = editingProduct === product.id;

                        return (
                            <Card key={product.id} className={`p-4 ${!product.is_active ? 'opacity-60' : ''}`}>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                value={editedProduct.name || ''}
                                                onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                                                placeholder="Nom"
                                            />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={editedProduct.unit_price || 0}
                                                onChange={(e) => setEditedProduct({ ...editedProduct, unit_price: parseFloat(e.target.value) || 0 })}
                                                placeholder="Prix unitaire"
                                            />
                                        </div>
                                        <Textarea
                                            value={editedProduct.description || ''}
                                            onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                                            placeholder="Description"
                                            rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={editedProduct.is_active}
                                                onCheckedChange={(checked) => setEditedProduct({ ...editedProduct, is_active: checked })}
                                            />
                                            <span className="text-sm">Actif</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => setEditingProduct(null)}>Annuler</Button>
                                            <Button onClick={handleSaveProduct}>Sauvegarder</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xl">
                                                    🌶️
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold">{product.name}</h4>
                                                <p className="text-sm text-muted-foreground">{product.description}</p>
                                                <Badge variant="secondary" className="mt-1">{product.unit_price}€/pièce</Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(product.id, file);
                                                }}
                                            />
                                            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                                                <Upload className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => {
                                                setEditingProduct(product.id);
                                                setEditedProduct(product);
                                            }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteProduct(product.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Offers Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-500" />
                        Offres spéciales
                    </h3>
                    <Button onClick={handleAddOffer} className="gap-2" variant="outline">
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </Button>
                </div>

                <Card className="p-4 bg-green-500/5 border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-3">
                        Définissez les offres groupées (ex: 5 items = 5€, 10 items = 9€)
                    </p>
                    <div className="grid gap-2">
                        {offers.map((offer) => {
                            const isEditing = editingOffer === offer.id;

                            return (
                                <div key={offer.id} className={`flex items-center gap-3 p-2 rounded-lg ${offer.is_active ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                                    {isEditing ? (
                                        <>
                                            <Input
                                                type="number"
                                                value={editedOffer.quantity || 0}
                                                onChange={(e) => setEditedOffer({ ...editedOffer, quantity: parseInt(e.target.value) || 0 })}
                                                className="w-20"
                                            />
                                            <span>items =</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={editedOffer.price || 0}
                                                onChange={(e) => setEditedOffer({ ...editedOffer, price: parseFloat(e.target.value) || 0 })}
                                                className="w-20"
                                            />
                                            <span>€</span>
                                            <Switch
                                                checked={editedOffer.is_active}
                                                onCheckedChange={(checked) => setEditedOffer({ ...editedOffer, is_active: checked })}
                                            />
                                            <Button size="sm" variant="ghost" onClick={() => setEditingOffer(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" onClick={handleSaveOffer}>
                                                <Save className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Badge variant={offer.is_active ? "default" : "secondary"} className={offer.is_active ? "bg-green-500" : ""}>
                                                {offer.quantity} items = {offer.price}€
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                ({(offer.price / offer.quantity).toFixed(2)}€/item)
                                            </span>
                                            <div className="flex-1" />
                                            <Button size="sm" variant="ghost" onClick={() => {
                                                setEditingOffer(offer.id);
                                                setEditedOffer(offer);
                                            }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteOffer(offer.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}
