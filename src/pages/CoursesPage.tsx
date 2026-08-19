import { useState, useEffect, useMemo } from 'react';
import {
  SupplierProduct,
  DEFAULT_SUPPLIER_PRODUCTS,
} from '@/data/supplierCatalog';
import {
  OrderItem,
  loadDraftOrder,
  saveDraftOrder,
  clearDraftOrder,
  getAllSupplierProducts,
} from '@/lib/coursesService';
import { CourseProductCard } from '@/components/courses/CourseProductCard';
import { CourseCategoryTabs } from '@/components/courses/CourseCategoryTabs';
import { CourseSearchBar } from '@/components/courses/CourseSearchBar';
import { CourseCartDrawer } from '@/components/courses/CourseCartDrawer';
import { CourseAddCustomItemDialog } from '@/components/courses/CourseAddCustomItemDialog';
import {
  ShoppingBag,
  ArrowLeft,
  RotateCcw,
  Utensils,
  Download,
  Share,
  X,
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
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Setup manifest & PWA listeners
  useEffect(() => {
    // Dynamically set manifest to courses-manifest.json
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

    // Detect iOS
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

  // Load initial catalog & draft
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

  // Sync draft to local storage
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

  // Build selected order items
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

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (showOnlySelected) {
        return (quantities[product.id] || 0) > 0;
      }
      if (activeCategory !== 'all' && product.category !== activeCategory) {
        return false;
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
  }, [products, activeCategory, showOnlySelected, searchQuery, quantities]);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      {/* Header (Mobile First) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a
              href="/kitchen?tab=reception"
              className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Retour à la cuisine"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>

            {/* Custom App Logo */}
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-emerald-800 border border-emerald-500/40">
              <img
                src="/icons/courses-icon.svg"
                alt="Twin Courses"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight flex items-center gap-1.5">
                Twin Courses
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  KFA
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Réassort & Commandes • 0323</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Install PWA Button */}
            {isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 border border-emerald-400/30"
                title="Installer sur l'écran d'accueil"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Installer</span>
              </button>
            )}

            {orderItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs transition-colors"
                title="Vider le panier"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <a
              href="/kitchen"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700/60"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Cuisine</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 pt-3.5 space-y-3">
        {/* Search & Voice */}
        <CourseSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Category Filter Pills */}
        <CourseCategoryTabs
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          selectedCount={orderItems.length}
          showOnlySelected={showOnlySelected}
          onToggleOnlySelected={() => setShowOnlySelected(!showOnlySelected)}
        />

        {/* Products List */}
        <div className="space-y-2.5 pt-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-900/50 rounded-2xl border border-slate-800">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                {showOnlySelected
                  ? 'Aucun article dans votre panier pour le moment.'
                  : 'Aucun produit trouvé.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {showOnlySelected
                  ? 'Ajoutez des articles en parcourant les catégories.'
                  : 'Essayez un autre mot-clé ou ajoutez-le en article sur-mesure.'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <CourseProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onUpdateQuantity={(qty) => handleUpdateQuantity(product.id, qty)}
              />
            ))
          )}
        </div>

        {/* Add custom item */}
        <div className="pt-2">
          <CourseAddCustomItemDialog onProductAdded={handleCustomProductAdded} />
        </div>
      </main>

      {/* Bottom Cart Drawer */}
      <CourseCartDrawer
        items={orderItems}
        onClear={handleClearAll}
        onUpdateQuantity={handleUpdateQuantity}
      />

      {/* iOS Installation Instructions Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              Installer l'application Courses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs text-slate-300">
            <p>Pour installer l'application sur votre écran d'accueil iPhone ou iPad :</p>
            <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  1
                </span>
                <span>
                  Appuyez sur le bouton <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> en bas de Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  2
                </span>
                <span>
                  Faites défiler et touchez <strong>« Sur l'écran d'accueil »</strong> 📲.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  3
                </span>
                <span>
                  Touchez <strong>Ajouter</strong> en haut à droite. C'est prêt ! 🎉
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
