import { useState, useEffect, useMemo, useRef } from 'react';
import {
  SupplierProduct,
} from '@/data/supplierCatalog';
import {
  OrderItem,
  loadDraftOrder,
  saveDraftOrder,
  clearDraftOrder,
  getAllSupplierProducts,
  syncOverridesFromCloud,
} from '@/lib/coursesService';
import {
  FOOD_CATEGORY_CHIPS,
  getProductFoodCategory,
} from '@/lib/coursesNameFormatter';
import { CourseProductCard } from '@/components/courses/CourseProductCard';
import { CourseSearchBar } from '@/components/courses/CourseSearchBar';
import { CourseCategoryChips } from '@/components/courses/CourseCategoryChips';
import { CourseCartDrawer } from '@/components/courses/CourseCartDrawer';
import { CourseAddCustomItemDialog } from '@/components/courses/CourseAddCustomItemDialog';
import {
  ArrowLeft,
  RotateCcw,
  Utensils,
  Download,
  Share,
  LayoutGrid,
  List,
  PackageOpen,
  Camera,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CoursesPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Photo Scan Mode on Courses Page
  const [photoScanMode, setPhotoScanMode] = useState<boolean>(false);
  const [activeScanProductId, setActiveScanProductId] = useState<string | null>(null);
  const [processingScan, setProcessingScan] = useState<{
    id: string;
    name: string;
    stage: string;
    percent: number;
  } | null>(null);

  const cameraScanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Twin Courses - Réassort & Commandes';
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.href = '/courses-manifest.json';
    }
    let appleIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    appleIcons.forEach((el) => {
      el.href = '/icons/courses-apple-touch-icon.png';
    });
    let appTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appTitle) {
      appTitle.content = 'Twin Courses';
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (manifestLink) {
        manifestLink.href = '/manifest.json';
      }
      appleIcons.forEach((el) => {
        el.href = '/favicon.png';
      });
      if (appTitle) {
        appTitle.content = 'Twin Pizza';
      }
    };
  }, []);

  useEffect(() => {
    setProducts(getAllSupplierProducts());
    const savedDraft = loadDraftOrder();
    setQuantities(savedDraft);

    // Sync custom photos from Supabase
    syncOverridesFromCloud().then(() => {
      setProducts(getAllSupplierProducts());
    });
  }, []);

  const handleTriggerCameraScan = (productId: string) => {
    setActiveScanProductId(productId);
    cameraScanInputRef.current?.click();
  };

  const handleCameraScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScanProductId) return;
    const prod = products.find((p) => p.id === activeScanProductId);
    const prodName = prod?.name || 'Produit';

    try {
      setProcessingScan({
        id: activeScanProductId,
        name: prodName,
        stage: '📸 Photo reçue...',
        percent: 10,
      });

      const { removeBackgroundAndOptimize } = await import('@/utils/aiBackgroundRemover');
      const { uploadBlobToSupabaseStorage } = await import('@/utils/cloudinary');
      const { updateProductOverride } = await import('@/lib/coursesService');

      const optimizedWebp = await removeBackgroundAndOptimize(file, (stage, percent) => {
        setProcessingScan({
          id: activeScanProductId,
          name: prodName,
          stage,
          percent,
        });
      });

      setProcessingScan({
        id: activeScanProductId,
        name: prodName,
        stage: '☁️ Synchronisation...',
        percent: 95,
      });

      const publicUrl = await uploadBlobToSupabaseStorage(optimizedWebp, `course_${activeScanProductId}`);
      updateProductOverride(activeScanProductId, { image: publicUrl });
      setProducts(getAllSupplierProducts());

      setProcessingScan(null);
      setActiveScanProductId(null);
      toast.success(`✨ Photo détourée et synchronisée pour "${prodName}" !`);
    } catch (err: any) {
      console.error('Scan error:', err);
      setProcessingScan(null);
      toast.error('Erreur lors du détourage : ' + (err?.message || 'Inconnue'));
    }

    e.target.value = '';
  };

  const handleInstallClick = async () => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('🎉 Application Twin Courses installée !');
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowIosGuide(true);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      saveDraftOrder(next);
      return next;
    });
  };

  const handleClearAll = () => {
    if (Object.keys(quantities).length === 0) return;
    if (window.confirm('Voulez-vous vraiment vider tout le panier ?')) {
      setQuantities({});
      clearDraftOrder();
      setShowOnlySelected(false);
      toast.info('Panier réinitialisé');
    }
  };

  const handleCustomProductAdded = (newProduct: SupplierProduct, initialQty: number) => {
    setProducts((prev) => [newProduct, ...prev]);
    handleUpdateQuantity(newProduct.id, initialQty);
  };

  const orderItems: OrderItem[] = useMemo(() => {
    const list: OrderItem[] = [];
    Object.entries(quantities).forEach(([prodId, qty]) => {
      if (qty > 0) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          list.push({
            product: prod,
            quantity: qty,
            unit: prod.defaultUnit,
          });
        }
      }
    });
    return list;
  }, [quantities, products]);

  // Compute category counts for chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    FOOD_CATEGORY_CHIPS.forEach((c) => {
      if (c.id !== 'all') counts[c.id] = 0;
    });

    products.forEach((p) => {
      const cat = getProductFoodCategory(p);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [products]);

  // Filter products by category, search, and selection
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (showOnlySelected) {
        return (quantities[product.id] || 0) > 0;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesRef = product.reference?.toLowerCase().includes(q);
        const matchesUnit = product.defaultUnit?.toLowerCase().includes(q);
        if (!matchesName && !matchesRef && !matchesUnit) return false;
      }

      // Category Chip
      if (selectedCategory !== 'all') {
        const cat = getProductFoodCategory(product);
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [products, showOnlySelected, selectedCategory, searchQuery, quantities]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28 font-sans antialiased">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a
              href="/kitchen?tab=reception"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Retour cuisine"
              aria-label="Retour cuisine"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>

            {/* Logo */}
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs flex-shrink-0 bg-emerald-600 border border-emerald-500/80">
              <img
                src="/icons/courses-apple-touch-icon.png"
                alt="Twin Courses"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icons/courses-icon.png';
                }}
              />
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Twin Courses
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Réassort & Courses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Camera Scanner Mode Button */}
            <button
              type="button"
              onClick={() => {
                const next = !photoScanMode;
                setPhotoScanMode(next);
                if (next) {
                  toast.info('📸 Mode Scanner Photo activé !', {
                    description: 'Touchez n\'importe quel article pour le prendre en photo et le détourer.',
                  });
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                photoScanMode
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50 font-extrabold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
              }`}
              title="Activer le scanner photo IA"
            >
              <Camera className={`w-3.5 h-3.5 ${photoScanMode ? 'text-slate-950' : 'text-emerald-600'}`} />
              <span>{photoScanMode ? 'Mode Photo ON' : 'Scanner Photo'}</span>
            </button>

            {/* Install Button */}
            {isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer</span>
              </button>
            )}

            {orderItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition-colors"
                title="Vider la commande"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <a
              href="/kitchen"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/80 transition-colors"
            >
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xs:inline">Cuisine</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hidden Mobile Camera Input */}
      <input
        type="file"
        ref={cameraScanInputRef}
        onChange={handleCameraScanFile}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* AI Processing Modal Overlay */}
      {processingScan && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 border border-emerald-500/30 animate-in fade-in zoom-in duration-200">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
              <div className="relative w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                <Sparkles className="w-7 h-7 animate-spin text-emerald-600" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                ✨ IA Auto-Détourage
              </span>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                {processingScan.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {processingScan.stage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${processingScan.percent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Sans arrière-plan</span>
                <span className="text-emerald-700 font-bold">{processingScan.percent}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Mode Alert Banner */}
      {photoScanMode && (
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-3">
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-base">📸</span>
              <span>
                <strong>Mode Scanner Photo Actif :</strong> Touchez l'icône appareil photo sur n'importe quel article pour le prendre en photo et le détourer en direct.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPhotoScanMode(false)}
              className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 whitespace-nowrap shadow-2xs"
            >
              Quitter
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-3.5 space-y-3.5">
        {/* 1. Search Bar */}
        <CourseSearchBar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q && showOnlySelected) setShowOnlySelected(false);
          }}
        />

        {/* 2. Category Navigation Chips */}
        {!showOnlySelected && (
          <CourseCategoryChips
            categories={FOOD_CATEGORY_CHIPS}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              if (searchQuery) setSearchQuery('');
            }}
            categoryCounts={categoryCounts}
          />
        )}

        {/* 3. Segmented Control (Tous / Panier) & View Toggle */}
        <div className="flex items-center justify-between pt-1">
          {/* Segmented Filter */}
          <div className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowOnlySelected(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                !showOnlySelected
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setShowOnlySelected(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                showOnlySelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛒 Panier</span>
              {orderItems.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                    showOnlySelected
                      ? 'bg-white text-emerald-800'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {orderItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Grid / List Toggle */}
          <div className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Aperçu en Grille"
              aria-label="Aperçu en Grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Aperçu en Liste"
              aria-label="Aperçu en Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. Products Display (Responsive 2-col on Mobile, 3-5 on Desktop) */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <PackageOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              {showOnlySelected
                ? 'Votre panier est vide'
                : searchQuery
                ? 'Aucun produit trouvé'
                : 'Aucun produit dans cette catégorie'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {showOnlySelected
                ? 'Sélectionnez des articles dans le catalogue pour préparer votre commande.'
                : searchQuery
                ? 'Essayez un autre mot-clé ou ajoutez un article sur-mesure.'
                : 'Sélectionnez une autre catégorie ci-dessus.'}
            </p>
            {showOnlySelected && (
              <button
                type="button"
                onClick={() => setShowOnlySelected(false)}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Parcourir le catalogue
              </button>
            )}
          </div>
        ) : (
          <div
            className={`${
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'
                : 'space-y-2'
            }`}
          >
            {filteredProducts.map((product) => (
              <CourseProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                quantity={quantities[product.id] || 0}
                isScanMode={photoScanMode}
                onUpdateQuantity={(qty) => handleUpdateQuantity(product.id, qty)}
                onTriggerCamera={handleTriggerCameraScan}
              />
            ))}
          </div>
        )}

        {/* 5. Add Custom Item on the fly */}
        <div className="pt-2">
          <CourseAddCustomItemDialog onProductAdded={handleCustomProductAdded} />
        </div>
      </main>

      {/* Floating Cart Drawer Bar */}
      <CourseCartDrawer
        items={orderItems}
        onClear={handleClearAll}
        onUpdateQuantity={handleUpdateQuantity}
      />

      {/* iOS Installation Instructions */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Installer Twin Courses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1 text-xs text-slate-600">
            <p>Pour installer sur votre écran d'accueil iPhone ou iPad :</p>
            <div className="space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                  1
                </span>
                <span>
                  Touchez <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-emerald-600" /> en bas de Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                  2
                </span>
                <span>
                  Touchez <strong>« Sur l'écran d'accueil »</strong> 📲.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                  3
                </span>
                <span>
                  Touchez <strong>Ajouter</strong> en haut à droite.
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
