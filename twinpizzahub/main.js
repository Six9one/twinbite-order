const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, exec } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrinterManager } = require('./printer');

// ─── Config ───────────────────────────────────────────────────────────────────
const isDev = process.argv.includes('--dev');
const VITE_PORT = 8080;
const FILE_SERVER_PORT = 3456;

// Thermal printer (Ethernet) — change IP to match your printer
const PRINTER_IP   = process.env.PRINTER_IP   || '192.168.1.200';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');
const printer = new PrinterManager(PRINTER_IP, PRINTER_PORT);

// ─── State ────────────────────────────────────────────────────────────────────
let viteProcess    = null;
let fileServer     = null;
let printServerProcess = null;
let whatsappClient = null;
let whatsappStatus = 'disconnected'; // disconnected | connecting | connected | error
let lastQR         = null; // store last QR so we can re-send it when panel opens
let supabase       = null;

// ─── WhatsApp chat / message store (in-memory + persisted to disk) ──────────
const waChats    = new Map(); // jid → { id, name, unread, lastMsg, lastTs }
const waMessages = new Map(); // jid → [{ id, text, fromMe, ts }]

function getWAHistoryPath() {
  return path.join(app.getPath('userData'), 'wa-history.json');
}
function loadWAHistory() {
  try {
    const p = getWAHistoryPath();
    if (!fs.existsSync(p)) return;
    const { chats, messages } = JSON.parse(fs.readFileSync(p, 'utf8'));
    (chats    || []).forEach(c  => waChats.set(c.id, c));
    Object.entries(messages || {}).forEach(([jid, msgs]) => waMessages.set(jid, msgs));
    console.log(`✅ WA history loaded: ${waChats.size} chats`);
  } catch(e) { console.warn('WA history load error:', e.message); }
}
let _waSaveTimer = null;
function saveWAHistory() {
  if (_waSaveTimer) return; // debounce — save at most once per 5 s
  _waSaveTimer = setTimeout(() => {
    _waSaveTimer = null;
    try {
      const messages = {};
      waMessages.forEach((arr, jid) => { messages[jid] = arr.slice(-150); });
      fs.writeFileSync(getWAHistoryPath(), JSON.stringify({
        chats: [...waChats.values()],
        messages,
        savedAt: Date.now(),
      }));
    } catch(e) { console.warn('WA history save error:', e.message); }
  }, 5000);
}

function normalizeMsg(m) {
  const text = m.message?.conversation
    || m.message?.extendedTextMessage?.text
    || m.message?.imageMessage?.caption
    || m.message?.videoMessage?.caption
    || (m.message?.imageMessage ? '[Image]' : '')
    || (m.message?.stickerMessage ? '[Sticker]' : '')
    || (m.message?.audioMessage ? '[Audio]' : '')
    || '[Message]';
  return { id: m.key.id, text, fromMe: !!m.key.fromMe, ts: (m.messageTimestamp || 0) * 1000 };
}

// ─── Google review timers (in-memory) ──────────────────────────────────────────
// orderId -> setTimeout handle. Fires 40 min after a confirmation is sent.
const reviewTimers = new Map();
const REVIEW_DELAY_MS = 40 * 60 * 1000; // 40 minutes

// ─── Window registry ──────────────────────────────────────────────────────────
const windows = {};
let launcherWin = null;
let tray = null;

// ─── Supabase init ────────────────────────────────────────────────────────────
function initSupabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const WebSocket = require('ws');
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) { console.warn('⚠️ Supabase env vars missing'); return; }
    // ws transport keeps realtime stable on Node < 22 (else orders are missed)
    supabase = createClient(url, key, { realtime: { transport: WebSocket } });
    console.log('✅ Supabase connected');
    listenForOrders();
  } catch(e) {
    console.error('Supabase init error:', e.message);
  }
}

// ─── Order tracking (in-memory, per session) ──────────────────────────────────
const seenOrders     = new Set(); // for UI badge + system notification (once)
const messagedOrders = new Set(); // for WhatsApp confirmation (once, when connected)
const appStartTime   = Date.now(); // don't WhatsApp orders from before this session
let ordersChannel    = null;
let ordersPollTimer  = null;

// Handle one order: UI + notification (once) and WhatsApp (once, when connected)
function handleIncomingOrder(order) {
  if (!order || !order.id) return;

  // ── UI + notification — only the first time we see this order ──
  if (!seenOrders.has(order.id)) {
    seenOrders.add(order.id);
    console.log('🔔 New order:', order.order_number);

    Object.values(windows).forEach(w => {
      if (!w.isDestroyed()) w.webContents.send('new-order', order);
    });
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.webContents.send('new-order', order);
    }
    try {
      new Notification({
        title: '🍕 Nouvelle Commande!',
        body: `#${order.order_number} — ${order.order_type?.toUpperCase()} — ${order.total}€`,
      }).show();
    } catch(_) {}
  }

  // ── WhatsApp confirmation — only once, and only if WhatsApp is connected ──
  if (messagedOrders.has(order.id)) return;
  // Don't re-message orders from before this app session started (avoids
  // re-spamming customers if the Hub is restarted).
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : Date.now();
  if (createdAt < appStartTime - 60000) { messagedOrders.add(order.id); return; }
  const realPhone = order.customer_phone && !['borne','pos','POS'].includes(order.customer_phone);
  if (!realPhone) { messagedOrders.add(order.id); return; } // nothing to send, mark done
  if (whatsappStatus !== 'connected') return; // not connected yet — polling will retry

  messagedOrders.add(order.id); // mark before send to avoid double-send race

  // Always schedule review — 40 min after order, regardless of WA connection state
  scheduleReviewMessage(order);

  const msg = generateOrderMessage(order);
  sendWhatsAppMessage(order.customer_phone, msg)
    .then(() => {
      console.log('✅ WhatsApp confirmation sent for', order.order_number);
      notifyMessageSent({ type:'confirmation', order, phone:order.customer_phone, message:msg, success:true });
    })
    .catch(e => {
      console.error('WhatsApp send failed:', e.message);
      messagedOrders.delete(order.id); // allow retry
      notifyMessageSent({ type:'confirmation', order, phone:order.customer_phone, message:msg, success:false });
    });
}

// ─── Realtime: listen for new orders (with auto-reconnect) ────────────────────
function listenForOrders() {
  if (!supabase) return;
  if (ordersChannel) { try { supabase.removeChannel(ordersChannel); } catch(_) {} }

  ordersChannel = supabase
    .channel('hub-orders-' + Date.now()) // unique name forces a fresh connection
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      handleIncomingOrder(payload.new);
    })
    .subscribe((status) => {
      console.log('📡 Orders realtime status:', status);
      if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        console.log('🔄 Orders realtime dropped — reconnecting in 5s...');
        setTimeout(listenForOrders, 5000);
      }
    });

  // Polling fallback — catches anything realtime missed (also retries WhatsApp
  // for orders that arrived before WhatsApp was connected).
  if (!ordersPollTimer) {
    ordersPollTimer = setInterval(pollRecentOrders, 15000);
    console.log('🔍 Order polling fallback active (every 15s)');
  }
  console.log('👂 Listening for new orders via Supabase Realtime');
}

// Poll the last 15 minutes of orders and process any not yet handled
async function pollRecentOrders() {
  if (!supabase) return;
  try {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('orders').select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    if (error) return;
    (data || []).forEach(handleIncomingOrder);
  } catch(_) {}
}

// ─── WhatsApp (Baileys — FREE, no Meta API) ───────────────────────────────────
async function initWhatsApp() {
  try {
    console.log('💬 Starting WhatsApp (Baileys)...');
    broadcastWA('connecting');

    // Use the new "baileys" package + the CURRENT WhatsApp protocol version.
    // Fetching the latest version fixes the "405 connection closed, no QR" bug
    // that old/hardcoded versions hit when WhatsApp updates its servers.
    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = await import('baileys');
    const authPath = path.join(app.getPath('userData'), 'whatsapp-auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    let waVersion;
    try {
      const v = await fetchLatestBaileysVersion();
      waVersion = v.version;
      console.log('💬 WhatsApp protocol version:', waVersion.join('.'));
    } catch (e) {
      console.warn('Could not fetch WA version, using default:', e.message);
    }

    const noop = () => {};
    const silentLogger = { trace:noop, debug:noop, info:noop, warn:noop, error:noop, fatal:noop, level:'silent', child(){ return this; } };

    whatsappClient = makeWASocket({
      auth: state,
      browser: ['Twin Pizza', 'Desktop', '1.0.0'],
      logger: silentLogger,
      ...(waVersion ? { version: waVersion } : {}),
    });

    whatsappClient.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        whatsappStatus = 'qr';
        console.log('📱 QR ready — sending to UI...');
        // Render the QR locally to a data URL so it works WITHOUT internet
        // (no dependency on an external QR image API).
        try {
          const QRCode = require('qrcode');
          lastQR = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
        } catch (e) {
          lastQR = qr; // fallback to raw string (renderer uses external API)
        }
        broadcastWA('qr', lastQR);
      }

      if (connection === 'open') {
        whatsappStatus = 'connected';
        lastQR = null;
        console.log('✅ WhatsApp connected!');
        broadcastWA('connected');
      }

      if (connection === 'close') {
        whatsappStatus = 'disconnected';
        broadcastWA('disconnected');
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('🔄 WhatsApp reconnecting in 5s...');
          setTimeout(initWhatsApp, 5000);
        } else {
          console.log('⚠️ WhatsApp logged out — rescan QR to reconnect');
          // Clear auth so next init shows fresh QR
          try { fs.rmSync(path.join(app.getPath('userData'), 'whatsapp-auth'), { recursive: true }); } catch(_) {}
          setTimeout(initWhatsApp, 3000);
        }
      }
    });

    whatsappClient.ev.on('creds.update', saveCreds);

    // ── In-memory chat + message store ──────────────────────────────────────
    whatsappClient.ev.on('messaging-history.set', ({ chats, messages }) => {
      (chats || []).forEach(c => {
        if (!waChats.has(c.id)) waChats.set(c.id, { id: c.id, name: c.name || c.id, unread: c.unreadCount || 0, lastMsg: '', lastTs: 0 });
      });
      (messages || []).forEach(m => {
        if (!waMessages.has(m.key.remoteJid)) waMessages.set(m.key.remoteJid, []);
        waMessages.get(m.key.remoteJid).push(normalizeMsg(m));
      });
      broadcastWA(whatsappStatus === 'connected' ? 'connected' : whatsappStatus);
    });

    whatsappClient.ev.on('chats.upsert', chats => {
      chats.forEach(c => {
        const existing = waChats.get(c.id) || {};
        waChats.set(c.id, { ...existing, id: c.id, name: c.name || existing.name || c.id, unread: c.unreadCount || 0 });
      });
    });

    whatsappClient.ev.on('messages.upsert', ({ messages: msgs, type }) => {
      msgs.forEach(m => {
        if (!m.message) return;
        const jid = m.key.remoteJid;
        if (!waMessages.has(jid)) waMessages.set(jid, []);
        const arr = waMessages.get(jid);
        const norm = normalizeMsg(m);
        // Avoid duplicates
        if (!arr.find(x => x.id === norm.id)) arr.push(norm);
        // Keep last 200 per chat
        if (arr.length > 200) arr.splice(0, arr.length - 200);
        saveWAHistory();
        // Update chat metadata
        const chat = waChats.get(jid) || { id: jid, name: jid, unread: 0, lastMsg: '', lastTs: 0 };
        chat.lastMsg = norm.text;
        chat.lastTs  = norm.ts;
        if (!m.key.fromMe) chat.unread = (chat.unread || 0) + 1;
        waChats.set(jid, chat);
        // Notify UI of new incoming message
        [launcherWin, ...Object.values(windows)].forEach(w => {
          if (w && !w.isDestroyed()) w.webContents.send('wa-new-message', { jid, message: norm });
        });
      });
    });

  } catch(err) {
    console.error('WhatsApp init error:', err.message);
    whatsappStatus = 'error';
    broadcastWA('error');
    setTimeout(initWhatsApp, 10000);
  }
}

function broadcastWA(status, qr) {
  whatsappStatus = status === 'qr' ? 'connecting' : status;
  const payload = { status, qr };
  [launcherWin, ...Object.values(windows)].forEach(w => {
    if (w && !w.isDestroyed()) {
      w.webContents.send('whatsapp-status', payload);
      if (qr) w.webContents.send('whatsapp-qr', qr);
    }
  });
}

async function sendWhatsAppMessage(phone, message) {
  if (!whatsappClient || whatsappStatus !== 'connected') throw new Error('WhatsApp not connected');
  const clean = phone.replace(/[^0-9]/g, '');
  const jid = clean.startsWith('33')
    ? `${clean}@s.whatsapp.net`
    : `33${clean.replace(/^0/, '')}@s.whatsapp.net`;
  await whatsappClient.sendMessage(jid, { text: message });
  console.log('✅ WhatsApp sent to:', jid);
}

// Extract a friendly first name from the order
function getFirstName(order) {
  const raw = (order.customer_name || '').trim();
  if (!raw || raw.startsWith('[POS]')) return '';
  return raw.split(/\s+/)[0];
}

// ── SHORT, warm confirmation message ──────────────────────────────────────────
function generateOrderMessage(order) {
  const meta = {
    livraison: { emoji: '🚗', label: 'Livraison',  delay: '30/45 min' },
    emporter:  { emoji: '🛍️', label: 'À emporter', delay: '15/20 min' },
    surplace:  { emoji: '🍽️', label: 'Sur place',  delay: '15/20 min' },
  }[order.order_type] || { emoji: '📦', label: order.order_type || 'Commande', delay: '15/20 min' };

  const name  = getFirstName(order);
  const hello = name ? ` ${name}` : '';
  const phone = encodeURIComponent(order.customer_phone || '');

  let msg = `🍕 *Twin Pizza* — Merci${hello} !\n\n`;
  msg += `Votre commande *#${order.order_number}* est bien reçue ✅\n`;
  msg += `${meta.emoji} ${meta.label} — prêt dans *${meta.delay}*\n\n`;
  msg += `Suivre : twinpizza.fr/ticket?phone=${phone}\n`;
  msg += `À tout de suite ! 😊`;
  return msg;
}

// ── SHORT Google review message (sent 40 min later) ───────────────────────────
function generateReviewMessage(order) {
  const name  = getFirstName(order);
  const hello = name ? ` ${name}` : '';
  const reviewLink = 'https://g.page/r/CXpZZnzoTBFREBM/review?utm_source=gbp&utm_medium=reviews&utm_campaign=qr';

  let msg = `Bonjour${hello} ! 😊\n\n`;
  msg += `Votre commande était bonne ?\n`;
  msg += `On serait trop contents d'avoir votre avis ⭐ :\n`;
  msg += `${reviewLink}\n\n`;
  msg += `Merci d'avance ! 🙏 *Twin Pizza*`;
  return msg;
}

// ── Send review with retry (up to 10 x 2min if WA disconnected at fire time) ──
function attemptReviewSend(order, phone, msg, attempt) {
  if (whatsappStatus !== 'connected') {
    if (attempt < 10) {
      console.log(`⭐ Review retry ${attempt+1}/10 for #${order.order_number} in 2 min (WA not connected)`);
      setTimeout(() => attemptReviewSend(order, phone, msg, attempt + 1), 2 * 60 * 1000);
    } else {
      console.log(`⭐ Review abandoned for #${order.order_number} — WhatsApp never reconnected`);
    }
    return;
  }
  sendWhatsAppMessage(phone, msg)
    .then(() => {
      console.log(`⭐ Review sent for #${order.order_number}`);
      notifyMessageSent({ type:'review', order, phone, message:msg, success:true });
    })
    .catch(e => {
      console.error('Review send failed:', e.message);
      notifyMessageSent({ type:'review', order, phone, message:msg, success:false });
    });
}

// ── Schedule the review message 40 min after the confirmation ─────────────────
function scheduleReviewMessage(order) {
  const phone = order.customer_phone;
  if (!phone) return;
  // Avoid duplicate timers for the same order
  if (reviewTimers.has(order.id)) return;

  console.log(`⭐ Review scheduled for #${order.order_number} in 40 min`);
  const msg = generateReviewMessage(order);
  const handle = setTimeout(() => {
    reviewTimers.delete(order.id);
    attemptReviewSend(order, phone, msg, 0);
  }, REVIEW_DELAY_MS);

  reviewTimers.set(order.id, handle);
}

// ── Tell the launcher UI that a WhatsApp message was actually sent ─────────────
// Includes the recipient phone, name, type, full message text and result.
function notifyMessageSent({ type, order, phone, message, success }) {
  const payload = {
    type,
    order_number: order?.order_number,
    customer_name: order?.customer_name,
    phone,
    message,
    success,
    time: Date.now(),
  };
  if (launcherWin && !launcherWin.isDestroyed()) {
    launcherWin.webContents.send('whatsapp-message-sent', payload);
  }
}

// Printing handled by PrinterManager in printer.js

// ─── Mini HTTP server (production) ────────────────────────────────────────────
function startFileServer() {
  const distPath = path.join(__dirname, '..', 'dist');
  const mime = {
    '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
    '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
    '.svg':'image/svg+xml', '.json':'application/json', '.ico':'image/x-icon',
    '.woff':'font/woff', '.woff2':'font/woff2', '.webp':'image/webp',
  };

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(distPath)) {
      reject(new Error('dist/ not found — run npm run build first'));
      return;
    }
    fileServer = http.createServer((req, res) => {
      let p = path.join(distPath, req.url.split('?')[0]);
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(distPath, 'index.html');
      const ext = path.extname(p).toLowerCase();
      const ct = mime[ext] || 'application/octet-stream';
      
      const headers = { 'Content-Type': ct };
      if (ext === '.html') {
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
      } else if (['.js', '.css', '.woff', '.woff2'].includes(ext)) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'].includes(ext)) {
        headers['Cache-Control'] = 'public, max-age=604800'; // 1 week
      }

      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, headers);
        res.end(data);
      });
    });
    fileServer.listen(FILE_SERVER_PORT, '127.0.0.1', resolve);
    fileServer.on('error', reject);
  });
}

// ─── Vite (dev mode) ──────────────────────────────────────────────────────────
function startVite() {
  return new Promise((resolve) => {
    viteProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'), shell: true, stdio: 'pipe',
    });
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    viteProcess.stdout.on('data', d => { if (d.toString().match(/localhost|ready|Local:/)) setTimeout(finish, 600); });
    setTimeout(finish, 7000);
  });
}

// ─── Spawn print server ───────────────────────────────────────────────────────
// First check if a print server is already running (started by LANCER_TWINPIZZA.bat)
function startPrintServer() {
  // Ping port 3001 — if already running, skip spawning
  const testReq = http.get('http://localhost:3001/status', (res) => {
    if (res.statusCode === 200) {
      console.log('🖨️ Print server already running on port 3001 — skipping spawn.');
      return;
    }
    spawnPrintServer();
  });
  testReq.on('error', () => {
    // Not running — spawn it
    spawnPrintServer();
  });
  testReq.setTimeout(1000, () => {
    testReq.destroy();
    spawnPrintServer();
  });
}

function spawnPrintServer() {
  const serverPath = path.join(__dirname, '..', 'print-server', 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.warn('⚠️ Print server not found at', serverPath);
    return;
  }
  console.log('🖨️ Spawning print server...');
  printServerProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..', 'print-server'),
    stdio: 'pipe',
    env: { ...process.env },
  });
  printServerProcess.stdout.on('data', d => process.stdout.write('[PRINT] ' + d));
  printServerProcess.stderr.on('data', d => process.stderr.write('[PRINT ERR] ' + d));
  printServerProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`🖨️ Print server exited (${code}) — restarting in 5s...`);
      printServerProcess = null;
      setTimeout(startPrintServer, 5000);
    }
  });
}

function getUrl(route = '/') {
  const base = isDev ? `http://localhost:${VITE_PORT}` : `http://localhost:${FILE_SERVER_PORT}`;
  return base + route;
}

// ─── Screen helpers ───────────────────────────────────────────────────────────
function getSecondDisplay() {
  const all = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  return all.find(d => d.id !== primary.id) || primary;
}

// ─── Window factory ───────────────────────────────────────────────────────────
function createWindow(name, { route, display, fullscreen = false, width = 1366, height = 860, title }) {
  if (windows[name] && !windows[name].isDestroyed()) { windows[name].focus(); return windows[name]; }
  const { bounds } = display || screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    title: title || `TwinPizza — ${name}`,
    x: bounds.x + (fullscreen ? 0 : Math.floor((bounds.width - width) / 2)),
    y: bounds.y + (fullscreen ? 0 : Math.floor((bounds.height - height) / 2)),
    width: fullscreen ? bounds.width : width,
    height: fullscreen ? bounds.height : height,
    fullscreen, autoHideMenuBar: true,
    show: false,              // no black flash
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(getUrl(route));
  win.on('closed', () => { delete windows[name]; });
  windows[name] = win;
  return win;
}

// ─── Launcher ────────────────────────────────────────────────────────────────
function createLauncher() {
  if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.focus(); return; }
  launcherWin = new BrowserWindow({
    title: 'Twin Pizza', width: 1400, height: 860, minWidth: 1100, minHeight: 700,
    center: true, autoHideMenuBar: true,
    show: true,
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
    },
  });
  launcherWin.loadFile(path.join(__dirname, 'launcher.html'));
  // Re-send QR and printer status once window finishes loading
  launcherWin.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (lastQR) broadcastWA('qr', lastQR);
      if (whatsappStatus) broadcastWA(whatsappStatus, lastQR);
    }, 500);
  });
  launcherWin.on('closed', () => {
    launcherWin = null;
    Object.values(windows).forEach(w => { try { if (!w.isDestroyed()) w.close(); } catch(_){} });
  });
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('open-window', (_, name) => {
  const cfg = {
    admin:   { route: '/admin/dashboard', title: 'TwinPizza — POS / Admin', width: 1440, height: 900 },
    tv:      { route: '/tv',              title: 'TwinPizza — Écran Cuisine', display: getSecondDisplay(), fullscreen: true },
    kiosk:   { route: '/kiosk',           title: 'TwinPizza — Borne', fullscreen: true },
    kitchen: { route: '/kitchen',         title: 'TwinPizza — HACCP' },
    crew:    { route: '/crew',            title: 'TwinPizza — Équipe' },
    website: { route: '/',               title: 'TwinPizza — Site Client' },
  }[name];
  if (cfg) createWindow(name, cfg);
});

ipcMain.handle('get-displays', () =>
  screen.getAllDisplays().map(d => ({
    id: d.id, label: d.label || `Écran ${d.id}`,
    primary: d.id === screen.getPrimaryDisplay().id, bounds: d.bounds,
  }))
);

ipcMain.handle('get-whatsapp-status', () => {
  console.log(`[WA Status] status=${whatsappStatus} hasQR=${!!lastQR}`);
  return { status: whatsappStatus, qr: lastQR };
});

ipcMain.handle('send-whatsapp', async (_, { phone, message }) => {
  try { await sendWhatsAppMessage(phone, message); return { success: true }; }
  catch(e) { return { success: false, message: e.message }; }
});

// ─── WhatsApp chat/conversation IPC ──────────────────────────────────────────
ipcMain.handle('get-wa-chats', () => {
  const list = Array.from(waChats.values())
    .filter(c => !c.id.endsWith('@g.us') || true) // include groups too
    .sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
    .slice(0, 100);
  return list;
});

ipcMain.handle('get-wa-messages', (_, jid) => {
  const msgs = waMessages.get(jid) || [];
  return msgs.slice(-100); // last 100 messages
});

ipcMain.handle('send-wa-message', async (_, { jid, text }) => {
  try {
    if (!whatsappClient || whatsappStatus !== 'connected') throw new Error('WhatsApp non connecté');
    await whatsappClient.sendMessage(jid, { text });
    // Store it locally
    const norm = { id: Date.now() + '', text, fromMe: true, ts: Date.now() };
    if (!waMessages.has(jid)) waMessages.set(jid, []);
    waMessages.get(jid).push(norm);
    const chat = waChats.get(jid) || { id: jid, name: jid, unread: 0, lastMsg: '', lastTs: 0 };
    chat.lastMsg = text; chat.lastTs = Date.now();
    waChats.set(jid, chat);
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
});

const PRINT_SERVER = 'http://localhost:3001';

// Check print server status
async function getPrintServerStatus() {
  return new Promise((resolve) => {
    http.get(`${PRINT_SERVER}/status`, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ online: true, ...JSON.parse(body) }); }
        catch(_) { resolve({ online: true }); }
      });
    }).on('error', () => resolve({ online: false }));
  });
}

ipcMain.handle('get-printer-state', async () => {
  const s = await getPrintServerStatus();
  return {
    status: s.online ? 'online' : 'offline',
    serverUrl: PRINT_SERVER,
    online: s.online,
    ...s,
  };
});

ipcMain.handle('print-thermal', async (_, orderData) => {
  return new Promise((resolve) => {
    const body = JSON.stringify(orderData);
    const req = http.request(`${PRINT_SERVER}/reprint/${encodeURIComponent(orderData.order_number || 'test')}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(_) { resolve({ success: res.statusCode < 300 }); }});
      }
    );
    req.on('error', e => resolve({ success: false, message: e.message }));
    req.write(body);
    req.end();
  });
});

ipcMain.handle('retry-print-queue', async () => {
  return new Promise((resolve) => {
    const req = http.request(`${PRINT_SERVER}/recover-prints`, { method: 'POST' }, (res) => {
      res.resume();
      resolve({ success: res.statusCode < 300 });
    });
    req.on('error', () => resolve({ success: false }));
    req.end();
  });
});

ipcMain.handle('clear-print-queue', () => true); // handled by print server
ipcMain.handle('update-printer-ip', (_, { ip, port }) => true); // handled by print server config

// Helper to run commands in the project root folder
function execPromise(cmd, options = {}) {
  const timeoutMs = options.timeout || 30000; // default 30s
  delete options.timeout;
  return new Promise((resolve) => {
    const child = exec(cmd, { cwd: path.join(__dirname, '..'), ...options }, (error, stdout, stderr) => {
      if (error) {
        resolve({ error, stdout: (stdout||'').trim(), stderr: (stderr||'').trim() });
      } else {
        resolve({ stdout: (stdout||'').trim(), stderr: (stderr||'').trim() });
      }
    });
    // Hard timeout — kills the process if it hangs
    const timer = setTimeout(() => {
      try { child.kill(); } catch(_) {}
      resolve({ error: new Error(`Timeout: ${cmd}`), stdout: '', stderr: 'timeout' });
    }, timeoutMs);
    child.on('close', () => clearTimeout(timer));
  });
}

// IPC handler to check for git updates
ipcMain.handle('check-for-updates', async () => {
  try {
    // 1. Get current branch name (fast, local)
    const branchRes = await execPromise('git rev-parse --abbrev-ref HEAD', { timeout: 5000 });
    const branch = (branchRes.stdout || 'main').trim();

    // 2. Get last 8 local commits (always works, no network needed)
    const localRes = await execPromise(
      'git log -8 --format="%H|%s|%an|%ad" --date=short', { timeout: 5000 }
    );
    const localCommits = localRes.stdout
      ? localRes.stdout.split('\n').filter(Boolean).map(line => {
          const [hash, msg, author, date] = line.split('|');
          return { hash: hash ? hash.substring(0, 7) : '', fullHash: hash, msg, author, date };
        })
      : [];
    const current = localCommits[0] || {};

    // 3. Try git fetch with short timeout (8s) — non-blocking if no internet
    let fetchOk = false;
    try {
      const fetchRes = await execPromise('git fetch --quiet', { timeout: 8000 });
      fetchOk = !fetchRes.error;
    } catch(_) { fetchOk = false; }

    // 4. Check remote commits ahead (only if fetch succeeded)
    let aheadCommits = [];
    let updateAvailable = false;
    if (fetchOk) {
      const aheadRes = await execPromise(
        `git log HEAD..origin/${branch} --format="%H|%s|%an|%ad" --date=short`, { timeout: 5000 }
      );
      if (aheadRes.stdout) {
        aheadCommits = aheadRes.stdout.split('\n').filter(Boolean).map(line => {
          const [hash, msg, author, date] = line.split('|');
          return { hash: hash ? hash.substring(0, 7) : '', msg, author, date };
        });
        updateAvailable = aheadCommits.length > 0;
      }
    }

    return {
      success: true,
      branch,
      fetchOk,
      current,
      localCommits,
      updateAvailable,
      aheadCommits
    };
  } catch (error) {
    console.error('Check for updates error:', error);
    return { success: false, error: error.message };
  }
});

// IPC handler to pull changes, npm install, npm build, and relaunch app
ipcMain.handle('trigger-update', async () => {
  const sendStatus = (msg) => {
    Object.values(windows).forEach(win => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-status', { status: 'progress', message: msg });
      }
    });
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.webContents.send('update-status', { status: 'progress', message: msg });
    }
  };

  try {
    sendStatus('Initialisation de la mise à jour...');
    
    // 1. Reset package-locks + local runtime files that must not block the pull
    sendStatus('Nettoyage des fichiers locaux...');
    await execPromise('git checkout -- twinpizzahub/package-lock.json');
    await execPromise('git checkout -- package-lock.json');
    // These files change at runtime and must never block git pull
    await execPromise('git checkout -- .env').catch(() => {});
    await execPromise('git checkout -- print-server/printed_orders.json').catch(() => {});
    // Stash any other leftover local changes so pull always succeeds
    await execPromise('git stash').catch(() => {});
    
    // 2. Git pull
    sendStatus('Téléchargement de la dernière version (git pull)...');
    const pullRes = await execPromise('git pull');
    if (pullRes.error) {
      console.warn('Git pull warning:', pullRes.error, pullRes.stderr);
    }
    
    // 3. Install packages in root
    sendStatus('Mise à jour des dépendances principales (npm install)...');
    const npmRoot = await execPromise('npm install');
    if (npmRoot.error) {
      console.error('NPM Root error:', npmRoot.stderr);
    }
    
    // 4. Install packages in twinpizzahub
    sendStatus('Mise à jour des dépendances de l\'application (twinpizzahub)...');
    const npmHub = await execPromise('npm install', { cwd: path.join(__dirname) });
    if (npmHub.error) {
      console.error('NPM Hub error:', npmHub.stderr);
    }

    // 5. Build Vite frontend
    sendStatus('Reconstruction de l\'application (npm run build)...');
    const buildRes = await execPromise('npm run build');
    if (buildRes.error) {
      throw new Error(`Erreur lors de la reconstruction: ${buildRes.stderr}`);
    }

    sendStatus('Mise à jour réussie ! Rechargement en cours...');
    
    // Relaunch app
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 2000);

    return { success: true };
  } catch (error) {
    console.error('Update failed:', error);
    Object.values(windows).forEach(win => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-status', { status: 'error', message: error.message });
      }
    });
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.webContents.send('update-status', { status: 'error', message: error.message });
    }
    return { success: false, error: error.message };
  }
});

// ─── Tray ────────────────────────────────────────────────────────────────────
function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'favicon.png')).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('Twin Pizza');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '🍕 Twin Pizza', enabled: false },
      { type: 'separator' },
      { label: 'Launcher', click: createLauncher },
      { label: 'POS / Admin', click: () => ipcMain.emit('open-window', null, 'admin') },
      { label: 'Écran TV',    click: () => ipcMain.emit('open-window', null, 'tv') },
      { label: 'Kiosque',     click: () => ipcMain.emit('open-window', null, 'kiosk') },
      { label: 'HACCP',       click: () => ipcMain.emit('open-window', null, 'kitchen') },
      { type: 'separator' },
      { label: 'Quitter', click: () => app.quit() },
    ]));
    tray.on('click', createLauncher);
  } catch(e) { console.error('Tray error:', e.message); }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    if (isDev) {
      await startVite();
    } else {
      await startFileServer();
    }
  } catch(err) {
    dialog.showErrorBox('Twin Pizza',
      'Le site n\'est pas compilé.\n\nLancez d\'abord:\nnpm run build\n\ndans le dossier twinbite-order, puis relancez.\n\nErreur: ' + err.message);
    app.quit();
    return;
  }



  // Show the launcher ASAP — everything else loads in background
  createLauncher();
  createTray();

  // All non-critical services start in background (don't block the UI)
  setImmediate(() => {
    loadWAHistory();
    initSupabase();
    initWhatsApp();
    startPrintServer();

    // Poll print server status every 15s and broadcast to UI
    let lastPrintServerOnline = null;
    const broadcastPrinterStatus = async () => {
      const s = await getPrintServerStatus();
      const state = { status: s.online ? 'online' : 'offline', serverUrl: PRINT_SERVER, online: s.online, ...s };
      const all = [launcherWin, ...Object.values(windows)];
      all.forEach(w => { if (w && !w.isDestroyed()) w.webContents.send('printer-status', state); });
      if (lastPrintServerOnline === true && !s.online) {
        try { new Notification({ title: '🖨️ Serveur impression hors ligne', body: 'Relancez START_ALL_SERVERS.bat' }).show(); } catch(_) {}
      }
      if (lastPrintServerOnline === false && s.online) {
        try { new Notification({ title: '🖨️ Serveur impression reconnecté', body: 'Impression automatique active' }).show(); } catch(_) {}
      }
      lastPrintServerOnline = s.online;
    };
    setTimeout(broadcastPrinterStatus, 2000); // delay first check so UI loads first
    setInterval(broadcastPrinterStatus, 15000);
  });

  app.on('activate', createLauncher);
});

app.on('window-all-closed', () => { /* stay in tray */ });

app.on('before-quit', () => {
  if (viteProcess)       try { viteProcess.kill();        } catch(_) {}
  if (fileServer)        try { fileServer.close();         } catch(_) {}
  if (printServerProcess) try { printServerProcess.kill(); } catch(_) {}
});

// ─── Unified Box Integration (Freebox / Livebox) ─────────────────────────────────
const crypto = require('crypto');
const CONFIG_FILE = path.join(__dirname, 'freebox-config.json'); // Keep same filename for compatibility

let boxType = 'freebox'; // 'freebox' | 'livebox'

// Freebox State
let freeboxAppToken = null;
let freeboxSessionToken = null;
let freeboxLastCallId = null;
let freeboxPollInterval = null;

// Livebox State
let liveboxPassword = null;
let liveboxContextId = null;
let liveboxCookie = null;
let liveboxLastCallTime = null;
let liveboxPollInterval = null;

// Load config on startup
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    boxType = cfg.box_type || 'freebox';
    freeboxAppToken = cfg.app_token || null;
    liveboxPassword = cfg.livebox_password || null;
  }
} catch (e) {
  console.error('Error loading Box config:', e);
}

// Helper to send call log events to all renderer windows
function broadcastFreeboxCall(phoneNumber, name) {
  const all = [launcherWin, ...Object.values(windows)];
  all.forEach(w => {
    if (w && !w.isDestroyed()) {
      w.webContents.send('freebox-call', { phone: phoneNumber, name: name || null });
    }
  });
}

// ─── FREEBOX LOGIC ───────────────────────────────────────────────────────────
async function getFreeboxSession() {
  try {
    const resLogin = await fetch('http://mafreebox.freebox.fr/api/v8/login/');
    const loginData = await resLogin.json();
    if (!loginData.success) return null;

    const challenge = loginData.result.challenge;
    const password = crypto.createHmac('sha1', freeboxAppToken).update(challenge).digest('hex');

    const resSession = await fetch('http://mafreebox.freebox.fr/api/v8/login/session/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: 'fr.twinpizza.pos',
        app_version: '1.0.0',
        password: password
      })
    });
    const sessionData = await resSession.json();
    if (sessionData.success) {
      freeboxSessionToken = sessionData.result.session_token;
      return freeboxSessionToken;
    }
  } catch (e) {
    console.error('Freebox login failed:', e);
  }
  return null;
}

async function pollFreeboxCalls() {
  if (!freeboxAppToken) return;
  
  let token = freeboxSessionToken;
  if (!token) {
    token = await getFreeboxSession();
    if (!token) return;
  }

  try {
    const res = await fetch('http://mafreebox.freebox.fr/api/v8/call/log/', {
      headers: { 'X-Fbx-App-Auth': token }
    });
    const data = await res.json();
    
    if (data.errorcode === 'auth_required') {
      freeboxSessionToken = null;
      return;
    }

    if (data.success && data.result) {
      const logs = data.result;
      if (logs.length === 0) return;

      logs.sort((a, b) => a.id - b.id);
      const latestCall = logs[logs.length - 1];

      if (freeboxLastCallId === null) {
        freeboxLastCallId = latestCall.id;
        return;
      }

      for (const log of logs) {
        if (log.id > freeboxLastCallId) {
          if (log.type === 'missed' || log.type === 'accepted') {
            const timeDiff = Math.abs(Date.now() / 1000 - log.datetime);
            if (timeDiff < 15) {
              broadcastFreeboxCall(log.number, log.name);
            }
          }
          freeboxLastCallId = log.id;
        }
      }
    }
  } catch (e) {
    console.error('Error fetching Freebox call logs:', e);
  }
}

// ─── LIVEBOX LOGIC ───────────────────────────────────────────────────────────
async function getLiveboxSession() {
  if (!liveboxPassword) {
    console.log('[Livebox] No password configured, skipping session creation.');
    return null;
  }
  
  // Method 1: createContext via /ws (New Livebox OS)
  try {
    console.log('[Livebox] Attempting Method 1 authentication (createContext)...');
    const authPayload = {
      service: "sah.Device.Information",
      method: "createContext",
      parameters: {
        applicationName: "so_sdkut",
        username: "admin",
        password: liveboxPassword
      }
    };
    const res = await fetch('http://192.168.1.1/ws', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sah-ws-1-call+json',
        'Authorization': 'X-Sah-Login'
      },
      body: JSON.stringify(authPayload)
    });
    const data = await res.json();
    console.log('[Livebox] Method 1 response:', JSON.stringify(data));
    if (data && data.data && data.data.contextID) {
      liveboxContextId = data.data.contextID;
      const cookies = res.headers.get('set-cookie');
      if (cookies) liveboxCookie = cookies;
      console.log('[Livebox] Method 1 success! Context ID:', liveboxContextId, 'Cookie:', liveboxCookie);
      return liveboxContextId;
    }
  } catch (e) {
    console.warn('[Livebox] Method 1 auth failed, trying Method 2...', e.message);
  }

  // Method 2: GET/POST to /authenticate (Livebox Pro / Older Livebox OS)
  try {
    console.log('[Livebox] Attempting Method 2 authentication (authenticate)...');
    const res = await fetch(`http://192.168.1.1/authenticate?username=admin&password=${encodeURIComponent(liveboxPassword)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    console.log('[Livebox] Method 2 response:', JSON.stringify(data));
    if (data && data.data && data.data.contextID) {
      liveboxContextId = data.data.contextID;
      const cookies = res.headers.get('set-cookie');
      if (cookies) liveboxCookie = cookies;
      console.log('[Livebox] Method 2 success! Context ID:', liveboxContextId, 'Cookie:', liveboxCookie);
      return liveboxContextId;
    }
  } catch (e) {
    console.error('[Livebox] Method 2 auth failed:', e);
  }

  console.log('[Livebox] Both authentication methods failed.');
  return null;
}

function parseLiveboxTime(t) {
  if (!t) return 0;
  if (!isNaN(t)) {
    const val = Number(t);
    if (val < 32503680000) {
      return val * 1000;
    }
    return val;
  }
  const parsed = Date.parse(t);
  if (!isNaN(parsed)) return parsed;
  return 0;
}

async function pollLiveboxCalls() {
  if (!liveboxPassword) return;

  console.log('[Livebox] pollLiveboxCalls triggered. Current context:', liveboxContextId);
  let context = liveboxContextId;
  if (!context) {
    context = await getLiveboxSession();
    if (!context) {
      console.log('[Livebox] Could not establish session, aborting poll.');
      return;
    }
  }

  try {
    const payload = {
      service: "VoiceService.VoiceApplication",
      method: "getCallList",
      parameters: {}
    };
    console.log('[Livebox] Fetching call list from ws endpoint...');
    const res = await fetch('http://192.168.1.1/ws', {
      method: 'POST',
      headers: {
        'X-Context': context,
        'X-Prototype-Version': '1.7',
        'Content-Type': 'application/x-sah-ws-1-call+json; charset=UTF-8',
        'Accept': 'text/javascript',
        ...(liveboxCookie ? { 'Cookie': liveboxCookie } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('[Livebox] Call list response parsed. Keys:', Object.keys(data));

    if (data && data.errors && data.errors.some(e => e.error === 'AuthenticationFailed' || e.error === 'InvalidContext')) {
      console.log('[Livebox] Authentication/Context invalid, resetting context.');
      liveboxContextId = null;
      liveboxCookie = null;
      return;
    }

    if (data && data.result) {
      const logs = data.result;
      console.log(`[Livebox] Retrieved ${Array.isArray(logs) ? logs.length : 'non-array'} call records.`);
      if (!Array.isArray(logs)) return;

      // DEBUG: Save last calls to local JSON for inspection
      try {
        fs.writeFileSync(path.join(__dirname, 'last-livebox-calls.json'), JSON.stringify(logs, null, 2));
      } catch(_) {}

      if (logs.length === 0) return;

      const parsedCalls = logs.map(c => ({
        number: c.remoteNumber || c.number || '',
        time: parseLiveboxTime(c.startTime),
        type: c.callType || '',
        origin: c.callOrigin || '',
        name: c.contactName || ''
      })).filter(c => c.time > 0);

      console.log(`[Livebox] Mapped ${parsedCalls.length} valid call logs.`);
      if (parsedCalls.length === 0) return;

      parsedCalls.sort((a, b) => a.time - b.time);
      const latestCall = parsedCalls[parsedCalls.length - 1];
      console.log('[Livebox] Latest call in router log:', JSON.stringify(latestCall), 'Last processed time:', liveboxLastCallTime);

      if (liveboxLastCallTime === null) {
        liveboxLastCallTime = latestCall.time;
        console.log('[Livebox] Initialized last call time to:', liveboxLastCallTime);
        return;
      }

      for (const log of parsedCalls) {
        if (log.time > liveboxLastCallTime) {
          if (log.type !== 'placed' && log.type !== 'outgoing' && log.origin !== 'local') {
            const timeDiff = Math.abs(Date.now() - log.time) / 1000;
            if (timeDiff < 20) {
              broadcastFreeboxCall(log.number, log.name);
            }
          }
          liveboxLastCallTime = log.time;
        }
      }
    }
  } catch (e) {
    console.error('Error fetching Livebox call logs:', e);
    liveboxContextId = null;
    liveboxCookie = null;
  }
}

// Start polling on startup
if (boxType === 'freebox' && freeboxAppToken) {
  freeboxPollInterval = setInterval(pollFreeboxCalls, 3000);
} else if (boxType === 'livebox' && liveboxPassword) {
  liveboxPollInterval = setInterval(pollLiveboxCalls, 3000);
}

// IPC Handlers
ipcMain.handle('freebox-register', async () => {
  try {
    const res = await fetch('http://mafreebox.freebox.fr/api/v8/login/authorize/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: 'fr.twinpizza.pos',
        app_name: 'Twin Pizza POS',
        app_version: '1.0.0',
        device_name: 'POS Station'
      })
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('freebox-check-authorization', async (_, { trackId, appToken }) => {
  try {
    const res = await fetch(`http://mafreebox.freebox.fr/api/v8/login/authorize/${trackId}`);
    const data = await res.json();
    if (data.success && data.result.status === 'granted') {
      boxType = 'freebox';
      freeboxAppToken = appToken;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ box_type: 'freebox', app_token: appToken }));
      
      if (freeboxPollInterval) clearInterval(freeboxPollInterval);
      if (liveboxPollInterval) clearInterval(liveboxPollInterval);
      freeboxPollInterval = setInterval(pollFreeboxCalls, 3000);
    }
    return data;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('freebox-status', () => {
  return { success: true, registered: boxType === 'freebox' && !!freeboxAppToken };
});

ipcMain.handle('freebox-unregister', () => {
  if (freeboxPollInterval) {
    clearInterval(freeboxPollInterval);
    freeboxPollInterval = null;
  }
  freeboxAppToken = null;
  freeboxSessionToken = null;
  freeboxLastCallId = null;
  
  if (fs.existsSync(CONFIG_FILE)) {
    try { fs.unlinkSync(CONFIG_FILE); } catch(_) {}
  }
  return { success: true };
});

ipcMain.handle('livebox-register', async (_, { password }) => {
  try {
    // Save password temporarily to test
    liveboxPassword = password;
    const testSession = await getLiveboxSession();
    if (testSession) {
      boxType = 'livebox';
      liveboxLastCallTime = null;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ box_type: 'livebox', livebox_password: password }));
      
      if (liveboxPollInterval) clearInterval(liveboxPollInterval);
      if (freeboxPollInterval) clearInterval(freeboxPollInterval);
      liveboxPollInterval = setInterval(pollLiveboxCalls, 3000);
      return { success: true };
    } else {
      liveboxPassword = null;
      return { success: false, error: 'Connexion échouée : vérifiez votre mot de passe Livebox.' };
    }
  } catch (e) {
    liveboxPassword = null;
    return { success: false, error: e.message };
  }
});

ipcMain.handle('livebox-status', () => {
  return { success: true, registered: boxType === 'livebox' && !!liveboxPassword };
});

ipcMain.handle('livebox-unregister', () => {
  if (liveboxPollInterval) {
    clearInterval(liveboxPollInterval);
    liveboxPollInterval = null;
  }
  liveboxPassword = null;
  liveboxContextId = null;
  liveboxLastCallTime = null;
  boxType = 'freebox';
  
  if (fs.existsSync(CONFIG_FILE)) {
    try { fs.unlinkSync(CONFIG_FILE); } catch(_) {}
  }
  return { success: true };
});
