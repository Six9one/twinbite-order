import { createClient } from '@supabase/supabase-js';
import { Socket } from 'net';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import express from 'express';
import cors from 'cors';

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
            timeStyle: 'short',
            timeZone: 'Europe/Paris'
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
            minute: '2-digit',
            timeZone: 'Europe/Paris'
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

    // Pizza Credits Section (if any)
    const pizzaCreditsSaved = order.pizza_credits_saved || 0;
    const pizzaCreditsRemaining = order.pizza_credits_remaining || 0;
    if (pizzaCreditsSaved > 0 || pizzaCreditsRemaining > 0) {
        ticket += ESCPOS.CENTER;
        ticket += ESCPOS.BOLD_ON;
        ticket += '*** PIZZAS EN RESERVE ***\n';
        ticket += ESCPOS.BOLD_OFF;
        if (pizzaCreditsSaved > 0) {
            ticket += `Pizza sauvegardee: ${pizzaCreditsSaved}\n`;
        }
        if (pizzaCreditsRemaining > 0) {
            ticket += ESCPOS.BOLD_ON;
            ticket += `TOTAL EN RESERVE: ${pizzaCreditsRemaining}\n`;
            ticket += ESCPOS.BOLD_OFF;
        }
        ticket += 'Valable sans limite de temps!\n';
        ticket += LINE;
    }

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
        // Mark as printed in database
        await markOrderPrinted(order.id);
        console.log(`✅ Order ${order.order_number} saved to printed cache + DB`);
    } else {
        // Mark failed attempt in database
        await markPrintAttempt(order.id, 'Print failed after retries');
    }
}

// ============================================
// ORDER PROCESSING STATUS TRACKING
// ============================================

// Mark order as printed in database
async function markOrderPrinted(orderId) {
    try {
        const { error } = await supabase
            .from('order_processing_status')
            .upsert({
                order_id: orderId,
                printed: true,
                print_attempts: 1,
                last_print_attempt: new Date().toISOString()
            }, { onConflict: 'order_id' });

        if (error) {
            console.log('⚠️ Could not update print status in DB:', error.message);
        }
    } catch (err) {
        console.log('⚠️ DB update error:', err.message);
    }
}

// Mark failed print attempt
async function markPrintAttempt(orderId, errorMsg) {
    try {
        // First check if record exists
        const { data: existing } = await supabase
            .from('order_processing_status')
            .select('print_attempts')
            .eq('order_id', orderId)
            .single();

        const attempts = (existing?.print_attempts || 0) + 1;

        const { error } = await supabase
            .from('order_processing_status')
            .upsert({
                order_id: orderId,
                printed: false,
                print_attempts: attempts,
                last_print_attempt: new Date().toISOString(),
                print_error: errorMsg
            }, { onConflict: 'order_id' });

        if (error) {
            console.log('⚠️ Could not update print attempt in DB:', error.message);
        }
    } catch (err) {
        console.log('⚠️ DB update error:', err.message);
    }
}

// Recover and print ONLY orders explicitly marked as failed in the tracking table
// Orders without a tracking record are assumed to have been printed already (pre-tracking)
async function recoverMissedPrints() {
    console.log('\n🔄 ===== CHECKING FOR MISSED PRINTS =====');

    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // ONLY get orders explicitly marked as NOT printed in the tracking table
        const { data: failedRecords, error: statusError } = await supabase
            .from('order_processing_status')
            .select('order_id')
            .eq('printed', false)
            .gt('print_attempts', 0)
            .gte('last_print_attempt', oneHourAgo);

        if (statusError) {
            console.log('✅ No tracking table or error, skip recovery:', statusError.message);
            return { recovered: 0, failed: 0 };
        }

        if (!failedRecords || failedRecords.length === 0) {
            console.log('✅ No failed print attempts to recover!');
            return { recovered: 0, failed: 0 };
        }

        const orderIds = failedRecords.map(r => r.order_id);
        console.log(`\n⚠️ Found ${orderIds.length} order(s) with failed print attempts! Recovering...\n`);

        let recovered = 0;
        let failed = 0;

        for (const orderId of orderIds) {
            const { data: fullOrder, error: fetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (fetchError || !fullOrder) {
                console.error(`❌ Could not fetch order:`, fetchError?.message);
                failed++;
                continue;
            }

            console.log(`🔄 RECOVERING order #${fullOrder.order_number}...`);
            await handleNewOrder(fullOrder);
            recovered++;

            // Small delay between prints
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`\n✅ RECOVERY COMPLETE: ${recovered} printed, ${failed} failed\n`);
        return { recovered, failed };

    } catch (err) {
        console.error('❌ Recovery error:', err.message);
        return { recovered: 0, failed: 0 };
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

    // Subscribe to new orders AND HACCP print queue via real-time
    channel = supabase
        .channel('print-server-' + Date.now()) //  Unique channel name to force new connection
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
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'haccp_print_queue'
            },
            (payload) => {
                console.log('🧾 Received HACCP print job');
                reconnectAttempts = 0;
                handleHACCPPrint(payload.new);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Connected to Supabase real-time!');
                console.log('👂 Listening for orders + HACCP prints...\n');
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

// Handle HACCP print job from queue
async function handleHACCPPrint(job) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧾 HACCP PRINT: ${job.product_name}`);
    console.log(`   Category: ${job.category_name}`);
    console.log(`   DLC: ${job.dlc_date}`);
    console.log(`${'='.repeat(50)}\n`);

    // Detect date_label type from notes field
    let isDateLabel = false;
    try {
        if (job.notes) {
            const notes = JSON.parse(job.notes);
            isDateLabel = notes.type === 'date_label';
        }
    } catch (e) { /* notes not JSON, use default format */ }

    let ticketData;
    if (isDateLabel) {
        console.log('📋 Routing to date label format');
        ticketData = formatDateLabel({
            productName: job.product_name,
            actionLabel: job.action_label || 'Fait le',
            actionDate: job.action_date,
            useByDate: job.dlc_date,
            operator: job.operator,
        });
    } else {
        ticketData = formatHACCPTicket({
            productName: job.product_name,
            categoryName: job.category_name,
            categoryColor: job.category_color,
            actionDate: job.action_date,
            dlcDate: job.dlc_date,
            storageTemp: job.storage_temp,
            operator: job.operator,
            dlcHours: job.dlc_hours,
            actionLabel: job.action_label,
        });
    }

    const success = await printWithRetry(ticketData, `HACCP-${job.product_name}`);

    // Mark as printed
    if (success) {
        await supabase
            .from('haccp_print_queue')
            .update({ printed: true })
            .eq('id', job.id);
        console.log('✅ HACCP ticket printed successfully');
    }
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
                const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });
                console.log(`💚 Heartbeat OK - ${now}`);
            }
        } catch (err) {
            console.error('💔 Heartbeat error:', err.message);
            handleDisconnect();
        }
    }, HEARTBEAT_INTERVAL);
}

// ============================================
// HTTP SERVER FOR HACCP DIRECT PRINTING
// ============================================
const HTTP_PORT = process.env.HTTP_PORT || 3001;

// Format compact date label for ESC/POS printing
// Used for sticking on sauces, bottles, and kitchen items
function formatDateLabel(data) {
    const { productName, actionLabel, actionDate, useByDate, operator } = data;

    let ticket = '';

    // Initialize printer and set code page for French characters
    ticket += ESCPOS.INIT;
    ticket += ESCPOS.SET_CODEPAGE_1252;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'TWIN PIZZA\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Product name (large, bold)
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += productName + '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Action date ("Fait le" or "Ouvert le")
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.BOLD_ON;
    ticket += actionLabel + ': ';
    ticket += ESCPOS.BOLD_OFF;
    ticket += actionDate + '\n';
    ticket += '\n';

    // Use-by date (highlighted, large)
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.LINE_42;
    ticket += ESCPOS.BOLD_ON;
    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += 'A CONSOMMER AVANT LE\n';
    ticket += useByDate + '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Footer with operator
    ticket += ESCPOS.CENTER;
    ticket += 'Par: ' + operator + '\n';
    ticket += '\n';

    // Cut
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    return convertToCP1252(ticket);
}

// Format HACCP ticket for ESC/POS printing
function formatHACCPTicket(data) {
    const { productName, categoryName, categoryColor, actionDate, dlcDate, storageTemp, operator, dlcHours, actionLabel } = data;

    let ticket = '';

    // Initialize printer and set code page for French characters
    ticket += ESCPOS.INIT;
    ticket += ESCPOS.SET_CODEPAGE_1252;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'HACCP\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += 'TWIN PIZZA\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Category
    ticket += ESCPOS.BOLD_ON;
    ticket += categoryName + '\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Product name (large)
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += productName + '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Action date
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.LINE_42;
    ticket += actionLabel + ': ' + actionDate + '\n';
    ticket += '\n';

    // DLC (highlighted)
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON;
    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += '*** DATE LIMITE ***\n';
    ticket += dlcDate + '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += '(+' + dlcHours + ' heures)\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Storage temp
    ticket += ESCPOS.LEFT;
    ticket += 'Conservation: ' + storageTemp + '\n';
    ticket += '\n';

    // Rules
    ticket += ESCPOS.BOLD_ON;
    ticket += 'ETIQUETER - Frigo 0-3C\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Footer
    ticket += ESCPOS.CENTER;
    ticket += new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) + '\n';
    ticket += 'Operateur: ' + operator + '\n';
    ticket += '\n';

    // Cut
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    return convertToCP1252(ticket);
}

// Setup Express HTTP server
function setupHttpServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', printer: PRINTER_IP });
    });

    // HACCP print endpoint
    app.post('/print-haccp', async (req, res) => {
        console.log('\n📥 HACCP print request received');

        try {
            const data = req.body;

            if (!data.productName || !data.categoryName) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            console.log(`   Product: ${data.productName}`);
            console.log(`   Category: ${data.categoryName}`);

            const ticketData = formatHACCPTicket(data);
            const success = await printWithRetry(ticketData, `HACCP-${data.productName}`);

            if (success) {
                console.log('✅ HACCP ticket printed successfully');
                res.json({ success: true, message: 'Ticket printed' });
            } else {
                console.error('❌ Failed to print HACCP ticket');
                res.status(500).json({ error: 'Print failed after retries' });
            }
        } catch (error) {
            console.error('❌ HACCP print error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Date label print via GET (from HTTPS pages using window.open)
    app.get('/print-date-label', async (req, res) => {
        const { product, madeDate, useByDate, action, copies } = req.query;
        console.log(`\n📥 Date label GET request: ${product}`);

        if (!product || !madeDate || !useByDate) {
            return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Paramètres manquants</h2><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
        }

        try {
            const numCopies = Math.min(parseInt(copies) || 1, 10);
            const actionLabel = action === 'ouvert' ? 'Ouvert le' : 'Fait le';

            const ticketData = formatDateLabel({
                productName: decodeURIComponent(String(product)),
                actionLabel,
                actionDate: decodeURIComponent(String(madeDate)),
                useByDate: decodeURIComponent(String(useByDate)),
                operator: 'Staff',
            });

            let printed = 0;
            for (let i = 0; i < numCopies; i++) {
                const ok = await printWithRetry(ticketData, `LABEL-${product}-${i + 1}`);
                if (ok) printed++;
                if (i < numCopies - 1) await new Promise(r => setTimeout(r, 500));
            }

            if (printed > 0) {
                console.log(`✅ ${printed}/${numCopies} date label(s) printed`);
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>✅ ${printed}x étiquette${printed > 1 ? 's' : ''} imprimée${printed > 1 ? 's' : ''}!</h2><p>${decodeURIComponent(String(product))}</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            } else {
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur d'impression</h2><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
            }
        } catch (error) {
            console.error('❌ Date label GET error:', error.message);
            res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur</h2><p>${error.message}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }
    });

    // Reprint an order by order number (GET - used from HTTPS pages via window.open)
    app.get('/reprint/:orderNumber', async (req, res) => {
        const orderNumber = req.params.orderNumber;
        console.log(`\n📥 Reprint GET request for order #${orderNumber}`);

        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .order('created_at', { ascending: false })
                .limit(1);

            const order = orders?.[0];

            if (error || !order) {
                return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Commande ${orderNumber} non trouvée</h2><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            }

            const ticketData = formatOrderForPrint(order);
            const success = await printWithRetry(ticketData, orderNumber);

            if (success) {
                console.log(`✅ Order #${orderNumber} reprinted`);
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>✅ Commande ${orderNumber} imprimée!</h2><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            } else {
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur d'impression</h2><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
            }
        } catch (error) {
            console.error('❌ Reprint GET error:', error.message);
            res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur</h2><p>${error.message}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }
    });

    // Reprint an order by order number (POST)
    app.post('/reprint/:orderNumber', async (req, res) => {
        const orderNumber = req.params.orderNumber;
        console.log(`\n📥 Reprint request for order #${orderNumber}`);

        try {
            // Fetch order from Supabase
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .order('created_at', { ascending: false })
                .limit(1);

            const order = orders?.[0];

            if (error || !order) {
                console.error(`❌ Order #${orderNumber} not found:`, error?.message);
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log(`   Found: ${order.customer_name} - ${order.total}€`);

            // Format and print
            const ticketData = formatOrderForPrint(order);
            const success = await printWithRetry(ticketData, orderNumber);

            if (success) {
                console.log(`✅ Order #${orderNumber} reprinted successfully!`);
                res.json({ success: true, message: 'Order reprinted' });
            } else {
                console.error(`❌ Failed to reprint order #${orderNumber}`);
                res.status(500).json({ error: 'Print failed after retries' });
            }
        } catch (error) {
            console.error('❌ Reprint error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Print invoice via GET (used from HTTPS pages via window.open to bypass mixed content)
    app.get('/print-invoice/:orderNumber', async (req, res) => {
        const { orderNumber } = req.params;
        const invoiceDate = req.query.date || new Date().toISOString().slice(0, 10);
        console.log(`\n📥 Invoice GET request for order ${orderNumber}`);

        try {
            // Fetch order from Supabase
            const { data: order, error } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .single();

            if (error || !order) {
                console.error('❌ Order not found:', orderNumber);
                return res.send(`<html><body><h2>❌ Commande ${orderNumber} non trouvée</h2><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            }

            const invoiceNumber = `FA-${orderNumber}`;

            // Format and print (reuse the same logic)
            const LINE = ESCPOS.LINE_42;
            const TVA_RATE = 10;

            let ticket = '';
            ticket += ESCPOS.INIT;
            ticket += ESCPOS.SET_CODEPAGE_1252;

            ticket += ESCPOS.CENTER;
            ticket += ESCPOS.DOUBLE_SIZE;
            ticket += ESCPOS.BOLD_ON;
            ticket += 'FACTURE\n';
            ticket += ESCPOS.NORMAL_SIZE;
            ticket += ESCPOS.BOLD_OFF;
            ticket += '\n';

            ticket += ESCPOS.BOLD_ON;
            ticket += 'TWIN PIZZA\n';
            ticket += ESCPOS.BOLD_OFF;
            ticket += '60 Rue Georges Clemenceau\n';
            ticket += '76530 Grand-Couronne\n';
            ticket += 'Tel: 02 32 11 26 13\n';
            ticket += LINE;

            ticket += ESCPOS.LEFT;
            ticket += ESCPOS.BOLD_ON + 'SIRET: ' + ESCPOS.BOLD_OFF + '942 617 358 00018\n';
            ticket += ESCPOS.BOLD_ON + 'N° TVA: ' + ESCPOS.BOLD_OFF + 'FR28942617358\n';
            ticket += LINE;

            ticket += ESCPOS.BOLD_ON;
            ticket += `Facture: ${invoiceNumber}\n`;
            ticket += ESCPOS.BOLD_OFF;

            const dateStr = new Date(invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            ticket += `Date: ${dateStr}\n`;
            ticket += `Commande: ${orderNumber}\n`;
            ticket += LINE;

            ticket += ESCPOS.BOLD_ON + 'CLIENT:\n' + ESCPOS.BOLD_OFF;
            ticket += `${order.customer_name}\n`;
            if (order.customer_phone) ticket += `Tel: ${order.customer_phone}\n`;
            if (order.customer_address) ticket += `${order.customer_address}\n`;
            ticket += LINE;

            ticket += ESCPOS.BOLD_ON + 'ARTICLES:\n' + ESCPOS.BOLD_OFF;
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach((cartItem) => {
                const productName = cartItem.item?.name || cartItem.name || 'Produit';
                const quantity = cartItem.quantity || 1;
                const price = cartItem.totalPrice || cartItem.calculatedPrice || cartItem.price || 0;
                ticket += `${quantity}x ${productName} - ${Number(price).toFixed(2)}€\n`;
            });
            if (order.delivery_fee > 0) {
                ticket += `Frais de livraison - ${order.delivery_fee.toFixed(2)}€\n`;
            }
            ticket += LINE;

            ticket += ESCPOS.RIGHT;
            const totalHT = (order.subtotal / (1 + TVA_RATE / 100));
            const tva = order.subtotal - totalHT;
            ticket += `Total HT: ${totalHT.toFixed(2)}€\n`;
            ticket += `TVA (${TVA_RATE}%): ${tva.toFixed(2)}€\n`;
            ticket += ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON;
            ticket += `TOTAL TTC: ${order.total.toFixed(2)}€\n`;
            ticket += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

            ticket += ESCPOS.CENTER + '\n';
            const paymentLabels = { 'en_ligne': 'CB en ligne - PAYE', 'cb': 'Carte bancaire', 'especes': 'Especes' };
            ticket += `Paiement: ${paymentLabels[order.payment_method] || order.payment_method}\n`;
            ticket += LINE;
            ticket += ESCPOS.CENTER + '\n';
            ticket += 'Twin Pizza - Entreprise individuelle\n';
            ticket += 'SIRET: 942 617 358 00018\n';
            ticket += 'TVA: FR28942617358\n\n';
            ticket += ESCPOS.FEED + ESCPOS.PARTIAL_CUT;

            const ticketData = convertToCP1252(ticket);
            const success = await printWithRetry(ticketData, `INVOICE-${invoiceNumber}`);

            if (success) {
                console.log(`✅ Invoice ${invoiceNumber} printed`);
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>✅ Facture ${invoiceNumber} imprimée!</h2><p>Vous pouvez fermer cette fenêtre.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            } else {
                res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur d'impression</h2><p>Vérifiez l'imprimante.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
            }
        } catch (error) {
            console.error('❌ Invoice GET error:', error.message);
            res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Erreur</h2><p>${error.message}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }
    });

    // Print invoice/facture endpoint (POST - for local use)
    app.post('/print-invoice', async (req, res) => {
        console.log('\n📥 Invoice print request received');

        try {
            const { order, invoiceDate, invoiceNumber } = req.body;

            if (!order || !invoiceNumber) {
                return res.status(400).json({ error: 'Missing required fields (order, invoiceNumber)' });
            }

            console.log(`   Invoice: ${invoiceNumber}`);
            console.log(`   Order: ${order.order_number}`);
            console.log(`   Date: ${invoiceDate}`);

            // Format invoice for thermal printer
            const LINE = ESCPOS.LINE_42;
            const TVA_RATE = 10;

            let ticket = '';
            ticket += ESCPOS.INIT;
            ticket += ESCPOS.SET_CODEPAGE_1252;

            // Header
            ticket += ESCPOS.CENTER;
            ticket += ESCPOS.DOUBLE_SIZE;
            ticket += ESCPOS.BOLD_ON;
            ticket += 'FACTURE\n';
            ticket += ESCPOS.NORMAL_SIZE;
            ticket += ESCPOS.BOLD_OFF;
            ticket += '\n';

            // Company info
            ticket += ESCPOS.BOLD_ON;
            ticket += 'TWIN PIZZA\n';
            ticket += ESCPOS.BOLD_OFF;
            ticket += '60 Rue Georges Clemenceau\n';
            ticket += '76530 Grand-Couronne\n';
            ticket += 'Tel: 02 32 11 26 13\n';
            ticket += LINE;

            // Legal numbers
            ticket += ESCPOS.LEFT;
            ticket += ESCPOS.BOLD_ON;
            ticket += 'SIRET: ';
            ticket += ESCPOS.BOLD_OFF;
            ticket += '942 617 358 00018\n';
            ticket += ESCPOS.BOLD_ON;
            ticket += 'N° TVA: ';
            ticket += ESCPOS.BOLD_OFF;
            ticket += 'FR28942617358\n';
            ticket += LINE;

            // Invoice info
            ticket += ESCPOS.BOLD_ON;
            ticket += `Facture: ${invoiceNumber}\n`;
            ticket += ESCPOS.BOLD_OFF;

            // Format the invoice date
            const dateStr = invoiceDate
                ? new Date(invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            ticket += `Date: ${dateStr}\n`;
            ticket += `Commande: ${order.order_number}\n`;
            ticket += LINE;

            // Client info
            ticket += ESCPOS.BOLD_ON;
            ticket += 'CLIENT:\n';
            ticket += ESCPOS.BOLD_OFF;
            ticket += `${order.customer_name}\n`;
            if (order.customer_phone) ticket += `Tel: ${order.customer_phone}\n`;
            if (order.customer_address) ticket += `${order.customer_address}\n`;
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

                ticket += `${quantity}x ${productName}`;
                ticket += ` - ${Number(price).toFixed(2)}€\n`;
            });

            if (order.delivery_fee > 0) {
                ticket += `Frais de livraison - ${order.delivery_fee.toFixed(2)}€\n`;
            }

            ticket += LINE;

            // Totals
            ticket += ESCPOS.RIGHT;
            const totalHT = (order.subtotal / (1 + TVA_RATE / 100));
            const tva = order.subtotal - totalHT;

            ticket += `Total HT: ${totalHT.toFixed(2)}€\n`;
            ticket += `TVA (${TVA_RATE}%): ${tva.toFixed(2)}€\n`;

            ticket += ESCPOS.DOUBLE_HEIGHT;
            ticket += ESCPOS.BOLD_ON;
            ticket += `TOTAL TTC: ${order.total.toFixed(2)}€\n`;
            ticket += ESCPOS.NORMAL_SIZE;
            ticket += ESCPOS.BOLD_OFF;

            ticket += ESCPOS.CENTER;
            ticket += '\n';

            // Payment method
            const paymentLabels = {
                'en_ligne': 'Carte bancaire (en ligne) - PAYE',
                'cb': 'Carte bancaire',
                'especes': 'Especes'
            };
            ticket += `Paiement: ${paymentLabels[order.payment_method] || order.payment_method}\n`;
            ticket += LINE;

            // Footer
            ticket += ESCPOS.CENTER;
            ticket += '\n';
            ticket += 'Twin Pizza - Entreprise individuelle\n';
            ticket += 'SIRET: 942 617 358 00018\n';
            ticket += 'TVA: FR28942617358\n';
            ticket += '\n';

            ticket += ESCPOS.FEED;
            ticket += ESCPOS.PARTIAL_CUT;

            const ticketData = convertToCP1252(ticket);
            const success = await printWithRetry(ticketData, `INVOICE-${invoiceNumber}`);

            if (success) {
                console.log(`✅ Invoice ${invoiceNumber} printed successfully`);
                res.json({ success: true, message: 'Invoice printed' });
            } else {
                console.error(`❌ Failed to print invoice ${invoiceNumber}`);
                res.status(500).json({ error: 'Print failed after retries' });
            }
        } catch (error) {
            console.error('❌ Invoice print error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // Recovery endpoint - print all missed orders
    app.post('/recover-prints', async (req, res) => {
        console.log('\n📥 Recovery request received');
        try {
            const result = await recoverMissedPrints();
            res.json({
                success: true,
                message: `Recovered ${result.recovered} orders, ${result.failed} failed`,
                ...result
            });
        } catch (error) {
            console.error('❌ Recovery endpoint error:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    app.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`🌐 HTTP server listening on port ${HTTP_PORT}`);
        console.log(`   HACCP endpoint: http://localhost:${HTTP_PORT}/print-haccp`);
        console.log(`   Date labels: http://localhost:${HTTP_PORT}/print-date-label`);
        console.log(`   Reprint endpoint: POST http://localhost:${HTTP_PORT}/reprint/:orderNumber`);
        console.log(`   Invoice endpoint: POST http://localhost:${HTTP_PORT}/print-invoice`);
        console.log(`   Recovery endpoint: POST http://localhost:${HTTP_PORT}/recover-prints`);
    });
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

    // Start HTTP server for HACCP printing
    setupHttpServer();

    // 🔄 RECOVERY: Check for missed prints on startup
    console.log('\n🔄 Running startup recovery check...');
    setTimeout(async () => {
        await recoverMissedPrints();
    }, 5000); // Wait 5s for system to stabilize

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

