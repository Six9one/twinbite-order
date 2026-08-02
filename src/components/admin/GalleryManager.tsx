import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Images, Plus, Trash2, GripVertical } from 'lucide-react';
import { compressImage } from '@/utils/imageCompressor';

interface GalleryImage {
  id: string;
  title: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImage, setNewImage] = useState({ title: '', image_url: '' });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_images' as any)
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setImages(data as unknown as GalleryImage[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newImage.image_url) {
      toast.error("L'image est requise");
      return;
    }

    const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order)) + 1 : 0;

    const { error } = await supabase.from('gallery_images' as any).insert({
      title: newImage.title || null,
      image_url: newImage.image_url,
      display_order: maxOrder,
      is_active: true,
    } as any);

    if (!error) {
      toast.success('Photo ajoutée à la galerie !');
      fetchImages();
      setNewImage({ title: '', image_url: '' });
    } else {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('gallery_images' as any)
      .update({ is_active: !isActive } as any)
      .eq('id', id);

    if (!error) {
      toast.success(isActive ? 'Photo masquée' : 'Photo visible');
      fetchImages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette photo ?')) return;

    const { error } = await supabase.from('gallery_images' as any).delete().eq('id', id);

    if (!error) {
      toast.success('Photo supprimée');
      fetchImages();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `gallery-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile, { cacheControl: '31536000', upsert: true });

      if (error) {
        toast.error("Erreur lors de l'upload");
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setNewImage(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Photo uploadée !');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Images className="w-6 h-6 text-amber-500" />
          Galerie Photos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Photos affichées dans le carrousel de la page d'accueil, juste après les avis clients (pizzas, soufflés, équipe, etc.)
        </p>
      </div>

      {/* Add new photo */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Ajouter une photo</h3>

        <Input
          placeholder="Titre / légende (optionnel)"
          value={newImage.title}
          onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
        />

        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span>{uploading ? 'Upload en cours...' : 'Choisir une photo'}</span>
            </Button>
          </label>
          {newImage.image_url && (
            <div className="w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
              <img src={newImage.image_url} alt="Aperçu" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <Button onClick={handleAdd} disabled={!newImage.image_url || uploading}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter à la galerie
        </Button>
      </Card>

      {/* List of photos */}
      <div className="space-y-3">
        {images.length === 0 ? (
          <Card className="p-8 text-center">
            <Images className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune photo dans la galerie</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Ajoutez des photos pour créer votre galerie sur la page d'accueil
            </p>
          </Card>
        ) : (
          images.map((image, index) => (
            <Card key={image.id} className={`p-4 ${!image.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />

                <div className="w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={image.image_url}
                    alt={image.title || 'Photo galerie'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">
                    {image.title || `Photo ${index + 1}`}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={image.is_active}
                    onCheckedChange={() => handleToggle(image.id, image.is_active)}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
