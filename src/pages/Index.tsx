import { useState, useEffect, useRef, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Settings, MapPin, Clock, Phone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { useStackEffectEnabled } from '@/hooks/useStackEffectEnabled';
import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { CategoryCardGrid } from '@/components/CategoryCardGrid';
import { BestSellerSlider, BestSellerPreset } from '@/components/BestSellerSlider';
import { ReviewsSlider } from '@/components/ReviewsSlider';
import { GallerySlider } from '@/components/GallerySlider';
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';

/**
 * Stacked-page scroll effect (same principle as Skiper UI's "skiper16" stacked cards:
 * `pnpm dlx shadcn add @skiper-ui/skiper16`, adapted to the site's actual sections).
 * Every section is `position: sticky; top: 0` with an increasing z-index, so each one pins
 * at the top of the viewport and gets folded over by the next section rising up behind it.
 * A Framer Motion `scale` tied to scroll progress (via `useScroll`/`useTransform`) adds the
 * "receding page" depth cue. (Lenis, also installed by the skiper16 add, is intentionally NOT
 * wrapped around this view — its scroll virtualization conflicts with `position: sticky` here,
 * which breaks the actual pinning/folding effect. Native scroll stays buttery via CSS alone.)
 *
 * The effect is conditional: `useStackEffectEnabled` drops it back to normal document flow
 * when the user prefers reduced motion, the viewport is too short, or a section grew taller
 * than the viewport (sticky cannot pin an element bigger than its scrollport). Content stays
 * fully reachable in every one of those cases — only the decoration is lost.
 */
const STACK_Z_BASE = 10; // stays well below fixed overlays (cart/modals use z-50+)
const STACK_COUNT = 6; // Hero, Top Ventes, Nos Spécialités, Avis Clients, Notre Galerie, Notre Restaurant

function StackSection({
  i,
  progress,
  enabled,
  className = '',
  delay = 0,
  style,
  children,
}: {
  i: number;
  progress: MotionValue<number>;
  enabled: boolean;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const targetScale = Math.max(0.92, 1 - (STACK_COUNT - i - 1) * 0.02);
  const scale = useTransform(progress, [i / STACK_COUNT, 1], [1, targetScale]);

  const inner = (
    <motion.div
      className={`origin-top animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards shadow-[0_-14px_30px_-6px_rgba(40,20,5,0.35)] ${className}`}
      style={{ ...style, ...(enabled ? { scale } : null), animationDelay: `${delay}ms` }}
    >
      {children}
    </motion.div>
  );

  // Fallback path: plain flow, no pinning and no scroll-linked transform.
  if (!enabled) {
    return <div className="relative">{inner}</div>;
  }

  // Sticky positioning lives on a plain div — putting it on the same element as the Framer
  // Motion `scale` transform (motion.div) breaks `position: sticky` here, so the scale
  // animation is applied one level down instead, matching the skiper16 reference structure.
  return (
    <div className="sticky top-0" style={{ zIndex: STACK_Z_BASE + i }}>
      {inner}
    </div>
  );
}

function MainApp() {
  const { orderType, setOrderType } = useOrder();
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

  const stackContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stackContainerRef, offset: ['start start', 'end end'] });
  const stackEnabled = useStackEffectEnabled(stackContainerRef);

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
        <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-3">
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
        <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-3">
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
    <div className="min-h-dvh bg-[#DDA463] antialiased">
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

      {/* STACKED CARD DECK — every major section is `position: sticky` with an increasing
          z-index and a scroll-linked scale (Skiper UI "skiper16" stacked-cards principle),
          so each one pins at the top and folds under the next as the user scrolls. */}
      {/* The whole deck is an app-width column, centred on tablet/desktop instead of
          stretching a phone layout edge-to-edge across a wide viewport. */}
      <div ref={stackContainerRef} className="mx-auto w-full max-w-[560px] lg:max-w-[620px]">
        {/* Card 0 — Hero */}
        <StackSection
          i={0}
          progress={scrollYProgress}
          enabled={stackEnabled}
          className="relative h-[clamp(220px,30vh,340px)] rounded-t-[2rem] overflow-hidden"
        >
          <img
            src="/store-front.jpg"
            alt="Twin Pizza storefront"
            className="absolute inset-0 w-full h-full object-cover blur-[1px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#4A3428]/80 via-[#4A3428]/65 to-[#4A3428]/85" />

          <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 pt-[env(safe-area-inset-top)]">
            <div className="w-[clamp(52px,14vw,72px)] h-[clamp(52px,14vw,72px)] rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center mb-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.15)]">
              <img src="/favicon.png" alt="Twin Pizza" className="w-2/3 h-2/3 object-contain" />
            </div>
            <h1 className="text-[clamp(1.5rem,6vw,2.4rem)] font-black tracking-tight text-white drop-shadow-sm leading-none text-center">
              <span className="text-[#F5B041]">Twin</span> Pizza
            </h1>
            <p className="text-[clamp(11px,2.8vw,14px)] text-white/60 font-medium mt-1 tracking-wider uppercase text-center">Grand-Couronne</p>
          </div>
        </StackSection>

        {/* Card 1 — Top Ventes */}
        <StackSection i={1} progress={scrollYProgress} enabled={stackEnabled} className="bg-[#FFF8F0] rounded-t-[2rem] pt-6 pb-4">
          <BestSellerSlider onSelect={handleBestSellerSelect} />
        </StackSection>

        {/* Card 2 — Nos Spécialités */}
        <StackSection i={2} progress={scrollYProgress} enabled={stackEnabled} className="mx-3 rounded-[1.75rem] bg-[#FDEEDD] p-5 sm:p-6">
          <h2 className="text-[clamp(1.05rem,3.6vw,1.4rem)] font-extrabold text-[#3B2216] tracking-tight mb-3">
            Nos Spécialités
          </h2>
          <CategoryCardGrid onSelectCategory={handleSelectCategory} />
        </StackSection>

        {/* Card 3 — Avis Clients */}
        <StackSection i={3} progress={scrollYProgress} enabled={stackEnabled} delay={80} className="mx-3 rounded-[1.75rem] bg-[#FCF3E1] py-5 sm:py-6">
          <ReviewsSlider />
        </StackSection>

        {/* Card 4 — Notre Galerie (self-hides if admin hasn't added photos yet; owns its own card chrome) */}
        <StackSection i={4} progress={scrollYProgress} enabled={stackEnabled} delay={110} className="mx-3">
          <GallerySlider />
        </StackSection>

        {/* Card 5 — Notre Restaurant (last layer, acts as the page footer — carries the
            bottom safe-area inset so the phone number clears the iOS home indicator) */}
        <StackSection
          i={5}
          progress={scrollYProgress}
          enabled={stackEnabled}
          delay={140}
          className="mx-3 rounded-[1.75rem] bg-[#F8E6D6] p-5 sm:p-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <h2 className="text-[clamp(1.05rem,3.6vw,1.4rem)] font-extrabold text-[#3B2216] tracking-tight mb-4">
            Notre Restaurant
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4.5 h-4.5 text-[#DB7F1E]" />
              </div>
              <div>
                <p className="font-semibold text-[clamp(13px,3vw,15px)] text-[#3B2216]">60 Rue Georges Clemenceau</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">76530 Grand-Couronne</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5 text-[#DB7F1E]" />
              </div>
              <div>
                <p className="font-semibold text-[clamp(13px,3vw,15px)] text-[#3B2216]">Lun – Sam</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">11h00 – 15h00 · 17h30 – 00h00</p>
              </div>
            </div>
            <a href="tel:0232112613" className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-xl bg-white/60 group-hover:bg-white/85 flex items-center justify-center flex-shrink-0 transition-colors">
                <Phone className="w-4.5 h-4.5 text-[#DB7F1E]" />
              </div>
              <div>
                <p className="font-semibold text-[clamp(13px,3vw,15px)] text-[#3B2216] group-hover:text-[#DB7F1E] transition-colors">02 32 11 26 13</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Appeler pour commander</p>
              </div>
            </a>
          </div>
        </StackSection>
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