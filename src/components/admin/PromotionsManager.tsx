import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Gift, Calendar, Percent } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  promo_type: string;
  discount_percent: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  cart_min_amount: number | null;
  free_item_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    promo_type: 'discount',
    discount_percent: 0,
    buy_quantity: 0,
    get_quantity: 0,
    cart_min_amount: 0,
    free_item_name: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPromotions(data as unknown as Promotion[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newPromo.title) {
      toast.error('Le titre est requis');
      return;
    }

    const { error } = await supabase.from('promotions' as any).insert({
      title: newPromo.title,
      description: newPromo.description || null,
      promo_type: newPromo.promo_type,
      discount_percent: newPromo.promo_type === 'discount' ? newPromo.discount_percent : null,
      buy_quantity: newPromo.promo_type === 'buy_x_get_y' ? newPromo.buy_quantity : null,
      get_quantity: newPromo.promo_type === 'buy_x_get_y' ? newPromo.get_quantity : null,
      cart_min_amount: newPromo.promo_type === 'cart_threshold' ? newPromo.cart_min_amount : null,
      free_item_name: newPromo.promo_type === 'cart_threshold' ? newPromo.free_item_name : null,
      start_date: newPromo.start_date || null,
      end_date: newPromo.end_date || null,
      is_active: true,
    } as any);

    if (!error) {
      toast.success('Promotion ajoutée!');
      fetchPromotions();
      setNewPromo({
        title: '',
        description: '',
        promo_type: 'discount',
        discount_percent: 0,
        buy_quantity: 0,
        get_quantity: 0,
        cart_min_amount: 0,
        free_item_name: '',
        start_date: '',
        end_date: '',
      });
    } else {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('promotions' as any)
      .update({ is_active: !isActive } as any)
      .eq('id', id);
    
    if (!error) {
      toast.success(isActive ? 'Promotion désactivée' : 'Promotion activée');
      fetchPromotions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette promotion?')) return;
    
    const { error } = await supabase.from('promotions' as any).delete().eq('id', id);
    
    if (!error) {
      toast.success('Promotion supprimée');
      fetchPromotions();
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'discount': return 'Réduction %';
      case 'buy_x_get_y': return 'Achetez X, obtenez Y';
      case 'cart_threshold': return 'Seuil panier';
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Gift className="w-6 h-6 text-amber-500" />
        Gestion des Promotions
      </h2>

      {/* Add new promotion */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Nouvelle Promotion</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Titre de la promotion"
            value={newPromo.title}
            onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
          />
          <Input
            placeholder="Description (optionnel)"
            value={newPromo.description}
            onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select 
            value={newPromo.promo_type} 
            onValueChange={(v) => setNewPromo({ ...newPromo, promo_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de promotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Réduction en %</SelectItem>
              <SelectItem value="buy_x_get_y">Achetez X, obtenez Y gratuit</SelectItem>
              <SelectItem value="cart_threshold">Cadeau si panier ≥ €X</SelectItem>
            </SelectContent>
          </Select>

          {newPromo.promo_type === 'discount' && (
            <Input
              type="number"
              placeholder="% de réduction"
              value={newPromo.discount_percent || ''}
              onChange={(e) => setNewPromo({ ...newPromo, discount_percent: parseInt(e.target.value) })}
            />
          )}

          {newPromo.promo_type === 'buy_x_get_y' && (
            <>
              <Input
                type="number"
                placeholder="Achetez X"
                value={newPromo.buy_quantity || ''}
                onChange={(e) => setNewPromo({ ...newPromo, buy_quantity: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Obtenez Y gratuit"
                value={newPromo.get_quantity || ''}
                onChange={(e) => setNewPromo({ ...newPromo, get_quantity: parseInt(e.target.value) })}
              />
            </>
          )}

          {newPromo.promo_type === 'cart_threshold' && (
            <>
              <Input
                type="number"
                placeholder="Panier minimum (€)"
                value={newPromo.cart_min_amount || ''}
                onChange={(e) => setNewPromo({ ...newPromo, cart_min_amount: parseFloat(e.target.value) })}
              />
              <Input
                placeholder="Article gratuit"
                value={newPromo.free_item_name}
                onChange={(e) => setNewPromo({ ...newPromo, free_item_name: e.target.value })}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Date de début</label>
            <Input
              type="datetime-local"
              value={newPromo.start_date}
              onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Date de fin</label>
            <Input
              type="datetime-local"
              value={newPromo.end_date}
              onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleAdd} disabled={!newPromo.title}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </Card>

      {/* List of promotions */}
      <div className="space-y-3">
        {promotions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune promotion</p>
        ) : (
          promotions.map((promo) => (
            <Card key={promo.id} className={`p-4 ${!promo.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{promo.title}</h4>
                    <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                      {promo.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Badge variant="outline">{getPromoTypeLabel(promo.promo_type)}</Badge>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {promo.discount_percent && (
                      <span><Percent className="w-3 h-3 inline" /> {promo.discount_percent}%</span>
                    )}
                    {promo.buy_quantity && promo.get_quantity && (
                      <span>Achetez {promo.buy_quantity} → {promo.get_quantity} gratuit</span>
                    )}
                    {promo.cart_min_amount && (
                      <span>Panier ≥ {promo.cart_min_amount}€ → {promo.free_item_name}</span>
                    )}
                    {promo.start_date && (
                      <span><Calendar className="w-3 h-3 inline" /> {new Date(promo.start_date).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggle(promo.id, promo.is_active)}
                  >
                    {promo.is_active ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(promo.id)}
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