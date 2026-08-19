import { useState } from 'react';
import { SupplierProduct } from '@/data/supplierCatalog';
import { addCustomProduct } from '@/lib/coursesService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CourseAddCustomItemDialogProps {
  onProductAdded: (product: SupplierProduct, initialQty: number) => void;
}

export function CourseAddCustomItemDialog({ onProductAdded }: CourseAddCustomItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'kg' | 'colis' | 'sachet' | 'pack' | 'paquet' | 'seau' | 'bidon' | 'carton' | 'boîte' | 'U'>('U');
  const [category, setCategory] = useState<'chambre_froide' | 'congelateur' | 'reserve_seche' | 'emballages' | 'boissons'>('reserve_seche');
  const [qty, setQty] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nom de l\'article requis');
      return;
    }

    const newProd: SupplierProduct = {
      id: 'custom_' + Date.now(),
      reference: 'CUSTOM',
      name: name.trim(),
      category,
      defaultUnit: unit,
      image: '/cat_pizza_3d.webp',
      presets: [1, 2, 5],
    };

    addCustomProduct(newProd);
    onProductAdded(newProd, parseFloat(qty) || 1);
    toast.success(`"${newProd.name}" ajouté à la commande !`);
    setName('');
    setQty('1');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-2 text-xs font-semibold transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Ajouter un autre article hors catalogue
        </button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white">
            Ajouter un produit sur-mesure
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div>
            <Label className="text-xs text-slate-300">Nom du produit *</Label>
            <Input
              placeholder="Ex: Sel fin 5kg, Sauce Samouraï..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950 border-slate-700 text-white h-10 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-300">Unité</Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-2.5 text-xs text-white"
              >
                <option value="U">Unité (U)</option>
                <option value="kg">Kilo (kg)</option>
                <option value="colis">Colis</option>
                <option value="sachet">Sachet</option>
                <option value="pack">Pack</option>
                <option value="paquet">Paquet</option>
                <option value="seau">Seau</option>
                <option value="bidon">Bidon</option>
                <option value="carton">Carton</option>
                <option value="boîte">Boîte</option>
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Quantité</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white h-10 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-300">Emplacement</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-2.5 text-xs text-white"
            >
              <option value="chambre_froide">❄️ Chambre Froide</option>
              <option value="congelateur">🧊 Congélateur</option>
              <option value="reserve_seche">📦 Réserve Sèche</option>
              <option value="emballages">🍕 Emballages</option>
              <option value="boissons">🥤 Boissons</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl mt-2"
          >
            Ajouter au panier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
