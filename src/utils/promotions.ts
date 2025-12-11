import { OrderType, CartItem, PizzaCustomization } from '@/types/order';
import { pizzaPrices, cheeseSupplementOptions } from '@/data/menu';

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

// Get base pizza price WITHOUT supplements
function getBasePizzaPrice(customization: PizzaCustomization): number {
  if (customization.isMenuMidi) {
    return customization.size === 'senior' 
      ? pizzaPrices.menuMidiSenior 
      : pizzaPrices.menuMidiMega;
  }
  return customization.size === 'senior' 
    ? pizzaPrices.senior 
    : pizzaPrices.mega;
}

// Get supplements total for a pizza
function getSupplementsTotal(customization: PizzaCustomization): number {
  if (!customization.supplements || customization.supplements.length === 0) {
    return 0;
  }
  return customization.supplements.reduce((sum, supId) => {
    const sup = cheeseSupplementOptions.find(s => s.id === supId);
    return sum + (sup?.price || 0);
  }, 0);
}

// Apply pizza promotions based on order type
export interface PromoResult {
  originalTotal: number;
  discountedTotal: number;
  promoDescription: string | null;
  freePizzas: number;
  supplementsTotal: number;
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
      freePizzas: 0,
      supplementsTotal: 0
    };
  }

  // Calculate supplements total separately (never discounted)
  let supplementsTotal = 0;
  pizzaItems.forEach(item => {
    const customization = item.customization as PizzaCustomization;
    if (customization) {
      supplementsTotal += getSupplementsTotal(customization) * item.quantity;
    }
  });

  // Group pizzas by size (for base price calculation only)
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

  // Calculate original total (base prices only, without supplements)
  let originalBaseTotal = 0;
  pizzaItems.forEach(item => {
    const customization = item.customization as PizzaCustomization;
    if (customization) {
      originalBaseTotal += getBasePizzaPrice(customization) * item.quantity;
    }
  });

  let discountedBaseTotal = 0;
  let promoDescription: string | null = null;
  let freePizzas = 0;

  if (orderType === 'surplace' || orderType === 'emporter') {
    // 1 achetée = 1 offerte (pairs of 2)
    const seniorPairs = Math.floor(seniorCount / 2);
    const seniorSingles = seniorCount % 2;
    const megaPairs = Math.floor(megaCount / 2);
    const megaSingles = megaCount % 2;

    discountedBaseTotal = 
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

    discountedBaseTotal = 
      (seniorGroups * 2 * pizzaPrices.senior) + (seniorRemainder * pizzaPrices.senior) +
      (megaGroups * 2 * pizzaPrices.mega) + (megaRemainder * pizzaPrices.mega);
    
    freePizzas = seniorGroups + megaGroups;

    if (freePizzas > 0) {
      promoDescription = `2 achetées = 1 offerte (${freePizzas} pizza${freePizzas > 1 ? 's' : ''} offerte${freePizzas > 1 ? 's' : ''})`;
    }
  } else {
    discountedBaseTotal = originalBaseTotal;
  }

  // Final totals: base + supplements (supplements are NEVER discounted)
  const originalTotal = originalBaseTotal + supplementsTotal;
  const discountedTotal = discountedBaseTotal + supplementsTotal;

  return { originalTotal, discountedTotal, promoDescription, freePizzas, supplementsTotal };
}

// Calculate TVA (10%)
export function calculateTVA(total: number): { ht: number; tva: number; ttc: number } {
  const ttc = total;
  const ht = ttc / 1.10;
  const tva = ttc - ht;
  return { ht, tva, ttc };
}