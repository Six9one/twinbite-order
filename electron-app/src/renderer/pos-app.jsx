import React, { useState, useEffect } from 'react';
import POSCatalog from './components/POSCatalog';
import POSCart from './components/POSCart';
import POSCheckout from './components/POSCheckout';
import POSStatus from './components/POSStatus';
import './styles/pos.css';

export default function POSApp() {
  const [cart, setCart] = useState([]);
  const [currentStep, setCurrentStep] = useState('catalog'); // catalog, cart, checkout
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [status, setStatus] = useState({ whatsapp: 'disconnected', printer: 'unknown', internet: 'connected' });
  const [isLoading, setIsLoading] = useState(true);

  // Load status on mount
  useEffect(() => {
    loadStatus();
    loadProducts();
    loadCategories();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await window.electronAPI.getStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const prods = await window.electronAPI.getProducts();
      setProducts(prods);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await window.electronAPI.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const handleCheckout = () => {
    setCurrentStep('checkout');
  };

  const handleBackToCart = () => {
    setCurrentStep('cart');
  };

  const handleBackToCatalog = () => {
    setCurrentStep('catalog');
  };

  const handleCheckoutComplete = () => {
    setCart([]);
    setCurrentStep('catalog');
    loadStatus();
  };

  if (isLoading) {
    return (
      <div className="pos-loading">
        <div className="spinner"></div>
        <p>Chargement du POS...</p>
      </div>
    );
  }

  return (
    <div className="pos-app">
      {/* Header with status */}
      <header className="pos-header">
        <div className="pos-header-left">
          <h1>🍕 Twin Pizza POS</h1>
        </div>
        <div className="pos-header-right">
          <POSStatus status={status} />
        </div>
      </header>

      {/* Main content */}
      <main className="pos-main">
        {currentStep === 'catalog' && (
          <POSCatalog
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onAddToCart={handleAddToCart}
            cartCount={cart.length}
            onGoToCart={() => setCurrentStep('cart')}
          />
        )}

        {currentStep === 'cart' && (
          <POSCart
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onCheckout={handleCheckout}
            onBack={handleBackToCatalog}
          />
        )}

        {currentStep === 'checkout' && (
          <POSCheckout
            cart={cart}
            onBack={handleBackToCart}
            onComplete={handleCheckoutComplete}
            status={status}
          />
        )}
      </main>
    </div>
  );
}
