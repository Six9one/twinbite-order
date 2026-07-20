import { MenuItem, MenuCategory } from "@/types/order";

// ============= PIZZAS =============
// Base Tomate - 18€ Senior, 25€ Mega
export const pizzasTomate: MenuItem[] = [
  { id: "pizza-t-1", name: "Margherita", description: "Sauce tomate, Mozzarella, origan", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-2", name: "Végétarienne", description: "Sauce tomate, Mozzarella, champignons, oignons, poivrons, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-3", name: "Fruits de mer", description: "Sauce tomate, Mozzarella, cocktail de fruits de mer", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-4", name: "Mexicaine", description: "Sauce tomate, Mozzarella, merguez, chorizo, poivrons, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-5", name: "4 Saisons", description: "Sauce tomate, Mozzarella, jambons, champignons, artichauts, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-6", name: "Reine", description: "Sauce tomate, Mozzarella, jambons, champignons", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-7", name: "Orientale", description: "Sauce tomate, Mozzarella, merguez, poivron, œuf", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-8", name: "Campione", description: "Sauce tomate, Mozzarella, viande hachée, champignons, œuf", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-9", name: "4 Fromages", description: "Sauce tomate, Mozzarella, Bleu, fromage de chèvre, Parmesan", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-10", name: "Calzone", description: "Sauce tomate, Mozzarella, jambon de dinde, œuf, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-11", name: "Savoyarde", description: "Sauce tomate, Mozzarella, Reblochon, émincé de poulet, pomme de terre", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-12", name: "Pêcheur", description: "Sauce tomate, Mozzarella, thon, oignons, œuf, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-13", name: "Pimento", description: "Sauce tomate, relevée harissa, Mozzarella, Jalapeños, chorizo, poivrons", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-14", name: "Royale", description: "Sauce tomate, Mozzarella, viande hachée, merguez, poivrons, olives", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-15", name: "3 Jambons", description: "Sauce tomate, Mozzarella, chorizo, jambon, lardons", price: 18, category: "pizzas", base: "tomate" },
  { id: "pizza-t-16", name: "Twinizienne", description: "Sauce tomate, relevée harissa, Mozzarella, émincé de poulet, aubergine, poivrons, olives", price: 18, category: "pizzas", base: "tomate" }
];

// Base Crème Fraîche - 18€ Senior, 25€ Mega
export const pizzasCreme: MenuItem[] = [
  { id: "pizza-c-1", name: "Tartiflette", description: "Sauce fraîche, Mozzarella, lardons, reblochon, pomme de terre, oignons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-2", name: "Kebab", description: "Sauce fraîche, Mozzarella, kebab, pomme de terre, oignons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-3", name: "Norvégienne", description: "Sauce fraîche, Mozzarella, saumon", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-4", name: "Buffalo", description: "Sauce barbecue, Mozzarella, viande hachée, cheddar, oignions", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-5", name: "Raclette", description: "Sauce fraîche, Mozzarella, pomme de terre, raclette, lardons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-6", name: "Antillaise", description: "Sauce fraîche, Mozzarella, merguez, viande hachée, pomme de terre, olives", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-7", name: "Chèvre miel", description: "Sauce fraîche, Mozzarella, fromage de chèvre, miel", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-8", name: "Farmer", description: "Sauce fraîche, Mozzarella, tenders, pomme de terre, oignons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-9", name: "Charcutière", description: "Sauce fraîche, Mozzarella, jambon, lardons, champignons, cheddar", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-10", name: "Boursin", description: "Sauce fraîche, Mozzarella, émincé de poulet, pomme de terre, oignons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-11", name: "Biggy", description: "Sauce Biggy, Mozzarella, viande hachée, poivrons, cornichons", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-12", name: "Cheezy", description: "Sauce fraîche, Mozzarella, blanc de poulet, pomme de terre, sauce cheezy", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-13", name: "Chicken", description: "Sauce fraîche, Mozzarella, blanc de poulet, pomme de terre, cheddar", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-14", name: "Indienne", description: "Sauce Curry, Mozzarella, émincé de poulet, poivrons, olives", price: 18, category: "pizzas", base: "creme" },
  { id: "pizza-c-15", name: "La Hawaïe", description: "Sauce fraîche, Mozzarella, ananas, jambon", price: 18, category: "pizzas", base: "creme" }
];

// ============= TACOS =============
export const tacos: MenuItem[] = [
  {
    id: "tacos-solo",
    name: "Tacos Solo",
    description: "1 viande au choix, frites, fromage, sauce",
    price: 7.5,
    category: "tacos",
  },
  {
    id: "tacos-double",
    name: "Tacos Double",
    description: "2 viandes au choix, frites, fromage, sauces",
    price: 9,
    category: "tacos",
  },
  {
    id: "tacos-triple",
    name: "Tacos Triple",
    description: "3 viandes au choix, frites, fromage, sauces",
    price: 10.5,
    category: "tacos",
  },
];

// ============= SOUFFLETS =============
export const soufflets: MenuItem[] = [
  {
    id: "souffle-solo",
    name: "Soufflet Solo",
    description: "1 viande, sauce, garnitures au choix",
    price: 7.5,
    category: "soufflets",
  },
  {
    id: "souffle-double",
    name: "Soufflet Double",
    description: "2 viandes, sauces, garnitures au choix",
    price: 9,
    category: "soufflets",
  },
  {
    id: "souffle-triple",
    name: "Soufflet Triple",
    description: "3 viandes, sauces, garnitures au choix",
    price: 10.5,
    category: "soufflets",
  },
];

// ============= MAKLOUB =============
export const makloub: MenuItem[] = [
  {
    id: "makloub-solo",
    name: "Makloub Solo",
    description: "1 viande, garnitures, sauces",
    price: 7.5,
    category: "makloub",
  },
  {
    id: "makloub-double",
    name: "Makloub Double",
    description: "2 viandes, garnitures, sauces",
    price: 9,
    category: "makloub",
  },
  {
    id: "makloub-triple",
    name: "Makloub Triple",
    description: "3 viandes, garnitures, sauces",
    price: 10.5,
    category: "makloub",
  },
];

// ============= MLAWI =============
export const mlawi: MenuItem[] = [
  {
    id: "mlawi-solo",
    name: "Mlawi Solo",
    description: "1 viande, garnitures, sauces",
    price: 7.5,
    category: "mlawi"
  },
  {
    id: "mlawi-double",
    name: "Mlawi Double",
    description: "2 viandes, garnitures, sauces",
    price: 9,
    category: "mlawi"
  },
  {
    id: "mlawi-triple",
    name: "Mlawi Triple",
    description: "3 viandes, garnitures, sauces",
    price: 10.5,
    category: "mlawi"
  },
];

// ============= PANINI =============
export const panini: MenuItem[] = [
  {
    id: "panini-poulet",
    name: "Panini Poulet",
    description: "Poulet grillé, fromage, sauce",
    price: 5,
    category: "panini",
  },
  { id: "panini-thon", name: "Panini Thon", description: "Thon, fromage, tomates", price: 5, category: "panini" },
  {
    id: "panini-merguez",
    name: "Panini Merguez",
    description: "Merguez, fromage, sauce",
    price: 5.5,
    category: "panini",
  },
];

// ============= CROQUES / TEX-MEX =============
export const croques: MenuItem[] = [
  {
    id: "croque-monsieur",
    name: "Croque Monsieur",
    description: "Jambon, fromage gratiné",
    price: 4.5,
    category: "croques",
  },
  { id: "croque-madame", name: "Croque Madame", description: "Jambon, fromage, œuf", price: 5, category: "croques" },
  { id: "tex-mex", name: "Tex-Mex", description: "Viande épicée, poivrons, fromage", price: 6, category: "croques" },
];

// ============= FRITES =============
export const frites: MenuItem[] = [
  { id: "frites-small", name: "Petite Frites", description: "Portion individuelle", price: 2.5, category: "frites" },
  { id: "frites-large", name: "Grande Frites", description: "Grande portion", price: 4, category: "frites" },
  { id: "frites-maison", name: "Frites Maison", description: "Frites fraîches maison", price: 5, category: "frites" },
];

// ============= MILKSHAKES =============
export const milkshakes: MenuItem[] = [
  { id: "milk-vanille", name: "Milkshake Vanille", description: "Vanille onctueuse", price: 4, category: "milkshakes" },
  {
    id: "milk-chocolat",
    name: "Milkshake Chocolat",
    description: "Chocolat intense",
    price: 4,
    category: "milkshakes",
  },
  { id: "milk-fraise", name: "Milkshake Fraise", description: "Fraise fraîche", price: 4, category: "milkshakes" },
  { id: "milk-banane", name: "Milkshake Banane", description: "Banane crémeuse", price: 4, category: "milkshakes" },
  { id: "milk-oreo", name: "Milkshake Oreo", description: "Oreo crunchy", price: 4.5, category: "milkshakes" },
];

// ============= CRÊPES =============
export const crepes: MenuItem[] = [
  { id: "crepe-sucre", name: "Crêpe Sucre", description: "Sucre fin", price: 3, category: "crepes" },
  { id: "crepe-nutella", name: "Crêpe Nutella", description: "Nutella généreux", price: 4, category: "crepes" },
  {
    id: "crepe-banane-nutella",
    name: "Crêpe Banane Nutella",
    description: "Banane fraîche et Nutella",
    price: 5,
    category: "crepes",
  },
  { id: "crepe-chantilly", name: "Crêpe Chantilly", description: "Crème chantilly", price: 4, category: "crepes" },
];

// ============= GAUFRES =============
export const gaufres: MenuItem[] = [
  { id: "gaufre-sucre", name: "Gaufre Sucre", description: "Sucre glace", price: 3.5, category: "gaufres" },
  { id: "gaufre-nutella", name: "Gaufre Nutella", description: "Nutella fondant", price: 4.5, category: "gaufres" },
  {
    id: "gaufre-choco",
    name: "Gaufre Chocolat",
    description: "Sauce chocolat chaude",
    price: 4.5,
    category: "gaufres",
  },
  {
    id: "gaufre-complete",
    name: "Gaufre Complète",
    description: "Nutella, banane, chantilly",
    price: 6,
    category: "gaufres",
  },
];

// ============= BOISSONS =============
export const boissons: MenuItem[] = [
  { id: "canette", name: "Canette au choix", description: "Ex: Coca-Cola, Fanta, Sprite…", price: 1.5, category: "boissons" },
  { id: "bouteille", name: "Grande Bouteille", description: "Ex: Coca 1.5L, eau gazeuse…", price: 3.5, category: "boissons" },
  { id: "eau-mini", name: "Eau Mini (50cl)", description: "Eau minérale 50cl", price: 1.5, category: "boissons" },
  { id: "eau-grand", name: "Eau Grand (1.5L)", description: "Eau minérale 1.5L", price: 1.5, category: "boissons" },
];

// ============= SALADES =============
export const salades: MenuItem[] = [
  {
    id: "salade-cesar",
    name: "Salade César",
    description: "Salade, poulet grillé, croûtons, parmesan, sauce césar",
    price: 8.5,
    category: "salades",
  },
  {
    id: "salade-nicoise",
    name: "Salade Niçoise",
    description: "Salade, thon, œuf dur, tomates, olives, haricots verts",
    price: 8.0,
    category: "salades",
  },
  {
    id: "salade-chevre-chaud",
    name: "Salade Chèvre Chaud",
    description: "Salade, toasts de chèvre chaud, miel, noix, tomates",
    price: 9.0,
    category: "salades",
  },
];

// ============= ALL MENU ITEMS =============
export const menuItems: MenuItem[] = [
  ...pizzasTomate,
  ...pizzasCreme,
  ...tacos,
  ...soufflets,
  ...makloub,
  ...mlawi,
  ...panini,
  ...croques,
  ...frites,
  ...milkshakes,
  ...crepes,
  ...gaufres,
  ...boissons,
  ...salades,
];

// ============= OPTIONS =============
// Meats allowed: Escalope marinée, Tenders, Viande hachée, Merguez, Cordon bleu, Nuggets
export const meatOptions = [
  { id: "escalope", name: "Escalope marinée", price: 0 },
  { id: "tenders", name: "Tenders", price: 0 },
  { id: "viande", name: "Viande hachée", price: 0 },
  { id: "merguez", name: "Merguez", price: 0 },
  { id: "cordon-bleu", name: "Cordon bleu", price: 0 },
  { id: "nuggets", name: "Nuggets", price: 0 },
];

export const sauceOptions = [
  { id: "blanche", name: "Sauce Blanche", price: 0 },
  { id: "algerienne", name: "Algérienne", price: 0 },
  { id: "harissa", name: "Harissa", price: 0 },
  { id: "biggy", name: "Biggy Burger", price: 0 },
  { id: "samourai", name: "Samouraï", price: 0 },
  { id: "ketchup", name: "Ketchup", price: 0 },
  { id: "mayonnaise", name: "Mayonnaise", price: 0 },
  { id: "bbq", name: "Barbecue", price: 0 },
  { id: "curry", name: "Curry", price: 0 },
  { id: "sauce-fromager", name: "Sauce Fromagère", price: 0 },
];

// Garnitures for Soufflet (Pomme de terre, Oignon, Olive)
export const souffletGarnitureOptions = [
  { id: "pdt", name: "Pomme de Terre", price: 0 },
  { id: "oignon", name: "Oignon", price: 0 },
  { id: "olive", name: "Olive", price: 0 },
];

// Garnitures for Makloub (Salade, Tomate, Oignon)
export const makloubGarnitureOptions = [
  { id: "salade", name: "Salade", price: 0 },
  { id: "tomate", name: "Tomate", price: 0 },
  { id: "oignon", name: "Oignon", price: 0 },
];

// Garnitures for Mlawi (Salade, Tomate, Oignon, Olives)
export const mlawiGarnitureOptions = [
  { id: "salade", name: "Salade", price: 0 },
  { id: "tomate", name: "Tomate", price: 0 },
  { id: "oignon", name: "Oignon", price: 0 },
  { id: "olive", name: "Olive", price: 0 },
];

// Legacy garniture options
export const garnitureOptions = [
  { id: "salade", name: "Salade", price: 0 },
  { id: "tomate", name: "Tomate", price: 0 },
  { id: "oignon", name: "Oignons", price: 0 },
  { id: "olive", name: "Olives", price: 0.5 },
  { id: "pdt", name: "Pommes de Terre", price: 0 },
  { id: "fromage", name: "Fromage", price: 1 },
];

// Supplements for Soufflet and Makloub (1€ each)
export const cheeseSupplementOptions = [
  { id: "chevre", name: "Chèvre", price: 1 },
  { id: "reblochon", name: "Reblochon", price: 1 },
  { id: "mozzarella", name: "Mozzarella", price: 1 },
  { id: "raclette", name: "Raclette", price: 1 },
  { id: "cheddar", name: "Cheddar", price: 1 },
  { id: "boursin", name: "Boursin", price: 1 },
];

export const supplementOptions = [
  { id: "fromage-sup", name: "Supplément Fromage", price: 1 },
  { id: "viande-sup", name: "Supplément Viande", price: 1.5 },
  { id: "sauce-sup", name: "Sauce Supplémentaire", price: 0.5 },
];

// ============= PIZZA INGREDIENT SUPPLEMENTS =============
// Extras that can be added to any pizza during customization
export const pizzaIngredientSupplements = [
  { id: "pi-fromage", name: "Extra Fromage", emoji: "🧀", price: 1.00 },
  { id: "pi-viande", name: "Extra Viande", emoji: "🥩", price: 1.50 },
  { id: "pi-sauce", name: "Sauce Supplémentaire", emoji: "🫙", price: 0.50 },
  { id: "pi-champignons", name: "Champignons", emoji: "🍄", price: 0.50 },
  { id: "pi-olives", name: "Olives", emoji: "🫒", price: 0.50 },
  { id: "pi-poivrons", name: "Poivrons", emoji: "🫑", price: 0.30 },
  { id: "pi-oignons", name: "Oignons", emoji: "🧅", price: 0.30 },
  { id: "pi-oeuf", name: "Œuf", emoji: "🥚", price: 1.00 },
  { id: "pi-mozzarella", name: "Mozzarella extra", emoji: "⚪", price: 1.00 },
  { id: "pi-jambon", name: "Jambon", emoji: "🥓", price: 1.00 },
  { id: "pi-lardons", name: "Lardons", emoji: "🥓", price: 1.00 },
  { id: "pi-merguez", name: "Merguez", emoji: "🌭", price: 1.00 },
  { id: "pi-poulet", name: "Poulet", emoji: "🍗", price: 1.00 },
  { id: "pi-chorizo", name: "Chorizo", emoji: "🌶️", price: 1.00 },
  { id: "pi-thon", name: "Thon", emoji: "🐟", price: 1.00 },
  { id: "pi-chevre", name: "Chèvre", emoji: "🧀", price: 1.00 },
];

// ============= CATEGORY CONFIG =============
export const categoryLabels: Record<MenuCategory, string> = {
  pizzas: "🍕 Pizzas",
  "menus-midi": "☀️ Menus Midi",
  tacos: "🌮 Tacos",
  soufflets: "🥟 Soufflet",
  makloub: "🌯 Makloub",
  mlawi: "🫓 Mlawi",
  panini: "🥪 Panini",
  croques: "🧀 Croques",
  texmex: "🌶️ Tex-Mex",
  frites: "🍟 Frites",
  milkshakes: "🥤 Milkshakes",
  crepes: "🥞 Crêpes",
  gaufres: "🧇 Gaufres",
  boissons: "🥤 Boissons",
  salades: "🥗 Salade",
};

export const categoryOrder: MenuCategory[] = [
  "pizzas",
  "tacos",
  "soufflets",
  "makloub",
  "mlawi",
  "panini",
  "croques",
  "texmex",
  "frites",
  "milkshakes",
  "crepes",
  "gaufres",
  "boissons",
  "salades",
];

// ============= DELIVERY ZONES =============
export const deliveryZones = [
  { id: "zone-1", name: "Grand-Couronne Centre", minOrder: 12, deliveryFee: 0, estimatedTime: "20-30 min" },
  { id: "zone-2", name: "Petit-Couronne", minOrder: 15, deliveryFee: 2, estimatedTime: "25-35 min" },
  { id: "zone-3", name: "Moulineaux", minOrder: 15, deliveryFee: 2, estimatedTime: "25-35 min" },
  { id: "zone-4", name: "Orival", minOrder: 18, deliveryFee: 3, estimatedTime: "30-40 min" },
  { id: "zone-5", name: "Saint-Étienne-du-Rouvray", minOrder: 20, deliveryFee: 3, estimatedTime: "35-45 min" },
  { id: "zone-6", name: "Rouen Sud", minOrder: 25, deliveryFee: 4, estimatedTime: "40-50 min" },
];

// ============= DEALS =============
export const deals = [
  {
    id: "deal-1",
    title: "1 Achetée = 1 Offerte",
    description: "Sur place & À emporter - 2 pizzas Senior 18€",
    image: "deal-1",
    orderTypes: ["surplace", "emporter"] as const,
  },
  {
    id: "deal-2",
    title: "2 Achetées = 1 Offerte",
    description: "En livraison - 3 pizzas pour le prix de 2",
    image: "deal-2",
    orderTypes: ["livraison"] as const,
  },
  {
    id: "deal-3",
    title: "Menu Midi",
    description: "Pizza Senior + Boisson 10€ (11h-minuit)",
    image: "deal-3",
    orderTypes: ["surplace", "emporter", "livraison"] as const,
  },
];

// ============= PRICES CONFIG =============
// Re-exported from centralized pricing.ts for backward compatibility
export { pizzaPrices, menuOptionPrices } from './pricing';


// Legacy support
export const souffletOptions = {
  meats: meatOptions,
  sauces: sauceOptions,
  toppings: garnitureOptions,
  sides: [
    { id: "frites", name: "Frites", price: 2.5 },
    { id: "boisson", name: "Boisson", price: 2 },
    { id: "frites-boisson", name: "Frites + Boisson", price: 4 },
    { id: "rien", name: "Rien", price: 0 },
  ],
};
