import { useState } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { HeroOrderSelector } from '@/components/HeroOrderSelector';
import { DealsCarousel } from '@/components/DealsCarousel';
import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { Footer } from '@/components/Footer';
import { DeliveryZones } from '@/components/DeliveryZones';
import { PromoBanner } from '@/components/PromoBanner';
import heroPizza from '@/assets/hero-pizza.jpg';

function MainApp() {
  const { orderType, setOrderType } = useOrder();
  const [view, setView] = useState<'home' | 'menu' | 'checkout'>('home');
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  // Menu view
  if (view === 'menu') {
    return (
      <>
        <CategoryMenu 
          onBack={handleBackToHome}
          onOpenCart={() => setIsCartOpen(true)}
        />
        <NewCart 
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
        />
      </>
    );
  }

  // Checkout view
  if (view === 'checkout') {
    return (
      <NewCheckout 
        onBack={() => setView('menu')}
        onComplete={handleOrderComplete}
      />
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-background">
      {/* Promo Banner */}
      <PromoBanner />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroPizza})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="text-center mb-10 animate-fade-in">
            {/* Logo TWIN */}
            <div className="mb-6">
              <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight whitespace-nowrap">
                <span className="text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">TWIN</span>
                <span className="text-white drop-shadow-lg ml-3">PIZZA</span>
              </h1>
            </div>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/90 mb-2 font-light">
              Grand-Couronne
            </p>
            <p className="text-base md:text-lg text-amber-200/80 max-w-lg mx-auto">
              Pizzas • Soufflés • Makloub • Mlawi • Tacos • Sandwiches et plus encore...
            </p>
          </div>
          
          <HeroOrderSelector onSelect={handleOrderTypeSelect} />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Deals Carousel */}
      <section className="py-12 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-8">
            <span className="text-amber-500">Nos</span> Offres
          </h2>
          <DealsCarousel />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🍕</span>
              <h3 className="text-xl font-display font-semibold mb-2">Pizzas Artisanales</h3>
              <p className="text-muted-foreground">
                30 recettes uniques, base tomate ou crème fraîche
              </p>
            </div>
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🚗</span>
              <h3 className="text-xl font-display font-semibold mb-2">Livraison Rapide</h3>
              <p className="text-muted-foreground">
                Grand-Couronne et environs en 30-45 min
              </p>
            </div>
            <div className="group p-6 rounded-2xl bg-card hover:bg-primary/5 transition-all duration-300 hover:-translate-y-2">
              <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🎉</span>
              <h3 className="text-xl font-display font-semibold mb-2">Promos Exclusives</h3>
              <p className="text-muted-foreground">
                1 achetée = 1 offerte sur place & à emporter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Zones */}
      <DeliveryZones />

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-8">
            <span className="text-amber-500">Contact</span> & Horaires
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl bg-card">
              <span className="text-3xl mb-3 block">📍</span>
              <h3 className="font-semibold mb-2 text-lg">Adresse</h3>
              <p className="text-muted-foreground">
                Grand-Couronne<br />
                76530, France
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card">
              <span className="text-3xl mb-3 block">🕐</span>
              <h3 className="font-semibold mb-2 text-lg">Horaires</h3>
              <p className="text-muted-foreground">
                Mar - Dim: 11h30 - 14h30 / 18h - 22h30<br />
                Lundi: Fermé
              </p>
            </div>
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
