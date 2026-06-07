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
    // size is 'menu_midi' for Senior, 'menu_midi_mega' for Mega
    return customization.size === 'menu_midi'
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
    // size id is 'menu_midi' for Midi Senior, 'menu_midi_mega' for Midi Mega
    return customization.size === 'menu_midi'
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

  const totalCount = seniorCount + megaCount;

  // Build a flat list of all regular pizza base prices, sorted descending (most expensive first)
  // This way the cheapest pizza in each group becomes the free one
  const allPizzaPrices: number[] = [];
  for (let i = 0; i < seniorCount; i++) allPizzaPrices.push(pizzaPrices.senior);
  for (let i = 0; i < megaCount; i++) allPizzaPrices.push(pizzaPrices.mega);
  allPizzaPrices.sort((a, b) => b - a); // Descending: most expensive first

  if (orderType === 'surplace' || orderType === 'emporter') {
    // ═══════════════════════════════════════════════════════
    // 1 ACHETÉE = 1 OFFERTE (groups of 2: pay 1, get 1 free)
    // ═══════════════════════════════════════════════════════
    // In each pair, the cheapest pizza is FREE
    // If odd count, customer can add 1 more free pizza (or defer)
    if (totalCount > 0 && totalCount % 2 === 1) {
      freePizzas = 1;
    }

    discountedBaseTotal = 0;
    for (let i = 0; i < allPizzaPrices.length; i++) {
      const isSecondInPair = (i % 2 === 1); // index 1, 3, 5... = free pizza
      if (!isSecondInPair) {
        discountedBaseTotal += allPizzaPrices[i]; // Paid
      }
      // else: FREE — don't add to total
    }

    if (totalCount >= 1) {
      promoDescription = `1 achetée = 1 offerte${freePizzas > 0 ? ' (1 pizza offerte à ajouter !)' : ''}`;
    }
  } else if (orderType === 'livraison') {
    // ═══════════════════════════════════════════════════════
    // 2 ACHETÉES = 1 OFFERTE (groups of 3: pay 2, get 1 free)
    // ═══════════════════════════════════════════════════════
    // In each triplet, the cheapest pizza is FREE
    // If remainder is 2, customer can add 1 more free pizza (or defer)
    if (totalCount > 0 && totalCount % 3 === 2) {
      freePizzas = 1;
    }

    discountedBaseTotal = 0;
    for (let i = 0; i < allPizzaPrices.length; i++) {
      const isThirdInTriplet = (i % 3 === 2); // index 2, 5, 8... = free pizza
      if (!isThirdInTriplet) {
        discountedBaseTotal += allPizzaPrices[i]; // Paid
      }
      // else: FREE — don't add to total
    }

    if (totalCount >= 2) {
      promoDescription = `2 achetées = 1 offerte${freePizzas > 0 ? ' (1 pizza offerte à ajouter !)' : ''}`;
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