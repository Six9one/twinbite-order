import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Upload, X, Image } from 'lucide-react';

interface ImageUploadTableProps {
  tableName: string;
  title: string;
  hasImage?: boolean;
}

export function ImageUploadTable({ tableName, title, hasImage = false }: ImageUploadTableProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<any>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const fetchItems = async () => {
    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .order('display_order', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploading(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tableName}/${itemId}-${Date.now()}.${fileExt}`;

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
        .from(tableName as any)
        .update({ image_url: publicUrl })
        .eq('id', itemId);

      if (!error) {
        toast.success('Image ajoutée!');
        fetchItems();
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (itemId: string) => {
    const { error } = await supabase
      .from(tableName as any)
      .update({ image_url: null })
      .eq('id', itemId);

    if (!error) {
      toast.success('Image supprimée!');
      fetchItems();
    }
  };

  const handleSave = async (item: any) => {
    const updateData: any = { name: item.name };
    if (item.price !== undefined) updateData.price = item.price;

    const { error } = await supabase
      .from(tableName as any)
      .update(updateData)
      .eq('id', item.id);

    if (!error) {
      toast.success('Mis à jour!');
      setEditingId(null);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from(tableName as any)
      .update({ is_active: false })
      .eq('id', id);

    if (!error) {
      toast.success('Supprimé!');
      fetchItems();
    }
  };

  const handleAdd = async () => {
    // Get the next display order
    const maxOrder = items.reduce((max, item) => Math.max(max, item.display_order || 0), 0);

    const insertData = {
      ...newItem,
      is_active: true,
      display_order: maxOrder + 1,
      price: newItem.price || 0
    };

    const { error } = await supabase
      .from(tableName as any)
      .insert(insertData);

    if (!error) {
      toast.success('Ajouté!');
      fetchItems();
      setNewItem({});
    } else {
      console.error('Insert error:', error);
      toast.error("Erreur lors de l'ajout: " + (error.message || 'Vérifiez les permissions'));
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-display font-bold">{title}</h2>

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
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="font-semibold mb-3">Ajouter</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <Input
            placeholder="Nom"
            value={newItem.name || ''}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-40"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Prix"
            value={newItem.price || ''}
            onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
            className="w-24"
          />
          <Button onClick={handleAdd} disabled={!newItem.name}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.filter(i => i.is_active !== false).map((item) => (
          <div key={item.id} className="bg-card rounded-lg border overflow-hidden">
            {/* Image */}
            {hasImage && (
              <div className="relative aspect-square bg-muted">
                {item.image_url ? (
                  <>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleRemoveImage(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Image className="w-8 h-8 opacity-30" />
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  disabled={uploading === item.id}
                  onClick={() => {
                    setUploadTargetId(item.id);
                    fileInputRef.current?.click();
                  }}
                >
                  {uploading === item.id ? '...' : <Upload className="w-3 h-3" />}
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="p-3 space-y-2">
              {editingId === item.id ? (
                <>
                  <Input
                    value={item.name}
                    onChange={(e) => setItems(items.map(i =>
                      i.id === item.id ? { ...i, name: e.target.value } : i
                    ))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => setItems(items.map(i =>
                      i.id === item.id ? { ...i, price: parseFloat(e.target.value) } : i
                    ))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(item)}>Sauver</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-primary font-semibold">{item.price}€</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
