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
  syncOverridesFromCloud,
} from '@/lib/coursesService';
import { removeBackgroundAndOptimize } from '@/utils/aiBackgroundRemover';
import { uploadBlobToSupabaseStorage } from '@/utils/cloudinary';
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
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export function CoursesCatalogManager() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);

  // Processing state for AI background removal
  const [processingProduct, setProcessingProduct] = useState<{
    id: string;
    name: string;
    stage: string;
    percent: number;
  } | null>(null);

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('reserve_seche');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdRef, setNewProdRef] = useState('');
  const [newProdImg, setNewProdImg] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadProductId, setActiveUploadProductId] = useState<string | null>(null);

  const loadProducts = () => {
    setProducts(getAllSupplierProducts());
  };

  useEffect(() => {
    loadProducts();
    syncOverridesFromCloud().then(() => loadProducts());
  }, []);

  const overrides = getProductOverrides();
  const overriddenCount = Object.keys(overrides).length;

  const handleProcessImage = async (file: File, productId: string, productName: string) => {
    if (!file || !productId) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 15 Mo)');
      return;
    }

    try {
      setProcessingProduct({
        id: productId,
        name: productName,
        stage: '📸 Initialisation du modèle IA...',
        percent: 10,
      });

      // 1. Run AI Background Removal + 600x600 WebP square centering
      const optimizedWebpBlob = await removeBackgroundAndOptimize(file, (stage, percent) => {
        setProcessingProduct({
          id: productId,
          name: productName,
          stage,
          percent,
        });
      });

      // 2. Upload to Supabase Storage
      setProcessingProduct({
        id: productId,
        name: productName,
        stage: '☁️ Synchronisation Supabase Storage...',
        percent: 95,
      });

      const publicUrl = await uploadBlobToSupabaseStorage(optimizedWebpBlob, `courses_${productId}`);

      // 3. Save override locally and in cloud
      updateProductOverride(productId, { image: publicUrl });
      loadProducts();

      setProcessingProduct(null);
      setActiveUploadProductId(null);
      toast.success(`✨ Photo détourée et synchronisée pour "${productName}" !`, {
        description: 'Format WebP optimisé transparent sans fond.',
      });
    } catch (err: any) {
      console.error('Error during AI background removal:', err);
      setProcessingProduct(null);
      toast.error('Erreur lors du détourage IA : ' + (err?.message || 'Inconnue'));
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadProductId) return;
    const prod = products.find((p) => p.id === activeUploadProductId);
    handleProcessImage(file, activeUploadProductId, prod?.name || 'Produit');
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadProductId) return;
    const prod = products.find((p) => p.id === activeUploadProductId);
    handleProcessImage(file, activeUploadProductId, prod?.name || 'Produit');
    e.target.value = '';
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

  const [filterMode, setFilterMode] = useState<'all' | 'needs_photo' | 'has_photo'>('all');

  const filteredProducts = products.filter((p) => {
    const isOverridden = !!overrides[p.id]?.image;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.reference?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesCat =
      selectedCategory === 'all' || p.category === selectedCategory;

    let matchesFilter = true;
    if (filterMode === 'needs_photo') matchesFilter = !isOverridden;
    if (filterMode === 'has_photo') matchesFilter = isOverridden;

    return matchesSearch && matchesCat && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Native Mobile Camera Input (Direct Photo Capture) */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Standard File Upload Input (Gallery / Disk) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* AI Processing Modal / Live Progress */}
      {processingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
              <div className="relative w-16 h-16 rounded-full bg-emerald-500/30 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-8 h-8 animate-spin text-emerald-300" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                ✨ IA Auto-Détourage & Optimisation
              </span>
              <h3 className="text-base font-bold text-white line-clamp-1">
                {processingProduct.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {processingProduct.stage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${processingProduct.percent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Détourage sans arrière-plan</span>
                <span className="text-emerald-400 font-bold">{processingProduct.percent}%</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400/80 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              ⚡ Suppression instantanée du décor, recadrage automatique et compression WebP ~50 Ko.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-emerald-500" />
            Scanner & Catalogue Photos Courses
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Shootez directement vos ingrédients en cuisine : l'<strong>IA efface l'arrière-plan</strong> automatiquement et synchronise le produit en direct sur la PWA <strong>/courses</strong>.
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

      {/* Filter Mode & Search Bar */}
      <div className="space-y-3">
        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMode === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tous les articles ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('needs_photo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMode === 'needs_photo'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📸 À photographier ({products.length - overriddenCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('has_photo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMode === 'has_photo'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ✨ Photos Personnalisées ({overriddenCount})
          </button>
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
            <option value="all">Toutes les catégories</option>
            <option value="chambre_froide">❄️ Chambre Froide</option>
            <option value="congelateur">🧊 Congélateur</option>
            <option value="reserve_seche">📦 Réserve Sèche</option>
            <option value="emballages">🍕 Emballages</option>
            <option value="boissons">🥤 Boissons</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredProducts.map((product) => {
          const isOverridden = !!overrides[product.id]?.image;

          return (
            <Card
              key={product.id}
              className={`bg-slate-900 transition-all rounded-2xl overflow-hidden flex flex-col justify-between border ${
                isOverridden ? 'border-emerald-500/40 shadow-xs' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2.5 space-y-2">
                {/* Image Container with Actions */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 group">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
                    }}
                  />

                  {/* Overridden Badge */}
                  {isOverridden && (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-[10px] font-bold text-white shadow flex items-center gap-1 backdrop-blur-xs">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-200" />
                      Détourée
                    </div>
                  )}

                  {/* Hover / Touch Action Overlay */}
                  <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-xs">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveUploadProductId(product.id);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                    >
                      <Camera className="w-3 h-3" />
                      Prendre Photo
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActiveUploadProductId(product.id);
                        fileInputRef.current?.click();
                      }}
                      className="w-full h-7 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1 border border-slate-700"
                    >
                      <Upload className="w-3 h-3" />
                      Galerie
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingProduct(product);
                        setImageUrlInput(product.image.startsWith('data:') ? '' : product.image);
                      }}
                      className="w-full h-6 text-[9px] text-slate-400 hover:text-white"
                    >
                      <LinkIcon className="w-2.5 h-2.5 mr-1" />
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
                    <span className="truncate max-w-[70px] text-slate-500 font-mono">{product.reference}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action: One-Click Camera Button */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
                {!isOverridden ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveUploadProductId(product.id);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 justify-center shadow-xs rounded-xl"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Shooter & Détourer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveUploadProductId(product.id);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full h-7 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 gap-1 justify-center rounded-lg"
                  >
                    <Camera className="w-3 h-3 text-emerald-400" />
                    Reprendre photo
                  </Button>
                )}
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
                <img src={imageUrlInput} alt="Aperçu" className="w-full h-full object-contain" />
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
