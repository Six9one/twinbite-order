import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAllSandwichTypes, useUpdateSandwichType, useCreateSandwichType, useDeleteSandwichType } from '@/hooks/useSandwiches';
import { Plus, Trash2, Edit2, Image, Save, X, Sandwich } from 'lucide-react';

export function SandwichManager() {
  const { data: sandwiches, isLoading } = useAllSandwichTypes();
  const updateSandwich = useUpdateSandwichType();
  const createSandwich = useCreateSandwichType();
  const deleteSandwich = useDeleteSandwichType();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', base_price: 0 });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', base_price: 6.50 });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (sandwichId: string, file: File) => {
    try {
      setUploadingId(sandwichId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `sandwich-${sandwichId}-${Date.now()}.${fileExt}`;
      const filePath = `sandwiches/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      await updateSandwich.mutateAsync({ id: sandwichId, image_url: publicUrl });
      toast.success('Image mise à jour');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingId(null);
    }
  };

  const handleEdit = (sandwich: any) => {
    setEditingId(sandwich.id);
    setEditForm({
      name: sandwich.name,
      description: sandwich.description || '',
      base_price: sandwich.base_price,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateSandwich.mutateAsync({
        id: editingId,
        name: editForm.name,
        description: editForm.description,
        base_price: editForm.base_price,
      });
      toast.success('Sandwich mis à jour');
      setEditingId(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCreate = async () => {
    try {
      await createSandwich.mutateAsync({
        name: newForm.name,
        description: newForm.description,
        base_price: newForm.base_price,
        is_active: true,
        display_order: (sandwiches?.length || 0) + 1,
        image_url: null,
      });
      toast.success('Sandwich créé');
      setShowNewForm(false);
      setNewForm({ name: '', description: '', base_price: 6.50 });
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce sandwich ?')) return;
    try {
      await deleteSandwich.mutateAsync(id);
      toast.success('Sandwich supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Sandwiches</h2>
        <Button onClick={() => setShowNewForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau Sandwich
        </Button>
      </div>

      {/* New Sandwich Form */}
      {showNewForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Nouveau Sandwich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nom du sandwich"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
            />
            <Input
              type="number"
              step="0.50"
              placeholder="Prix"
              value={newForm.base_price}
              onChange={(e) => setNewForm({ ...newForm, base_price: parseFloat(e.target.value) })}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Créer</Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sandwich List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sandwiches?.map(sandwich => (
          <Card key={sandwich.id} className={!sandwich.is_active ? 'opacity-50' : ''}>
            <div className="relative">
              {sandwich.image_url ? (
                <img
                  src={sandwich.image_url}
                  alt={sandwich.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center rounded-t-lg">
                  <Sandwich className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(sandwich.id, file);
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2 right-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingId === sandwich.id}
              >
                <Image className="w-4 h-4" />
              </Button>
            </div>
            <CardContent className="p-4">
              {editingId === sandwich.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.50"
                    value={editForm.base_price}
                    onChange={(e) => setEditForm({ ...editForm, base_price: parseFloat(e.target.value) })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Sauver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{sandwich.name}</h3>
                    {!sandwich.is_active && <Badge variant="secondary">Inactif</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{sandwich.description}</p>
                  <p className="text-lg font-bold text-primary mb-3">{sandwich.base_price.toFixed(2)}€</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(sandwich)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(sandwich.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
