import { Order, OrderStatus } from '@/types/order';

const ORDERS_KEY = 'twin_pizza_orders';

export function getOrders(): Order[] {
  const data = localStorage.getItem(ORDERS_KEY);
  if (!data) return [];
  try {
    const orders = JSON.parse(data);
    return orders.map((order: Order) => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
    }));
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('newOrder', { detail: order }));
  
  // Request notification permission and notify
  notifyNewOrder(order);
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index].status = status;
    orders[index].updatedAt = new Date();
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('orderUpdated', { detail: orders[index] }));
  }
}

export function getOrderById(orderId: string): Order | undefined {
  const orders = getOrders();
  return orders.find(o => o.id === orderId);
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `TP-${timestamp}-${random}`.toUpperCase();
}

// Notification functions
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function notifyNewOrder(order: Order): void {
  if (Notification.permission === 'granted') {
    const orderTypeLabels = {
      emporter: 'À emporter',
      livraison: 'Livraison',
      surplace: 'Sur place',
    };
    
    new Notification('🍕 Nouvelle Commande!', {
      body: `${orderTypeLabels[order.type!]} - ${order.customer.name} - ${order.total.toFixed(2)}€`,
      icon: '/favicon.ico',
      tag: order.id,
    });
    
    // Play sound
    playNotificationSound();
  }
}

export function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio notification not available');
  }
}
