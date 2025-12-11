import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OrderType, CartItem, MenuItem, SouffletOrder } from '@/types/order';

interface OrderContextType {
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, customization?: SouffletOrder) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: MenuItem, quantity = 1, customization?: SouffletOrder) => {
    const cartItemId = customization 
      ? `${item.id}-${Date.now()}` 
      : item.id;

    const existingItem = cart.find(ci => ci.id === item.id && !customization);
    
    if (existingItem && !customization) {
      setCart(cart.map(ci => 
        ci.id === item.id 
          ? { ...ci, quantity: ci.quantity + quantity }
          : ci
      ));
    } else {
      setCart([...cart, { id: cartItemId, item, quantity, customization }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(ci => ci.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(ci => 
        ci.id === itemId ? { ...ci, quantity } : ci
      ));
    }
  };

  const clearCart = () => setCart([]);

  const getTotal = () => {
    return cart.reduce((total, ci) => total + (ci.item.price * ci.quantity), 0);
  };

  const getItemCount = () => {
    return cart.reduce((count, ci) => count + ci.quantity, 0);
  };

  return (
    <OrderContext.Provider value={{
      orderType,
      setOrderType,
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
