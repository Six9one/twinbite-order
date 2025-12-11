export type OrderType = 'emporter' | 'livraison' | 'surplace' | null;

export type MenuCategory = 
  | 'pizzas' 
  | 'menus-midi'
  | 'tacos' 
  | 'soufflets' 
  | 'makloub' 
  | 'mlawi'
  | 'panini' 
  | 'croques'
  | 'frites'
  | 'milkshakes'
  | 'crepes'
  | 'gaufres'
  | 'boissons';

export type PizzaBase = 'tomate' | 'creme';
export type PizzaSize = 'senior' | 'mega';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image?: string;
  base?: PizzaBase; // For pizzas
  ingredients?: string[];
}

export interface PizzaCustomization {
  base: PizzaBase;
  size: PizzaSize;
  isMenuMidi?: boolean;
  promoApplied?: string;
  note?: string;
  supplements?: string[]; // Cheese supplements
}

export interface TacosCustomization {
  size: 'solo' | 'double' | 'triple';
  meats: string[];
  sauces: string[];
  menuOption: 'none' | 'frites' | 'boisson' | 'menu';
  supplements: string[];
  note?: string;
}

export interface SouffletCustomization {
  size: 'solo' | 'double' | 'triple';
  meats: string[];
  sauces: string[];
  garnitures: string[];
  supplements: string[];
  menuOption: 'none' | 'frites' | 'boisson' | 'menu';
  cheeseSupplements?: string[];
  note?: string;
}

export interface MakloubCustomization {
  size: 'solo' | 'double';
  meats: string[];
  sauces: string[];
  garnitures: string[];
  supplements: string[];
  cheeseSupplements?: string[];
  note?: string;
}

export interface MlawiCustomization {
  meats: string[];
  sauces: string[];
  garnitures: string[];
  note?: string;
}

export interface PaniniCustomization {
  meats: string[];
  sauces: string[];
  menuOption: 'none' | 'frites' | 'boisson' | 'menu';
  supplements: string[];
  note?: string;
}

export type ProductCustomization = 
  | PizzaCustomization 
  | TacosCustomization 
  | SouffletCustomization 
  | MakloubCustomization
  | MlawiCustomization
  | PaniniCustomization;

// Legacy support - Updated with new fields
export interface SouffletOrder {
  meat: string | null;
  sauces?: string[];
  sauce: string | null;
  garnitures?: string[];
  toppings: string[];
  cheeseSupplements?: string[];
  menuOption?: 'none' | 'frites' | 'boisson' | 'menu';
  side: string | null;
  note?: string;
}

export interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  customization?: ProductCustomization | SouffletOrder;
  calculatedPrice?: number; // Price after customization
  note?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cb' | 'especes' | 'en_ligne';

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface Order {
  id: string;
  type: OrderType;
  items: CartItem[];
  subtotal: number;
  tva: number;
  total: number;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}