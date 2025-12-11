import { OrderType, CartItem, PizzaCustomization } from '@/types/order';
import { pizzaPrices } from '@/data/menu';

// Menu midi is available between 11:00 and 15:00
export function isMenuMidiTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 11 && hour < 15;
}

// Get remaining time for menu midi
export function getMenuMidiRemainingTime(): { hours: number; minutes: number; seconds: number } | null {
  if (!isMenuMidiTime()) return null;
  
  const now = new Date();
  const endTime = new Date();
  endTime.setHours(15, 0, 0, 0);
  
  const diff = endTime.getTime() - now.getTime();
  if (diff <= 0) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

// Calculate pizza price based on customization
export function calculatePizzaPrice(customization: PizzaCustomization): number {
  if (customization.isMenuMidi) {
    return customization.size === 'senior' 
      ? pizzaPrices.menuMidiSenior 
      : pizzaPrices.menuMidiMega;
  }
  return customization.size === 'senior' 
    ? pizzaPrices.senior 
    : pizzaPrices.mega;
}

// Apply pizza promotions based on order type
export interface PromoResult {
  originalTotal: number;
  discountedTotal: number;
  promoDescription: string | null;
  freePizzas: number;
}

export function applyPizzaPromotions(
  pizzaItems: CartItem[], 
  orderType: OrderType
): PromoResult {
  if (!orderType || pizzaItems.length === 0) {
    const total = pizzaItems.reduce((sum, item) => 
      sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);
    return { 
      originalTotal: total, 
      discountedTotal: total, 
      promoDescription: null,
      freePizzas: 0 
    };
  }

  // Group pizzas by size
  const seniorPizzas = pizzaItems.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.size === 'senior';
  });
  const megaPizzas = pizzaItems.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.size === 'mega';
  });

  const seniorCount = seniorPizzas.reduce((sum, item) => sum + item.quantity, 0);
  const megaCount = megaPizzas.reduce((sum, item) => sum + item.quantity, 0);

  let originalTotal = 0;
  let discountedTotal = 0;
  let promoDescription: string | null = null;
  let freePizzas = 0;

  // Calculate original total
  pizzaItems.forEach(item => {
    originalTotal += (item.calculatedPrice || item.item.price) * item.quantity;
  });

  if (orderType === 'surplace' || orderType === 'emporter') {
    // 1 achetée = 1 offerte (pairs of 2)
    const seniorPairs = Math.floor(seniorCount / 2);
    const seniorSingles = seniorCount % 2;
    const megaPairs = Math.floor(megaCount / 2);
    const megaSingles = megaCount % 2;

    discountedTotal = 
      (seniorPairs * pizzaPrices.senior) + (seniorSingles * pizzaPrices.senior) +
      (megaPairs * pizzaPrices.mega) + (megaSingles * pizzaPrices.mega);
    
    freePizzas = seniorPairs + megaPairs;

    if (freePizzas > 0) {
      promoDescription = `1 achetée = 1 offerte (${freePizzas} pizza${freePizzas > 1 ? 's' : ''} offerte${freePizzas > 1 ? 's' : ''})`;
    }
  } else if (orderType === 'livraison') {
    // 2 achetées = 1 offerte (groups of 3, pay for 2)
    const seniorGroups = Math.floor(seniorCount / 3);
    const seniorRemainder = seniorCount % 3;
    const megaGroups = Math.floor(megaCount / 3);
    const megaRemainder = megaCount % 3;

    discountedTotal = 
      (seniorGroups * 2 * pizzaPrices.senior) + (seniorRemainder * pizzaPrices.senior) +
      (megaGroups * 2 * pizzaPrices.mega) + (megaRemainder * pizzaPrices.mega);
    
    freePizzas = seniorGroups + megaGroups;

    if (freePizzas > 0) {
      promoDescription = `2 achetées = 1 offerte (${freePizzas} pizza${freePizzas > 1 ? 's' : ''} offerte${freePizzas > 1 ? 's' : ''})`;
    }
  } else {
    discountedTotal = originalTotal;
  }

  return { originalTotal, discountedTotal, promoDescription, freePizzas };
}

// Calculate TVA (10%)
export function calculateTVA(total: number): { ht: number; tva: number; ttc: number } {
  const ttc = total;
  const ht = ttc / 1.10;
  const tva = ttc - ht;
  return { ht, tva, ttc };
}