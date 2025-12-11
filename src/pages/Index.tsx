import { useState } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { Header } from '@/components/Header';
import { OrderTypeSelector } from '@/components/OrderTypeSelector';
import { Menu } from '@/components/Menu';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';

type View = 'orderType' | 'menu' | 'checkout';

function MainApp() {
  const { orderType, setOrderType, cart } = useOrder();
  const [currentView, setCurrentView] = useState<View>('orderType');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleOrderTypeSelected = () => {
    setCurrentView('menu');
  };

  const handleCheckout = () => {
    if (cart.length > 0) {
      setIsCartOpen(false);
      setCurrentView('checkout');
    }
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const handleBackToStart = () => {
    setOrderType(null);
    setCurrentView('orderType');
  };

  return (
    <div className="min-h-screen bg-background">
      {currentView !== 'orderType' && (
        <Header onCartClick={() => setIsCartOpen(true)} />
      )}

      {currentView === 'orderType' && (
        <OrderTypeSelector onSelect={handleOrderTypeSelected} />
      )}

      {currentView === 'menu' && <Menu />}

      {currentView === 'checkout' && (
        <Checkout onBack={cart.length > 0 ? handleBackToMenu : handleBackToStart} />
      )}

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
