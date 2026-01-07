import { createClient } from '@supabase/supabase-js';
import { Socket } from 'net';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PRINTER_IP = process.env.PRINTER_IP || '192.168.123.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';
const ESCPOS = {
    INIT: ESC + '@',
    CENTER: ESC + 'a' + '\x01',
    LEFT: ESC + 'a' + '\x00',
    RIGHT: ESC + 'a' + '\x02',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    DOUBLE_HEIGHT: GS + '!' + '\x10',
    DOUBLE_WIDTH: GS + '!' + '\x20',
    DOUBLE_SIZE: GS + '!' + '\x30',
    NORMAL_SIZE: GS + '!' + '\x00',
    UNDERLINE_ON: ESC + '-' + '\x01',
    UNDERLINE_OFF: ESC + '-' + '\x00',
    CUT: GS + 'V' + '\x00',
    PARTIAL_CUT: GS + 'V' + '\x01',
    FEED: ESC + 'd' + '\x03',
    LINE: '-'.repeat(42) + '\n',
    DOUBLE_LINE: '='.repeat(42) + '\n',
};

// Track printed orders to avoid duplicates
const printedOrders = new Set();

// Format order for ESC/POS printing
function formatOrderForPrint(order) {
    let ticket = '';

    // Initialize printer
    ticket += ESCPOS.INIT;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'TWIN PIZZA\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += 'Grand-Couronne\n';
    ticket += '02 32 11 26 13\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE;

    // Order number (large, centered)
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += `N° ${order.order_number}\n`;
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    // Date/time
    const orderDate = new Date(order.created_at);
    ticket += orderDate.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }) + '\n';

    ticket += ESCPOS.LINE;

    // Order type (highlighted)
    const orderTypeLabels = {
        livraison: 'LIVRAISON',
        emporter: 'À EMPORTER',
        surplace: 'SUR PLACE'
    };
    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += ESCPOS.BOLD_ON;
    ticket += orderTypeLabels[order.order_type] || order.order_type.toUpperCase();
    ticket += '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    // Scheduled order info
    if (order.is_scheduled && order.scheduled_for) {
        const scheduledDate = new Date(order.scheduled_for);
        ticket += ESCPOS.BOLD_ON;
        ticket += '\n⏰ PROGRAMMÉE POUR:\n';
        ticket += scheduledDate.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) + '\n';
        ticket += ESCPOS.BOLD_OFF;
    }

    ticket += ESCPOS.LINE;

    // Customer info
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'Client: ' + order.customer_name + '\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += 'Tél: ' + (order.customer_phone || '') + '\n';

    if (order.customer_address) {
        ticket += 'Adresse: ' + order.customer_address + '\n';
    }

    if (order.customer_notes) {
        ticket += '\n';
        ticket += ESCPOS.BOLD_ON;
        ticket += '📝 Note: ';
        ticket += ESCPOS.BOLD_OFF;
        ticket += order.customer_notes + '\n';
    }

    ticket += ESCPOS.LINE;

    // Items
    ticket += ESCPOS.BOLD_ON;
    ticket += 'ARTICLES:\n';
    ticket += ESCPOS.BOLD_OFF;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((cartItem) => {
        const productName = cartItem.item?.name || cartItem.name || 'Produit';
        const quantity = cartItem.quantity || 1;
        const price = cartItem.totalPrice || cartItem.calculatedPrice || cartItem.price || 0;

        ticket += ESCPOS.BOLD_ON;
        ticket += `${quantity}x ${productName}`;
        ticket += ESCPOS.BOLD_OFF;
        ticket += ` - ${price.toFixed(2)}€\n`;

        // Customization details
        const customization = cartItem.customization;
        if (customization) {
            const details = [];

            if (customization.size) {
                details.push(`📏 ${customization.size.toUpperCase()}`);
            }
            if (customization.base) {
                details.push(`Base ${customization.base}`);
            }
            if (customization.meats?.length) {
                details.push(`🥩 ${customization.meats.join(', ')}`);
            }
            if (customization.meat) {
                details.push(`🥩 ${customization.meat}`);
            }
            if (customization.sauces?.length) {
                details.push(`🍯 ${customization.sauces.join(', ')}`);
            }
            if (customization.sauce) {
                details.push(`🍯 ${customization.sauce}`);
            }
            if (customization.garnitures?.length) {
                details.push(`🥗 ${customization.garnitures.join(', ')}`);
            }
            if (customization.supplements?.length) {
                details.push(`➕ ${customization.supplements.join(', ')}`);
            }
            if (customization.menuOption && customization.menuOption !== 'none') {
                const menuLabels = {
                    'frites': '+Frites',
                    'boisson': '+Boisson',
                    'menu': '+Menu'
                };
                details.push(menuLabels[customization.menuOption] || customization.menuOption);
            }
            if (customization.note) {
                details.push(`📝 ${customization.note}`);
            }

            if (details.length > 0) {
                ticket += `   ${details.join(' | ')}\n`;
            }
        }
    });

    ticket += ESCPOS.LINE;

    // Totals
    ticket += ESCPOS.RIGHT;
    ticket += `Sous-total: ${order.subtotal.toFixed(2)}€\n`;
    ticket += `TVA (10%): ${order.tva.toFixed(2)}€\n`;
    if (order.delivery_fee > 0) {
        ticket += `Livraison: ${order.delivery_fee.toFixed(2)}€\n`;
    }

    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += ESCPOS.BOLD_ON;
    ticket += `TOTAL: ${order.total.toFixed(2)}€\n`;
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    ticket += ESCPOS.CENTER;
    ticket += '\n';

    // Payment status
    const paymentLabels = {
        'en_ligne': { label: 'PAYÉE ✓', paid: true },
        'cb': { label: 'CB (À PAYER)', paid: false },
        'especes': { label: 'ESPÈCES (À PAYER)', paid: false }
    };
    const payment = paymentLabels[order.payment_method] || { label: order.payment_method, paid: false };

    if (payment.paid) {
        ticket += ESCPOS.BOLD_ON;
        ticket += '*** COMMANDE PAYÉE ***\n';
        ticket += ESCPOS.BOLD_OFF;
    } else {
        ticket += ESCPOS.DOUBLE_HEIGHT;
        ticket += ESCPOS.BOLD_ON;
        ticket += `À PAYER: ${payment.label}\n`;
        ticket += ESCPOS.NORMAL_SIZE;
        ticket += ESCPOS.BOLD_OFF;
    }

    ticket += ESCPOS.LINE;

    // Footer
    ticket += 'Merci de votre visite!';
    ticket += '\n\n';
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    return ticket;
}

// Send data to printer via TCP
function sendToPrinter(data) {
    return new Promise((resolve, reject) => {
        const socket = new Socket();

        socket.setTimeout(10000); // 10 second timeout

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        });

        socket.on('error', (err) => {
            reject(err);
        });

        socket.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log(`📡 Connected to printer at ${PRINTER_IP}:${PRINTER_PORT}`);
            socket.write(data, 'binary', () => {
                socket.end();
                resolve();
            });
        });

        socket.on('close', () => {
            console.log('🔌 Printer connection closed');
        });
    });
}

// Print with retry logic
async function printWithRetry(data, orderNumber) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🖨️  Print attempt ${attempt}/${MAX_RETRIES} for order ${orderNumber}...`);
            await sendToPrinter(data);
            console.log(`✅ Order ${orderNumber} printed successfully!`);
            return true;
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);

            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }

    console.error(`❌ Failed to print order ${orderNumber} after ${MAX_RETRIES} attempts`);
    return false;
}

// Handle new order
async function handleNewOrder(order) {
    // Skip if already printed
    if (printedOrders.has(order.id)) {
        console.log(`⏭️  Order ${order.order_number} already printed, skipping...`);
        return;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 NEW ORDER: ${order.order_number}`);
    console.log(`   Type: ${order.order_type}`);
    console.log(`   Client: ${order.customer_name}`);
    console.log(`   Total: ${order.total}€`);
    console.log(`${'='.repeat(50)}\n`);

    // Format and print
    const ticketData = formatOrderForPrint(order);
    const success = await printWithRetry(ticketData, order.order_number);

    if (success) {
        printedOrders.add(order.id);
    }
}

// Start the print server
async function startServer() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║           🍕 TWIN PIZZA PRINT SERVER 🍕               ║
╠════════════════════════════════════════════════════════╣
║  Printer: ${PRINTER_IP.padEnd(15)} Port: ${PRINTER_PORT.toString().padEnd(6)}       ║
║  Status: Waiting for orders...                         ║
╚════════════════════════════════════════════════════════╝
`);

    // Subscribe to new orders via real-time
    const channel = supabase
        .channel('orders-print')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'orders'
            },
            (payload) => {
                console.log('📥 Received new order event');
                handleNewOrder(payload.new);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to Supabase real-time!');
                console.log('👂 Listening for new orders...\n');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Failed to connect to Supabase real-time');
            }
        });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down print server...');
        await supabase.removeChannel(channel);
        process.exit(0);
    });
}

// Run the server
startServer().catch(console.error);
