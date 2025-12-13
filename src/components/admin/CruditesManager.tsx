import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAllCruditeOptions } from '@/hooks/useSandwiches';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Save, X, Leaf } from 'lucide-react';

export function CruditesManager() {
  const queryClient = useQueryClient();
  const { data: crudites, isLoading } = useAllCruditeOptions();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: 0 });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', price: 0 });

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('crudites_options')
        .insert({
          name: newForm.name,
          price: newForm.price,
          display_order: (crudites?.length || 0) + 1,
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['crudites_options'] });
      queryClient.invalidateQueries({ queryKey: ['crudites_options_all'] });
      toast.success('Crudité créée');
      setShowNewForm(false);
      setNewForm({ name: '', price: 0 });
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleEdit = (crudite: any) => {
    setEditingId(crudite.id);
    setEditForm({ name: crudite.name, price: crudite.price });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const { error } = await supabase
        .from('crudites_options')
        .update({ name: editForm.name, price: editForm.price })
        .eq('id', editingId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['crudites_options'] });
      queryClient.invalidateQueries({ queryKey: ['crudites_options_all'] });
      toast.success('Crudité mise à jour');
      setEditingId(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette crudité ?')) return;
    try {
      const { error } = await supabase
        .from('crudites_options')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['crudites_options'] });
      queryClient.invalidateQueries({ queryKey: ['crudites_options_all'] });
      toast.success('Crudité supprimée');
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
        <h2 className="text-2xl font-bold">Gestion des Crudités</h2>
        <Button onClick={() => setShowNewForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle Crudité
        </Button>
      </div>

      {showNewForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Nouvelle Crudité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nom"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            />
            <Input
              type="number"
              step="0.50"
              placeholder="Prix (0 si gratuit)"
              value={newForm.price}
              onChange={(e) => setNewForm({ ...newForm, price: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Créer</Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crudites?.map(crudite => (
          <Card key={crudite.id} className={!crudite.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              {editingId === crudite.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.50"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
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
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold">{crudite.name}</h3>
                    {!crudite.is_active && <Badge variant="secondary">Inactif</Badge>}
                  </div>
                  <p className="text-primary font-bold mb-3">
                    {crudite.price > 0 ? `${crudite.price.toFixed(2)}€` : 'Gratuit'}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(crudite)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(crudite.id)}>
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
