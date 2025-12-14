import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Image, Plus, Trash2, GripVertical, Save } from 'lucide-react';

interface CarouselImage {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

export function CarouselManager() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImage, setNewImage] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_images' as any)
      .select('*')
      .order('display_order', { ascending: true });
    
    if (!error && data) {
      setImages(data as unknown as CarouselImage[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newImage.image_url) {
      toast.error('L\'URL de l\'image est requise');
      return;
    }

    const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order)) + 1 : 0;

    const { error } = await supabase.from('carousel_images' as any).insert({
      title: newImage.title || null,
      description: newImage.description || null,
      image_url: newImage.image_url,
      link_url: newImage.link_url || null,
      display_order: maxOrder,
      is_active: true,
    } as any);

    if (!error) {
      toast.success('Image ajoutée!');
      fetchImages();
      setNewImage({ title: '', description: '', image_url: '', link_url: '' });
    } else {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('carousel_images' as any)
      .update({ is_active: !isActive } as any)
      .eq('id', id);
    
    if (!error) {
      toast.success(isActive ? 'Image désactivée' : 'Image activée');
      fetchImages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette image?')) return;
    
    const { error } = await supabase.from('carousel_images' as any).delete().eq('id', id);
    
    if (!error) {
      toast.success('Image supprimée');
      fetchImages();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `carousel-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      toast.error('Erreur lors de l\'upload');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    setNewImage({ ...newImage, image_url: urlData.publicUrl });
    toast.success('Image uploadée!');
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Image className="w-6 h-6 text-amber-500" />
        Carousel & Médias
      </h2>

      {/* Add new image */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Ajouter une image</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Titre (optionnel)"
            value={newImage.title}
            onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
          />
          <Input
            placeholder="Description (optionnel)"
            value={newImage.description}
            onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              placeholder="URL de l'image"
              value={newImage.image_url}
              onChange={(e) => setNewImage({ ...newImage, image_url: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ou</span>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Uploader une image</span>
                </Button>
              </label>
            </div>
          </div>
          <Input
            placeholder="Lien URL (optionnel)"
            value={newImage.link_url}
            onChange={(e) => setNewImage({ ...newImage, link_url: e.target.value })}
          />
        </div>

        {newImage.image_url && (
          <div className="w-32 h-20 rounded overflow-hidden bg-muted">
            <img 
              src={newImage.image_url} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <Button onClick={handleAdd} disabled={!newImage.image_url}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </Card>

      {/* List of images */}
      <div className="space-y-3">
        {images.length === 0 ? (
          <Card className="p-8 text-center">
            <Image className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune image dans le carousel</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Ajoutez des images pour créer votre carousel de promotions
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
                    alt={image.title || 'Carousel image'} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">
                    {image.title || `Image ${index + 1}`}
                  </h4>
                  {image.description && (
                    <p className="text-sm text-muted-foreground truncate">{image.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 truncate">{image.image_url}</p>
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