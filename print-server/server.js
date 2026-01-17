import { createClient } from '@supabase/supabase-js';
import { Socket } from 'net';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.200';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const SETTINGS_REFRESH_INTERVAL = 60000; // Refresh settings every 60 seconds

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
    // Set Code Page 1252 (Western European) for French characters
    SET_CODEPAGE_1252: ESC + 't' + '\x10',  // Code page 1252
    SET_CODEPAGE_858: ESC + 't' + '\x13',   // Code page 858 (Multilingual Latin I)
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
    LINE_42: '-'.repeat(42) + '\n',
    LINE_32: '-'.repeat(32) + '\n',
    DOUBLE_LINE_42: '='.repeat(42) + '\n',
    DOUBLE_LINE_32: '='.repeat(32) + '\n',
};

// Convert French accented characters to Code Page 1252 bytes
function convertToCP1252(text) {
    if (!text) return '';

    // Map of UTF-8 characters to their CP1252 equivalents
    const charMap = {
        'é': '\xE9', 'è': '\xE8', 'ê': '\xEA', 'ë': '\xEB',
        'à': '\xE0', 'â': '\xE2', 'ä': '\xE4',
        'ù': '\xF9', 'û': '\xFB', 'ü': '\xFC',
        'ô': '\xF4', 'ö': '\xF6',
        'î': '\xEE', 'ï': '\xEF',
        'ç': '\xE7',
        'É': '\xC9', 'È': '\xC8', 'Ê': '\xCA', 'Ë': '\xCB',
        'À': '\xC0', 'Â': '\xC2', 'Ä': '\xC4',
        'Ù': '\xD9', 'Û': '\xDB', 'Ü': '\xDC',
        'Ô': '\xD4', 'Ö': '\xD6',
        'Î': '\xCE', 'Ï': '\xCF',
        'Ç': '\xC7',
        '€': '\x80',
        '°': '\xB0',
        '«': '\xAB', '»': '\xBB',
        '–': '-', '—': '-',
        '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
        '\u2026': '...',
        // Emoji replacements (thermal printers don't support emoji)
        '🍕': '[PIZZA]', '🥩': '', '🍯': '', '🥗': '', '➕': '+',
        '📝': '*', '📏': '', '⏰': '', '🖨️': '', '✅': '[OK]', '❌': '[X]',
        '🔌': '', '📡': '', '📥': '', '📦': '', '👋': '', '👂': '',
    };

    let result = '';
    for (const char of text) {
        result += charMap[char] !== undefined ? charMap[char] : char;
    }
    return result;
}

// Default ticket settings (fallback if database unavailable)
const defaultSettings = {
    kitchenTemplate: {
        header: 'TWIN PIZZA - CUISINE',
        subheader: '',
        footer: '',
        showOrderNumber: true,
        showDateTime: true,
        showCustomerInfo: true,
        showCustomerPhone: false,
        showDeliveryAddress: true,
        showItemDetails: true,
        showItemNotes: true,
        showPaymentMethod: false,
        showPaymentStatus: true,
        showSubtotal: false,
        showTva: false,
        showDeliveryFee: false,
        showTotal: false,
        showCustomerNotes: true,
        showScheduledTime: true,
    },
    counterTemplate: {
        header: 'TWIN PIZZA',
        subheader: 'Grand-Couronne\n02 32 11 26 13',
        footer: 'Merci de votre visite!',
        showOrderNumber: true,
        showDateTime: true,
        showCustomerInfo: true,
        showCustomerPhone: true,
        showDeliveryAddress: true,
        showItemDetails: true,
        showItemNotes: true,
        showPaymentMethod: true,
        showPaymentStatus: true,
        showSubtotal: true,
        showTva: true,
        showDeliveryFee: true,
        showTotal: true,
        showCustomerNotes: true,
        showScheduledTime: true,
    },
    activeTemplate: 'counter',
    paperWidth: '80mm',
    fontSize: 'medium'
};

// Current settings (loaded from database)
let ticketSettings = { ...defaultSettings };

// Track printed orders to avoid duplicates - persist to file
const PRINTED_ORDERS_FILE = join(__dirname, 'printed_orders.json');

// Load printed orders from file
function loadPrintedOrders() {
    try {
        if (existsSync(PRINTED_ORDERS_FILE)) {
            const data = JSON.parse(readFileSync(PRINTED_ORDERS_FILE, 'utf8'));
            // Only keep orders from last 24 hours
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentOrders = data.filter(entry => entry.timestamp > oneDayAgo);
            console.log(`📋 Loaded ${recentOrders.length} printed orders from cache`);
            return new Map(recentOrders.map(e => [e.id, e.timestamp]));
        }
    } catch (err) {
        console.log('⚠️ Could not load printed orders cache:', err.message);
    }
    return new Map();
}

// Save printed orders to file
function savePrintedOrders() {
    try {
        const data = Array.from(printedOrders.entries()).map(([id, timestamp]) => ({ id, timestamp }));
        writeFileSync(PRINTED_ORDERS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('⚠️ Could not save printed orders cache:', err.message);
    }
}

const printedOrders = loadPrintedOrders();

// Fetch ticket settings from Supabase
async function fetchTicketSettings() {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('setting_value')
            .eq('setting_key', 'ticket_templates')
            .single();

        if (error) {
            console.log('⚠️ Using default ticket settings (database fetch failed):', error.message);
            return;
        }

        if (data?.setting_value) {
            const savedSettings = data.setting_value;
            ticketSettings = {
                ...defaultSettings,
                ...savedSettings,
                kitchenTemplate: { ...defaultSettings.kitchenTemplate, ...(savedSettings.kitchenTemplate || {}) },
                counterTemplate: { ...defaultSettings.counterTemplate, ...(savedSettings.counterTemplate || {}) }
            };
            console.log('✅ Ticket settings loaded from database:');
            console.log('   Header:', ticketSettings.counterTemplate.header);
            console.log('   Subheader:', ticketSettings.counterTemplate.subheader);
            console.log('   Footer:', ticketSettings.counterTemplate.footer);
            console.log('   Paper width:', ticketSettings.paperWidth);
            console.log('   Active template:', ticketSettings.activeTemplate);
        } else {
            console.log('⚠️ No ticket_templates found in database, using defaults');
        }
    } catch (err) {
        console.log('⚠️ Using default ticket settings:', err.message);
    }
}

// Get line separator based on paper width
function getLine() {
    return ticketSettings.paperWidth === '58mm' ? ESCPOS.LINE_32 : ESCPOS.LINE_42;
}

// Get the active template
function getActiveTemplate() {
    return ticketSettings.activeTemplate === 'kitchen'
        ? ticketSettings.kitchenTemplate
        : ticketSettings.counterTemplate;
}

// Format order for ESC/POS printing using database settings
function formatOrderForPrint(order) {
    const template = getActiveTemplate();
    const LINE = getLine();
    let ticket = '';

    // Initialize printer and set code page for French characters
    ticket += ESCPOS.INIT;
    ticket += ESCPOS.SET_CODEPAGE_1252;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += template.header + '\n';
    ticket += ESCPOS.NORMAL_SIZE;

    if (template.subheader) {
        ticket += template.subheader.replace(/\\n/g, '\n') + '\n';
    }

    ticket += ESCPOS.BOLD_OFF;
    ticket += LINE;

    // Order number (bold, centered)
    if (template.showOrderNumber) {
        ticket += ESCPOS.BOLD_ON;
        ticket += `N. ${order.order_number}\n`;
        ticket += ESCPOS.BOLD_OFF;
    }

    // Date/time
    if (template.showDateTime) {
        const orderDate = new Date(order.created_at);
        ticket += orderDate.toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }) + '\n';
    }

    ticket += LINE;

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
    if (template.showScheduledTime && order.is_scheduled && order.scheduled_for) {
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

    ticket += LINE;

    // Customer info
    ticket += ESCPOS.LEFT;

    if (template.showCustomerInfo) {
        ticket += ESCPOS.BOLD_ON;
        ticket += 'Client: ' + order.customer_name + '\n';
        ticket += ESCPOS.BOLD_OFF;
    }

    if (template.showCustomerPhone && order.customer_phone) {
        ticket += 'Tél: ' + order.customer_phone + '\n';
    }

    if (template.showDeliveryAddress && order.customer_address) {
        ticket += 'Adresse: ' + order.customer_address + '\n';
    }

    if (template.showCustomerNotes && order.customer_notes) {
        ticket += '\n';
        ticket += ESCPOS.BOLD_ON;
        ticket += '📝 Note: ';
        ticket += ESCPOS.BOLD_OFF;
        ticket += order.customer_notes + '\n';
    }

    ticket += LINE;

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

        if (template.showItemDetails) {
            ticket += ` - ${price.toFixed(2)}€`;
        }
        ticket += '\n';

        // Customization details
        if (template.showItemDetails) {
            const customization = cartItem.customization;
            if (customization) {
                const details = [];

                // Size is NOT shown - it's already in product name
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

                if (details.length > 0) {
                    ticket += `   ${details.join(' | ')}\n`;
                }
            }
        }

        // Item notes
        if (template.showItemNotes && cartItem.customization?.note) {
            ticket += `   📝 ${cartItem.customization.note}\n`;
        }
    });

    ticket += LINE;

    // Totals
    ticket += ESCPOS.RIGHT;

    if (template.showSubtotal) {
        ticket += `Sous-total: ${order.subtotal.toFixed(2)}€\n`;
    }

    if (template.showTva) {
        ticket += `TVA (10%): ${order.tva.toFixed(2)}€\n`;
    }

    if (template.showDeliveryFee && order.delivery_fee > 0) {
        ticket += `Livraison: ${order.delivery_fee.toFixed(2)}€\n`;
    }

    if (template.showTotal) {
        ticket += ESCPOS.DOUBLE_HEIGHT;
        ticket += ESCPOS.BOLD_ON;
        ticket += `TOTAL: ${order.total.toFixed(2)}€\n`;
        ticket += ESCPOS.NORMAL_SIZE;
        ticket += ESCPOS.BOLD_OFF;
    }

    ticket += ESCPOS.CENTER;
    ticket += '\n';

    // Payment status
    if (template.showPaymentMethod || template.showPaymentStatus) {
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
    }

    ticket += LINE;

    // Stamp Card Section (if loyalty info available from order)
    // Note: This would need loyalty info to be passed with the order
    // For now, we add a loyalty reminder
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'CARTE FIDELITE\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += 'Achetez 9 produits\n';
    ticket += '= 10ème GRATUIT (10€)!\n';
    ticket += LINE;

    // Footer
    if (template.footer) {
        ticket += template.footer.replace(/\\n/g, '\n');
    }
    ticket += '\n\n';
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    // Convert all text to CP1252 encoding for proper French character display
    return convertToCP1252(ticket);
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

    console.log(`${'='.repeat(50)}\n`);

    // Fetch loyalty info
    let loyaltyText = '';
    try {
        if (order.customer_phone) {
            const { data: customer } = await supabase
                .from('loyalty_customers')
                .select('points')
                .eq('phone', order.customer_phone)
                .single();

            if (customer) {
                const points = customer.points;
                const pointsNeeded = 9;

                if (points >= pointsNeeded) {
                    loyaltyText = '\n' + ESCPOS.CENTER + ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT +
                        '*** 10eme OFFERTE ! ***\n(Valeur 10 EUR)\n' +
                        ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF +
                        `Solde: ${points} Tampons\n`;
                } else {
                    loyaltyText = '\n' + ESCPOS.CENTER + ESCPOS.BOLD_ON +
                        `FIDELITE: ${points}/${pointsNeeded}\n` +
                        ESCPOS.BOLD_OFF +
                        `Plus que ${pointsNeeded - points} pour la gratuite!\n`;
                }
            }
        }
    } catch (err) {
        console.error('Error fetching loyalty for ticket:', err.message);
    }

    // Format and print
    let ticketData = formatOrderForPrint(order);

    // Inject loyalty text before the cut/footer if we have it
    // We append it before the final cut command
    if (loyaltyText) {
        // Remove the final cut command from original ticket
        // This is a bit hacky but avoids rewriting the whole format function immediately
        // Better approach: Modify formatOrderForPrint to accept an optional footer text
        // For now, let's just append it before the very end
        const cutIndex = ticketData.lastIndexOf(ESCPOS.PARTIAL_CUT);
        if (cutIndex !== -1) {
            ticketData = ticketData.substring(0, cutIndex) +
                ESCPOS.CENTER + '--------------------------------\n' +
                loyaltyText +
                '\n\n' +
                ESCPOS.PARTIAL_CUT;
        }
    }

    const success = await printWithRetry(ticketData, order.order_number);

    if (success) {
        // Use Map.set() with timestamp
        printedOrders.set(order.id, Date.now());
        // Save to file for persistence
        savePrintedOrders();
        console.log(`✅ Order ${order.order_number} saved to printed cache`);
    }
}

// Start the print server
let channel = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;
const HEARTBEAT_INTERVAL = 30000; // Check connection every 30 seconds

async function setupRealtimeSubscription() {
    // Remove existing channel if any
    if (channel) {
        await supabase.removeChannel(channel);
    }

    // Subscribe to new orders via real-time
    channel = supabase
        .channel('orders-print-' + Date.now()) //  Unique channel name to force new connection
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'orders'
            },
            (payload) => {
                console.log('📥 Received new order event');
                reconnectAttempts = 0; // Reset on successful event
                handleNewOrder(payload.new);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to Supabase real-time!');
                console.log('👂 Listening for new orders...\n');
                reconnectAttempts = 0;
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                console.error(`❌ Channel status: ${status}`);
                handleDisconnect();
            } else if (status === 'TIMED_OUT') {
                console.error('⏰ Connection timed out');
                handleDisconnect();
            }
        });
}

async function handleDisconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting...`);
        process.exit(1);
    }

    reconnectAttempts++;
    console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    setTimeout(async () => {
        await setupRealtimeSubscription();
    }, RECONNECT_DELAY);
}

// Heartbeat to check connection
function startHeartbeat() {
    setInterval(async () => {
        try {
            // Simple query to test connection
            const { error } = await supabase.from('orders').select('id').limit(1);
            if (error) {
                console.error('💔 Heartbeat failed:', error.message);
                handleDisconnect();
            } else {
                const now = new Date().toLocaleTimeString('fr-FR');
                console.log(`💚 Heartbeat OK - ${now}`);
            }
        } catch (err) {
            console.error('💔 Heartbeat error:', err.message);
            handleDisconnect();
        }
    }, HEARTBEAT_INTERVAL);
}

async function startServer() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║           🍕 TWIN PIZZA PRINT SERVER 🍕               ║
╠════════════════════════════════════════════════════════╣
║  Printer: ${PRINTER_IP.padEnd(15)} Port: ${PRINTER_PORT.toString().padEnd(6)}       ║
║  Loading settings from database...                     ║
║  Auto-reconnect: ENABLED                               ║
║  Heartbeat: Every ${HEARTBEAT_INTERVAL / 1000}s                                  ║
╚════════════════════════════════════════════════════════╝
`);

    // Fetch initial settings
    await fetchTicketSettings();
    console.log(`📋 Active template: ${ticketSettings.activeTemplate}`);
    console.log(`📏 Paper width: ${ticketSettings.paperWidth}`);
    console.log(`🔤 Font size: ${ticketSettings.fontSize}`);

    // Refresh settings periodically
    setInterval(async () => {
        await fetchTicketSettings();
    }, SETTINGS_REFRESH_INTERVAL);

    // Setup realtime subscription
    await setupRealtimeSubscription();

    // Start heartbeat monitoring
    startHeartbeat();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down print server...');
        if (channel) {
            await supabase.removeChannel(channel);
        }
        process.exit(0);
    });
}

// Run the server
startServer().catch(console.error);
