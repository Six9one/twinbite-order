import { useState, useEffect, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Settings, MapPin, Clock, Phone, X, ShoppingBag, ArrowRight, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { CategoryCardGrid } from '@/components/CategoryCardGrid';
import { BestSellerSlider, BestSellerPreset } from '@/components/BestSellerSlider';
import { ReviewsSlider } from '@/components/ReviewsSlider';
import { GallerySlider } from '@/components/GallerySlider';
import { FloatingGlassCart } from '@/components/FloatingGlassCart';
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';
import { useStoreOpen } from '@/hooks/useStoreOpen';

function MainApp() {
  const { orderType, setOrderType, getItemCount } = useOrder();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'home' | 'menu' | 'checkout'>(
    searchParams.get('checkout') === '1' || searchParams.get('retry') === '1' || searchParams.get('cancel') === '1' ? 'checkout' : 'home'
  );
  const [selectedPizzaSize, setSelectedPizzaSize] = useState<'senior' | 'mega' | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOrderTypePopup, setShowOrderTypePopup] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bestSellerModal, setBestSellerModal] = useState<BestSellerPreset | null>(null);
  const [pendingBestSeller, setPendingBestSeller] = useState<BestSellerPreset | null>(null);

  const { isOpen, label: hoursLabel } = useStoreOpen();

  useEffect(() => {
    if (searchParams.get('checkout') === '1' || searchParams.get('retry') === '1' || searchParams.get('cancel') === '1') {
      setView('checkout');
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) return;
        if (data?.session) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (roleData) {
            setIsAdmin(true);
          }
        }
      } catch (e) {}
    };
    checkAdmin();
  }, []);

  const handleSelectCategory = (categoryId?: string) => {
    if (categoryId) {
      setActiveCategory(categoryId);
    }
    if (!orderType) {
      setShowOrderTypePopup(true);
    } else {
      setView('menu');
    }
  };

  const handleStartOrder = (type?: OrderType) => {
    if (type) {
      setOrderType(type);
      setView('menu');
      return;
    }
    if (!orderType) {
      setShowOrderTypePopup(true);
    } else {
      setView('menu');
    }
  };

  const handleOrderTypePick = (type: OrderType) => {
    setOrderType(type);
    setShowOrderTypePopup(false);
    if (pendingBestSeller) {
      setBestSellerModal(pendingBestSeller);
      setPendingBestSeller(null);
      return;
    }
    setView('menu');
  };

  const handleBestSellerSelect = (preset: BestSellerPreset) => {
    if (!orderType) {
      setPendingBestSeller(preset);
      setShowOrderTypePopup(true);
    } else {
      setBestSellerModal(preset);
    }
  };

  const handleBackToHome = () => {
    setView('home');
    setOrderType(null);
    setActiveCategory(null);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setView('checkout');
  };

  const handleOrderComplete = () => {
    setView('home');
    setOrderType(null);
    setSelectedPizzaSize(null);
    setActiveCategory(null);
  };

  if (view === 'menu') {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-stone-500 animate-pulse">Chargement du menu...</span>
        </div>
      }>
        <CategoryMenu
          onBack={handleBackToHome}
          onOpenCart={() => setIsCartOpen(true)}
          lockedPizzaSize={selectedPizzaSize}
          onClearLockedSize={() => setSelectedPizzaSize(null)}
          initialCategory={activeCategory}
        />
        <NewCart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
          onEditItem={(cat) => setActiveCategory(cat)}
        />
      </Suspense>
    );
  }

  if (view === 'checkout') {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-stone-500 animate-pulse">Chargement de la commande...</span>
        </div>
      }>
        <NewCheckout
          onBack={(size) => {
            if (size) setSelectedPizzaSize(size);
            setView('menu');
          }}
          onComplete={handleOrderComplete}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] antialiased text-[#3B2216]">
      {isAdmin && (
        <Link to="/admin/dashboard" className="fixed top-3 right-3 z-50">
          <button className="flex items-center gap-1.5 bg-stone-800/80 backdrop-blur text-white shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold">
            <Settings className="w-3.5 h-3.5" /> Admin
          </button>
        </Link>
      )}

      <Suspense fallback={null}>
        <NewCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />
      </Suspense>

      <FloatingGlassCart onOpenCart={() => setIsCartOpen(true)} />

      {showOrderTypePopup && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowOrderTypePopup(false); setPendingBestSeller(null); }} />
          <div className="relative z-10 w-full max-w-md mx-4 mb-5 bg-white rounded-[1.75rem] shadow-2xl p-6 animate-in slide-in-from-bottom-8 duration-300">
            <button onClick={() => { setShowOrderTypePopup(false); setPendingBestSeller(null); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-stone-400" />
            </button>
            <p className="text-lg font-black text-stone-800 text-center mb-1 tracking-tight">Mode de commande</p>
            <p className="text-xs text-stone-400 text-center mb-5">Choisissez comment récupérer votre commande</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: 'emporter' as OrderType, label: 'Emporter', emoji: '🛍️' },
                { type: 'livraison' as OrderType, label: 'Livraison', emoji: '🚗' },
                { type: 'surplace' as OrderType, label: 'Sur Place', emoji: '🍽️' },
              ] as const).map((opt) => (
                <button key={opt.type} onClick={() => handleOrderTypePick(opt.type)} className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-stone-50 hover:bg-amber-50 active:scale-95 transition-all duration-200 group">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{opt.emoji}</span>
                  <span className="text-xs font-bold text-stone-700 group-hover:text-amber-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {bestSellerModal && (
        <div className="fixed inset-0 z-[100] bg-background animate-in fade-in slide-in-from-bottom-8 duration-300">
          <Suspense fallback={null}>
            {bestSellerModal.type === 'pizza' && (
              <PizzaWizard
                initialPizzaId={bestSellerModal.pizzaId}
                onClose={(added) => { setBestSellerModal(null); if (added) setIsCartOpen(true); }}
              />
            )}
            {bestSellerModal.type === 'tacos' && (
              <TacosWizard
                initialSize={bestSellerModal.size as any}
                initialMeatNames={bestSellerModal.meats}
                initialSauceNames={bestSellerModal.sauces}
                onClose={(added) => { setBestSellerModal(null); if (added) setIsCartOpen(true); }}
              />
            )}
            {(bestSellerModal.type === 'soufflet' || bestSellerModal.type === 'makloub') && (
              <UnifiedProductWizard
                productType={bestSellerModal.type}
                initialSize={bestSellerModal.size}
                initialMeatNames={bestSellerModal.meats}
                initialSauceNames={bestSellerModal.sauces}
                onClose={(added) => { setBestSellerModal(null); if (added) setIsCartOpen(true); }}
              />
            )}
          </Suspense>
        </div>
      )}

      {/* Main Page Content */}
      <div className="mx-auto w-full max-w-[480px] px-3 py-3 space-y-5">
        {/* Hero Banner */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-lg" style={{ height: '340px' }}>
          <img
            src="/store-front.jpg"
            alt="Devanture du restaurant Twin Pizza à Grand-Couronne"
            width={1024}
            height={637}
            className="absolute inset-0 w-full h-full object-cover blur-[1px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4A3428]/80 via-[#4A3428]/65 to-[#4A3428]/85" />

          <div className="relative z-10 flex flex-col items-center pt-7 pb-5 px-5">
            <div className="w-[60px] h-[60px] rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center mb-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.15)]">
              <img src="/favicon.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-[1.7rem] font-black tracking-tight text-white drop-shadow-sm leading-none">
              <span className="text-[#F5B041]">Twin</span> Pizza
            </h1>
            <p className="text-[12px] text-white/60 font-medium mt-1 tracking-wider uppercase">Grand-Couronne</p>

            {/* Store Status */}
            {isOpen !== null && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-1.5 backdrop-blur-md border ${
                  isOpen ? 'bg-emerald-500/15 border-emerald-300/30' : 'bg-red-500/15 border-red-300/30'
                }`}
              >
                <span className="relative flex w-2 h-2">
                  {isOpen && <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
                  <span className={`relative inline-flex w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </span>
                <span className="text-[12px] font-bold text-white leading-none">
                  {isOpen ? 'Ouvert' : 'Fermé'}
                  {hoursLabel && <span className="font-medium text-white/70"> · {hoursLabel}</span>}
                </span>
              </div>
            )}

            {/* Primary Call to Action */}
            <button
              onClick={() => handleStartOrder()}
              className="mt-4 w-full max-w-[300px] flex items-center justify-center gap-2 h-[52px] rounded-2xl bg-[#F5B041] hover:bg-[#e8a232] active:scale-[0.98] text-[#3B2216] font-black text-[16px] tracking-tight shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {getItemCount() > 0 ? 'Continuer ma commande' : 'Commander'}
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>

            {/* Order Type Shortcuts */}
            <div className="mt-2.5 flex items-center gap-2">
              {([
                { type: 'emporter' as OrderType, label: 'Emporter', emoji: '🛍️' },
                { type: 'livraison' as OrderType, label: 'Livraison', emoji: '🚗' },
                { type: 'surplace' as OrderType, label: 'Sur Place', emoji: '🍽️' },
              ] as const).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleStartOrder(opt.type)}
                  className="flex items-center gap-1.5 rounded-full bg-white/12 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/90 transition-all"
                >
                  <span className="text-[13px] leading-none">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Ventes Carousel */}
        <div className="pt-2 pb-1">
          <BestSellerSlider onSelect={handleBestSellerSelect} />
        </div>

        {/* Nos Spécialités Grid */}
        <div className="pt-2">
          <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-3 px-1">
            Nos Spécialités
          </h2>
          <CategoryCardGrid onSelectCategory={handleSelectCategory} />
        </div>

        {/* Reviews */}
        <div className="pt-2">
          <ReviewsSlider />
        </div>

        {/* Photo Gallery */}
        <div className="pt-2">
          <GallerySlider />
        </div>

        {/* Notre Restaurant Info Card */}
        <div className="rounded-[1.75rem] bg-white/80 backdrop-blur-sm p-5 shadow-sm space-y-4">
          <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-2">
            Notre Restaurant
          </h2>
          <div className="space-y-3">
            {/* Address with Google Maps Navigation Button */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=60+Rue+Georges+Clemenceau+76530+Grand-Couronne"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FDF5EB] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4.5 h-4.5 text-[#DB7F1E]" />
                </div>
                <div>
                  <p className="font-semibold text-[13px] text-[#3B2216]">60 Rue Georges Clemenceau</p>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">76530 Grand-Couronne</p>
                </div>
              </div>
              <span className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#F5B041] text-[#3B2216] font-extrabold text-xs flex items-center gap-1 shadow-sm group-hover:scale-105 transition-all">
                <Navigation className="w-3.5 h-3.5 fill-[#3B2216]" /> Y aller
              </span>
            </a>

            {/* Opening Hours (Mardi - Dimanche) */}
            <div className="flex items-center gap-3.5 p-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#FDF5EB] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5 text-[#DB7F1E]" />
              </div>
              <div>
                <p className="font-semibold text-[13px] text-[#3B2216]">Mardi – Dimanche</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">11h00 – 15h00 · 17h30 – 00h00</p>
              </div>
            </div>

            {/* Green Call Button */}
            <a
              href="tel:0232112613"
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-md shadow-emerald-600/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-white animate-bounce-slow" />
                </div>
                <div>
                  <p className="font-black text-sm text-white tracking-wide">02 32 11 26 13</p>
                  <p className="text-[11px] text-emerald-100 mt-0.5">Appeler pour commander</p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-white/20 group-hover:bg-white/30 font-black text-xs uppercase tracking-wider text-white backdrop-blur-sm transition-all">
                Appeler
              </span>
            </a>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="pt-4 pb-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-semibold text-[#3B2216]/70">
            <Link to="/mentions-legales" className="hover:text-[#3B2216] transition-colors">Mentions légales</Link>
            <span className="text-[#3B2216]/25">•</span>
            <Link to="/confidentialite" className="hover:text-[#3B2216] transition-colors">Confidentialité</Link>
            <span className="text-[#3B2216]/25">•</span>
            <Link to="/cgv" className="hover:text-[#3B2216] transition-colors">CGV</Link>
          </div>
          <p className="mt-2.5 text-[10px] text-[#3B2216]/45">
            © {new Date().getFullYear()} Twin Pizza — Grand-Couronne. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <OrderProvider>
      <MainApp />
    </OrderProvider>
  );
}

