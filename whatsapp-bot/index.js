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

        // Créer le message
        const items = order.items || [];
        const itemsList = items.map(item => `• ${item.quantity}x ${item.name}`).join('\n');

        const message = `🍕 *TWIN PIZZA - Commande Confirmée*

Bonjour ${order.customer_name || 'Client'} !

✅ Votre commande *N°${order.order_number}* est confirmée.

📋 *Votre commande:*
${itemsList}

💰 *Total:* ${order.total?.toFixed(2) || '0.00'}€
📍 *Type:* ${order.order_type === 'livraison' ? 'Livraison' : order.order_type === 'emporter' ? 'À emporter' : 'Sur place'}

Merci de votre confiance ! 🙏`;

        // Envoyer le message
        const chatId = phone + '@c.us';
        await client.sendMessage(chatId, message);

        console.log(`✅ Message envoyé à ${phone}`);

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

✅ Votre commande *N°${order.order_number}* est *PRÊTE* !

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
