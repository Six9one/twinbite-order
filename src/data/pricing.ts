/**
 * ===========================================================================
 * CENTRALIZED PRICING CONFIGURATION
 * ===========================================================================
 * 
 * This file contains ALL product pricing for the Twin Pizza website.
 * To change a price, simply update the value here and it will be reflected
 * across all wizards and components.
 * 
 * Last updated: 2025-12-23
 * ===========================================================================
 */

// =============================================================================
// PIZZA PRICES
// =============================================================================
export const pizzaPrices = {
    senior: 18,           // Standard pizza size
    mega: 25,             // Large pizza size
    menuMidiSenior: 10,   // Lunch menu pizza
    menuMidiMega: 15,     // Lunch menu mega pizza
};

// =============================================================================
// OLD PRICES (strikethrough display) - Edit these to change what's crossed out
// Set to null if you don't want to show an old price for that size
// =============================================================================
export const oldPrices = {
    soufflet: { solo: 7.5, double: 9, triple: 10.5 },
    makloub: { solo: 7.5, double: 9, triple: 10.5 },
    mlawi: { solo: 7.5, double: 9, triple: 10.5 },
    panini: { solo: null as number | null, duo: null as number | null },
    tacos: { solo: 7.5, double: 9, triple: 10.5 },
};

// =============================================================================
// SOUFFLET PRICES (by size)
// =============================================================================
export const souffletPrices = {
    solo: 7,     // 1 viande
    double: 8.5,  // 2 viandes
    triple: 10,  // 3 viandes
};

// =============================================================================
// MAKLOUB PRICES (by size)
// =============================================================================
export const makloubPrices = {
    solo: 7,    // 1 viande
    double: 8.5, // 2 viandes
    triple: 10,  // 3 viandes
};

// =============================================================================
// MLAWI PRICES (by size)
// =============================================================================
export const mlawiPrices = {
    solo: 7,     // 1 viande
    double: 8.5,   // 2 viandes
    triple: 10,  // 3 viandes
};

// =============================================================================
// PANINI PRICES (by size)
// =============================================================================
export const paniniPrices = {
    solo: 5,    // 2 viandes max
    duo: 6.5,  // 2 viandes max
};

// =============================================================================
// TACOS PRICES (by size)
// =============================================================================
export const tacosPrices = {
    solo: 7,     // 1 viande
    double: 8.5, // 2 viandes
    triple: 10,  // 3 viandes
};

// =============================================================================
// MENU OPTIONS (supplements with frites/boisson)
// =============================================================================
export const menuOptionPrices = {
    none: 0,        // Sans option menu
    frites: 1.5,    // Frites seules
    boisson: 1.5,   // Boisson seule
    menu: 2.5,      // Frites + Boisson
};

// =============================================================================
// SUPPLEMENT PRICES
// =============================================================================
export const supplementPrices = {
    // Fromages (pour Tacos, Soufflet, etc.)
    chevre: 1,
    reblochon: 1,
    mozzarella: 1,
    raclette: 1,
    cheddar: 1,
    boursin: 1,

    // Autres suppléments
    fromage: 1,
    viande: 1.5,
    sauce: 0.5,
};

// =============================================================================
// FRITES PRICES
// =============================================================================
export const fritesPrices = {
    petite: 2.5,
    grande: 4,
    maison: 5,
};

// =============================================================================
// MILKSHAKE PRICES
// =============================================================================
export const milkshakePrices = {
    standard: 4,   // Vanille, Chocolat, Fraise, Banane
    special: 4.5,  // Oreo
};

// =============================================================================
// CREPES PRICES
// =============================================================================
export const crepesPrices = {
    sucre: 3,
    nutella: 4,
    bananeNutella: 5,
    chantilly: 4,
};

// =============================================================================
// GAUFRES PRICES
// =============================================================================
export const gaufresPrices = {
    sucre: 3.5,
    nutella: 4.5,
    chocolat: 4.5,
    complete: 6,
};

// =============================================================================
// SALADE PRICES
// =============================================================================
export const saladePrices = {
    cesar: 8.5,
    nicoise: 8,
    chevreChaud: 9,
};

// =============================================================================
// CROQUES PRICES
// =============================================================================
export const croquesPrices = {
    monsieur: 4.5,
    madame: 5,
    texMex: 6,
};

// =============================================================================
// BOISSONS PRICES
// =============================================================================
export const boissonsPrices = {
    coca33cl: 2,
    cocoZero: 2,
    fanta: 2,
    sprite: 2,
    iceTea: 2,
    oasis: 2,
    orangina: 2,
    eau50cl: 1.5,
    perrier: 2.5,
    jusOrange: 2.5,
};

// =============================================================================
// DELIVERY ZONES CONFIG
// =============================================================================
export const deliveryZonesConfig = [
    { id: "zone-1", name: "Grand-Couronne Centre", minOrder: 12, deliveryFee: 0, estimatedTime: "20-30 min" },
    { id: "zone-2", name: "Petit-Couronne", minOrder: 15, deliveryFee: 2, estimatedTime: "25-35 min" },
    { id: "zone-3", name: "Moulineaux", minOrder: 15, deliveryFee: 2, estimatedTime: "25-35 min" },
    { id: "zone-4", name: "Orival", minOrder: 18, deliveryFee: 3, estimatedTime: "30-40 min" },
    { id: "zone-5", name: "Saint-Étienne-du-Rouvray", minOrder: 20, deliveryFee: 3, estimatedTime: "35-45 min" },
    { id: "zone-6", name: "Rouen Sud", minOrder: 25, deliveryFee: 4, estimatedTime: "40-50 min" },
];

// =============================================================================
// HELPER: Get all wizard size configs from centralized pricing
// =============================================================================
export const wizardSizePrices = {
    soufflet: [
        { id: 'solo', label: 'Solo', maxMeats: 1, price: souffletPrices.solo },
        { id: 'double', label: 'Double', maxMeats: 2, price: souffletPrices.double },
        { id: 'triple', label: 'Triple', maxMeats: 3, price: souffletPrices.triple },
    ],
    mlawi: [
        { id: 'solo', label: 'Solo', maxMeats: 1, price: mlawiPrices.solo },
        { id: 'double', label: 'Double', maxMeats: 2, price: mlawiPrices.double },
        { id: 'triple', label: 'Triple', maxMeats: 3, price: mlawiPrices.triple },
    ],
    makloub: [
        { id: 'solo', label: 'Solo', maxMeats: 1, price: makloubPrices.solo },
        { id: 'double', label: 'Double', maxMeats: 2, price: makloubPrices.double },
        { id: 'triple', label: 'Triple', maxMeats: 3, price: makloubPrices.triple },
    ],
    panini: [
        { id: 'solo', label: 'Solo', maxMeats: 2, price: paniniPrices.solo },
        { id: 'duo', label: 'Duo', maxMeats: 2, price: paniniPrices.duo },
    ],
    tacos: [
        { id: 'solo', label: 'Solo', maxMeats: 1, price: tacosPrices.solo },
        { id: 'double', label: 'Double', maxMeats: 2, price: tacosPrices.double },
        { id: 'triple', label: 'Triple', maxMeats: 3, price: tacosPrices.triple },
    ],
};
