// PocketBase collection types for Twin Pizza
// These match the existing Supabase types to minimize frontend changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// Base record type (all PocketBase records have these)
// ============================================
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ============================================
// Admin Settings
// ============================================
export interface AdminSetting extends BaseRecord {
  setting_key: string;
  setting_value: Json;
}

// ============================================
// Carousel Images
// ============================================
export interface CarouselImage extends BaseRecord {
  title: string | null;
  description: string | null;
  image_url: string;
  image_file: string; // PocketBase file field
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

// ============================================
// Categories
// ============================================
export interface Category extends BaseRecord {
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

// ============================================
// Products
// ============================================
export interface Product extends BaseRecord {
  name: string;
  description: string | null;
  base_price: number;
  pizza_base: string | null;
  category_id: string | null;
  image_url: string | null;
  image_file: string; // PocketBase file field
  display_order: number;
  is_active: boolean;
  // Expand fields
  expand?: {
    category_id?: Category;
  };
}

// ============================================
// Customization Options (shared shape)
// ============================================
export interface CustomizationOption extends BaseRecord {
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

// Aliases for specific option types
export type MeatOption = CustomizationOption;
export type SauceOption = CustomizationOption;
export type GarnitureOption = CustomizationOption;
export type SupplementOption = CustomizationOption;
export type CruditesOption = CustomizationOption;

// ============================================
// Drinks & Desserts
// ============================================
export interface Drink extends BaseRecord {
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Dessert extends BaseRecord {
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

// ============================================
// Delivery Zones
// ============================================
export interface DeliveryZone extends BaseRecord {
  name: string;
  min_order: number;
  delivery_fee: number;
  estimated_time: string;
  is_active: boolean;
  color: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  zone_type: string | null;
}

// ============================================
// Orders
// ============================================
export type OrderType = 'emporter' | 'livraison' | 'surplace';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cb' | 'especes' | 'en_ligne';

export interface Order extends BaseRecord {
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_notes: string | null;
  delivery_zone_id: string | null;
  items: Json;
  subtotal: number;
  tva: number;
  delivery_fee: number | null;
  total: number;
  payment_method: PaymentMethod;
  is_scheduled: boolean;
  scheduled_for: string | null;
}

// ============================================
// Sandwich Types
// ============================================
export interface SandwichType extends BaseRecord {
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

// ============================================
// Product Size Prices
// ============================================
export interface ProductSizePrice extends BaseRecord {
  product_type: string;
  size_id: string;
  size_label: string;
  max_meats: number;
  price: number;
  display_order: number;
  is_active: boolean;
}

// ============================================
// Promotions
// ============================================
export interface Promotion extends BaseRecord {
  title: string;
  description: string | null;
  promo_type: string;
  discount_percent: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  free_item_name: string | null;
  cart_min_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

// ============================================
// Opening Hours
// ============================================
export interface OpeningHours extends BaseRecord {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
}

// ============================================
// Site Settings (key-value)
// ============================================
export interface SiteSetting extends BaseRecord {
  key: string;
  value: string;
}

// ============================================
// Product Analytics
// ============================================
export interface ProductAnalytic extends BaseRecord {
  product_id: string | null;
  product_name: string;
  category_slug: string | null;
  action_type: string;
  session_id: string | null;
  device_type: string | null;
}

// ============================================
// Category Images
// ============================================
export interface CategoryImage extends BaseRecord {
  category_slug: string;
  image_url: string | null;
  emoji_fallback: string;
  display_name: string;
  is_active: boolean;
}

// ============================================
// User Roles
// ============================================
export type AppRole = 'admin' | 'staff';

export interface UserRole extends BaseRecord {
  user_id: string;
  role: AppRole;
}

// ============================================
// Loyalty System
// ============================================
export interface LoyaltyCustomer extends BaseRecord {
  phone: string;
  name: string;
  points: number;
  stamps: number;
  total_stamps: number;
  free_items_available: number;
  pizza_credits_available: number;
  total_spent: number;
  total_orders: number;
  first_order_done: boolean;
}

export interface LoyaltyTransaction extends BaseRecord {
  customer_id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  order_id: string | null;
}

export interface LoyaltyReward extends BaseRecord {
  name: string;
  description: string;
  points_cost: number;
  type: 'free_item' | 'discount' | 'percentage';
  value: number;
  is_active: boolean;
}

// ============================================
// Spin Wheel
// ============================================
export interface SpinWheelEntry extends BaseRecord {
  client_name: string;
  prize: string | null;
  prize_code: string;
  device_fingerprint: string;
  expires_at: string;
  reviewed: boolean;
}

// ============================================
// Inventory System
// ============================================
export interface InventoryCategory extends BaseRecord {
  name: string;
  slug: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export interface InventoryItem extends BaseRecord {
  category_id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  last_price: number | null;
  supplier_name: string | null;
  is_active: boolean;
  display_order: number;
  notes: string | null;
  // Computed / expanded
  category?: InventoryCategory;
  is_low_stock?: boolean;
}

export interface SupplierOrder extends BaseRecord {
  items: Json;
  supplier_name: string | null;
  supplier_phone: string | null;
  total_items: number;
  sent_via: string;
  status: 'draft' | 'sent' | 'received';
  sent_at: string | null;
  created_by: string | null;
  notes: string | null;
}

// ============================================
// System
// ============================================
export interface SystemStatus extends BaseRecord {
  server_name: string;
  is_online: boolean;
  last_heartbeat: string;
}

export interface PushSubscription extends BaseRecord {
  endpoint: string;
  keys: Json;
  user_agent: string;
  device_name: string;
  is_active: boolean;
  last_used_at: string;
}

// ============================================
// Kitchen / HACCP
// ============================================
export interface HaccpPrintQueueItem extends BaseRecord {
  product_name: string;
  category_name: string;
  category_color: string;
  action_date: string;
  dlc_date: string;
  storage_temp: string;
  operator: string;
  dlc_hours: number;
  action_label: string;
  notes: string | null;
  status: string;
}

export interface PrintJob extends BaseRecord {
  order_id: string;
  status: string;
  attempts: number;
  error: string | null;
}
