import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { HeroOrderSelector } from '@/components/HeroOrderSelector';
import { DealsCarousel } from '@/components/DealsCarousel';
import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { Footer } from '@/components/Footer';
import { DeliveryMapSection } from '@/components/DeliveryMapSection';
import { Header } from '@/components/Header';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ClosedBanner } from '@/components/ClosedBanner';
import { ReviewSection } from '@/components/ReviewSection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingBag, Phone, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import heroPizza from '@/assets/hero-pizza.jpg';

function MainApp() {
  const { orderType, setOrderType } = useOrder();
  const [view, setView] = useState<'home' | 'menu' | 'checkout'>('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const orderSelectorRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          return;
        }

        if (data?.session) {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (roleError) {
            console.error("Role fetch error:", roleError);
            return;
          }

          if (roleData) {
            setIsAdmin(true);
          }
        }
      } catch (e) {
        console.error("Admin check failed:", e);
      }
    };
    checkAdmin();
  }, []);

  const handleOrderTypeSelect = () => {
    setView('menu');
  };

  const handleBackToHome = () => {
    setView('home');
    setOrderType(null);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setView('checkout');
  };

  const handleOrderComplete = () => {
    setView('home');
    setOrderType(null);
  };

  const handleNavOrderTypeSelect = (type: OrderType) => {
    setView('menu');
  };

  const scrollToOrderSelector = () => {
    orderSelectorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Menu view
  if (view === 'menu') {
    return <>
      <CategoryMenu onBack={handleBackToHome} onOpenCart={() => setIsCartOpen(true)} />
      <NewCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />
    </>;
  }

  // Checkout view
  if (view === 'checkout') {
    return <NewCheckout onBack={() => setView('menu')} onComplete={handleOrderComplete} />;
  }

  // Home view
  return (
    <div className="min-h-screen bg-background">
      {/* Floating Admin Button */}
      {isAdmin && (
        <Link
          to="/admin/dashboard"
          className="fixed bottom-4 left-4 z-50"
        >
          <Button
            size="sm"
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-full px-4"
          >
            <Settings className="w-4 h-4" />
            Admin
          </Button>
        </Link>
      )}
      <AnnouncementBanner />
      <Header
        onCartClick={() => setIsCartOpen(true)}
        onOrderTypeSelect={handleNavOrderTypeSelect}
        onMenuClick={scrollToOrderSelector}
        onScheduleClick={scrollToOrderSelector}
      />
      <ClosedBanner onScheduleConfirmed={handleOrderTypeSelect} />
      <NewCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />

      {/* Hero Section - optimized height */}
      <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroPizza})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />

        <div className="relative z-10 container mx-auto px-3 sm:px-4 py-8">
          <div className="text-center mb-6 sm:mb-8 animate-fade-in">
            <div className="mb-4">
              <a href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-medium tracking-wide whitespace-nowrap">
                  <span className="text-amber-400">Twin</span>
                  <span className="text-white ml-2 sm:ml-3">Pizza</span>
                </h1>
              </a>
            </div>
            <p className="text-base sm:text-lg mb-1 sm:mb-2 font-sans font-extrabold md:text-xl text-secondary">
              Grand-Couronne
            </p>
            <p className="text-sm sm:text-base md:text-lg max-w-lg mx-auto text-orange-400 px-4 sm:px-0">
              Pizzas • Soufflés • Makloub • Mlawi • Tacos • Sandwiches et plus encore...
            </p>
          </div>

          <div ref={orderSelectorRef}>
            <HeroOrderSelector onSelect={handleOrderTypeSelect} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Call Now Section */}
      <section className="py-4 sm:py-6 bg-primary/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Phone className="w-6 h-6 text-primary" />
              <span>📞 Appelez-nous maintenant</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:0232112613" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg">
                <Phone className="w-5 h-5" />
                02 32 11 26 13
              </a>
              <a href="tel:0685852788" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg">
                <Phone className="w-5 h-5" />
                06 85 85 27 88
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Carousel */}
      <section className="py-6 sm:py-10 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <DealsCarousel />
          <div className="flex justify-center mt-8">
            <Button onClick={scrollToOrderSelector} size="lg" className="btn-primary gap-2 px-8 py-6 text-lg rounded-full shadow-lg hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
              Commander Maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 text-center">
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🍕</span>
              <h3 className="text-xl font-display font-semibold mb-2">Pizzas Artisanales</h3>
              <p className="text-muted-foreground">30 recettes uniques, base tomate ou crème fraîche</p>
            </div>
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🚗</span>
              <h3 className="text-xl font-display font-semibold mb-2">Livraison Rapide</h3>
              <p className="text-muted-foreground">Grand-Couronne et environs en 30-45 min</p>
            </div>
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🎉</span>
              <h3 className="text-xl font-display font-semibold mb-2">Promos Exclusives</h3>
              <p className="text-muted-foreground">1 achetée = 1 offerte sur place & à emporter</p>
            </div>
          </div>
        </div>
      </section>

      <DeliveryMapSection />

      <ReviewSection />

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-8">
            <span className="text-amber-500">Contact</span> & Horaires
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto">
            <Card className="p-6">
              <span className="text-3xl mb-3 block">📍</span>
              <h3 className="font-semibold mb-2 text-lg">Adresse</h3>
              <p className="text-muted-foreground">
                60 Rue Georges Clemenceau<br />
                76530 Grand-Couronne
              </p>
            </Card>
            <Card className="p-6">
              <span className="text-3xl mb-3 block">📞</span>
              <h3 className="font-semibold mb-2 text-lg">Téléphone</h3>
              <p className="text-muted-foreground space-y-1">
                <a href="tel:0232112613" className="block hover:text-primary transition-colors">02 32 11 26 13</a>
                <a href="tel:0685852788" className="block hover:text-primary transition-colors">06 85 85 27 88</a>
              </p>
            </Card>
            <Card className="p-6">
              <span className="text-3xl mb-3 block">🕐</span>
              <h3 className="font-semibold mb-2 text-lg">Horaires</h3>
              <p className="text-muted-foreground">
                Mar - Dim: 11h30 - 14h30 / 18h - 22h30<br />
                Lundi: Fermé
              </p>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
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