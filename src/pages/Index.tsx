import { useState } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { Header } from '@/components/Header';
import { HeroOrderSelector } from '@/components/HeroOrderSelector';
import { DealsCarousel } from '@/components/DealsCarousel';
import { MenuSection } from '@/components/MenuSection';
import { DeliveryZones } from '@/components/DeliveryZones';
import { Footer } from '@/components/Footer';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';
import { SouffletBuilder } from '@/components/SouffletBuilder';
import heroImage from '@/assets/hero-pizza.jpg';

function MainApp() {
  const { orderType, cart } = useOrder();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSouffletBuilder, setShowSouffletBuilder] = useState(false);

  const handleCheckout = () => {
    if (cart.length > 0 && orderType) {
      setIsCartOpen(false);
      setShowCheckout(true);
    }
  };

  if (showSouffletBuilder) {
    return (
      <OrderProvider>
        <SouffletBuilder onClose={() => setShowSouffletBuilder(false)} />
      </OrderProvider>
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-background">
        <Header onCartClick={() => setIsCartOpen(true)} />
        <Checkout onBack={() => setShowCheckout(false)} />
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={handleCheckout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Pizza Twin Pizza" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-card mb-4 drop-shadow-lg">
            Bienvenue chez <span className="text-primary">Twin Pizza</span>
          </h1>
          <p className="text-lg md:text-xl text-card/90 mb-8 max-w-2xl mx-auto">
            Pizzas artisanales, tacos, sandwiches et bien plus encore. 
            Commandez maintenant et régalez-vous !
          </p>
          
          <HeroOrderSelector />
          
          {orderType && (
            <a 
              href="#menu"
              className="inline-block mt-8 btn-primary px-8 py-4 rounded-full text-lg font-semibold animate-slide-up"
            >
              Voir le menu
            </a>
          )}
        </div>
      </section>

      {/* Deals Carousel */}
      <DealsCarousel />

      {/* Menu Section */}
      <MenuSection onCustomizeSoufflet={() => setShowSouffletBuilder(true)} />

      {/* Delivery Zones */}
      <div id="delivery">
        <DeliveryZones />
      </div>

      {/* Footer */}
      <Footer />

      {/* Cart Drawer */}
      <Cart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

const Index = () => {
  return (
    <OrderProvider>
      <MainApp />
    </OrderProvider>
  );
};

export default Index;
