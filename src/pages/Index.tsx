import { useState } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { HeroOrderSelector } from '@/components/HeroOrderSelector';
import { DealsCarousel } from '@/components/DealsCarousel';
import { CategoryMenu } from '@/components/CategoryMenu';
import { NewCart } from '@/components/NewCart';
import { NewCheckout } from '@/components/NewCheckout';
import { Footer } from '@/components/Footer';
import { DeliveryZones } from '@/components/DeliveryZones';
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
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroPizza})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-lg">
              Twin Pizza
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-2">
              Grand-Couronne
            </p>
            <p className="text-lg text-white/70">
              Pizzas artisanales • Tacos • Soufflés • Et plus encore...
            </p>
          </div>
          
          <HeroOrderSelector onSelect={handleOrderTypeSelect} />
        </div>
      </section>

      {/* Deals Carousel */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-8">
            Nos Offres
          </h2>
          <DealsCarousel />
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <span className="text-4xl">🍕</span>
              <h3 className="text-xl font-display font-semibold">Pizzas Artisanales</h3>
              <p className="text-muted-foreground">
                30 recettes uniques, base tomate ou crème fraîche
              </p>
            </div>
            <div className="space-y-3">
              <span className="text-4xl">🚗</span>
              <h3 className="text-xl font-display font-semibold">Livraison Rapide</h3>
              <p className="text-muted-foreground">
                Grand-Couronne et environs en 30-45 min
              </p>
            </div>
            <div className="space-y-3">
              <span className="text-4xl">🎉</span>
              <h3 className="text-xl font-display font-semibold">Promos Exclusives</h3>
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
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold mb-8">Contact & Horaires</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">📍 Adresse</h3>
              <p className="text-muted-foreground">
                Grand-Couronne<br />
                76530, France
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🕐 Horaires</h3>
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
