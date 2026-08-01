import { useState, useEffect, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Settings, MapPin, Clock, Phone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { CategoryCardGrid } from '@/components/CategoryCardGrid';

const FEATURED = [
  { id: 'soufflets', name: 'Soufflet Poulet', price: '7.50', image: '/cat_soufflet_3d.png' },
  { id: 'makloub', name: 'Makloub Thon', price: '6.50', image: '/cat_makloub_3d.png', extraClass: 'translate-x-1' },
];

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
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
    setView('menu');
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
    <div className="min-h-screen bg-[#C8AD7E] antialiased">
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowOrderTypePopup(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 mb-5 bg-white rounded-[1.75rem] shadow-2xl p-6 animate-in slide-in-from-bottom-8 duration-300">
            <button onClick={() => setShowOrderTypePopup(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors">
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

      {/* LAYER 1 — HERO BACKGROUND (dark mocha rounded container) */}
      <div className="relative mx-3 mt-3 rounded-[2rem] overflow-hidden shadow-[0_10px_32px_rgba(50,30,10,0.3)]" style={{ height: '260px' }}>
        <img
          src="/store-front.jpg"
          alt="Twin Pizza storefront"
          className="absolute inset-0 w-full h-full object-cover blur-[1px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#4A3428]/80 via-[#4A3428]/65 to-[#4A3428]/85" />

        <div className="relative z-10 flex flex-col items-center pt-7 pb-4">
          <div className="w-[60px] h-[60px] rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center mb-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.15)]">
            <img src="/favicon.png" alt="Twin Pizza" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-[1.7rem] font-black tracking-tight text-white drop-shadow-sm leading-none">
            <span className="text-[#F5B041]">Twin</span> Pizza
          </h1>
          <p className="text-[12px] text-white/60 font-medium mt-1 tracking-wider uppercase">Grand-Couronne</p>
        </div>
      </div>

      {/* LAYER 2 — MAIN CONTENT CARD (warm cream surface) */}
      <div
        className="relative z-10 mx-3 -mt-14 bg-[#FFF8F0] rounded-[2rem] shadow-[0_-4px_24px_rgba(60,40,20,0.08)] pb-10"
      >
        {/* Nos Spécialités */}
        <FadeIn className="px-5 pt-6">
          <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-3">
            Nos Spécialités
          </h2>
          <CategoryCardGrid onSelectCategory={handleSelectCategory} />
        </FadeIn>

        <div className="mx-5 my-5 h-px bg-[#3B2216]/8" />

        {/* Populaires */}
        <FadeIn className="px-5" delay={80}>
          <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-4">
            Populaires
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {FEATURED.map((item) => (
              <button
                key={item.name}
                onClick={() => handleSelectCategory(item.id)}
                className="text-left flex flex-col items-center group active:scale-95 transition-all duration-300 focus:outline-none"
              >
                <div className={`relative w-full aspect-square flex items-center justify-center -mb-3 z-10 ${item.extraClass || ''}`}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-[94%] h-[94%] object-contain group-hover:scale-110 transition-transform duration-300 food-ground-shadow"
                    loading="lazy"
                  />
                </div>
                <div className="w-full bg-white rounded-2xl pt-4 pb-3 px-3 shadow-[0_2px_10px_rgba(60,30,10,0.06)] text-center group-hover:shadow-[0_4px_16px_rgba(60,30,10,0.1)] transition-all duration-300">
                  <p className="font-bold text-[#3B2216] text-[13px] leading-tight">{item.name}</p>
                  <p className="font-bold text-[#C67B2E] text-sm mt-1">{item.price} €</p>
                </div>
              </button>
            ))}
          </div>
        </FadeIn>

        <div className="mx-5 my-5 h-px bg-[#3B2216]/8" />

        {/* Restaurant Info */}
        <FadeIn className="px-5" delay={140}>
          <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-4">
            Notre Restaurant
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5E6D3] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4.5 h-4.5 text-[#C67B2E]" />
              </div>
              <div>
                <p className="font-semibold text-[13px] text-[#3B2216]">60 Rue Georges Clemenceau</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">76530 Grand-Couronne</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#F5E6D3] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5 text-[#C67B2E]" />
              </div>
              <div>
                <p className="font-semibold text-[13px] text-[#3B2216]">Lun – Sam</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">11h00 – 15h00 · 17h30 – 00h00</p>
              </div>
            </div>
            <a href="tel:0232112613" className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#F5E6D3] group-hover:bg-[#F0D9C0] flex items-center justify-center flex-shrink-0 transition-colors">
                <Phone className="w-4.5 h-4.5 text-[#C67B2E]" />
              </div>
              <div>
                <p className="font-semibold text-[13px] text-[#3B2216] group-hover:text-[#C67B2E] transition-colors">02 32 11 26 13</p>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Appeler pour commander</p>
              </div>
            </a>
          </div>
        </FadeIn>
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