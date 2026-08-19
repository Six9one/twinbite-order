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
  const [unit, setUnit] = useState<string>('kg');
  const [qty, setQty] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nom du produit requis');
      return;
    }

    const newProd: SupplierProduct = {
      id: 'custom_' + Date.now(),
      reference: 'DIVERS',
      name: name.trim(),
      category: 'reserve_seche',
      defaultUnit: unit,
      image: '/cat_pizza_3d.webp',
    };

    addCustomProduct(newProd);
    onProductAdded(newProd, parseFloat(qty) || 1);
    toast.success(`"${newProd.name}" ajouté !`);
    setName('');
    setQty('1');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-white text-slate-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          Ajouter un article hors catalogue
        </button>
      </DialogTrigger>

      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900">
            Ajouter un produit sur-mesure
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <Label className="text-xs font-bold text-slate-700">Nom du produit *</Label>
            <Input
              placeholder="Ex: Sel fin 5kg, Sauce Samouraï..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border-slate-300 text-slate-900 h-9 text-xs mt-1"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Unité</Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2 text-xs text-slate-900 mt-1"
              >
                <option value="kg">Kilo (kg)</option>
                <option value="colis">Colis</option>
                <option value="sachet">Sachet</option>
                <option value="pack">Pack</option>
                <option value="paquet">Paquet</option>
                <option value="seau">Seau</option>
                <option value="bidon">Bidon</option>
                <option value="carton">Carton</option>
                <option value="boîte">Boîte</option>
                <option value="U">Unité (U)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Quantité</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 h-9 text-xs mt-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl mt-2"
          >
            Ajouter au panier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
