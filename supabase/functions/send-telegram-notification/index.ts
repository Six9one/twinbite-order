import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderNotification {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  total: number;
  paymentMethod: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customization?: any;
  }>;
  customerAddress?: string;
  customerNotes?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  subtotal?: number;
  tva?: number;
  deliveryFee?: number;
  // Stamp card info
  stampsEarned?: number;
  totalStamps?: number;
  freeItemsAvailable?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const order: OrderNotification = await req.json();

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatIds = [
      Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_1'),
      Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_2'),
      Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_3'),
      Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_4'),
    ].filter(Boolean);

    if (!botToken || chatIds.length === 0) {
      console.error('Missing Telegram configuration');
      return new Response(JSON.stringify({ error: 'Missing Telegram configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format order items with full customization details
    const formatCustomization = (customization: any, productName: string): string => {
      if (!customization) return '';
      const parts: string[] = [];

      // Check if this is a pizza (by product name)
      const isPizza = productName.toLowerCase().includes('pizza');

      // Show pizza SIZE prominently (MEGA in bold) - ONLY FOR PIZZAS
      if (isPizza && customization.size) {
        const sizeText = customization.size.toUpperCase() === 'MEGA'
          ? '*MEGA*'
          : customization.size.toUpperCase();
        parts.push(`📏 ${sizeText}`);
      }

      // Remove base sauce from display - not needed
      // Was: if (customization.base) { parts.push(customization.base === 'creme' ? 'Base crème' : 'Base tomate'); }

      // Menu Midi
      if (customization.isMenuMidi) {
        parts.push('Menu Midi');
      }

      // Meats
      if (customization.meats && customization.meats.length > 0) {
        parts.push(`🥩 ${customization.meats.join(', ')}`);
      }

      // Single meat (legacy)
      if (customization.meat) {
        parts.push(`🥩 ${customization.meat}`);
      }

      // Sauces
      if (customization.sauces && customization.sauces.length > 0) {
        parts.push(`🍯 ${customization.sauces.join(', ')}`);
      }

      // Single sauce (legacy)
      if (customization.sauce) {
        parts.push(`🍯 ${customization.sauce}`);
      }

      // Garnitures
      if (customization.garnitures && customization.garnitures.length > 0) {
        parts.push(`🥗 ${customization.garnitures.join(', ')}`);
      }

      // Toppings (legacy)
      if (customization.toppings && customization.toppings.length > 0) {
        parts.push(`🥗 ${customization.toppings.join(', ')}`);
      }

      // Supplements
      if (customization.supplements && customization.supplements.length > 0) {
        parts.push(`🧀 ${customization.supplements.join(', ')}`);
      }

      // Cheese supplements
      if (customization.cheeseSupplements && customization.cheeseSupplements.length > 0) {
        parts.push(`🧀 ${customization.cheeseSupplements.join(', ')}`);
      }

      // Menu option
      if (customization.menuOption && customization.menuOption !== 'none') {
        const menuLabels: Record<string, string> = {
          'frites': '+Frites',
          'boisson': '+Boisson',
          'menu': '+Menu complet'
        };
        parts.push(menuLabels[customization.menuOption] || '');
      }

      // Note
      if (customization.note) {
        parts.push(`📝 "${customization.note}"`);
      }

      return parts.length > 0 ? `\n   └ ${parts.join(' | ')}` : '';
    };

    const itemsList = order.items
      .map(item => {
        const customDetails = formatCustomization(item.customization, item.name);
        return `• ${item.quantity}x ${item.name} - ${item.price.toFixed(2)}€${customDetails}`;
      })
      .join('\n');

    // Order type emoji and text with colors
    const orderTypeMap: Record<string, { emoji: string; text: string; color: string }> = {
      'livraison': { emoji: '🛵', text: 'Livraison', color: '🔵' },
      'emporter': { emoji: '🥡', text: 'À emporter', color: '🟠' },
      'surplace': { emoji: '🍽️', text: 'Sur place', color: '🟢' },
    };
    const orderTypeInfo = orderTypeMap[order.orderType] || { emoji: '📦', text: order.orderType, color: '⚪' };

    // Payment method with status
    const getPaymentDisplay = () => {
      if (order.paymentMethod === 'en_ligne') {
        return '💳 PAYÉE ✅ (Stripe)';
      } else if (order.paymentMethod === 'cb') {
        return '💳 CB (À PAYER)';
      } else if (order.paymentMethod === 'especes') {
        return '💵 ESP (À PAYER)';
      }
      return order.paymentMethod;
    };
    const paymentText = getPaymentDisplay();

    // Scheduled order handling - PURPLE color for scheduled
    const isScheduled = order.isScheduled === true;
    let scheduledText = '';
    if (isScheduled && order.scheduledFor) {
      const scheduledDate = new Date(order.scheduledFor);
      const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      scheduledText = `\n\n⏰ *COMMANDE PROGRAMMÉE*\n📅 ${formattedDate}\n🕐 ${formattedTime}`;
    }

    // Build message with color coding
    const headerEmoji = isScheduled ? '📆⏰' : '🍕';
    const headerText = isScheduled ? 'COMMANDE PROGRAMMÉE' : 'NOUVELLE COMMANDE';

    let message = `${headerEmoji} *${headerText}* ${headerEmoji}\n`;
    message += `${orderTypeInfo.color} ${orderTypeInfo.color} ${orderTypeInfo.color}\n\n`;
    message += `📋 *Commande:* #${order.orderNumber}\n`;
    message += `${orderTypeInfo.emoji} ${orderTypeInfo.text}\n`;
    message += `${paymentText}\n`;

    if (isScheduled) {
      message += scheduledText;
    }

    message += `\n\n👤 *CLIENT:*\n`;
    message += `• Nom: ${order.customerName}\n`;
    message += `• Tél: ${order.customerPhone}\n`;

    if (order.customerAddress) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`;
      message += `• Adresse: [${order.customerAddress}](${mapsUrl})\n`;
    }

    message += `\n🛒 *ARTICLES:*\n${itemsList}\n`;

    // Show full pricing breakdown
    if (order.subtotal) {
      message += `\n📊 *Sous-total HT:* ${order.subtotal.toFixed(2)}€`;
    }
    if (order.tva) {
      message += `\n📊 *TVA (10%):* ${order.tva.toFixed(2)}€`;
    }
    // Delivery fee
    if (order.deliveryFee && order.deliveryFee > 0) {
      message += `\n🚗 *Livraison:* +${order.deliveryFee.toFixed(2)}€`;
    } else if (order.orderType === 'livraison') {
      message += `\n🚗 *Livraison:* GRATUITE`;
    }
    message += `\n💰 *TOTAL TTC: ${order.total.toFixed(2)}€*\n`;

    if (order.customerNotes) {
      message += `\n📝 *Notes:* ${order.customerNotes}`;
    }

    // Add stamp card info if available
    if (order.stampsEarned && order.stampsEarned > 0) {
      const currentStamps = order.totalStamps || 0;
      const displayStamps = currentStamps % 10;
      const stampsNeeded = 10 - displayStamps;
      const freeItems = order.freeItemsAvailable || 0;

      message += `\n\n🎁 *FIDÉLITÉ:*`;
      message += `\n• +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''} ajouté${order.stampsEarned > 1 ? 's' : ''}`;
      message += `\n• Progression: ${displayStamps}/10`;
      if (freeItems > 0) {
        message += `\n• 🎉 ${freeItems} PRODUIT${freeItems > 1 ? 'S' : ''} GRATUIT${freeItems > 1 ? 'S' : ''} (10€) À RÉCLAMER!`;
      } else {
        message += `\n• Plus que ${stampsNeeded} pour 1 produit gratuit (10€)!`;
      }
    }

    console.log('Sending Telegram notification to chats:', chatIds);

    // Send to all Telegram admins
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const results = await Promise.all(
      chatIds.map(async (chatId) => {
        try {
          const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'Markdown',
            }),
          });
          const result = await response.json();
          console.log(`Telegram sent to ${chatId}:`, result.ok ? 'success' : result.description);
          return result;
        } catch (err) {
          console.error(`Failed to send to ${chatId}:`, err);
          return { ok: false };
        }
      })
    );

    const successCount = results.filter(r => r.ok).length;
    console.log(`Telegram notifications sent: ${successCount}/${chatIds.length}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error sending Telegram notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});