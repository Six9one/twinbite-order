const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// ===========================================
// CONFIGURATION - Modifiez ces valeurs !
// ===========================================
const SUPABASE_URL = 'https://hsylnrzxeyqxczdalurj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyOTY4MTgsImV4cCI6MjA0OTg3MjgxOH0.Gmdnvhfk9XQLBSAU-m3Z6_hoycsGVNGhWYwI1aYfEYQ';

// ===========================================
// Initialisation WhatsApp
// ===========================================
console.log('🍕 Twin Pizza WhatsApp Bot');
console.log('==========================\n');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth'
    }),
    puppeteer: {
        headless: false,  // Show browser for debugging
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Afficher le QR code pour se connecter
client.on('qr', (qr) => {
    console.log('📱 Scannez ce QR code avec WhatsApp sur votre téléphone:\n');
    qrcode.generate(qr, { small: true });
});

// Quand connecté
client.on('ready', () => {
    console.log('\n✅ WhatsApp connecté !');
    console.log('🔄 En attente de nouvelles commandes...\n');

    // Démarrer l'écoute des commandes
    listenForOrders();
});

// Erreurs
client.on('auth_failure', () => {
    console.error('❌ Échec d\'authentification');
});

client.on('disconnected', (reason) => {
    console.log('❌ Déconnecté:', reason);
});

// ===========================================
// Écoute des nouvelles commandes
// ===========================================
function listenForOrders() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // S'abonner aux nouvelles commandes
    supabase
        .channel('orders')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            async (payload) => {
                console.log('📦 Nouvelle commande reçue !');
                const order = payload.new;
                await sendOrderNotification(order);
            }
        )
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            async (payload) => {
                const order = payload.new;
                const oldOrder = payload.old;

                // Envoyer notification quand commande prête
                if (order.status === 'ready' && oldOrder.status !== 'ready') {
                    console.log('🎉 Commande prête !');
                    await sendReadyNotification(order);
                }
            }
        )
        .subscribe();

    console.log('👂 Écoute des commandes activée...');
}

// ===========================================
// Envoyer notification de nouvelle commande
// ===========================================
async function sendOrderNotification(order) {
    try {
        // Formater le numéro de téléphone (33612345678 format)
        let phone = order.customer_phone || '';
        phone = phone.replace(/\s+/g, '').replace(/^0/, '33').replace(/^\+/, '');

        if (!phone || phone.length < 10) {
            console.log('⚠️ Numéro invalide:', order.customer_phone);
            return;
        }

        // Build detailed items list
        const items = order.items || [];
        let itemsList = '';

        items.forEach(item => {
            const qty = item.quantity || 1;
            const name = item.name || item.item?.name || 'Produit';
            const price = item.totalPrice || item.price || 0;

            itemsList += `\n  ${qty}x ${name}`;
            if (price) itemsList += ` - ${price.toFixed(2)} EUR`;

            // Get customizations
            const customization = item.customization || {};
            const details = [];

            // Check if this is a pizza
            const itemCategory = (item.category || item.item?.category || '').toLowerCase();
            const isPizza = itemCategory.includes('pizza');

            // Size - MEGA in bold - ONLY FOR PIZZAS
            if (isPizza && customization.size && customization.size.toLowerCase() !== 'none') {
                if (customization.size.toUpperCase() === 'MEGA') {
                    details.push('*MEGA*');
                } else {
                    details.push(customization.size.toUpperCase());
                }
            }

            // Base sauce removed - not needed

            // Meats (Viandes)
            if (customization.meats?.length) {
                details.push(`Viandes: ${customization.meats.join(', ')}`);
            } else if (customization.meat) {
                details.push(`Viande: ${customization.meat}`);
            }

            // Sauces
            if (customization.sauces?.length) {
                details.push(`Sauces: ${customization.sauces.join(', ')}`);
            }

            // Garnitures
            if (customization.garnitures?.length) {
                details.push(`Garnitures: ${customization.garnitures.join(', ')}`);
            }

            // Supplements
            if (customization.supplements?.length) {
                details.push(`Supplements: ${customization.supplements.join(', ')}`);
            }

            // Menu option
            if (customization.menuOption && customization.menuOption.toLowerCase() !== 'none') {
                details.push(`Menu: ${customization.menuOption}`);
            }

            // Add details if any
            if (details.length > 0) {
                itemsList += `\n     (${details.join(' | ')})`;
            }

            // Item note
            const note = item.note || customization.note;
            if (note) {
                itemsList += `\n     Note: ${note}`;
            }
        });

        // Order type in French
        const orderType = order.order_type === 'livraison' ? 'Livraison'
            : order.order_type === 'emporter' ? 'A emporter'
                : 'Sur place';

        // Portal URL
        const portalUrl = `https://twinpizza.fr/ticket?phone=${phone}`;

        // Build FULL message
        let message = `*TWIN PIZZA*
================================

Bonjour ${order.customer_name || 'Client'} !

Votre commande *${order.order_number}* est confirmee.

--------------------------------
*VOTRE COMMANDE :*
${itemsList || '  (aucun article)'}

--------------------------------
*RECAPITULATIF :*
- Mode : *${orderType}*
- Total : *${order.total?.toFixed(2) || '0.00'} EUR*
- Delai estime : *15 a 25 minutes*`;

        // Add address for delivery
        if (order.order_type === 'livraison' && order.customer_address) {
            message += `\n- Adresse : ${order.customer_address}`;
        }

        // Add customer notes if any
        if (order.customer_notes) {
            message += `\n- Note : ${order.customer_notes}`;
        }

        message += `

--------------------------------
Suivez votre commande :
${portalUrl}

Merci pour votre confiance !
*TWIN PIZZA*`;

        // Envoyer le message
        const chatId = phone + '@c.us';
        await client.sendMessage(chatId, message);

        console.log(`✅ Message complet envoyé à ${phone}`);

    } catch (error) {
        console.error('❌ Erreur envoi message:', error.message);
    }
}

// ===========================================
// Envoyer notification commande prête
// ===========================================
async function sendReadyNotification(order) {
    try {
        let phone = order.customer_phone || '';
        phone = phone.replace(/\s+/g, '').replace(/^0/, '33').replace(/^\+/, '');

        if (!phone || phone.length < 10) {
            return;
        }

        const message = `🎉 *TWIN PIZZA - Commande Prête !*

Bonjour ${order.customer_name || 'Client'} !

✅ Votre commande *${order.order_number}* est *PRÊTE* !

${order.order_type === 'livraison'
                ? '🚗 Notre livreur arrive bientôt !'
                : '📍 Venez la récupérer au restaurant !'}

À très vite ! 🍕`;

        const chatId = phone + '@c.us';
        await client.sendMessage(chatId, message);

        console.log(`✅ Message "Prête" envoyé à ${phone}`);

    } catch (error) {
        console.error('❌ Erreur envoi:', error.message);
    }
}

// ===========================================
// Démarrer le bot
// ===========================================
console.log('🚀 Démarrage du bot...\n');
client.initialize();
