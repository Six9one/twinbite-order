import { createClient } from '@supabase/supabase-js';
import { Socket } from 'net';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import express from 'express';
import cors from 'cors';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PRINTER_IPS = (process.env.PRINTER_IPS || process.env.PRINTER_IP || '192.168.1.1,192.168.1.200').split(',').map(ip => ip.trim()).filter(Boolean);
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const SETTINGS_REFRESH_INTERVAL = 300000; // Refresh settings every 5 minutes
const POLL_INTERVAL = 30000; // Poll for missed orders every 30 seconds
let lastEventReceivedAt = Date.now();

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

// Save printed orders to file (async — non-blocking)
async function savePrintedOrders() {
    try {
        const data = Array.from(printedOrders.entries()).map(([id, timestamp]) => ({ id, timestamp }));
        await writeFile(PRINTED_ORDERS_FILE, JSON.stringify(data, null, 2));
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

// ============================================
// KITCHEN TICKET — Bold, clean, easy to read
// Matches: order# + type, items bold, customizations indented
// ============================================
function formatKitchenTicket(order) {
    const LINE = getLine();
    let t = '';
    t += ESCPOS.INIT + ESCPOS.SET_CODEPAGE_1252;

    // Order number + type on same line (like the photo)
    const typeLabels = { livraison: 'LIVR', emporter: 'EMP', surplace: 'SUR PL' };
    const typeLabel = typeLabels[order.order_type] || order.order_type?.toUpperCase() || '';

    t += ESCPOS.CENTER + LINE;
    t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
    t += `Commande : ${order.order_number}`;
    // Right-align the type by padding
    const cmdText = `Commande : ${order.order_number}`;
    const pad = Math.max(1, 21 - cmdText.length);
    t += ' '.repeat(pad) + typeLabel + '\n';
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

    // Date/time
    const orderDate = new Date(order.created_at);
    t += orderDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }) + '\n';
    t += LINE;

    // Scheduled order
    if (order.is_scheduled && order.scheduled_for) {
        const sd = new Date(order.scheduled_for);
        t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
        t += 'PROGRAMMEE POUR:\n';
        t += sd.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + '\n';
        t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF + LINE;
    }

    // Customer (delivery only)
    if (order.order_type === 'livraison') {
        t += ESCPOS.LEFT + ESCPOS.BOLD_ON;
        t += 'Client: ' + order.customer_name + '\n';
        t += ESCPOS.BOLD_OFF;
        if (order.customer_phone) t += 'Tel: ' + order.customer_phone + '\n';
        if (order.customer_address) t += 'Adresse: ' + order.customer_address + '\n';
        t += LINE;
    }

    // Customer notes
    if (order.customer_notes) {
        t += ESCPOS.LEFT + ESCPOS.BOLD_ON;
        t += '*** NOTE: ' + order.customer_notes + ' ***\n';
        t += ESCPOS.BOLD_OFF + LINE;
    }

    // Items — big, bold, clear
    t += ESCPOS.LEFT;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((ci) => {
        const name = (ci.item?.name || ci.name || 'Produit').toUpperCase();
        const qty = ci.quantity || 1;

        // Item name: BOLD + DOUBLE HEIGHT (e.g. "1  TACOS DOUBLE")
        t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
        t += `${qty}  ${name}\n`;
        t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

        const c = ci.customization;
        if (c) {
            // Size in parentheses for pizzas (e.g. "(MEGA)" or "(SENIOR)")
            if (c.size) {
                t += `   (${c.size.toUpperCase()})\n`;
            }

            // Base/dough
            if (c.base) t += `   ${c.base.toUpperCase()}\n`;

            // Meats with dot prefix (e.g. "     . TENDERS")
            if (c.meats?.length) c.meats.forEach(m => { t += `     . ${m.toUpperCase()}\n`; });
            if (c.meat) t += `     . ${c.meat.toUpperCase()}\n`;

            // Sauces with dot prefix (e.g. "     .ALGERIENNE")
            if (c.sauces?.length) c.sauces.forEach(s => { t += `     .${s.toUpperCase()}\n`; });
            if (c.sauce) t += `     .${c.sauce.toUpperCase()}\n`;

            // Garnitures with dot prefix
            if (c.garnitures?.length) c.garnitures.forEach(g => { t += `     .${g.toUpperCase()}\n`; });

            // Removed ingredients with "Sans" bold
            if (c.removedIngredients?.length) c.removedIngredients.forEach(r => {
                t += ESCPOS.BOLD_ON + `   Sans ${r.toUpperCase()}\n` + ESCPOS.BOLD_OFF;
            });

            // Supplements in parentheses
            if (c.supplements?.length) c.supplements.forEach(s => { t += `   (${s.toUpperCase()})\n`; });

            // Menu option: FRITE / BOISSON
            if (c.menuOption !== undefined) {
                const isSandwichOrPanini = name.includes('SANDWICH') || name.includes('PANINI');
                const ml = { 'frites': 'FRITE INCLUSE', 'boisson': 'BOISSON', 'supp_frites': 'SUPPLEMENT FRITES', 'menu': 'FRITE / BOISSON' };
                if (c.menuOption === 'none' || c.menuOption === '') {
                    if (isSandwichOrPanini) {
                        t += `   SANS FRITE\n`;
                    }
                } else {
                    const parts = c.menuOption.split(',').map(o => o.trim()).filter(Boolean);
                    const labels = [];
                    if (isSandwichOrPanini) {
                        if (parts.includes('frites')) {
                            labels.push('FRITE INCLUSE');
                        } else {
                            labels.push('SANS FRITE');
                        }
                    } else {
                        if (parts.includes('frites')) {
                            labels.push('FRITE');
                        }
                    }
                    if (parts.includes('boisson')) {
                        labels.push('BOISSON');
                    }
                    if (parts.includes('supp_frites')) {
                        labels.push('SUPPLEMENT FRITES');
                    }
                    if (parts.includes('menu')) {
                        labels.push('FRITE / BOISSON');
                    }
                    parts.forEach(p => {
                        if (!['frites', 'boisson', 'supp_frites', 'menu'].includes(p)) {
                            labels.push(ml[p] || p.toUpperCase());
                        }
                    });
                    if (labels.length > 0) {
                        t += `   ${labels.join(' + ')}\n`;
                    }
                }
            }

            // Drink on its own line
            if (c.drink) t += `   ${c.drink.toUpperCase()}\n`;

            // Note: bold with asterisks
            if (c.note) t += ESCPOS.BOLD_ON + `   *** ${c.note} ***\n` + ESCPOS.BOLD_OFF;
        }
        t += LINE;
    });

    t += '\n' + ESCPOS.FEED + ESCPOS.PARTIAL_CUT;
    return convertToCP1252(t);
}

// ============================================
// COUNTER/CUSTOMER TICKET — Full receipt with business details
// Matches: name, address, SIRET, TVA, prices, totals, payment
// ============================================
function formatCounterTicket(order, loyaltyText) {
    const LINE = getLine();
    const TVA_RATE = 10;
    let t = '';
    t += ESCPOS.INIT + ESCPOS.SET_CODEPAGE_1252;

    // === HEADER: Business info ===
    t += ESCPOS.CENTER;
    t += ESCPOS.DOUBLE_SIZE + ESCPOS.BOLD_ON;
    t += 'TWIN PIZZA\n';
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    t += '60 Rue Georges Clemenceau\n';
    t += '76530 Grand-Couronne\n';
    t += 'France\n';
    t += 'SIRET 942 617 358 00018\n';
    t += 'N. TVA FR28942617358\n';
    t += LINE;

    // === ORDER INFO ===
    const typeLabels = { livraison: 'LIVRAISON', emporter: 'A EMPORTER', surplace: 'SUR PLACE' };
    const typeLabel = typeLabels[order.order_type] || order.order_type?.toUpperCase() || '';

    t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
    t += `COMMANDE N.${order.order_number}`;
    const pad2 = Math.max(1, 21 - `COMMANDE N.${order.order_number}`.length);
    t += ' '.repeat(pad2) + typeLabel + '\n';
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

    // Date/time
    const orderDate = new Date(order.created_at);
    t += orderDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }) + '\n';
    t += LINE;

    // Scheduled
    if (order.is_scheduled && order.scheduled_for) {
        const sd = new Date(order.scheduled_for);
        t += ESCPOS.BOLD_ON;
        t += 'PROGRAMMEE: ' + sd.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + '\n';
        t += ESCPOS.BOLD_OFF;
    }

    // === CUSTOMER ===
    t += ESCPOS.LEFT;
    if (order.customer_name) {
        t += ESCPOS.BOLD_ON + 'Client: ' + ESCPOS.BOLD_OFF + order.customer_name + '\n';
    }
    if (order.customer_phone) t += 'Tel: ' + order.customer_phone + '\n';
    if (order.customer_address) t += 'Adresse: ' + order.customer_address + '\n';
    if (order.customer_notes) t += 'Note: ' + order.customer_notes + '\n';
    t += LINE;

    // === ITEMS with prices ===
    t += ESCPOS.LEFT;
    t += ESCPOS.BOLD_ON + ' QT  DESIGNATION              P.U   TTC\n' + ESCPOS.BOLD_OFF;
    t += LINE;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((ci) => {
        const name = ci.item?.name || ci.name || 'Produit';
        const qty = ci.quantity || 1;
        const price = ci.totalPrice || ci.calculatedPrice || ci.price || 0;
        const unitPrice = qty > 0 ? (price / qty) : price;

        // Main item line
        t += ESCPOS.BOLD_ON;
        t += ` ${qty}   ${name}\n`;
        t += ESCPOS.BOLD_OFF;

        // Price line (right-aligned)
        const priceStr = `${unitPrice.toFixed(2)} ${Number(price).toFixed(2)}`;
        t += ' '.repeat(Math.max(1, 42 - priceStr.length - 4)) + priceStr + '\n';

        // Customization details
        const c = ci.customization;
        if (c) {
            const details = [];
            if (c.base) details.push(c.base);
            if (c.meats?.length) details.push(...c.meats.map(m => 'Avec ' + m));
            if (c.meat) details.push('Avec ' + c.meat);
            if (c.sauces?.length) details.push(...c.sauces);
            if (c.sauce) details.push(c.sauce);
            if (c.garnitures?.length) details.push(...c.garnitures);
            if (c.supplements?.length) details.push(...c.supplements);
            if (c.removedIngredients?.length) details.push(...c.removedIngredients.map(r => 'Sans ' + r));
            if (c.menuOption !== undefined) {
                const isSandwichOrPanini = name.toUpperCase().includes('SANDWICH') || name.toUpperCase().includes('PANINI');
                const ml = { 'frites': 'Frite classique', 'boisson': 'Boisson', 'supp_frites': 'Supplement Frites', 'menu': 'Menu complet' };
                if (c.menuOption === 'none' || c.menuOption === '') {
                    if (isSandwichOrPanini) {
                        details.push('SANS FRITE');
                    }
                } else {
                    const parts = c.menuOption.split(',').map(o => o.trim()).filter(Boolean);
                    const labels = [];
                    if (isSandwichOrPanini) {
                        if (parts.includes('frites')) {
                            labels.push('Frite classique');
                        } else {
                            labels.push('SANS FRITE');
                        }
                    } else {
                        if (parts.includes('frites')) {
                            labels.push('Frite');
                        }
                    }
                    if (parts.includes('boisson')) {
                        labels.push('Boisson');
                    }
                    if (parts.includes('supp_frites')) {
                        labels.push('Supplement Frites');
                    }
                    if (parts.includes('menu')) {
                        labels.push('Menu complet');
                    }
                    parts.forEach(p => {
                        if (!['frites', 'boisson', 'supp_frites', 'menu'].includes(p)) {
                            labels.push(ml[p] || p);
                        }
                    });
                    if (labels.length > 0) {
                        details.push(labels.join(' + '));
                    }
                }
            }
            if (c.drink) details.push(c.drink);
            if (c.note) details.push('Note: ' + c.note);
            details.forEach(d => { t += `      ${d}\n`; });
        }
    });

    t += LINE;

    // === TVA BREAKDOWN ===
    const totalTTC = order.total || 0;
    const deliveryFee = order.delivery_fee || 0;
    const subtotalTTC = (order.subtotal || totalTTC) - deliveryFee;
    const totalHT = subtotalTTC / (1 + TVA_RATE / 100);
    const tvaAmount = subtotalTTC - totalHT;

    t += ESCPOS.LEFT;
    t += `NB LIGNES : ${items.length}\n`;
    t += LINE;

    // TVA table
    t += ESCPOS.BOLD_ON;
    t += ' Code  TAUX    HT      TVA     TTC\n';
    t += ESCPOS.BOLD_OFF;
    t += ` (001) ${TVA_RATE}%  ${totalHT.toFixed(2)}  ${tvaAmount.toFixed(2)}  ${subtotalTTC.toFixed(2)}\n`;
    t += LINE;

    // Delivery fee
    if (deliveryFee > 0) {
        t += `Frais de livraison: ${deliveryFee.toFixed(2)}E\n`;
    }

    // Totals
    t += ESCPOS.RIGHT;
    t += `TOTAL HT : ${totalHT.toFixed(2)}E\n`;
    t += '\n';
    t += ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON;
    t += `TOTAL TTC : ${totalTTC.toFixed(2)}E\n`;
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    t += LINE;

    // Payment
    t += ESCPOS.LEFT;
    const payLabels = { 'en_ligne': 'Carte Bancaire (en ligne)', 'cb': 'Carte Bancaire', 'especes': 'Especes' };
    const payLabel = payLabels[order.payment_method] || order.payment_method || '';
    const isPaid = order.payment_method === 'en_ligne';

    if (isPaid) {
        t += ESCPOS.CENTER + ESCPOS.BOLD_ON;
        t += '*** COMMANDE PAYEE ***\n';
        t += ESCPOS.BOLD_OFF;
        t += `Paiement: ${payLabel}\n`;
        t += `Montant: ${totalTTC.toFixed(2)}E\n`;
    } else {
        t += ESCPOS.CENTER + ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON;
        t += 'A PAYER\n';
        t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
        t += `Mode: ${payLabel}\n`;
        t += `Montant: ${totalTTC.toFixed(2)}E\n`;
    }
    t += LINE;

    // Loyalty
    if (loyaltyText) {
        t += loyaltyText + '\n';
        t += LINE;
    } else {
        t += ESCPOS.CENTER + ESCPOS.BOLD_ON;
        t += 'CARTE FIDELITE\n';
        t += ESCPOS.BOLD_OFF;
        t += 'Achetez 9 produits\n';
        t += '= 10eme GRATUIT (10E)!\n';
        t += LINE;
    }

    // Pizza credits
    const creditsSaved = order.pizza_credits_saved || 0;
    const creditsRemaining = order.pizza_credits_remaining || 0;
    if (creditsSaved > 0 || creditsRemaining > 0) {
        t += ESCPOS.CENTER + ESCPOS.BOLD_ON;
        t += '*** PIZZAS EN RESERVE ***\n' + ESCPOS.BOLD_OFF;
        if (creditsSaved > 0) t += `Pizza sauvegardee: ${creditsSaved}\n`;
        if (creditsRemaining > 0) {
            t += ESCPOS.BOLD_ON + `TOTAL EN RESERVE: ${creditsRemaining}\n` + ESCPOS.BOLD_OFF;
        }
        t += 'Valable sans limite de temps!\n';
        t += LINE;
    }

    // Footer
    t += ESCPOS.CENTER;
    t += '\nTwin Pizza - Entreprise individuelle\n';
    t += 'SIRET: 942 617 358 00018\n';
    t += 'TVA: FR28942617358\n';
    t += '\n';
    t += 'Merci de votre visite!\n';
    t += '\n' + ESCPOS.FEED + ESCPOS.PARTIAL_CUT;

    return convertToCP1252(t);
}

// Legacy wrapper for backward compatibility (HACCP endpoints etc.)
function formatOrderForPrint(order, isKitchen = false) {
    return isKitchen ? formatKitchenTicket(order) : formatCounterTicket(order, '');
}

// ============================================
// UNIFIED TICKET — ONE single clear ticket
// Kitchen-readable items + prices + totals
// ============================================
function formatUnifiedTicket(order, loyaltyText) {
    const LINE = getLine();
    const TVA_RATE = 10;
    let t = '';
    t += ESCPOS.INIT + ESCPOS.SET_CODEPAGE_1252;

    // === HEADER ===
    t += ESCPOS.CENTER;
    t += ESCPOS.DOUBLE_SIZE + ESCPOS.BOLD_ON;
    t += 'TWIN PIZZA\n';
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    t += '60 Rue Georges Clemenceau\n';
    t += '76530 Grand-Couronne\n';
    t += '02 32 11 26 13\n';
    t += LINE;

    // === ORDER NUMBER + TYPE ===
    const typeLabels = { livraison: 'LIVRAISON', emporter: 'A EMPORTER', surplace: 'SUR PLACE' };
    const typeLabel = typeLabels[order.order_type] || order.order_type?.toUpperCase() || '';

    t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
    t += `#${order.order_number}  ${typeLabel}\n`;
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

    // Date/time
    const orderDate = new Date(order.created_at);
    t += orderDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }) + '\n';
    t += LINE;

    // Scheduled
    if (order.is_scheduled && order.scheduled_for) {
        const sd = new Date(order.scheduled_for);
        t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
        t += 'PROGRAMMEE POUR:\n';
        t += sd.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + '\n';
        t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF + LINE;
    }

    // === CUSTOMER ===
    t += ESCPOS.LEFT;
    if (order.customer_name) {
        t += ESCPOS.BOLD_ON + 'Client: ' + ESCPOS.BOLD_OFF + order.customer_name + '\n';
    }
    if (order.customer_phone) t += 'Tel: ' + order.customer_phone + '\n';
    if (order.customer_address) t += 'Adresse: ' + order.customer_address + '\n';
    if (order.customer_notes) {
        t += ESCPOS.BOLD_ON + '*** NOTE: ' + order.customer_notes + ' ***\n' + ESCPOS.BOLD_OFF;
    }
    t += LINE;

    // === ITEMS — bold names + details + price ===
    t += ESCPOS.LEFT;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((ci) => {
        const name = (ci.item?.name || ci.name || 'Produit').toUpperCase();
        const qty = ci.quantity || 1;
        const price = ci.totalPrice || ci.calculatedPrice || ci.price || 0;

        // Item: bold + double height with price on same line
        t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
        t += `${qty}  ${name}\n`;
        t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;

        // Price right-aligned
        const priceStr = `${Number(price).toFixed(2)}E`;
        t += ' '.repeat(Math.max(1, 42 - priceStr.length)) + priceStr + '\n';

        // Customization details
        const c = ci.customization;
        if (c) {
            if (c.size) t += `   (${c.size.toUpperCase()})\n`;
            if (c.base) t += `   ${c.base.toUpperCase()}\n`;
            if (c.meats?.length) c.meats.forEach(m => { t += `     . ${m.toUpperCase()}\n`; });
            if (c.meat) t += `     . ${c.meat.toUpperCase()}\n`;
            if (c.sauces?.length) c.sauces.forEach(s => { t += `     .${s.toUpperCase()}\n`; });
            if (c.sauce) t += `     .${c.sauce.toUpperCase()}\n`;
            if (c.garnitures?.length) c.garnitures.forEach(g => { t += `     .${g.toUpperCase()}\n`; });
            if (c.removedIngredients?.length) c.removedIngredients.forEach(r => {
                t += ESCPOS.BOLD_ON + `   Sans ${r.toUpperCase()}\n` + ESCPOS.BOLD_OFF;
            });
            if (c.supplements?.length) c.supplements.forEach(s => { t += `   (${s.toUpperCase()})\n`; });
            if (c.menuOption !== undefined) {
                const isSandwichOrPanini = name.includes('SANDWICH') || name.includes('PANINI');
                const ml = { 'frites': 'FRITE INCLUSE', 'boisson': 'BOISSON', 'supp_frites': 'SUPPLEMENT FRITES', 'menu': 'FRITE / BOISSON' };
                if (c.menuOption === 'none' || c.menuOption === '') {
                    if (isSandwichOrPanini) {
                        t += `   SANS FRITE\n`;
                    }
                } else {
                    const parts = c.menuOption.split(',').map(o => o.trim()).filter(Boolean);
                    const labels = [];
                    if (isSandwichOrPanini) {
                        if (parts.includes('frites')) {
                            labels.push('FRITE INCLUSE');
                        } else {
                            labels.push('SANS FRITE');
                        }
                    } else {
                        if (parts.includes('frites')) {
                            labels.push('FRITE');
                        }
                    }
                    if (parts.includes('boisson')) {
                        labels.push('BOISSON');
                    }
                    if (parts.includes('supp_frites')) {
                        labels.push('SUPPLEMENT FRITES');
                    }
                    if (parts.includes('menu')) {
                        labels.push('FRITE / BOISSON');
                    }
                    parts.forEach(p => {
                        if (!['frites', 'boisson', 'supp_frites', 'menu'].includes(p)) {
                            labels.push(ml[p] || p.toUpperCase());
                        }
                    });
                    if (labels.length > 0) {
                        t += `   ${labels.join(' + ')}\n`;
                    }
                }
            }
            if (c.drink) t += `   ${c.drink.toUpperCase()}\n`;
            if (c.note) t += ESCPOS.BOLD_ON + `   *** ${c.note} ***\n` + ESCPOS.BOLD_OFF;
        }
        t += '\n';
    });

    t += LINE;

    // === TOTALS ===
    const totalTTC = order.total || 0;
    const deliveryFee = order.delivery_fee || 0;
    const subtotalTTC = (order.subtotal || totalTTC) - deliveryFee;
    const totalHT = subtotalTTC / (1 + TVA_RATE / 100);
    const tvaAmount = subtotalTTC - totalHT;

    t += ESCPOS.LEFT;
    if (deliveryFee > 0) {
        t += `Frais de livraison: ${deliveryFee.toFixed(2)}E\n`;
    }
    t += ESCPOS.RIGHT;
    t += `TOTAL HT : ${totalHT.toFixed(2)}E\n`;
    t += `TVA ${TVA_RATE}% : ${tvaAmount.toFixed(2)}E\n`;
    t += ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON;
    t += `TOTAL TTC : ${totalTTC.toFixed(2)}E\n`;
    t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    t += LINE;

    // === PAYMENT ===
    const payLabels = { 'en_ligne': 'CB en ligne', 'cb': 'Carte Bancaire', 'especes': 'Especes' };
    const payLabel = payLabels[order.payment_method] || order.payment_method || '';
    const isPaid = order.payment_method === 'en_ligne';

    t += ESCPOS.CENTER;
    if (isPaid) {
        t += ESCPOS.BOLD_ON + '*** PAYE ***\n' + ESCPOS.BOLD_OFF;
    } else {
        t += ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON + 'A PAYER\n' + ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    }
    t += `${payLabel} - ${totalTTC.toFixed(2)}E\n`;
    t += LINE;

    // Loyalty
    if (loyaltyText) {
        t += loyaltyText + '\n';
        t += LINE;
    }

    // Footer
    t += ESCPOS.CENTER;
    t += 'SIRET 942 617 358 00018\n';
    t += 'TVA FR28942617358\n';
    t += '\nMerci de votre visite!\n';
    t += '\n' + ESCPOS.FEED + ESCPOS.PARTIAL_CUT;

    return convertToCP1252(t);
}

// Send data to printer via TCP
function sendToPrinter(data, targetIp) {
    return new Promise((resolve, reject) => {
        const socket = new Socket();

        socket.setTimeout(3000); // 3 second timeout (LAN printers respond in <100ms)

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        });

        socket.on('error', (err) => {
            reject(err);
        });

        socket.connect(PRINTER_PORT, targetIp, () => {
            console.log(`📡 Connected to printer at ${targetIp}:${PRINTER_PORT}`);
            socket.write(data, 'binary', () => {
                socket.end();
                resolve();
            });
        });

        socket.on('close', () => {
            console.log(`🔌 Printer connection closed for ${targetIp}`);
        });
    });
}

// ============================================
// SERIAL PRINT QUEUE — prevents conflicts
// One print job at a time to avoid garbled output
// ============================================
const printQueue = [];
let printQueueProcessing = false;

function enqueuePrintJob(jobFn, label) {
    return new Promise((resolve) => {
        printQueue.push({ jobFn, label, resolve });
        if (!printQueueProcessing) processPrintQueue();
    });
}

async function processPrintQueue() {
    if (printQueueProcessing || printQueue.length === 0) return;
    printQueueProcessing = true;

    while (printQueue.length > 0) {
        const { jobFn, label, resolve } = printQueue.shift();
        try {
            console.log(`🖨️  Queue: processing [${label}] (${printQueue.length} remaining)`);
            const result = await jobFn();
            resolve(result);
        } catch (err) {
            console.error(`❌ Queue job [${label}] failed:`, err.message);
            resolve(false); // Don't reject — keep queue moving
        }
        // Brief pause between jobs so the printer can breathe
        if (printQueue.length > 0) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    printQueueProcessing = false;
}

// Print to a single printer with retry logic
async function printToSinglePrinter(data, ip, orderLabel) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🖨️  Attempt ${attempt}/${MAX_RETRIES} → ${ip} [${orderLabel}]`);
            await sendToPrinter(data, ip);
            console.log(`✅ Printed on ${ip} [${orderLabel}]`);
            return true;
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed on ${ip}: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }
    console.error(`❌ All ${MAX_RETRIES} attempts failed on ${ip} [${orderLabel}]`);
    return false;
}

// Send formatted data to all printers (parallel per printer, queued globally)
async function sendToAllPrinters(ticketData, label) {
    if (PRINTER_IPS.length === 0) {
        console.error('❌ No printers configured');
        return false;
    }
    const results = await Promise.allSettled(
        PRINTER_IPS.map(ip => printToSinglePrinter(ticketData, ip, label))
    );
    return results.some(r => r.status === 'fulfilled' && r.value === true);
}

// Print order ticket (QUEUED) — formats and sends to all printers
async function printWithRetry(order, loyaltyText) {
    const label = `Order #${order.order_number}`;
    return enqueuePrintJob(async () => {
        const ticketData = formatUnifiedTicket(order, loyaltyText || '');
        console.log(`🖨️  Printing ticket #${order.order_number}...`);
        return sendToAllPrinters(ticketData, label);
    }, label);
}

// Print raw pre-formatted data (QUEUED) — for invoices, HACCP, etc.
async function printRawWithRetry(ticketData, label) {
    return enqueuePrintJob(async () => {
        console.log(`🖨️  Printing [${label}]...`);
        return sendToAllPrinters(ticketData, label);
    }, label);
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

    // Fetch loyalty info (Only used for counter printer)
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

    const success = await printWithRetry(order, loyaltyText);

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
let disconnectTimer = null;
const RECONNECT_BASE_DELAY = 5000; // Exponential backoff: 5s → 10s → 20s → 40s → cap 60s

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
                reconnectAttempts = 0; lastEventReceivedAt = Date.now(); // Reset on successful event
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
                lastEventReceivedAt = Date.now();
                enqueueHACCPPrint(payload.new);
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

// ============================================
// HACCP PRINT QUEUE (sequential processing)
// ============================================
const haccpQueue = [];
let haccpQueueProcessing = false;
const HACCP_DELAY_BETWEEN_TICKETS = 2000; // 2s between each ticket
const HACCP_RETRY_COUNT = 3;
const HACCP_RETRY_DELAY = 3000; // 3s between retries

// Add job to HACCP queue
function enqueueHACCPPrint(job) {
    haccpQueue.push(job);
    console.log(`📥 HACCP queued: ${job.product_name} (queue size: ${haccpQueue.length})`);
    // Start processing if not already running
    if (!haccpQueueProcessing) {
        processHACCPQueue();
    }
}

// Process HACCP queue one ticket at a time
async function processHACCPQueue() {
    if (haccpQueueProcessing || haccpQueue.length === 0) return;
    haccpQueueProcessing = true;

    console.log(`\n🖨️  Starting HACCP queue processing (${haccpQueue.length} ticket(s))...\n`);

    while (haccpQueue.length > 0) {
        const job = haccpQueue.shift();
        await handleHACCPPrint(job);

        // Wait between tickets to let printer breathe
        if (haccpQueue.length > 0) {
            console.log(`⏳ Waiting ${HACCP_DELAY_BETWEEN_TICKETS / 1000}s before next ticket... (${haccpQueue.length} remaining)`);
            await new Promise(r => setTimeout(r, HACCP_DELAY_BETWEEN_TICKETS));
        }
    }

    console.log('✅ HACCP queue empty — all tickets processed.\n');
    haccpQueueProcessing = false;
}

// Handle a single HACCP print job (with retries)
async function handleHACCPPrint(job) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧾 HACCP PRINT: ${job.product_name}`);
    console.log(`   Category: ${job.category_name}`);
    console.log(`   DLC: ${job.dlc_date}`);
    console.log(`${'='.repeat(50)}\n`);

    // Detect label type by category_name
    const isDateLabel = job.category_name === 'ETIQUETTE_DATE';
    const isIngredientLabel = job.category_name === 'ETIQUETTE_INGREDIENT';
    const isFreezerLabel = job.category_name === 'Congélation';

    let ticketData;
    if (isDateLabel || isIngredientLabel) {
        console.log(`📋 Routing to ${isIngredientLabel ? 'ingredient' : 'date'} label format`);
        const useByDate = (job.dlc_date && job.dlc_date !== job.action_date) ? job.dlc_date : '';
        ticketData = formatDateLabel({
            productName: job.product_name,
            actionLabel: job.action_label || 'Fait le',
            actionDate: job.action_date,
            useByDate,
            operator: job.operator,
            warning: isIngredientLabel ? 'NE PAS DEPASSER 3 JOURS' : '',
        });
    } else if (isFreezerLabel) {
        console.log(`🧊 Routing to FREEZER label format`);
        // Parse extra data from notes JSON
        let extra = {};
        try { if (job.notes) extra = JSON.parse(job.notes); } catch {}
        ticketData = formatFreezerTicket({
            productName: job.product_name,
            frozenDate: job.action_date,
            expiryDate: job.dlc_date,
            originalDlc: extra.originalDlc || 'N/A',
            lotNumber: extra.lotNumber || 'N/A',
            weight: extra.weight || '',
            origin: extra.origin || '',
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

    // Send through the global print queue
    const anyPrinted = await printRawWithRetry(ticketData, `HACCP: ${job.product_name}`);

    // Mark as printed in DB
    if (anyPrinted) {
        await supabase
            .from('haccp_print_queue')
            .update({ printed: true })
            .eq('id', job.id);
        console.log(`✅ ${job.product_name} — done`);
    } else {
        console.error(`❌ FAILED: ${job.product_name} — all ${HACCP_RETRY_COUNT} attempts failed on all printers`);
    }
}

async function handleDisconnect() {
    // Prevent multiple simultaneous reconnect attempts
    if (disconnectTimer) {
        console.log('🔄 Reconnect already scheduled, skipping...');
        return;
    }

    reconnectAttempts++;
    // Exponential backoff: 5s → 10s → 20s → 40s → capped at 60s — NEVER gives up
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1), 60000);
    console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt #${reconnectAttempts}, NEVER gives up)`);

    disconnectTimer = setTimeout(async () => {
        disconnectTimer = null;
        try {
            await setupRealtimeSubscription();
        } catch (err) {
            console.error('❌ Reconnection error:', err.message);
            handleDisconnect(); // Try again — never give up
        }
    }, delay);
}

// Heartbeat — monitors channel health + event freshness
function startHeartbeat() {
    setInterval(() => {
        const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });
        const eventAge = Math.round((Date.now() - lastEventReceivedAt) / 60000);

        if (channel && channel.state === 'joined') {
            console.log(`💚 Heartbeat OK — ${now} | last event: ${eventAge}m ago | queue: ${printQueue.length}`);
        } else {
            console.error(`💔 Heartbeat FAIL — channel: ${channel?.state || 'null'} — ${now}`);
            handleDisconnect();
        }
    }, 60000);
}

// ============================================
// ACTIVE POLLING FALLBACK — catches missed orders
// Safety net when realtime silently dies
// ============================================
async function pollForUnprintedOrders(lookbackMs) {
    try {
        const lookback = lookbackMs || 5 * 60 * 1000; // Default: last 5 minutes
        const since = new Date(Date.now() - lookback).toISOString();
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', since)
            .order('created_at', { ascending: true });

        if (error) {
            console.log('⚠️ Poll check failed:', error.message);
            return;
        }

        let caught = 0;
        for (const order of (orders || [])) {
            if (!printedOrders.has(order.id)) {
                console.log(`🔍 POLL CATCH: Order #${order.order_number} missed by realtime! Printing now...`);
                await handleNewOrder(order);
                caught++;
            }
        }

        if (caught > 0) {
            console.log(`⚠️ Poll caught ${caught} missed order(s) — forcing realtime reconnect...`);
            handleDisconnect();
        }
    } catch (err) {
        console.log('⚠️ Poll error:', err.message);
    }
}

// ============================================
// HTTP SERVER FOR HACCP DIRECT PRINTING
// ============================================
const HTTP_PORT = process.env.HTTP_PORT || 3001;

// Format compact date label for ESC/POS printing
// Used for sticking on sauces, bottles, and kitchen items
function formatDateLabel(data) {
    const { productName, actionLabel, actionDate, useByDate, operator, warning } = data;

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

    // Action date ("Fait le" or "Ouvert le" or "Préparé le")
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.BOLD_ON;
    ticket += actionLabel + ': ';
    ticket += ESCPOS.BOLD_OFF;
    ticket += actionDate + '\n';
    ticket += '\n';

    // Use-by date (only if provided)
    if (useByDate) {
        ticket += ESCPOS.CENTER;
        ticket += ESCPOS.LINE_42;
        ticket += ESCPOS.BOLD_ON;
        ticket += ESCPOS.DOUBLE_HEIGHT;
        ticket += 'A CONSOMMER AVANT LE\n';
        ticket += useByDate + '\n';
        ticket += ESCPOS.NORMAL_SIZE;
        ticket += ESCPOS.BOLD_OFF;
        ticket += ESCPOS.LINE_42;
    } else {
        ticket += ESCPOS.LINE_42;
    }

    // Warning line (for ingredient labels)
    if (warning) {
        ticket += ESCPOS.CENTER;
        ticket += ESCPOS.BOLD_ON;
        ticket += '\n' + warning + '\n';
        ticket += ESCPOS.BOLD_OFF;
        ticket += '\n';
    }

    // Footer with operator
    ticket += ESCPOS.CENTER;
    ticket += 'Par: ' + operator + '\n';
    ticket += '\n';

    // Cut
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    return convertToCP1252(ticket);
}
// Format FREEZER/CONGÉLATION ticket for ESC/POS printing
// Shows product info scanned from the original label + freezing details
function formatFreezerTicket(data) {
    const { productName, frozenDate, expiryDate, originalDlc, lotNumber, weight, origin, operator } = data;

    let ticket = '';
    ticket += ESCPOS.INIT;
    ticket += ESCPOS.SET_CODEPAGE_1252;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'TWIN PIZZA\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Big snowflake label
    ticket += ESCPOS.DOUBLE_SIZE + ESCPOS.BOLD_ON;
    ticket += 'CONGELATION\n';
    ticket += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Product name (big + bold)
    ticket += ESCPOS.DOUBLE_SIZE + ESCPOS.BOLD_ON;
    ticket += productName + '\n';
    ticket += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    ticket += '\n';
    ticket += ESCPOS.LINE_42;

    // Frozen date
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.BOLD_ON + 'Congele le: ' + ESCPOS.BOLD_OFF;
    ticket += frozenDate + '\n';
    ticket += '\n';

    // Original DLC
    if (originalDlc && originalDlc !== 'N/A') {
        ticket += ESCPOS.BOLD_ON + 'DLC Origine: ' + ESCPOS.BOLD_OFF;
        ticket += originalDlc + '\n';
    }

    // Lot number
    if (lotNumber && lotNumber !== 'N/A') {
        ticket += ESCPOS.BOLD_ON + 'N. Lot: ' + ESCPOS.BOLD_OFF;
        ticket += lotNumber + '\n';
    }

    // Weight
    if (weight) {
        ticket += ESCPOS.BOLD_ON + 'Poids: ' + ESCPOS.BOLD_OFF;
        ticket += weight + '\n';
    }

    // Origin
    if (origin) {
        ticket += ESCPOS.BOLD_ON + 'Origine: ' + ESCPOS.BOLD_OFF;
        ticket += origin + '\n';
    }

    ticket += ESCPOS.LINE_42;

    // Expiry date (big, bold, highlighted)
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_HEIGHT;
    ticket += 'A CONSOMMER AVANT LE\n';
    ticket += expiryDate + '\n';
    ticket += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE_42;

    // Storage rules
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'Conservation: -18.C\n';
    ticket += '3 MOIS MAXIMUM\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += '\n';

    // Footer
    ticket += 'Par: ' + operator + '\n';
    ticket += '\n';
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
        res.json({ status: 'ok', printers: PRINTER_IPS });
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
            const success = await printRawWithRetry(ticketData, `HACCP-HTTP: ${data.productName}`);

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
                const ok = await printRawWithRetry(ticketData, `Label: ${decodeURIComponent(String(product))} (${i+1}/${numCopies})`);
                if (ok) printed++;
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
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .order('created_at', { ascending: false })
                .limit(1);

            const order = orders?.[0];

            if (error || !order) {
                return res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>❌ Commande ${orderNumber} non trouvée</h2><script>setTimeout(()=>window.close(),2000)</script></body></html>`);
            }

            const success = await printWithRetry(order, '');

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
            const success = await printWithRetry(order, '');

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
            const { data: order, error } = await supabase
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
            const success = await printRawWithRetry(ticketData, `INVOICE-${invoiceNumber}`);

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
            const success = await printRawWithRetry(ticketData, `INVOICE-${invoiceNumber}`);

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
║        🍕 TWIN PIZZA PRINT SERVER v2.0 🍕             ║
╠════════════════════════════════════════════════════════╣
║  Printers: ${PRINTER_IPS.join(', ').padEnd(42)}║
║  Port: ${PRINTER_PORT.toString().padEnd(47)}║
║  Mode: PARALLEL dispatch | TCP timeout: 3s           ║
║  Retries: ${MAX_RETRIES} attempts, ${(RETRY_DELAY_MS/1000)}s delay                          ║
║  Auto-reconnect: ENABLED                              ║
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
        // Extra sweep: check last hour for orders never seen by the server
        await pollForUnprintedOrders(60 * 60 * 1000);
    }, 5000); // Wait 5s for system to stabilize

    // Start polling fallback — safety net for missed realtime events
    setInterval(pollForUnprintedOrders, POLL_INTERVAL);
    console.log(`🔍 Polling fallback active: checking every ${POLL_INTERVAL / 1000}s for missed orders`);

    // Catch uncaught errors — NEVER crash silently
    process.on('uncaughtException', (err) => {
        console.error('💥 UNCAUGHT EXCEPTION (server stays alive):', err.message);
        console.error(err.stack);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('💥 UNHANDLED REJECTION (server stays alive):', reason);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down print server...');
        if (channel) {
            await supabase.removeChannel(channel);
        }
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n👋 SIGTERM received, shutting down...');
        if (channel) {
            await supabase.removeChannel(channel);
        }
        process.exit(0);
    });
}

// Run the server
startServer().catch(console.error);

