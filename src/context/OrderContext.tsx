import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OrderType, CartItem, MenuItem, ProductCustomization, SouffletOrder, PizzaCustomization, TacosCustomization, SouffletCustomization, MakloubCustomization, ScheduledOrderInfo } from '@/types/order';
import { pizzaPrices, menuOptionPrices, supplementOptions, cheeseSupplementOptions } from '@/data/menu';

interface OrderContextType {
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  scheduledInfo: ScheduledOrderInfo;
  setScheduledInfo: (info: ScheduledOrderInfo) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, customization?: ProductCustomization | SouffletOrder, calculatedPrice?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Calculate price with all supplements and options
const calculateItemPrice = (item: MenuItem, customization?: ProductCustomization | SouffletOrder): number => {
  let price = item.price;

  if (!customization) return price;

  // Pizza customization
  if ('base' in customization && 'size' in customization && !('meats' in customization)) {
    const pizzaCustom = customization as PizzaCustomization;
    
    if (pizzaCustom.isMenuMidi) {
      price = pizzaCustom.size === 'senior' ? pizzaPrices.menuMidiSenior : pizzaPrices.menuMidiMega;
    } else {
      price = pizzaCustom.size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega;
    }
    
    // Add pizza supplements
    if (pizzaCustom.supplements) {
      pizzaCustom.supplements.forEach(supId => {
        const sup = cheeseSupplementOptions.find(s => s.id === supId);
        if (sup) price += sup.price;
      });
    }
  }

  // Tacos customization
  if ('meats' in customization && 'sauces' in customization && 'menuOption' in customization) {
    const tacosCustom = customization as TacosCustomization;
    
    // Add menu option price
    if (tacosCustom.menuOption && tacosCustom.menuOption !== 'none') {
      price += menuOptionPrices[tacosCustom.menuOption] || 0;
    }
    
    // Add supplements
    if (tacosCustom.supplements) {
      tacosCustom.supplements.forEach(supId => {
        const sup = supplementOptions.find(s => s.id === supId) || cheeseSupplementOptions.find(s => s.id === supId);
        if (sup) price += sup.price;
      });
    }
  }

  // Soufflet customization (new format)
  if ('meats' in customization && 'garnitures' in customization && 'menuOption' in customization) {
    const souffletCustom = customization as SouffletCustomization;
    
    // Add menu option price
    if (souffletCustom.menuOption && souffletCustom.menuOption !== 'none') {
      price += menuOptionPrices[souffletCustom.menuOption] || 0;
    }
    
    // Add cheese supplements
    if (souffletCustom.cheeseSupplements) {
      souffletCustom.cheeseSupplements.forEach(supId => {
        const sup = cheeseSupplementOptions.find(s => s.id === supId);
        if (sup) price += sup.price;
      });
    }
  }

  // Legacy SouffletOrder format
  if ('meat' in customization && 'toppings' in customization) {
    const legacyCustom = customization as SouffletOrder;
    
    // Add menu option price
    if (legacyCustom.menuOption && legacyCustom.menuOption !== 'none') {
      price += menuOptionPrices[legacyCustom.menuOption] || 0;
    }
    
    // Add cheese supplements
    if (legacyCustom.cheeseSupplements) {
      legacyCustom.cheeseSupplements.forEach(supId => {
        const sup = cheeseSupplementOptions.find(s => s.id === supId);
        if (sup) price += sup.price;
      });
    }
  }

  // Makloub customization
  if ('meats' in customization && 'garnitures' in customization && !('menuOption' in customization)) {
    const makloubCustom = customization as MakloubCustomization;
    
    // Add cheese supplements
    if (makloubCustom.cheeseSupplements) {
      makloubCustom.cheeseSupplements.forEach(supId => {
        const sup = cheeseSupplementOptions.find(s => s.id === supId);
        if (sup) price += sup.price;
      });
    }
  }

  return price;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [scheduledInfo, setScheduledInfo] = useState<ScheduledOrderInfo>({ isScheduled: false, scheduledFor: null });
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: MenuItem, quantity = 1, customization?: ProductCustomization | SouffletOrder, calculatedPrice?: number) => {
    const cartItemId = customization 
      ? `${item.id}-${Date.now()}` 
      : item.id;

    const existingItem = cart.find(ci => ci.id === item.id && !customization);
    
    // Calculate price if not provided
    const finalPrice = calculatedPrice ?? calculateItemPrice(item, customization);
    
    if (existingItem && !customization) {
      setCart(cart.map(ci => 
        ci.id === item.id 
          ? { ...ci, quantity: ci.quantity + quantity }
          : ci
      ));
    } else {
      setCart([...cart, { 
        id: cartItemId, 
        item, 
        quantity, 
        customization,
        calculatedPrice: finalPrice
      }]);
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
    return cart.reduce((total, ci) => {
      const itemPrice = ci.calculatedPrice ?? calculateItemPrice(ci.item, ci.customization);
      return total + (itemPrice * ci.quantity);
    }, 0);
  };

  const getItemCount = () => {
    return cart.reduce((count, ci) => count + ci.quantity, 0);
  };

  return (
    <OrderContext.Provider value={{
      orderType,
      setOrderType,
      scheduledInfo,
      setScheduledInfo,
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