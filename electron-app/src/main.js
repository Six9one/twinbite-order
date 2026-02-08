// Import electron modules FIRST (must be before any other require)
const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import other modules
// NOTE: electron-store v8.x is ESM-only, disabled for now
// const Store = require('electron-store');

// Initialize store for settings
// const store = new Store();

// Supabase service (lazy load after app ready)
let supabaseService = null;

// Keep references to windows
let mainWindow = null;
let notificationWindow = null;

// WhatsApp client reference
let whatsappClient = null;
let whatsappStatus = 'disconnected'; // disconnected, connecting, connected
let isWhatsAppReady = false; // True only when fully synced and ready to send

// Print server status
let printerStatus = 'unknown'; // unknown, ready, error

// Create the main application window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'Twin Pizza Hub',
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true, // Enable <webview> tag
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        show: false // Show after ready
    });

    // Load the renderer
    if (process.argv.includes('--dev')) {
        // Development: load from Vite dev server
        mainWindow.loadURL('http://localhost:5173/admin/dashboard');
        mainWindow.webContents.openDevTools();
    } else {
        // Production: load built files
        mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        // Send current WhatsApp status to renderer
        mainWindow.webContents.send('whatsapp-status', whatsappStatus);
        console.log('📱 Sent initial WhatsApp status to renderer:', whatsappStatus);
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create full-screen notification overlay window
function createNotificationWindow(orderData) {
    if (notificationWindow) {
        notificationWindow.close();
    }

    notificationWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: false,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load notification HTML with order data
    notificationWindow.loadFile(path.join(__dirname, 'renderer/notification.html'));

    // Send order data once loaded
    notificationWindow.webContents.once('did-finish-load', () => {
        notificationWindow.webContents.send('order-data', orderData);
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (notificationWindow && !notificationWindow.isDestroyed()) {
            notificationWindow.close();
            notificationWindow = null;
        }
    }, 5000);

    // Allow click to close
    notificationWindow.on('closed', () => {
        notificationWindow = null;
    });
}

// Play notification sound
function playNotificationSound() {
    if (mainWindow) {
        mainWindow.webContents.send('play-sound');
    }
}

// ============================================
// IPC HANDLERS - Communication with renderer
// ============================================

// Get status of all services
ipcMain.handle('get-status', async () => {
    return {
        whatsapp: whatsappStatus,
        printer: printerStatus,
        internet: 'connected' // TODO: implement proper check
    };
});

// Print ticket
ipcMain.handle('print-ticket', async (event, orderData) => {
    console.log('🖨️ Print request for order:', orderData.order_number);

    try {
        // Try to print using escpos
        const result = await printTicket(orderData);
        return { success: true, message: 'Ticket imprimé!' };
    } catch (error) {
        console.error('Print error:', error);
        // Retry once
        try {
            console.log('🔄 Retrying print...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = await printTicket(orderData);
            return { success: true, message: 'Ticket imprimé (2ème essai)!' };
        } catch (retryError) {
            console.error('Print retry failed:', retryError);
            return { success: false, message: 'Erreur impression: ' + retryError.message };
        }
    }
});

// Send WhatsApp message
ipcMain.handle('send-whatsapp', async (event, { phone, message }) => {
    console.log('💬 WhatsApp request to:', phone);

    if (whatsappStatus !== 'connected') {
        return { success: false, message: 'WhatsApp non connecté' };
    }

    try {
        const result = await sendWhatsAppMessage(phone, message);
        return { success: true, message: 'Message envoyé!' };
    } catch (error) {
        console.error('WhatsApp error:', error);
        // Retry once
        try {
            console.log('🔄 Retrying WhatsApp...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = await sendWhatsAppMessage(phone, message);
            return { success: true, message: 'Message envoyé (2ème essai)!' };
        } catch (retryError) {
            console.error('WhatsApp retry failed:', retryError);
            return { success: false, message: 'Erreur WhatsApp: ' + retryError.message };
        }
    }
});

// Show order notification
ipcMain.handle('show-order-notification', async (event, orderData) => {
    createNotificationWindow(orderData);
    playNotificationSound();

    // Also show system notification
    new Notification({
        title: '🍕 Nouvelle Commande!',
        body: `#${orderData.order_number} - ${orderData.order_type.toUpperCase()} - ${orderData.total}€`,
        icon: path.join(__dirname, '../assets/icon.png')
    }).show();

    return { success: true };
});

// Get customer loyalty info
ipcMain.handle('get-loyalty', async (event, phone) => {
    if (!supabaseService) return { stamps: 0, phone, credits: [] };

    try {
        const loyalty = await supabaseService.getLoyaltyByPhone(phone);
        const credits = await supabaseService.getPizzaCredits(phone);
        const history = await supabaseService.getOrderHistory(phone);

        return {
            ...loyalty,
            credits: credits,
            orderHistory: history
        };
    } catch (error) {
        console.error('Error fetching loyalty:', error);
        return { stamps: 0, phone, credits: [], orderHistory: [] };
    }
});

// Get today's orders
ipcMain.handle('get-orders', async (event, dateFilter) => {
    if (!supabaseService) return [];

    try {
        return await supabaseService.getOrders(dateFilter);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
});

// Get daily stats
ipcMain.handle('get-stats', async (event, dateFilter) => {
    if (!supabaseService) return { total: 0, orderCount: 0, pendingCount: 0 };

    try {
        return await supabaseService.getDailyStats(dateFilter);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { total: 0, orderCount: 0, pendingCount: 0 };
    }
});

// ============================================
// WHATSAPP INTEGRATION
// ============================================

async function initWhatsApp() {
    try {
        // 🧹 Clean up old socket if exists (prevents zombie connections)
        if (whatsappClient) {
            console.log('🧹 Cleaning up old WhatsApp connection...');
            try {
                whatsappClient.ev.removeAllListeners();
                whatsappClient.end(new Error('Reconnecting'));
            } catch (e) {
                console.log('Cleanup note:', e.message);
            }
            whatsappClient = null;
        }

        isWhatsAppReady = false;
        console.log('💬 Loading WhatsApp module...');

        // Notify UI we're starting
        if (mainWindow) {
            mainWindow.webContents.send('whatsapp-status', 'connecting');
        }

        const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');

        console.log('💬 Initializing WhatsApp connection...');
        whatsappStatus = 'connecting';

        // Auth state stored in user data folder
        const authPath = path.join(app.getPath('userData'), 'whatsapp-auth');
        console.log('📁 WhatsApp auth path:', authPath);

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        console.log('🔐 Auth state loaded');

        whatsappClient = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Twin Pizza Hub', 'Desktop', '1.0.0'],
            syncFullHistory: false // Faster startup
        });
        console.log('📱 WhatsApp socket created, waiting for QR...');

        // Handle connection updates
        whatsappClient.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            console.log('WhatsApp connection update:', { connection, hasQr: !!qr });

            if (qr) {
                console.log('📱 QR CODE RECEIVED! Sending to renderer...');
                whatsappStatus = 'connecting';
                isWhatsAppReady = false;
                // Send QR to renderer for display
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('whatsapp-qr', qr);
                    console.log('✅ QR sent to renderer');
                } else {
                    console.error('❌ mainWindow not available');
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('WhatsApp disconnected, code:', statusCode, 'reconnecting:', shouldReconnect);
                whatsappStatus = 'disconnected';
                isWhatsAppReady = false;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('whatsapp-status', 'disconnected');
                }

                if (shouldReconnect) {
                    console.log('⏳ Retrying WhatsApp in 5 seconds...');
                    setTimeout(initWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connection open, waiting for full sync...');
                whatsappStatus = 'connected';
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('whatsapp-status', 'connected');
                }

                // Fallback: set ready after 3s if messaging-history.set doesn't fire
                setTimeout(() => {
                    if (!isWhatsAppReady) {
                        console.log('✅ WhatsApp ready (timeout fallback)');
                        isWhatsAppReady = true;
                    }
                }, 3000);
            }
        });

        // Full sync complete - NOW we're truly ready to send
        whatsappClient.ev.on('messaging-history.set', () => {
            console.log('✅ WhatsApp fully synchronized and ready!');
            isWhatsAppReady = true;
        });

        // Track message delivery status for debugging
        whatsappClient.ev.on('messages.update', (updates) => {
            const statusMap = { 1: 'PENDING', 2: 'SENT', 3: 'DELIVERED', 4: 'READ' };
            for (const update of updates) {
                const msgId = update.key?.id?.slice(-8) || '?';
                const status = statusMap[update.update?.status] || update.update?.status;
                console.log(`📩 Message ${msgId}: ${status}`);
            }
        });

        whatsappClient.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('❌ WhatsApp init error:', error);
        console.error('Error stack:', error.stack);
        whatsappStatus = 'error';
        isWhatsAppReady = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whatsapp-status', 'error');
        }
        // Retry in 10 seconds
        console.log('⏳ Retrying WhatsApp in 10 seconds...');
        setTimeout(initWhatsApp, 10000);
    }
}

// Format phone number to WhatsApp JID (handles all French formats)
function formatPhoneToJID(rawPhone) {
    // Remove ALL non-digit characters
    let phone = rawPhone.replace(/\D/g, '');
    console.log('🔢 Phone formatting:', rawPhone, '→', phone);

    // Handle various French formats
    if (phone.startsWith('0033')) {
        phone = phone.slice(2); // 0033612... → 33612...
    } else if (phone.startsWith('33') && phone.length >= 11) {
        // Already has country code - keep as is
    } else if (phone.startsWith('0') && phone.length === 10) {
        phone = '33' + phone.slice(1); // 0612... → 33612...
    } else if (phone.length === 9 && !phone.startsWith('0')) {
        phone = '33' + phone; // 612... → 33612...
    }

    // Validate: French mobile = 33 + 9 digits
    if (!/^33[1-9]\d{8}$/.test(phone)) {
        console.error('❌ Invalid phone after formatting:', rawPhone, '→', phone);
        return null;
    }

    return `${phone}@s.whatsapp.net`;
}

async function sendWhatsAppMessage(phone, message) {
    console.log('📤 ===== WHATSAPP SEND START =====');
    console.log('📞 Raw phone input:', phone);

    if (!whatsappClient) {
        console.error('❌ whatsappClient is NULL');
        throw new Error('WhatsApp client not initialized');
    }

    if (whatsappStatus !== 'connected') {
        console.error('❌ WhatsApp status is:', whatsappStatus);
        throw new Error(`WhatsApp not connected (status: ${whatsappStatus})`);
    }

    // Wait for full ready state if needed
    if (!isWhatsAppReady) {
        console.log('⏳ Waiting for WhatsApp to be fully ready...');
        let waited = 0;
        while (!isWhatsAppReady && waited < 10000) {
            await new Promise(r => setTimeout(r, 500));
            waited += 500;
        }
        if (!isWhatsAppReady) {
            console.warn('⚠️ WhatsApp not fully ready, proceeding anyway...');
        } else {
            console.log('✅ WhatsApp now ready');
        }
    }

    // Format phone to JID
    const jid = formatPhoneToJID(phone);
    if (!jid) {
        throw new Error(`Invalid phone number format: ${phone}`);
    }
    console.log('📱 Formatted JID:', jid);

    // Optional: Verify number is on WhatsApp
    try {
        const [result] = await whatsappClient.onWhatsApp(jid.replace('@s.whatsapp.net', ''));
        if (!result?.exists) {
            console.warn('⚠️ Number may NOT be on WhatsApp:', phone);
        } else {
            console.log('✅ Number verified on WhatsApp');
        }
    } catch (e) {
        console.log('⚠️ onWhatsApp check failed:', e.message);
    }

    // Send the message
    const result = await whatsappClient.sendMessage(jid, { text: message });
    console.log('✅ Message sent! ID:', result.key?.id);
    console.log('📤 ===== WHATSAPP SEND END =====');

    return result;
}

// Generate WhatsApp message for new orders
function generateOrderMessage(order) {
    const typeLabels = {
        livraison: '🚗 Livraison',
        emporter: '🛍️ À emporter',
        surplace: '🍽️ Sur place'
    };

    let message = `🍕 *TWIN PIZZA* - Confirmation de commande\n\n`;
    message += `📋 *Commande #${order.order_number}*\n`;
    message += `📦 *Type:* ${typeLabels[order.order_type] || order.order_type}\n\n`;

    // Items list
    const items = Array.isArray(order.items) ? order.items : [];
    message += `*Votre commande:*\n`;
    items.forEach(item => {
        const name = item.item?.name || item.name || 'Produit';
        message += `  • ${item.quantity}x ${name}\n`;
    });

    message += `\n💰 *Total:* ${(order.total || 0).toFixed(2)}€\n\n`;

    if (order.order_type === 'livraison') {
        message += `⏱️ Livraison estimée: 30-45 min\n`;
    } else {
        message += `⏱️ Prêt dans: 15-25 min\n`;
    }

    message += `\nMerci pour votre commande! 🙏`;

    return message;
}
// ============================================
// PRINT INTEGRATION (ETHERNET PRINTER)
// ============================================

const net = require('net');

// Printer settings - Edit these for your printer
const PRINTER_IP = '192.168.1.200';
const PRINTER_PORT = 9100;

async function printTicket(orderData) {
    console.log('🖨️ Printing ticket for order:', orderData.order_number);

    try {
        const ticket = generateTicketData(orderData);
        await sendToPrinter(ticket);
        printerStatus = 'ready';
        console.log('✅ Ticket printed successfully');
        return true;
    } catch (error) {
        console.error('❌ Print error:', error.message);
        printerStatus = 'error';
        return false;
    }
}

function generateTicketData(order) {
    // ESC/POS commands
    const ESC = '\x1B';
    const GS = '\x1D';
    const INIT = ESC + '@';       // Initialize printer
    const CENTER = ESC + 'a1';    // Center align
    const LEFT = ESC + 'a0';      // Left align
    const BOLD_ON = ESC + 'E1';   // Bold on
    const BOLD_OFF = ESC + 'E0';  // Bold off
    const BIG = GS + '!\x11';    // Double height + width
    const NORMAL = GS + '!\x00'; // Normal size
    const CUT = GS + 'V\x00';    // Full cut
    const NEWLINE = '\n';

    let ticket = INIT;

    // Header
    ticket += CENTER + BIG + 'TWIN PIZZA' + NEWLINE;
    ticket += NORMAL + '------------------------' + NEWLINE;

    // Order number (BIG)
    ticket += BIG + 'Commande #' + order.order_number + NEWLINE;
    ticket += NORMAL + NEWLINE;

    // Order type
    const typeLabels = {
        livraison: 'LIVRAISON',
        emporter: 'A EMPORTER',
        surplace: 'SUR PLACE'
    };
    ticket += BOLD_ON + typeLabels[order.order_type] || order.order_type.toUpperCase() + BOLD_OFF + NEWLINE;
    ticket += NEWLINE;

    // Customer info
    ticket += LEFT;
    ticket += 'Client: ' + (order.customer_name || 'Client') + NEWLINE;
    ticket += 'Tel: ' + (order.customer_phone || '-') + NEWLINE;
    if (order.customer_address && order.order_type === 'livraison') {
        ticket += 'Adresse: ' + order.customer_address + NEWLINE;
    }
    ticket += NEWLINE;

    // Items
    ticket += '------------------------' + NEWLINE;
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach(item => {
        const name = item.item?.name || item.name || 'Produit';
        const price = item.item?.price || item.price || 0;
        ticket += item.quantity + 'x ' + name + NEWLINE;
        if (item.options && item.options.length > 0) {
            ticket += '   Options: ' + item.options.join(', ') + NEWLINE;
        }
    });
    ticket += '------------------------' + NEWLINE;

    // Total
    ticket += BIG + 'TOTAL: ' + (order.total || 0).toFixed(2) + ' EUR' + NORMAL + NEWLINE;

    // Payment method
    const paymentLabels = {
        cb: 'CB - A PAYER',
        especes: 'ESPECES - A PAYER',
        en_ligne: 'PAYE EN LIGNE'
    };
    ticket += BOLD_ON + (paymentLabels[order.payment_method] || order.payment_method) + BOLD_OFF + NEWLINE;
    ticket += NEWLINE;

    // Timestamp
    ticket += CENTER + new Date().toLocaleString('fr-FR') + NEWLINE;
    ticket += NEWLINE + NEWLINE + NEWLINE;
    ticket += CUT;

    return ticket;
}

function sendToPrinter(data) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        client.setTimeout(5000);

        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log('📡 Connected to printer');
            client.write(data, 'binary', () => {
                client.end();
                resolve();
            });
        });

        client.on('error', (err) => {
            client.destroy();
            reject(err);
        });

        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Printer connection timeout'));
        });
    });
}

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
    createMainWindow();

    // Initialize Supabase service
    try {
        supabaseService = require('./services/supabase');
        console.log('✅ Supabase service loaded');

        // Subscribe to new orders
        supabaseService.subscribeToOrders(async (newOrder) => {
            console.log('🆕 New order received via real-time:', newOrder.order_number);

            // Show full-screen notification
            createNotificationWindow(newOrder);
            playNotificationSound();

            // Also send to renderer
            if (mainWindow) {
                mainWindow.webContents.send('new-order', newOrder);
            }

            // AUTO-PRINT: Print ticket automatically
            console.log('🖨️ Auto-printing ticket...');
            try {
                await printTicket(newOrder);
            } catch (printError) {
                console.error('Auto-print failed:', printError);
            }

            // AUTO-WHATSAPP: Send confirmation to customer
            if (newOrder.customer_phone && whatsappStatus === 'connected') {
                console.log('💬 Sending auto WhatsApp to:', newOrder.customer_phone);
                const message = generateOrderMessage(newOrder);
                try {
                    await sendWhatsAppMessage(newOrder.customer_phone, message);
                    console.log('✅ Auto WhatsApp sent!');
                } catch (waError) {
                    console.error('Auto WhatsApp failed:', waError);
                }
            } else {
                console.log('⚠️ Auto WhatsApp skipped - Phone:', newOrder.customer_phone || 'MISSING', '- WhatsApp status:', whatsappStatus);
            }
        });
    } catch (error) {
        console.error('Supabase init error:', error);
    }

    // Initialize WhatsApp
    initWhatsApp();

    // Handle macOS dock click
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

console.log('🍕 Twin Pizza Hub starting...');
