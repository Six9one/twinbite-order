import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { Socket } from 'net';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { promises as fsPromises } from 'fs';
import { exec } from 'child_process';
import express from 'express';
import cors from 'cors';
import { buildLogoBytes, buildLogoBytesFromUrl } from './logo-escpos.js';

// Load environment variables
// Priority: print-server/.env → root .env (fallback, no override)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });                         // print-server/.env
config({ path: join(__dirname, '..', '.env'), override: false });  // root .env fallback

// Support SUPABASE_URL (print-server/.env) OR VITE_SUPABASE_URL (root .env)
const SUPABASE_URL      = (process.env.SUPABASE_URL      || process.env.VITE_SUPABASE_URL      || '').replace(/['"]/g, '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').replace(/['"]/g, '').trim();
const PRINTER_IPS = (process.env.PRINTER_IPS || process.env.PRINTER_IP || '').split(',').map(ip => ip.trim()).filter(Boolean);
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10);
// Star TSP100 USB (PC restaurant / caisse) — ticket client avec prix
let COUNTER_PRINTER_NAME = (process.env.COUNTER_PRINTER_NAME || process.env.USB_PRINTER_NAME || '').trim();
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const SETTINGS_REFRESH_INTERVAL = 300000;

// Logo ESC/POS bytes — preloaded once at startup
let logoBytes = null;
buildLogoBytes().then(b => {
    logoBytes = b;
    if (b) console.log('[LOGO] Twin Pizza logo loaded (' + b.length + ' bytes)');
    else   console.warn('[LOGO] Logo not available — tickets will print without logo');
});
const POLL_INTERVAL = 10000;
let lastEventReceivedAt = Date.now();

// Validate — exit immediately (Electron restarts us in 5s) if keys missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[PRINT ERR] Missing SUPABASE_URL / SUPABASE_ANON_KEY');
    console.error('[PRINT ERR] Check .env in print-server/ or root .env');
    console.error('[PRINT ERR] Restarting in 5s...');
    process.exit(1); // exit now — Electron will restart us
}

console.log('[PRINT] Supabase URL:', SUPABASE_URL.slice(0, 40) + '...');

// Initialize Supabase client — provide ws transport so realtime is STABLE on
// Node < 22 (without it the channel keeps closing and orders get missed).
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { transport: WebSocket },
});

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
    // ── Imprimante montée à l'envers sur le mur → rotation 180° ──
    UPSIDE_ON:  ESC + '{' + '\x01',   // Activer impression retournée
    UPSIDE_OFF: ESC + '{' + '\x00',   // Désactiver impression retournée
};


// Detect order source channel (pos, borne, website)
function detectOrderSource(order) {
    const phone = (order.customer_phone || '').toLowerCase().trim();
    const name  = (order.customer_name  || '').toLowerCase().trim();
    const notes = (order.customer_notes || '').toLowerCase();
    if (phone === 'pos' || name.startsWith('[pos]'))  return 'POS';
    if (phone === 'borne' || notes.includes('[borne]')) return 'BORNE';
    return 'WEBSITE';
}

// Source label for ticket
function getSourceLabel(order) {
    const src = detectOrderSource(order);
    if (src === 'POS')     return 'POS';
    if (src === 'BORNE')   return 'BORNE';
    return                         'WEB';
}

// Clean customer name (remove [POS] prefix)
function cleanCustomerName(name) {
    return (name || '').replace(/^\[pos\]\s*/i, '').trim();
}

// Clean customer phone (return empty string if it's a system placeholder)
function cleanCustomerPhone(phone) {
    const p = (phone || '').toLowerCase().trim();
    if (p === 'pos' || p === 'borne') return '';
    return phone || '';
}

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
        '•': '\x95',
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

            // Dynamic printer update from DB settings
            if (savedSettings.usbPrinterName) {
                const newPrinterName = savedSettings.usbPrinterName.trim();
                if (COUNTER_PRINTER_NAME !== newPrinterName) {
                    console.log(`🔌 Dynamic printer name updated from DB settings: "${COUNTER_PRINTER_NAME}" ➔ "${newPrinterName}"`);
                    COUNTER_PRINTER_NAME = newPrinterName;
                }
            } else {
                COUNTER_PRINTER_NAME = (process.env.COUNTER_PRINTER_NAME || process.env.USB_PRINTER_NAME || '').trim();
            }

            console.log('✅ Ticket settings loaded from database:');
            console.log('   Header:', ticketSettings.counterTemplate.header);
            console.log('   Subheader:', ticketSettings.counterTemplate.subheader);
            console.log('   Footer:', ticketSettings.counterTemplate.footer);
            console.log('   Paper width:', ticketSettings.paperWidth);
            console.log('   Active template:', ticketSettings.activeTemplate);
            console.log('   USB Printer:', COUNTER_PRINTER_NAME || '(none)');
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
// ── helpers ──────────────────────────────────────────────────────────────────
// Right-pad / left-pad text to fit 42-char width
function padLine(left, right, width = 42) {
    const gap = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, gap)) + right;
}
const DASH_LINE = '-'.repeat(42) + '\n';

// ── LOGO helper ───────────────────────────────────────────────────────────────
function getLogoBytesForTicket() {
    // Returns raw Buffer or empty string (text path uses strings)
    return logoBytes || null;
}

// ============================================
// DEFAULT SECTIONS & DYNAMIC FORMATTERS
// ============================================

const DEFAULT_SECTIONS = [
  { id: 'logo', name: 'Logo / Image', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'none' },
  { id: 'header', name: 'En-tête (Titre)', enabled: true, align: 'center', fontSize: 'double_size', fontType: 'A', bold: true, underline: false, borderBottom: 'none' },
  { id: 'subheader', name: 'Sous-titre (Adresse, Tél)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'order_info', name: 'N° & Type de commande', enabled: true, align: 'center', fontSize: 'double_height', fontType: 'A', bold: true, underline: false, borderBottom: 'dashed' },
  { id: 'scheduled_time', name: 'Heure programmée', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: true, underline: false, borderBottom: 'dashed' },
  { id: 'date_source', name: 'Date & Origine', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'customer_info', name: 'Infos client (Nom, Tel, Adresse)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'items', name: 'Liste des articles', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'totals', name: 'Totaux (TVA, HT, TTC)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'payment', name: 'Règlement / Paiement', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'qrcode', name: 'Code QR (Avis Google)', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'footer', name: 'Message de pied de page', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'none' },
];

function getAlignCmd(align) {
    if (align === 'center') return ESC + 'a' + '\x01';
    if (align === 'right') return ESC + 'a' + '\x02';
    return ESC + 'a' + '\x00';
}

function getStyleCmd(section) {
    let cmd = '';
    // Font Type (A/B)
    if (section.fontType === 'B') {
        cmd += ESC + 'M' + '\x01';
    } else {
        cmd += ESC + 'M' + '\x00';
    }
    
    // Font Size
    if (section.fontSize === 'double_height') cmd += GS + '!' + '\x01';
    else if (section.fontSize === 'double_width') cmd += GS + '!' + '\x10';
    else if (section.fontSize === 'double_size') cmd += GS + '!' + '\x11';
    else cmd += GS + '!' + '\x00';
    
    // Bold
    cmd += section.bold ? ESC + 'E' + '\x01' : ESC + 'E' + '\x00';
    
    // Underline
    cmd += section.underline ? ESC + '-' + '\x01' : ESC + '-' + '\x00';
    
    return cmd;
}

function getSeparatorLine(type, paperWidth) {
    const width = paperWidth === '58mm' ? 32 : 42;
    if (type === 'dashed') {
        return '- '.repeat(width / 2) + '\n';
    }
    if (type === 'solid') return '-'.repeat(width) + '\n';
    if (type === 'double') return '='.repeat(width) + '\n';
    return '';
}

class TicketBufferBuilder {
    constructor() {
        this.chunks = [];
    }
    
    addText(text) {
        if (!text) return;
        const cp1252Text = convertToCP1252(text);
        const buf = Buffer.from(cp1252Text, 'binary');
        this.chunks.push(buf);
    }
    
    addBuffer(buffer) {
        if (buffer && buffer.length > 0) {
            this.chunks.push(buffer);
        }
    }
    
    toBuffer() {
        return Buffer.concat(this.chunks);
    }
}

async function formatDynamicTicket(order, template, loyaltyText) {
    const paperWidth = template?.paperWidth || ticketSettings.paperWidth || '80mm';
    const lineWidth = paperWidth === '58mm' ? 32 : 42;
    
    const ESCPOS_LOCAL = {
        INIT: ESC + '@',
        SET_CODEPAGE_1252: ESC + 't' + '\x10',
        CENTER: ESC + 'a' + '\x01',
        LEFT: ESC + 'a' + '\x00',
        RIGHT: ESC + 'a' + '\x02',
        BOLD_ON: ESC + 'E' + '\x01',
        BOLD_OFF: ESC + 'E' + '\x00',
        DOUBLE_HEIGHT: GS + '!' + '\x01',
        DOUBLE_WIDTH: GS + '!' + '\x10',
        DOUBLE_SIZE: GS + '!' + '\x11',
        NORMAL_SIZE: GS + '!' + '\x00',
        UNDERLINE_ON: ESC + '-' + '\x01',
        UNDERLINE_OFF: ESC + '-' + '\x00',
        PARTIAL_CUT: GS + 'V' + '\x01',
        FEED: ESC + 'd' + '\x03',
        FONT_A: ESC + 'M' + '\x00',
        FONT_B: ESC + 'M' + '\x01',
    };

    const RESET_STYLE = ESCPOS_LOCAL.FONT_A + ESCPOS_LOCAL.NORMAL_SIZE + ESCPOS_LOCAL.BOLD_OFF + ESCPOS_LOCAL.UNDERLINE_OFF;

    const builder = new TicketBufferBuilder();
    builder.addText(ESCPOS_LOCAL.INIT);

    // Upside down print for kitchen template
    const isKitchen = template === ticketSettings.kitchenTemplate || 
                     (template?.name || '').toLowerCase().includes('cuisine') || 
                     (template?.name || '').toLowerCase().includes('kitchen');
    if (isKitchen) {
        builder.addText(ESCPOS.UPSIDE_ON);
    } else {
        builder.addText(ESCPOS.UPSIDE_OFF);
    }
    builder.addText(ESCPOS_LOCAL.SET_CODEPAGE_1252);

    const sections = template?.sections && template.sections.length > 0 ? template.sections : DEFAULT_SECTIONS;

    for (const s of sections) {
        if (!s.enabled) continue;

        builder.addText(getAlignCmd(s.align));
        builder.addText(getStyleCmd(s));

        switch (s.id) {
            case 'logo': {
                if (template?.logoUrl) {
                    const width = template.logoWidth || 160;
                    const logoBuf = await buildLogoBytesFromUrl(template.logoUrl, width);
                    if (logoBuf) {
                        builder.addBuffer(logoBuf);
                    }
                } else {
                    if (logoBytes) {
                        builder.addBuffer(logoBytes);
                    } else {
                        builder.addText('🍕 [TWIN PIZZA LOGO]\n');
                    }
                }
                break;
            }
            case 'header': {
                const headerText = template?.header || 'TWIN PIZZA';
                builder.addText(headerText + '\n');
                break;
            }
            case 'subheader': {
                const subheaderText = template?.subheader || '60 Rue Georges Clemenceau, 76530 Grand-Couronne\n02 32 11 26 13';
                subheaderText.split('\n').forEach(line => {
                    builder.addText(line.trim() + '\n');
                });
                break;
            }
            case 'order_info': {
                const typeLabels = { livraison: 'LIVRAISON', emporter: 'A EMPORTER', surplace: 'SUR PLACE' };
                const typeLabel = typeLabels[order.order_type] || (order.order_type || '').toUpperCase();
                builder.addText('#' + order.order_number + '\n' + typeLabel + '\n');
                break;
            }
            case 'scheduled_time': {
                if (order.is_scheduled && order.scheduled_for) {
                    const sd = new Date(order.scheduled_for);
                    const formatted = sd.toLocaleString('fr-FR', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
                    });
                    builder.addText('PROGRAMME: ' + formatted + '\n');
                }
                break;
            }
            case 'date_source': {
                const orderDate = new Date(order.created_at);
                const formattedDate = orderDate.toLocaleString('fr-FR', {
                    dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris'
                });
                builder.addText('Date: ' + formattedDate + '\n');
                builder.addText('Origine: ' + getSourceLabel(order) + '\n');
                break;
            }
            case 'customer_info': {
                const clientNotes = (order.customer_notes || '').replace(/^\[BORNE\]\s*/i, '').trim();
                const clientPhone = cleanCustomerPhone(order.customer_phone);
                const clientName  = cleanCustomerName(order.customer_name);
                
                if (clientName) {
                    builder.addText('Client: ' + clientName + '\n');
                }
                if (clientPhone) {
                    builder.addText('Tel: ' + clientPhone + '\n');
                }
                if (order.customer_address) {
                    builder.addText('Adresse: ' + order.customer_address + '\n');
                }
                if (clientNotes) {
                    builder.addText('Note: ' + clientNotes + '\n');
                }
                break;
            }
            case 'items': {
                builder.addText(ESCPOS_LOCAL.BOLD_ON + padLine('QTE  ARTICLE', 'P.U.   TOTAL', lineWidth) + ESCPOS_LOCAL.BOLD_OFF + '\n');
                builder.addText('-'.repeat(lineWidth) + '\n');

                const items = Array.isArray(order.items) ? order.items : [];
                const grouped = {};
                items.forEach(ci => {
                    const cat = (ci.item?.category || ci.category || 'Articles').toLowerCase();
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(ci);
                });

                const catKeys = Object.keys(grouped);
                catKeys.forEach(cat => {
                    builder.addText(ESCPOS_LOCAL.CENTER + ESCPOS_LOCAL.BOLD_ON + ESCPOS_LOCAL.DOUBLE_SIZE + '--- ' + cat.toUpperCase() + ' ---' + RESET_STYLE + '\n' + getAlignCmd(s.align));

                    const catItems = grouped[cat];
                    catItems.forEach(ci => {
                        const name      = ci.item?.name || ci.name || 'Produit';
                        const qty       = ci.quantity || 1;
                        const price     = ci.totalPrice || ci.calculatedPrice || ci.price || 0;
                        
                        let cleanedName = name.toUpperCase();
                        if (cat === 'pizza' || cat === 'pizzas' || cleanedName.startsWith('PIZZA ')) {
                            cleanedName = cleanedName.replace(/^PIZZA\s+/i, '');
                        }

                        const bullet = template?.itemBullet && template.itemBullet !== 'none' ? template.itemBullet + ' ' : '';
                        const leftPart = bullet + qty + 'x ' + cleanedName;
                        const rightPart = price.toFixed(2) + 'E';

                        const pSizeCmd = template?.itemFontSize === 'double_height' ? ESCPOS_LOCAL.DOUBLE_HEIGHT :
                                         template?.itemFontSize === 'double_size' ? ESCPOS_LOCAL.DOUBLE_SIZE :
                                         ESCPOS_LOCAL.NORMAL_SIZE;
                        const pBoldCmd = template?.itemBold !== false ? ESCPOS_LOCAL.BOLD_ON : ESCPOS_LOCAL.BOLD_OFF;

                        builder.addText(pBoldCmd + pSizeCmd + padLine(leftPart, rightPart, lineWidth) + RESET_STYLE + '\n');

                        const c = ci.customization;
                        if (c) {
                            const dFontCmd = template?.detailFontType === 'B' ? ESCPOS_LOCAL.FONT_B : ESCPOS_LOCAL.FONT_A;
                            const dSizeCmd = template?.detailFontSize === 'double_height' ? ESCPOS_LOCAL.DOUBLE_HEIGHT : ESCPOS_LOCAL.NORMAL_SIZE;
                            const dBoldCmd = template?.detailBold ? ESCPOS_LOCAL.BOLD_ON : ESCPOS_LOCAL.BOLD_OFF;

                            builder.addText(dFontCmd + dSizeCmd + dBoldCmd);

                            if (c.size) {
                                builder.addText('   - ' + c.size.toUpperCase() + '\n');
                            }

                            const otherDetails = [];
                            if (c.meats?.length)  otherDetails.push(...c.meats.map(m => '+ ' + m));
                            if (c.meat)           otherDetails.push('+ ' + c.meat);
                            if (c.sauces?.length) otherDetails.push(...c.sauces.map(s => 'Sauce: ' + s));
                            if (c.sauce)          otherDetails.push('Sauce: ' + c.sauce);
                            if (c.garnitures?.length) otherDetails.push(...c.garnitures);
                            if (c.supplements?.length) otherDetails.push(...c.supplements.map(s => '+ ' + s));
                            if (c.removedIngredients?.length) otherDetails.push(...c.removedIngredients.map(r => 'Sans ' + r));
                            
                            if (c.menuOption && c.menuOption !== 'none' && c.menuOption !== '') {
                                const parts  = c.menuOption.split(',').map(o => o.trim()).filter(Boolean);
                                const ml     = { frites: 'Frite', boisson: 'Boisson', supp_frites: 'Supp Frites', menu: 'Menu complet' };
                                const labels = parts.map(p => ml[p] || p);
                                if (labels.length) otherDetails.push(labels.join(' + '));
                            } else if (c.menuOption === 'none' || c.menuOption === '') {
                                const cat2 = (ci.item?.category || ci.category || '').toLowerCase();
                                if (cat2 === 'panini' || name.toUpperCase().includes('SANDWICH') || name.toUpperCase().includes('PANINI'))
                                    otherDetails.push('Sans frite');
                            }
                            if (c.drink) otherDetails.push('Boisson: ' + c.drink);

                            otherDetails.forEach(d => {
                                builder.addText('   - ' + d + '\n');
                            });

                            if (c.note) {
                                builder.addText('   - Note: ' + c.note + '\n');
                            }

                            builder.addText(RESET_STYLE);
                            builder.addText(getAlignCmd(s.align));
                            builder.addText(getStyleCmd(s));
                        }
                    });
                });
                break;
            }
            case 'totals': {
                const TVA_RATE = 10;
                const totalTTC = order.total || 0;
                const deliveryFee = order.delivery_fee || 0;
                const subtotalTTC = (order.subtotal || totalTTC) - deliveryFee;
                const totalHT = subtotalTTC / (1 + TVA_RATE / 100);
                const tvaAmount = subtotalTTC - totalHT;

                if (deliveryFee > 0) {
                    builder.addText(padLine('Livraison:', deliveryFee.toFixed(2) + 'E', lineWidth) + '\n');
                }
                builder.addText(padLine('TVA ' + TVA_RATE + '%:', tvaAmount.toFixed(2) + 'E', lineWidth) + '\n');
                builder.addText(ESCPOS_LOCAL.BOLD_ON + ESCPOS_LOCAL.DOUBLE_SIZE + padLine('TOTAL:', totalTTC.toFixed(2) + 'E', Math.floor(lineWidth * 0.6)) + RESET_STYLE + '\n');
                break;
            }
            case 'payment': {
                const payLabels = { 'en_ligne': 'CB', 'cb': 'CB', 'especes': 'Cash' };
                const payText = (payLabels[order.payment_method] || order.payment_method || '').toUpperCase();
                builder.addText('Reglement: ' + payText + '\n');

                const creditsSaved     = order.pizza_credits_saved || 0;
                const creditsRemaining = order.pizza_credits_remaining || 0;
                if (creditsSaved > 0 || creditsRemaining > 0) {
                    builder.addText(ESCPOS_LOCAL.CENTER + ESCPOS_LOCAL.BOLD_ON + '\n*** PIZZAS EN RESERVE ***\n' + ESCPOS_LOCAL.BOLD_OFF);
                    if (creditsSaved > 0)     builder.addText(`Pizza sauvegardee: ${creditsSaved}\n`);
                    if (creditsRemaining > 0) builder.addText(ESCPOS_LOCAL.BOLD_ON + `TOTAL EN RESERVE: ${creditsRemaining}\n` + ESCPOS_LOCAL.BOLD_OFF);
                    builder.addText('Valable sans limite de temps!\n' + getAlignCmd(s.align));
                }

                if (loyaltyText) {
                    builder.addText(loyaltyText + '\n');
                }
                break;
            }
            case 'qrcode': {
                builder.addText(ESCPOS_LOCAL.CENTER + ESCPOS_LOCAL.BOLD_ON + 'Laissez-nous un avis ! *\n' + ESCPOS_LOCAL.BOLD_OFF);
                builder.addText(getQRCodeString('https://g.page/r/CXpZZnzoTBFREBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr') + '\n');
                break;
            }
            case 'footer': {
                const footerText = template?.footer || 'Merci de votre visite !\n🍕 À bientôt ! 🍕';
                footerText.split('\n').forEach(line => {
                    builder.addText(line.trim() + '\n');
                });
                break;
            }
        }

        builder.addText(RESET_STYLE);

        if (s.borderBottom !== 'none') {
            builder.addText(getSeparatorLine(s.borderBottom, paperWidth));
        }
    }

    builder.addText(ESCPOS_LOCAL.FEED + ESCPOS_LOCAL.PARTIAL_CUT);

    return builder.toBuffer();
}

async function formatKitchenTicket(order, loyaltyText) {
    return formatDynamicTicket(order, ticketSettings.kitchenTemplate, loyaltyText);
}

async function formatCounterTicket(order, loyaltyText) {
    return formatDynamicTicket(order, ticketSettings.counterTemplate, loyaltyText);
}

async function formatOrderForPrint(order, isKitchen = false) {
    return isKitchen ? formatKitchenTicket(order, '') : formatCounterTicket(order, '');
}

async function formatUnifiedTicket(order, loyaltyText) {
    return formatCounterTicket(order, loyaltyText);
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

// Send data to USB printer using print-raw.ps1 script
function sendToUSBPrinter(data, printerName) {
    return new Promise(async (resolve, reject) => {
        const tempFilePath = join(__dirname, `temp_ticket_${Date.now()}_${Math.floor(Math.random() * 1000)}.bin`);
        try {
            await fsPromises.writeFile(tempFilePath, data, 'binary');
            const psScript = join(__dirname, 'print-raw.ps1');
            const command = `powershell -ExecutionPolicy Bypass -File "${psScript}" -PrinterName "${printerName}" -FilePath "${tempFilePath}"`;
            
            exec(command, async (error, stdout, stderr) => {
                // Clean up temp file
                try {
                    await fsPromises.unlink(tempFilePath);
                } catch (err) {
                    // ignore
                }
                
                if (error) {
                    console.error('❌ USB Printer Error:', stderr || error.message);
                    reject(error);
                } else {
                    console.log(`✅ Successfully printed to USB printer: ${printerName}`);
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

// Send formatted data to all printers (parallel, queued globally)
async function sendToAllPrinters(ticketData, label) {
    let success = false;

    // 1. Try USB Printer (Ethernet is frozen for now)
    const usbPrinterName = COUNTER_PRINTER_NAME || process.env.USB_PRINTER_NAME;
    if (usbPrinterName && usbPrinterName.trim()) {
        try {
            console.log(`🖨️  Printing [${label}] on USB printer "${usbPrinterName}"`);
            await sendToUSBPrinter(ticketData, usbPrinterName);
            success = true;
        } catch (err) {
            console.error(`❌ USB Printer failed: ${err.message}`);
        }
    }

    if (!success) {
        console.error(`❌ Printer failed for [${label}]. USB printer: ${usbPrinterName}`);
    }

    return success;
}

// Print order ticket (QUEUED) — dual: cuisine (Ethernet) + caisse (USB)
async function printWithRetry(order, loyaltyText) {
    const label = `Order #${order.order_number}`;
    return enqueuePrintJob(async () => {
        console.log(`🖨️  Impression double ticket #${order.order_number}...`);
        return printDualTickets(order, loyaltyText || '');
    }, label);
}

// Print raw pre-formatted data (QUEUED) — for invoices, HACCP, etc.
async function printRawWithRetry(ticketData, label) {
    return enqueuePrintJob(async () => {
        console.log(`🖨️  Printing [${label}]...`);
        return sendToAllPrinters(ticketData, label);
    }, label);
}

// ── DUAL PRINT (direct — do NOT wrap in enqueuePrintJob, already called from one) ──
// Ticket 1 → Ethernet cuisine : formatKitchenTicket (disabled for now)
// Ticket 2 → Star TSP100 USB  : formatCounterTicket (reçu complet client)
async function printDualTickets(order, loyaltyText) {
    let kitchenPromise = Promise.resolve(false);
    let counterPromise = Promise.resolve(false);

    // ── 1. TICKET CUISINE → Ethernet (Parallel, does not block USB) ──
    if (PRINTER_IPS.length > 0) {
        kitchenPromise = (async () => {
            try {
                const data = await formatKitchenTicket(order);
                const results = await Promise.allSettled(
                    PRINTER_IPS.map(ip => printToSinglePrinter(data, ip, `Cuisine #${order.order_number}`))
                );
                const ok = results.some(r => r.status === 'fulfilled' && r.value === true);
                if (ok) console.log(`✅ Ticket cuisine → ${PRINTER_IPS.join(', ')}`);
                return ok;
            } catch (err) {
                console.error(`❌ Ticket cuisine erreur: ${err.message}`);
                return false;
            }
        })();
    } else {
        console.log('⚠️  Aucun PRINTER_IPS configuré — ticket cuisine ignoré');
    }

    // ── 2. TICKET CAISSE → Star TSP100 USB (Parallel, does not block Ethernet) ──
    if (COUNTER_PRINTER_NAME) {
        counterPromise = (async () => {
            try {
                const data = await formatCounterTicket(order, loyaltyText || '');
                await sendToUSBPrinter(data, COUNTER_PRINTER_NAME);
                console.log(`✅ Ticket caisse → "${COUNTER_PRINTER_NAME}"`);
                return true;
            } catch (err) {
                console.error(`❌ Imprimante caisse "${COUNTER_PRINTER_NAME}" échouée: ${err.message}`);
                return false;
            }
        })();
    } else {
        console.log('⚠️  COUNTER_PRINTER_NAME non configuré dans .env — ticket caisse ignoré');
    }

    const [kitchenOk, counterOk] = await Promise.all([kitchenPromise, counterPromise]);
    return kitchenOk || counterOk;
}

// Orders currently being printed (in-flight guard — prevents the 10s poll and
// realtime from queueing the SAME order multiple times = paper waste).
const processingOrders = new Set();

// Handle new order. `force` = bypass the printed cache (used by manual recovery).
async function handleNewOrder(order, force = false) {
    // Skip if already printed (unless forced)
    if (!force && printedOrders.has(order.id)) {
        return; // already handled — do NOT reprint
    }
    // Skip if a print for this order is already in progress
    if (processingOrders.has(order.id)) {
        return;
    }
    processingOrders.add(order.id);

    // ── MARQUER IMMÉDIATEMENT pour éviter la duplication ──────────────────────
    // Si realtime rejoue l'événement OU si le polling tourne pendant l'impression,
    // le deuxième appel sera bloqué par printedOrders.has() ci-dessus.
    if (!force) {
        printedOrders.set(order.id, Date.now());
        savePrintedOrders();
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📦 NOUVELLE COMMANDE: ${order.order_number}`);
    console.log(`   Type   : ${order.order_type}`);
    console.log(`   Client : ${order.customer_name}`);
    console.log(`   Total  : ${order.total}€`);
    console.log(`${'='.repeat(50)}\n`);

    try {
        // Fetch loyalty (utilisé uniquement sur le ticket caisse)
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
            console.error('Erreur fidélité:', err.message);
        }

        // Impression double (cuisine Ethernet + caisse USB) via la queue
        const success = await enqueuePrintJob(async () => {
            return printDualTickets(order, loyaltyText);
        }, `Order #${order.order_number}`);

        if (success) {
            await markOrderPrinted(order.id);
            console.log(`✅ Commande ${order.order_number} — 2 tickets imprimés`);
        } else {
            await markPrintAttempt(order.id, 'Impression échouée (les 2 imprimantes)');
            console.log(`⚠️  Commande ${order.order_number} — ÉCHEC impression. Utiliser "Récupérer les manqués"`);
        }
    } finally {
        processingOrders.delete(order.id);
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
            printedOrders.delete(fullOrder.id);       // clear cache so the forced reprint goes through
            await handleNewOrder(fullOrder, true);    // force = bypass printed cache
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
    ticket += ESCPOS.UPSIDE_ON;
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
    ticket += ESCPOS.UPSIDE_ON;
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
    ticket += ESCPOS.UPSIDE_ON;
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

// Mock order for template test prints
const MOCK_TEST_ORDER = {
    order_number: 'TEST',
    order_type: 'livraison',
    created_at: new Date().toISOString(),
    customer_name: 'Jean Dupont',
    customer_phone: '06 12 34 56 78',
    customer_address: '15 Rue de la Paix, 76530 Grand-Couronne',
    customer_notes: 'Code porte 42A, sonner fort.',
    payment_method: 'cb',
    total: 24.50,
    subtotal: 22.00,
    delivery_fee: 2.50,
    items: [
        {
            quantity: 1,
            name: 'Pizza Margherita',
            category: 'pizzas',
            price: 12.50,
            customization: {
                size: 'Sénior',
                supplements: ['Supplément Fromage']
            }
        },
        {
            quantity: 2,
            name: 'Coca-Cola 33cl',
            category: 'boissons',
            price: 4.00,
            customization: {
                drink: 'Coca Zero'
            }
        },
        {
            quantity: 1,
            name: 'Tiramisu Maison',
            category: 'desserts',
            price: 4.00
        }
    ]
};

// Setup Express HTTP server
function setupHttpServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health / status endpoints (both paths, Electron checks /status)
    const statusHandler = (req, res) => {
        res.json({ status: 'ok', online: true, printers: PRINTER_IPS, port: PRINTER_PORT });
    };
    app.get('/health', statusHandler);
    app.get('/status', statusHandler);

    // Template test print endpoint
    app.post('/print-test-template', async (req, res) => {
        console.log('\n📥 Template test print request received');
        try {
            const { templateType, template } = req.body;
            if (!template) {
                return res.status(400).json({ error: 'Missing template configuration' });
            }

            console.log(`   Type: ${templateType}`);
            console.log(`   Paper Width: ${template.paperWidth || '80mm'}`);

            const loyaltyText = templateType === 'counter' ? '\n' + ESC + 'a' + '\x01' + ESC + 'E' + '\x01' + 'FIDELITE: 5/9 Tampons\n' + ESC + 'E' + '\x00' + 'Plus que 4 pour la gratuite!\n' : '';
            const ticketData = await formatDynamicTicket(MOCK_TEST_ORDER, template, loyaltyText);

            let success = false;
            if (templateType === 'kitchen') {
                if (PRINTER_IPS.length > 0) {
                    console.log(`🖨️  Printing test kitchen ticket to Ethernet IPs: ${PRINTER_IPS.join(', ')}`);
                    const results = await Promise.allSettled(
                        PRINTER_IPS.map(ip => printToSinglePrinter(ticketData, ip, `Test Kitchen`))
                    );
                    success = results.some(r => r.status === 'fulfilled' && r.value === true);
                } else {
                    return res.status(400).json({ error: 'No Ethernet kitchen printer IPs configured in print-server/.env (PRINTER_IPS)' });
                }
            } else {
                const usbPrinterName = COUNTER_PRINTER_NAME || process.env.USB_PRINTER_NAME;
                if (usbPrinterName && usbPrinterName.trim()) {
                    console.log(`🖨️  Printing test client ticket to USB: "${usbPrinterName}"`);
                    await sendToUSBPrinter(ticketData, usbPrinterName);
                    success = true;
                } else {
                    return res.status(400).json({ error: 'No USB printer name configured' });
                }
            }

            if (success) {
                res.json({ success: true, message: 'Test ticket printed successfully' });
            } else {
                res.status(500).json({ error: 'Failed to print test ticket. Check printer connections.' });
            }
        } catch (error) {
            console.error('❌ Template test print error:', error.message);
            res.status(500).json({ error: error.message });
        }
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
    ticket += ESCPOS.UPSIDE_ON;
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
    ticket += ESCPOS.UPSIDE_ON;
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

    // ── CUSTOM INVOICE endpoint ──────────────────────────────────────────────
    // Called directly by FactureManager in the admin UI
    // Expects: { invoiceNumber, invoiceDate, clientName, clientSiret, clientAddress,
    //            clientPhone, clientEmail, items:[{description,quantity,unitPrice}],
    //            tvaRate, notes, headerTitle, headerSubtitle }
    app.post('/print-custom-invoice', async (req, res) => {
        console.log('\n📥 Custom invoice print request');
        try {
            const {
                invoiceNumber, invoiceDate, clientName, clientSiret,
                clientAddress, clientPhone, clientEmail,
                items = [], tvaRate = 10, notes,
                headerTitle = 'TWIN PIZZA',
                headerSubtitle = '60 Rue Georges Clemenceau\n76530 Grand-Couronne\n02 32 11 26 13',
            } = req.body;

            if (!invoiceNumber || !items.length) {
                return res.status(400).json({ error: 'invoiceNumber and items required' });
            }

            console.log(`   Invoice: ${invoiceNumber}  Client: ${clientName}  Items: ${items.length}`);

            // ── Format invoice ticket ───────────────────────────────────────────
            const LINE = ESCPOS.LINE_42;
            let t = '';
            t += ESCPOS.INIT + ESCPOS.SET_CODEPAGE_1252;
    t += ESCPOS.UPSIDE_ON;

            // Header — business info
            t += ESCPOS.CENTER;
            t += ESCPOS.DOUBLE_SIZE + ESCPOS.BOLD_ON;
            t += 'FACTURE\n';
            t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF + '\n';
            t += ESCPOS.BOLD_ON + headerTitle + '\n' + ESCPOS.BOLD_OFF;
            (headerSubtitle || '').split('\n').forEach(l => { t += l.trim() + '\n'; });
            t += LINE;

            // Legal numbers
            t += ESCPOS.LEFT;
            t += ESCPOS.BOLD_ON + 'SIRET: ' + ESCPOS.BOLD_OFF + '942 617 358 00018\n';
            t += ESCPOS.BOLD_ON + 'N. TVA: ' + ESCPOS.BOLD_OFF + 'FR28942617358\n';
            t += LINE;

            // Invoice reference + date
            const dateStr = invoiceDate
                ? new Date(invoiceDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
                : new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
            const timeStr = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris' });

            t += ESCPOS.BOLD_ON;
            t += `Facture N.: ${invoiceNumber}\n`;
            t += ESCPOS.BOLD_OFF;
            t += `Date: ${dateStr} a ${timeStr}\n`;
            t += LINE;

            // Client info
            if (clientName) {
                t += ESCPOS.BOLD_ON + 'CLIENT:\n' + ESCPOS.BOLD_OFF;
                t += clientName + '\n';
                if (clientSiret)   t += 'SIRET: ' + clientSiret + '\n';
                if (clientAddress) t += clientAddress + '\n';
                if (clientPhone)   t += 'Tel: ' + clientPhone + '\n';
                if (clientEmail)   t += clientEmail + '\n';
                t += LINE;
            }

            // Items table
            t += ESCPOS.BOLD_ON + ' QT  DESIGNATION           P.U.    TTC\n' + ESCPOS.BOLD_OFF;
            t += LINE;

            let totalHT = 0;
            for (const item of items) {
                const qty   = Number(item.quantity)  || 1;
                const unit  = Number(item.unitPrice) || 0;
                const ttc   = qty * unit;
                const ht    = ttc / (1 + tvaRate / 100);
                totalHT += ht;

                t += ESCPOS.BOLD_ON + ` ${qty}   ${item.description}\n` + ESCPOS.BOLD_OFF;
                const priceStr = `${unit.toFixed(2)}  ${ttc.toFixed(2)}`;
                t += ' '.repeat(Math.max(1, 42 - priceStr.length - 4)) + priceStr + '\n';
            }

            t += LINE;

            // Totals
            const totalTTC = items.reduce((s, i) => s + (Number(i.quantity)||1) * (Number(i.unitPrice)||0), 0);
            const tvaAmt   = totalTTC - totalHT;

            t += ESCPOS.LEFT;
            t += `NB ARTICLES: ${items.length}\n`;
            t += LINE;
            t += ESCPOS.BOLD_ON + ` TVA  TAUX    HT      TVA     TTC\n` + ESCPOS.BOLD_OFF;
            t += ` (001) ${tvaRate}%  ${totalHT.toFixed(2)}  ${tvaAmt.toFixed(2)}  ${totalTTC.toFixed(2)}\n`;
            t += LINE;

            t += ESCPOS.RIGHT;
            t += `TOTAL HT : ${totalHT.toFixed(2)}E\n`;
            t += `TVA ${tvaRate}% : ${tvaAmt.toFixed(2)}E\n`;
            t += ESCPOS.DOUBLE_HEIGHT + ESCPOS.BOLD_ON;
            t += `TOTAL TTC : ${totalTTC.toFixed(2)}E\n`;
            t += ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
            t += LINE;

            // Notes
            if (notes) {
                t += ESCPOS.LEFT + 'Note: ' + notes + '\n';
                t += LINE;
            }

            // Footer
            t += ESCPOS.CENTER;
            t += '\nMerci de votre confiance!\n';
            t += 'Twin Pizza - Entreprise individuelle\n';
            t += 'SIRET: 942 617 358 00018  TVA: FR28942617358\n';
            t += '\n' + ESCPOS.FEED + ESCPOS.PARTIAL_CUT;

            const ticketData = convertToCP1252(t);
            const success = await printRawWithRetry(ticketData, `FACTURE-${invoiceNumber}`);

            if (success) {
                console.log(`✅ Invoice ${invoiceNumber} printed`);
                res.json({ success: true });
            } else {
                console.error(`❌ Failed to print invoice ${invoiceNumber}`);
                res.status(500).json({ error: 'Impression echouee — verifiez l\'imprimante' });
            }
        } catch (err) {
            console.error('❌ Custom invoice error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // GET available system printers
    app.get('/available-printers', async (req, res) => {
        console.log('\n📥 Listing available printers request');
        try {
            exec('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"', (err, stdout, stderr) => {
                if (err) {
                    console.error('❌ Error listing printers:', err.message);
                    return res.status(500).json({ error: 'Failed to list printers: ' + err.message });
                }
                try {
                    const printers = JSON.parse(stdout);
                    const names = Array.isArray(printers)
                        ? printers.map(p => p.Name).filter(Boolean)
                        : (printers && printers.Name ? [printers.Name] : []);
                    console.log(`   Found ${names.length} printers`);
                    res.json({ success: true, printers: names });
                } catch (parseErr) {
                    // Try fallback string parser if JSON parsing failed
                    const lines = stdout.split('\r\n').map(l => l.trim()).filter(l => l && l !== 'Name' && !l.startsWith('----'));
                    console.log(`   Found ${lines.length} printers (fallback)`);
                    res.json({ success: true, printers: lines });
                }
            });
        } catch (error) {
            console.error('❌ Printer list exception:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // POST print-test
    app.post('/print-test', async (req, res) => {
        console.log('\n📥 Test print request received');
        try {
            if (!COUNTER_PRINTER_NAME) {
                return res.status(400).json({ error: 'No counter printer name configured. Please save a printer name first.' });
            }

            // Star Line Mode formatting overrides for Star TSP100 USB printer
            const ESCPOS = {
                INIT: ESC + '@',
                SET_CODEPAGE_1252: ESC + 't' + '\x10',
                CENTER: ESC + 'a' + '\x01',
                LEFT: ESC + 'a' + '\x00',
                RIGHT: ESC + 'a' + '\x02',
                BOLD_ON: ESC + 'E' + '\x01',
                BOLD_OFF: ESC + 'E' + '\x00',
                DOUBLE_HEIGHT: ESC + 'i' + '\x00' + '\x01',
                DOUBLE_WIDTH: ESC + 'i' + '\x01' + '\x00',
                DOUBLE_SIZE: ESC + 'i' + '\x01' + '\x01',
                NORMAL_SIZE: ESC + 'i' + '\x00' + '\x00',
                UNDERLINE_ON: ESC + '-' + '\x01',
                UNDERLINE_OFF: ESC + '-' + '\x00',
                PARTIAL_CUT: '\x1D\x56\x01',
                FEED: ESC + 'd' + '\x03',
                UPSIDE_ON:  ESC + '{' + '\x01',
                UPSIDE_OFF: ESC + '{' + '\x00',
            };

            let t = '';
            t += ESCPOS.INIT + ESCPOS.SET_CODEPAGE_1252;
            t += ESCPOS.UPSIDE_ON;
            t += ESCPOS.CENTER;
            t += ESCPOS.BOLD_ON + ESCPOS.DOUBLE_SIZE + 'TEST IMPRIMANTE\n' + ESCPOS.NORMAL_SIZE + ESCPOS.BOLD_OFF;
            t += 'Star TSP100 USB\n';
            t += ESCPOS.LINE_42;
            t += ESCPOS.LEFT;
            t += 'Date: ' + new Date().toLocaleString('fr-FR') + '\n';
            t += 'Imprimante: ' + COUNTER_PRINTER_NAME + '\n';
            t += ESCPOS.LINE_42;
            t += ESCPOS.CENTER;
            t += ESCPOS.BOLD_ON + 'STATUT: SUCCES\n' + ESCPOS.BOLD_OFF;
            t += 'L\'imprimante est correctement configuree !\n';
            t += ESCPOS.LINE_42;
            
            // Google Review QR code
            t += ESCPOS.CENTER + ESCPOS.BOLD_ON + 'Laissez-nous un avis ! *\n' + ESCPOS.BOLD_OFF;
            t += getQRCodeString('https://g.page/r/CXpZZnzoTBFREBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr') + '\n';
            t += ESCPOS.LINE_42;
            
            t += '\n' + ESCPOS.FEED + ESCPOS.PARTIAL_CUT;

            const ticketData = convertToCP1252(t);
            await sendToUSBPrinter(ticketData, COUNTER_PRINTER_NAME);
            console.log(`✅ Test print successfully sent to: "${COUNTER_PRINTER_NAME}"`);
            res.json({ success: true, message: `Test print sent to ${COUNTER_PRINTER_NAME}` });
        } catch (error) {
            console.error('❌ Test print error:', error.message);
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

    // 🔄 RECOVERY: On startup, only recover orders explicitly marked failed in DB.
    // Do NOT sweep all of today — that causes reprints if printed_orders.json is missing.
    console.log('\n🔄 Running startup recovery check...');
    setTimeout(async () => {
        await recoverMissedPrints(); // only orders with printed=false in order_processing_status
    }, 3000);

    // Polling fallback — catches orders missed by realtime (e.g. brief disconnects)
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

