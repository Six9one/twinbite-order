import { useState, useEffect, useMemo } from 'react';
import {
  SupplierProduct,
} from '@/data/supplierCatalog';
import {
  OrderItem,
  loadDraftOrder,
  saveDraftOrder,
  clearDraftOrder,
  getAllSupplierProducts,
} from '@/lib/coursesService';
import { CourseProductCard } from '@/components/courses/CourseProductCard';
import { CourseSearchBar } from '@/components/courses/CourseSearchBar';
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
  CheckCircle2,
  Package,
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.href = '/courses-manifest.json';
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
    };
  }, []);

  useEffect(() => {
    setProducts(getAllSupplierProducts());
    const savedDraft = loadDraftOrder();
    setQuantities(savedDraft);
  }, []);

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

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (showOnlySelected) {
        return (quantities[product.id] || 0) > 0;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesRef = product.reference?.toLowerCase().includes(q);
        const matchesUnit = product.defaultUnit?.toLowerCase().includes(q);
        return matchesName || matchesRef || matchesUnit;
      }

      return true;
    });
  }, [products, showOnlySelected, searchQuery, quantities]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 shadow-2xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href="/kitchen?tab=reception"
              className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Retour cuisine"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>

            {/* Logo */}
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs flex-shrink-0 bg-emerald-600 border border-emerald-500">
              <img
                src="/icons/courses-icon.png"
                alt="Twin Courses"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">
                Twin Courses
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Réassort & Courses</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Install Button */}
            {isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <Download className="w-3 h-3" />
                <span>Installer</span>
              </button>
            )}

            {orderItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition-colors"
                title="Vider le panier"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <a
              href="/kitchen"
              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-colors"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Cuisine</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-3.5 pt-3 space-y-2.5">
        {/* Search Bar */}
        <CourseSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* View Controls & Cart Filter */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Quick Filter: All vs Selected */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setShowOnlySelected(false)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                showOnlySelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛒 Panier</span>
              {orderItems.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    showOnlySelected ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {orderItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Grid vs List Toggle */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Aperçu en Grille"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Aperçu en Liste"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Products Display (Grid 2-col or List) */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <Package className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">
              {showOnlySelected ? 'Votre panier est vide' : 'Aucun produit trouvé'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {showOnlySelected
                ? 'Sélectionnez des articles dans la liste'
                : 'Ajoutez-le avec le bouton ci-dessous'}
            </p>
          </div>
        ) : (
          <div
            className={`${
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-2'
                : 'space-y-1.5'
            }`}
          >
            {filteredProducts.map((product) => (
              <CourseProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                quantity={quantities[product.id] || 0}
                onUpdateQuantity={(qty) => handleUpdateQuantity(product.id, qty)}
              />
            ))}
          </div>
        )}

        {/* Add custom item */}
        <div className="pt-1">
          <CourseAddCustomItemDialog onProductAdded={handleCustomProductAdded} />
        </div>
      </main>

      {/* Bottom Cart Drawer */}
      <CourseCartDrawer
        items={orderItems}
        onClear={handleClearAll}
        onUpdateQuantity={handleUpdateQuantity}
      />

      {/* iOS Installation Instructions */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Installer Twin Courses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 pt-1 text-xs text-slate-600">
            <p>Pour installer sur votre écran d'accueil iPhone ou iPad :</p>
            <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                  1
                </span>
                <span>
                  Touchez <strong>Partager</strong> <Share className="w-3 h-3 inline mx-0.5 text-emerald-600" /> en bas de Safari.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                  2
                </span>
                <span>
                  Touchez <strong>« Sur l'écran d'accueil »</strong> 📲.
                </span>
              </div>
              <div className="flex items-center gap-2">
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
