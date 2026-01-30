import { OrderType, CartItem, PizzaCustomization } from '@/types/order';
import { pizzaPrices, cheeseSupplementOptions } from '@/data/menu';

// Menu midi is available all day from 11:00 to midnight
export function isMenuMidiTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 11; // Available from 11h until midnight
}

// Get remaining time for menu midi
export function getMenuMidiRemainingTime(): { hours: number; minutes: number; seconds: number } | null {
  if (!isMenuMidiTime()) return null;

  const now = new Date();
  const endTime = new Date();
  endTime.setHours(24, 0, 0, 0); // Midnight

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

  // SEPARATE Menu Midi pizzas from regular pizzas
  // Menu Midi pizzas do NOT get 1+1 promotions - they have a fixed price
  const menuMidiPizzas = pizzaItems.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.isMenuMidi === true;
  });

  const regularPizzas = pizzaItems.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.isMenuMidi !== true;
  });

  // Calculate Menu Midi total (NO promotions, fixed price)
  let menuMidiTotal = 0;
  menuMidiPizzas.forEach(item => {
    const customization = item.customization as PizzaCustomization;
    if (customization) {
      menuMidiTotal += getBasePizzaPrice(customization) * item.quantity;
      menuMidiTotal += getSupplementsTotal(customization) * item.quantity;
    }
  });

  // Calculate supplements total for REGULAR pizzas only (never discounted)
  let supplementsTotal = 0;
  regularPizzas.forEach(item => {
    const customization = item.customization as PizzaCustomization;
    if (customization) {
      supplementsTotal += getSupplementsTotal(customization) * item.quantity;
    }
  });

  // Group REGULAR pizzas by size (for base price calculation only)
  const seniorPizzas = regularPizzas.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.size === 'senior';
  });
  const megaPizzas = regularPizzas.filter(item => {
    const customization = item.customization as PizzaCustomization;
    return customization?.size === 'mega';
  });

  const seniorCount = seniorPizzas.reduce((sum, item) => sum + item.quantity, 0);
  const megaCount = megaPizzas.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate original total for REGULAR pizzas (base prices only, without supplements)
  let originalBaseTotal = 0;
  regularPizzas.forEach(item => {
    const customization = item.customization as PizzaCustomization;
    if (customization) {
      originalBaseTotal += getBasePizzaPrice(customization) * item.quantity;
    }
  });

  let discountedBaseTotal = 0;
  let promoDescription: string | null = null;
  let freePizzas = 0;

  // Calculate potential free pizzas based on "incomplete sets"
  // For emporter/surplace (1+1): 1 pizza entitles to 1 free pizza.
  // For livraison (2+1): 2 pizzas entitle to 1 free pizza.
  const totalCount = seniorCount + megaCount;

  if (orderType === 'surplace' || orderType === 'emporter') {
    // 1 achetée = 1 offerte
    // If odd number of pizzas, the user is entitled to 1 more free pizza (to add or defer)
    if (totalCount % 2 === 1) {
      freePizzas = 1;
    }

    // Existing pairing logic for discount in cart
    const seniorPairs = Math.floor(seniorCount / 2);
    const seniorSingles = seniorCount % 2;
    const megaPairs = Math.floor(megaCount / 2);
    const megaSingles = megaCount % 2;

    discountedBaseTotal =
      (seniorPairs * pizzaPrices.senior) + (seniorSingles * pizzaPrices.senior) +
      (megaPairs * pizzaPrices.mega) + (megaSingles * pizzaPrices.mega);

    if (totalCount >= 1) {
      promoDescription = `1 achetée = 1 offerte ${freePizzas > 0 ? '(1 pizza offerte à ajouter ou différer)' : ''}`;
    }
  } else if (orderType === 'livraison') {
    // 2 achetées = 1 offerte
    // If exactly 2 pizzas (or 5, 8...), the user is entitled to 1 more free pizza
    if (totalCount % 3 === 2) {
      freePizzas = 1;
    }

    // Pairing logic for discount in cart: groups of 3 (2 paid, 1 free)
    // We prioritize discounting mega pizzas if there's a mix
    let tempSenior = seniorCount;
    let tempMega = megaCount;
    let paidSenior = 0;
    let paidMega = 0;

    // Count full sets of 3
    const fullSets = Math.floor(totalCount / 3);
    const remaining = totalCount % 3;

    // For all full sets, we pay for 2 and get 1 free.
    // We prioritize mega for the "paid" slots to be conservative/fair? 
    // Actually, usually the cheapest is free. So we pay for all mega first.
    let totalPaidInSets = fullSets * 2;

    // Simplest logic: pay for everyone, then discount the cheapest pizzas in the sets
    discountedBaseTotal = (seniorCount * pizzaPrices.senior) + (megaCount * pizzaPrices.mega);
    const discountAmount = fullSets * pizzaPrices.senior; // Always discount the senior price for now as it's the 18€ one
    discountedBaseTotal -= discountAmount;

    if (totalCount >= 2) {
      promoDescription = `2 achetées = 1 offerte ${freePizzas > 0 ? '(1 pizza offerte à ajouter ou différer)' : ''}`;
    }
  } else {
    discountedBaseTotal = originalBaseTotal;
  }

  // Final totals: 
  // - Menu Midi: fixed price (no discount)
  // - Regular: base + supplements (supplements never discounted)
  const originalTotal = menuMidiTotal + originalBaseTotal + supplementsTotal;
  const discountedTotal = menuMidiTotal + discountedBaseTotal + supplementsTotal;

  return { originalTotal, discountedTotal, promoDescription, freePizzas, supplementsTotal };
}

// Calculate TVA (10%)
export function calculateTVA(total: number): { ht: number; tva: number; ttc: number } {
  const ttc = total;
  const ht = ttc / 1.10;
  const tva = ttc - ht;
  return { ht, tva, ttc };
}