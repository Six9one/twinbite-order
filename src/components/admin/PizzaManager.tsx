import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePizzasByBase, useUpdateProduct, useCreateProduct, useDeleteProduct, uploadProductImage, Product } from '@/hooks/useProducts';
import { useProductPopularity } from '@/hooks/useProductAnalytics';
import { Plus, Edit2, Trash2, Upload, X, Pizza, TrendingUp, Eye, ShoppingCart, Package, Star, Sparkles, ZoomIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export function PizzaManager() {
  const { data: pizzasTomate, isLoading: loadingTomate, refetch: refetchTomate } = usePizzasByBase('tomate');
  const { data: pizzasCreme, isLoading: loadingCreme, refetch: refetchCreme } = usePizzasByBase('creme');
  const { data: popularityData } = useProductPopularity(30);

  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // New pizza form state
  const [newPizza, setNewPizza] = useState({
    name: '',
    description: '',
    base_price: 18,
    pizza_base: 'tomate' as 'tomate' | 'creme' | 'speciale',
    image_url: null as string | null,
    is_top_picked: false,
    image_zoom: 1.0
  });

  const refetchAll = () => {
    refetchTomate();
    refetchCreme();
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId);
    try {
      const imageUrl = await uploadProductImage(file, productId);
      if (imageUrl) {
        await updateProduct.mutateAsync({ id: productId, updates: { image_url: imageUrl } });
        toast.success('Image téléchargée!');
        refetchAll();
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
      refetchAll();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pizza ?')) return;
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success('Pizza supprimée!');
      refetchAll();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        updates: {
          name: editingProduct.name,
          description: editingProduct.description,
          base_price: editingProduct.base_price,
          pizza_base: editingProduct.pizza_base,
          is_top_picked: (editingProduct as any).is_top_picked || false
        }
      });
      toast.success('Pizza mise à jour!');
      setEditingProduct(null);
      refetchAll();
    } catch (error: any) {
      console.error('Error updating pizza:', error);
      const message = error?.message || error?.error?.message || 'Erreur inconnue';
      toast.error(`Erreur lors de la mise à jour: ${message}`);
    }
  };

  const handleToggleTopPicked = async (pizzaId: string, currentValue: boolean) => {
    try {
      await updateProduct.mutateAsync({
        id: pizzaId,
        updates: { is_top_picked: !currentValue }
      });
      toast.success(currentValue ? 'Retiré des favoris' : 'Ajouté aux favoris!');
      refetchAll();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleAddPizza = async () => {
    if (!newPizza.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      // Get pizza category ID
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'pizzas')
        .single();

      if (!category) {
        toast.error('Catégorie pizzas introuvable');
        return;
      }

      await createProduct.mutateAsync({
        name: newPizza.name,
        description: newPizza.description,
        base_price: newPizza.base_price,
        pizza_base: newPizza.pizza_base,
        category_id: category.id,
        image_url: newPizza.image_url,
        display_order: 999,
        is_active: true,
        is_top_picked: newPizza.is_top_picked,
        image_zoom: newPizza.image_zoom
      });

      toast.success('Pizza ajoutée!');
      setIsAddDialogOpen(false);
      setNewPizza({
        name: '',
        description: '',
        base_price: 18,
        pizza_base: 'tomate',
        image_url: null,
        is_top_picked: false,
        image_zoom: 1.0
      });
      refetchAll();
    } catch (error: any) {
      console.error('Error adding pizza:', error);
      const message = error?.message || error?.error?.message || 'Erreur inconnue';
      toast.error(`Erreur lors de l'ajout: ${message}`);
    }
  };

  const handleNewPizzaImageUpload = async (file: File) => {
    setUploading('new');
    try {
      // Upload to temp location
      const fileExt = file.name.split('.').pop();
      const fileName = `temp-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setNewPizza(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image téléchargée!');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  };

  const getPopularityStats = (pizzaName: string) => {
    const stats = popularityData?.find(p => p.name === pizzaName);
    return stats || { views: 0, carts: 0, orders: 0 };
  };

  const handleZoomChange = async (productId: string, zoom: number) => {
    try {
      await updateProduct.mutateAsync({
        id: productId,
        updates: { image_zoom: zoom }
      });
    } catch (error) {
      // Silent fail for zoom - it will update on next render
    }
  };

  const renderPizzaCard = (pizza: Product) => {
    const stats = getPopularityStats(pizza.name);
    const isTopPicked = (pizza as any).is_top_picked || false;
    const imageZoom = pizza.image_zoom || 1.0;

    return (
      <Card key={pizza.id} className={`overflow-hidden ${isTopPicked ? 'ring-2 ring-amber-400' : ''}`}>
        {/* Circular Image Section */}
        <div className="relative p-4 bg-gradient-to-b from-slate-50 to-white">
          {isTopPicked && (
            <Badge className="absolute top-2 left-2 bg-amber-500 text-white z-10">
              <Star className="w-3 h-3 mr-1 fill-white" />
              Top Picked
            </Badge>
          )}

          {/* Circular Pizza Image */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden bg-white shadow-lg border-4 border-orange-100">
            {pizza.image_url ? (
              <img
                src={pizza.image_url}
                alt={pizza.name}
                className="w-full h-full object-contain"
                style={{ transform: `scale(${imageZoom})` }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-gradient-to-br from-orange-50 to-amber-50">
                <Pizza className="w-12 h-12 opacity-30" />
              </div>
            )}
          </div>

          {/* Image Controls */}
          <div className="flex justify-center gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading === pizza.id}
              onClick={() => {
                setEditingProduct(pizza);
                fileInputRef.current?.click();
              }}
            >
              {uploading === pizza.id ? 'Envoi...' : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  {pizza.image_url ? 'Changer' : 'Ajouter'}
                </>
              )}
            </Button>
            {pizza.image_url && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveImage(pizza.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Zoom Slider */}
          {pizza.image_url && (
            <div className="mt-3 px-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ZoomIn className="w-3 h-3" />
                <span>Zoom: {(imageZoom * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[imageZoom]}
                min={0.5}
                max={2}
                step={0.05}
                onValueChange={(value) => handleZoomChange(pizza.id, value[0])}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{pizza.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{pizza.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">
                {pizza.pizza_base === 'tomate' ? '🍅' : pizza.pizza_base === 'speciale' ? '⭐' : '🥛'}
              </Badge>
              <Button
                variant={isTopPicked ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs ${isTopPicked ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                onClick={() => handleToggleTopPicked(pizza.id, isTopPicked)}
              >
                <Star className={`w-3 h-3 mr-1 ${isTopPicked ? 'fill-white' : ''}`} />
                {isTopPicked ? 'Favori' : 'Marquer'}
              </Button>
            </div>
          </div>

          {/* Analytics Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {stats.views}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> {stats.carts}
            </span>
            <span className="flex items-center gap-1 text-primary font-medium">
              <Package className="w-3 h-3" /> {stats.orders}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">{pizza.base_price}€</span>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditingProduct(pizza)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifier la pizza</DialogTitle>
                  </DialogHeader>
                  {editingProduct && editingProduct.id === pizza.id && (
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={editingProduct.description || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix de base (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingProduct.base_price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, base_price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Base de sauce</Label>
                        <Select
                          value={editingProduct.pizza_base || 'tomate'}
                          onValueChange={(value) => setEditingProduct({ ...editingProduct, pizza_base: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tomate">🍅 Sauce Tomate</SelectItem>
                            <SelectItem value="creme">🥛 Crème Fraîche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSaveEdit} className="w-full">
                        Sauvegarder
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(pizza.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const isLoading = loadingTomate || loadingCreme;
  const allPizzas = [...(pizzasTomate || []), ...(pizzasCreme || [])];

  // Get top 5 most ordered pizzas
  const topPizzas = popularityData?.filter(p => p.category === 'pizzas').slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Gestion des Pizzas</h2>
          <p className="text-muted-foreground">
            {allPizzas.length} pizzas ({pizzasTomate?.length || 0} tomate, {pizzasCreme?.length || 0} crème)
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une pizza
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle Pizza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Image Upload with Circular Preview */}
              <div className="space-y-3">
                <Label>Image</Label>
                <div className="flex flex-col items-center p-4 bg-gradient-to-b from-slate-50 to-white rounded-lg">
                  {/* Circular Preview */}
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-white shadow-lg border-4 border-orange-100">
                    {newPizza.image_url ? (
                      <img
                        src={newPizza.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        style={{ transform: `scale(${newPizza.image_zoom})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-orange-50 to-amber-50">
                        <Pizza className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={uploading === 'new'}
                      onClick={() => addFileInputRef.current?.click()}
                    >
                      {uploading === 'new' ? 'Envoi...' : (
                        <>
                          <Upload className="w-4 h-4 mr-1" />
                          {newPizza.image_url ? 'Changer' : 'Ajouter'}
                        </>
                      )}
                    </Button>
                    {newPizza.image_url && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setNewPizza(prev => ({ ...prev, image_url: null, image_zoom: 1.0 }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Zoom Slider */}
                  {newPizza.image_url && (
                    <div className="w-full mt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <ZoomIn className="w-3 h-3" />
                        <span>Zoom: {(newPizza.image_zoom * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[newPizza.image_zoom]}
                        min={0.5}
                        max={2}
                        step={0.05}
                        onValueChange={(value) => setNewPizza(prev => ({ ...prev, image_zoom: value[0] }))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Ajustez le zoom pour que la pizza soit bien visible dans le cercle
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={newPizza.name}
                  onChange={(e) => setNewPizza(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Margherita"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newPizza.description}
                  onChange={(e) => setNewPizza(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Sauce tomate, mozzarella, basilic"
                />
              </div>

              <div className="space-y-2">
                <Label>Prix de base (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPizza.base_price}
                  onChange={(e) => setNewPizza(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Base de sauce</Label>
                <Select
                  value={newPizza.pizza_base}
                  onValueChange={(value: 'tomate' | 'creme') => setNewPizza(prev => ({ ...prev, pizza_base: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tomate">🍅 Sauce Tomate</SelectItem>
                    <SelectItem value="creme">🥛 Crème Fraîche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAddPizza} className="w-full" disabled={!newPizza.name.trim()}>
                Ajouter la pizza
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && editingProduct) {
            handleImageUpload(editingProduct.id, file);
          }
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={addFileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleNewPizzaImageUpload(file);
          }
          e.target.value = '';
        }}
      />

      {/* Top Pizzas Stats */}
      {topPizzas.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Top 5 Pizzas (30 derniers jours)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topPizzas.map((pizza, index) => (
              <div key={pizza.name} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{pizza.name}</p>
                  <p className="text-xs text-muted-foreground">{pizza.orders} commandes</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pizza Tabs */}
      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <Tabs defaultValue="tomate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tomate" className="text-base">
              🍅 Base Tomate ({pizzasTomate?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="creme" className="text-base">
              🥛 Base Crème ({pizzasCreme?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tomate">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pizzasTomate?.map(renderPizzaCard)}
            </div>
            {(!pizzasTomate || pizzasTomate.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Aucune pizza base tomate
              </div>
            )}
          </TabsContent>

          <TabsContent value="creme">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pizzasCreme?.map(renderPizzaCard)}
            </div>
            {(!pizzasCreme || pizzasCreme.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Aucune pizza base crème
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
