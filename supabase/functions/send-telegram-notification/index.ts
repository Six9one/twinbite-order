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
  }>;
  customerAddress?: string;
  customerNotes?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
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

    // Format order items
    const itemsList = order.items
      .map(item => `• ${item.quantity}x ${item.name} - ${item.price.toFixed(2)}€`)
      .join('\n');

    // Order type emoji and text with colors
    const orderTypeMap: Record<string, { emoji: string; text: string; color: string }> = {
      'livraison': { emoji: '🛵', text: 'Livraison', color: '🔵' },
      'emporter': { emoji: '🥡', text: 'À emporter', color: '🟠' },
      'surplace': { emoji: '🍽️', text: 'Sur place', color: '🟢' },
    };
    const orderTypeInfo = orderTypeMap[order.orderType] || { emoji: '📦', text: order.orderType, color: '⚪' };

    // Payment method
    const paymentMap: Record<string, string> = {
      'en_ligne': '💳 Payé en ligne ✅',
      'cb': '💳 CB à la livraison',
      'especes': '💵 Espèces',
    };
    const paymentText = paymentMap[order.paymentMethod] || order.paymentMethod;

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
    message += `\n💰 *TOTAL: ${order.total.toFixed(2)}€*\n`;
    
    if (order.customerNotes) {
      message += `\n📝 *Notes:* ${order.customerNotes}`;
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