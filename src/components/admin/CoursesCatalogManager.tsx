import { useState, useEffect, useRef } from 'react';
import {
  SupplierProduct,
  DEFAULT_SUPPLIER_PRODUCTS,
} from '@/data/supplierCatalog';
import {
  getAllSupplierProducts,
  updateProductOverride,
  addCustomProduct,
  resetProductOverrides,
  getProductOverrides,
} from '@/lib/coursesService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Camera,
  Upload,
  Link as LinkIcon,
  Plus,
  RotateCcw,
  Check,
  Package,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function CoursesCatalogManager() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('reserve_seche');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdRef, setNewProdRef] = useState('');
  const [newProdImg, setNewProdImg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadProductId, setActiveUploadProductId] = useState<string | null>(null);

  const loadProducts = () => {
    setProducts(getAllSupplierProducts());
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const overrides = getProductOverrides();
  const overriddenCount = Object.keys(overrides).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadProductId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5 Mo)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        // Compress in an offscreen canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          updateProductOverride(activeUploadProductId, { image: compressedDataUrl });
          loadProducts();
          toast.success('Photo mise à jour avec succès !');
          setActiveUploadProductId(null);
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUrlImage = () => {
    if (!editingProduct || !imageUrlInput.trim()) return;
    updateProductOverride(editingProduct.id, { image: imageUrlInput.trim() });
    loadProducts();
    toast.success('Lien image mis à jour !');
    setEditingProduct(null);
    setImageUrlInput('');
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      toast.error('Nom requis');
      return;
    }

    const newProd: SupplierProduct = {
      id: 'prod_' + Date.now(),
      name: newProdName.trim(),
      reference: newProdRef.trim() || 'MANUEL',
      category: newProdCategory as any,
      defaultUnit: newProdUnit,
      image: newProdImg.trim() || '/cat_pizza_3d.webp',
    };

    addCustomProduct(newProd);
    loadProducts();
    toast.success(`"${newProd.name}" ajouté au catalogue !`);
    setIsNewProductOpen(false);
    setNewProdName('');
    setNewProdRef('');
    setNewProdImg('');
  };

  const handleResetOverrides = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser toutes les photos modifiées aux images par défaut ?')) {
      resetProductOverrides();
      loadProducts();
      toast.info('Catalogue réinitialisé aux photos d\'origine');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.reference?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesCat =
      selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Mobile Camera / Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-emerald-500" />
            Gestion des Photos & Catalogue Courses
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Personnalisez les photos des 127 ingrédients KFA et ajoutez de nouveaux articles. Les modifications apparaissent immédiatement sur la PWA <strong>/courses</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overriddenCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOverrides}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser ({overriddenCount})
            </Button>
          )}

          <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-md">
                <Plus className="w-4 h-4" />
                Nouvel Article
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Ajouter un produit fournisseur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProduct} className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs text-slate-300">Nom du produit *</Label>
                  <Input
                    placeholder="Ex: Filet de Poulet Extra..."
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-xs h-9 text-white mt-1"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-300">Référence KFA / Fournisseur</Label>
                    <Input
                      placeholder="Ex: POULET-01"
                      value={newProdRef}
                      onChange={(e) => setNewProdRef(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-xs h-9 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Unité par défaut</Label>
                    <select
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full h-9 bg-slate-800 border border-slate-700 rounded-md px-2 text-xs text-white mt-1"
                    >
                      <option value="kg">kg (Kilo)</option>
                      <option value="colis">colis</option>
                      <option value="sachet">sachet</option>
                      <option value="pack">pack</option>
                      <option value="paquet">paquet</option>
                      <option value="seau">seau</option>
                      <option value="bidon">bidon</option>
                      <option value="carton">carton</option>
                      <option value="boîte">boîte</option>
                      <option value="U">Unité (U)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Catégorie de stockage</Label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full h-9 bg-slate-800 border border-slate-700 rounded-md px-2 text-xs text-white mt-1"
                  >
                    <option value="chambre_froide">❄️ Chambre Froide / Positif</option>
                    <option value="congelateur">🧊 Congélateur / Négatif</option>
                    <option value="reserve_seche">📦 Réserve Sèche / Épicerie</option>
                    <option value="emballages">🍕 Emballages & Boîtes</option>
                    <option value="boissons">🥤 Boissons</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Lien URL de l'image (optionnel)</Label>
                  <Input
                    placeholder="https://..."
                    value={newProdImg}
                    onChange={(e) => setNewProdImg(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-xs h-9 text-white mt-1"
                  />
                </div>

                <Button type="submit" className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs mt-2">
                  Enregistrer l'article
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom (poulet, mozza, frites...) ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-xs text-white h-10 rounded-xl"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-slate-300 h-10"
        >
          <option value="all">Toutes les catégories ({products.length})</option>
          <option value="chambre_froide">❄️ Chambre Froide</option>
          <option value="congelateur">🧊 Congélateur</option>
          <option value="reserve_seche">📦 Réserve Sèche</option>
          <option value="emballages">🍕 Emballages</option>
          <option value="boissons">🥤 Boissons</option>
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredProducts.map((product) => {
          const isOverridden = !!overrides[product.id]?.image;

          return (
            <Card
              key={product.id}
              className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div className="p-2.5 space-y-2">
                {/* Image Container with Actions */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800 group">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
                    }}
                  />

                  {/* Overridden Badge */}
                  {isOverridden && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600/90 text-[9px] font-bold text-white shadow">
                      Personnalisée
                    </div>
                  )}

                  {/* Hover / Touch Overlay Button */}
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActiveUploadProductId(product.id);
                        fileInputRef.current?.click();
                      }}
                      className="w-full h-7 text-[10px] font-bold bg-white text-slate-900 hover:bg-slate-100 gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      Importer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProduct(product);
                        setImageUrlInput(product.image.startsWith('data:') ? '' : product.image);
                      }}
                      className="w-full h-7 text-[10px] font-bold border-slate-700 bg-slate-800 text-white hover:bg-slate-700 gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      Lien URL
                    </Button>
                  </div>
                </div>

                {/* Product Info */}
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 min-h-[28px]">
                    {product.name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="font-semibold text-emerald-400">{product.defaultUnit}</span>
                    <span className="truncate max-w-[70px] text-slate-500">{product.reference}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActiveUploadProductId(product.id);
                    fileInputRef.current?.click();
                  }}
                  className="w-full h-7 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 gap-1 justify-center"
                >
                  <Camera className="w-3 h-3 text-emerald-400" />
                  Changer photo
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit URL Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-400" />
              Modifier l'image de l'article
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-400">
              Produit : <strong className="text-white">{editingProduct?.name}</strong>
            </p>
            <div>
              <Label className="text-xs text-slate-300">Lien URL direct de l'image</Label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs h-9 text-white mt-1"
                autoFocus
              />
            </div>
            {imageUrlInput && (
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-700 mx-auto">
                <img src={imageUrlInput} alt="Aperçu" className="w-full h-full object-cover" />
              </div>
            )}
            <Button
              onClick={handleSaveUrlImage}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
