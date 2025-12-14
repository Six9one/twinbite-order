import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Upload, X, Image } from 'lucide-react';

interface ProductCategoryManagerProps {
  categorySlug: string;
  title: string;
}

export function ProductCategoryManager({ categorySlug, title }: ProductCategoryManagerProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', base_price: 0 });
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const fetchCategoryAndProducts = async () => {
    // First get the category ID
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();

    if (categoryData) {
      setCategoryId(categoryData.id);
      
      // Then get products for this category
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryData.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      setProducts(productsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [categorySlug]);

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `products/${productId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        toast.error('Erreur upload: ' + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);

      if (!error) {
        toast.success('Image ajoutée!');
        fetchCategoryAndProducts();
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ image_url: null })
      .eq('id', productId);

    if (!error) {
      toast.success('Image supprimée!');
      fetchCategoryAndProducts();
    }
  };

  const handleSave = async (product: any) => {
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        description: product.description,
        base_price: product.base_price,
      })
      .eq('id', product.id);
    
    if (!error) {
      toast.success('Mis à jour!');
      setEditingId(null);
      fetchCategoryAndProducts();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    
    if (!error) {
      toast.success('Supprimé!');
      fetchCategoryAndProducts();
    }
  };

  const handleAdd = async () => {
    if (!categoryId) {
      toast.error('Catégorie non trouvée');
      return;
    }

    const { error } = await supabase
      .from('products')
      .insert({
        name: newProduct.name,
        description: newProduct.description,
        base_price: newProduct.base_price,
        category_id: categoryId,
        is_active: true,
        display_order: products.length,
      });
    
    if (!error) {
      toast.success('Produit ajouté!');
      fetchCategoryAndProducts();
      setNewProduct({ name: '', description: '', base_price: 0 });
      setShowAddForm(false);
    } else {
      toast.error("Erreur lors de l'ajout");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        <div className="flex gap-2">
          <Badge variant="secondary">{products.length} produits</Badge>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) {
            handleImageUpload(uploadTargetId, file);
          }
          e.target.value = '';
        }}
      />
      
      {/* Add Form */}
      {showAddForm && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Nouveau Produit</h3>
          <div className="grid gap-3">
            <Input
              placeholder="Nom du produit"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Prix de base"
              value={newProduct.base_price || ''}
              onChange={(e) => setNewProduct({ ...newProduct, base_price: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!newProduct.name}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            {/* Image */}
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
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveImage(product.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Image className="w-8 h-8 opacity-30" />
                  <span className="text-xs mt-1">Pas d'image</span>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2"
                disabled={uploading === product.id}
                onClick={() => {
                  setUploadTargetId(product.id);
                  fileInputRef.current?.click();
                }}
              >
                {uploading === product.id ? '...' : <Upload className="w-3 h-3" />}
              </Button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              {editingId === product.id ? (
                <>
                  <Input
                    value={product.name}
                    onChange={(e) => setProducts(products.map(p => 
                      p.id === product.id ? { ...p, name: e.target.value } : p
                    ))}
                    placeholder="Nom"
                  />
                  <Textarea
                    value={product.description || ''}
                    onChange={(e) => setProducts(products.map(p => 
                      p.id === product.id ? { ...p, description: e.target.value } : p
                    ))}
                    placeholder="Description"
                    className="min-h-[60px]"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={product.base_price}
                    onChange={(e) => setProducts(products.map(p => 
                      p.id === product.id ? { ...p, base_price: parseFloat(e.target.value) || 0 } : p
                    ))}
                    placeholder="Prix"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(product)}>Sauver</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-bold">{product.base_price}€</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(product.id)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun produit dans cette catégorie. Cliquez sur "Ajouter" pour en créer.
        </div>
      )}
    </div>
  );
}
