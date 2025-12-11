export type OrderType = 'emporter' | 'livraison' | 'surplace' | null;

export type MenuCategory = 'pizzas' | 'soufflets' | 'makloub' | 'tacos' | 'sandwiches' | 'panini' | 'boissons';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image?: string;
}

export interface SouffletOrder {
  meat: string | null;
  sauce: string | null;
  toppings: string[];
  side: string | null;
}

export interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  customization?: SouffletOrder;
}

export interface Order {
  type: OrderType;
  items: CartItem[];
  total: number;
}
