import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAllProducts, useUpdateProduct, uploadProductImage, Product } from '@/hooks/useProducts';
import { Plus, Edit2, Trash2, Image, Upload, X } from 'lucide-react';

export function ProductsManager() {
  const { data: products, isLoading, refetch } = useAllProducts();
  const updateProduct = useUpdateProduct();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId);
    try {
      const imageUrl = await uploadProductImage(file, productId);
      if (imageUrl) {
        await updateProduct.mutateAsync({ id: productId, updates: { image_url: imageUrl } });
        toast.success('Image téléchargée!');
        refetch();
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (productId: string) => {
    try {
      await updateProduct.mutateAsync({ id: productId, updates: { image_url: null } });
      toast.success('Image supprimée!');
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);
      
      if (!error) {
        toast.success('Produit supprimé!');
        refetch();
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSave = async (product: any) => {
    try {
      await updateProduct.mutateAsync({ 
        id: product.id, 
        updates: { 
          name: product.name, 
          description: product.description,
          base_price: product.base_price 
        } 
      });
      toast.success('Produit mis à jour!');
      setEditingId(null);
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  const activeProducts = products?.filter(p => p.is_active !== false) || [];
  const pizzas = activeProducts.filter(p => (p as any).categories?.slug === 'pizzas');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Gestion des Produits</h2>
        <Badge variant="secondary">{pizzas.length} pizzas</Badge>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && editingId) {
            handleImageUpload(editingId, file);
          }
          e.target.value = '';
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pizzas.map((product: any) => (
          <Card key={product.id} className="overflow-hidden">
            {/* Image Section */}
            <div className="relative aspect-video bg-muted">
              {product.image_url ? (
                <>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleRemoveImage(product.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Image className="w-12 h-12 mb-2 opacity-30" />
                  <span className="text-sm">Pas d'image</span>
                </div>
              )}
              
              {/* Upload Button Overlay */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2"
                disabled={uploading === product.id}
                onClick={() => {
                  setEditingId(product.id);
                  fileInputRef.current?.click();
                }}
              >
                {uploading === product.id ? (
                  'Envoi...'
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    {product.image_url ? 'Changer' : 'Ajouter'}
                  </>
                )}
              </Button>
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {product.pizza_base === 'tomate' ? '🍅' : '🥛'} {product.pizza_base}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{product.base_price}€</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(editingId === product.id ? null : product.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Edit Form */}
              {editingId === product.id && (
                <div className="pt-3 border-t space-y-2">
                  <Input
                    value={product.name}
                    onChange={(e) => {
                      const updated = products?.map(p => 
                        p.id === product.id ? { ...p, name: e.target.value } : p
                      );
                      // Local state update would go here
                    }}
                    placeholder="Nom"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={product.base_price}
                    onChange={(e) => {
                      // Local state update
                    }}
                    placeholder="Prix"
                  />
                  <Button size="sm" onClick={() => handleSave(product)}>
                    Sauvegarder
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {pizzas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun produit trouvé
        </div>
      )}
    </div>
  );
}
