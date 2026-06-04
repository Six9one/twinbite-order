const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
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

// ─── Window registry ──────────────────────────────────────────────────────────
const windows = {};
let launcherWin = null;
let tray = null;

// ─── Supabase init ────────────────────────────────────────────────────────────
function initSupabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) { console.warn('⚠️ Supabase env vars missing'); return; }
    supabase = createClient(url, key);
    console.log('✅ Supabase connected');
    listenForOrders();
  } catch(e) {
    console.error('Supabase init error:', e.message);
  }
}

// ─── Realtime: listen for new orders ─────────────────────────────────────────
function listenForOrders() {
  if (!supabase) return;
  supabase
    .channel('new-orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      const order = payload.new;
      console.log('🔔 New order received:', order.order_number);

      // Broadcast to all open Electron windows
      Object.values(windows).forEach(w => {
        if (!w.isDestroyed()) w.webContents.send('new-order', order);
      });
      if (launcherWin && !launcherWin.isDestroyed()) {
        launcherWin.webContents.send('new-order', order);
      }

      // System notification
      try {
        new Notification({
          title: '🍕 Nouvelle Commande!',
          body: `#${order.order_number} — ${order.order_type?.toUpperCase()} — ${order.total}€`,
        }).show();
      } catch(_) {}

      // WhatsApp confirmation
      if (order.customer_phone && order.customer_phone !== 'borne' && whatsappStatus === 'connected') {
        const msg = generateOrderMessage(order);
        sendWhatsAppMessage(order.customer_phone, msg).catch(e =>
          console.error('WhatsApp send failed:', e.message)
        );
      }

      // Auto-print handled by the existing print server on localhost:3001
      // (no duplicate printing needed)
    })
    .subscribe();

  console.log('👂 Listening for new orders via Supabase Realtime');
}

// ─── WhatsApp (Baileys — FREE, no Meta API) ───────────────────────────────────
async function initWhatsApp() {
  try {
    console.log('💬 Starting WhatsApp (Baileys)...');
    broadcastWA('connecting');

    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    const authPath = path.join(app.getPath('userData'), 'whatsapp-auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const noop = () => {};
    const silentLogger = { trace:noop, debug:noop, info:noop, warn:noop, error:noop, fatal:noop, level:'silent', child(){ return this; } };

    whatsappClient = makeWASocket({
      auth: state,
      printQRInTerminal: true, // show in terminal as backup
      browser: ['Twin Pizza Hub', 'Desktop', '1.0.0'],
      logger: silentLogger,
    });

    whatsappClient.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        whatsappStatus = 'qr';
        lastQR = qr; // store raw string — renderer will render it
        console.log('📱 QR ready — sending to UI...');
        broadcastWA('qr', qr);
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

function generateOrderMessage(order) {
  const types = { livraison: '🚗 Livraison', emporter: '🛍️ À emporter', surplace: '🍽️ Sur place' };
  const items = Array.isArray(order.items) ? order.items : [];
  let msg = `🍕 *TWIN PIZZA* — Confirmation\n\n`;
  msg += `📋 *Commande #${order.order_number}*\n`;
  msg += `📦 ${types[order.order_type] || order.order_type}\n\n`;
  msg += `*Votre commande:*\n`;
  items.forEach(i => { msg += `  • ${i.quantity}x ${i.item?.name || i.name || 'Produit'}\n`; });
  msg += `\n💰 *Total: ${(order.total || 0).toFixed(2)}€*\n`;
  msg += order.order_type === 'livraison' ? `⏱️ Livraison estimée: 30-45 min\n` : `⏱️ Prêt dans: 15-25 min\n`;
  msg += `\nMerci pour votre confiance! 🙏\ntwinpizza.fr`;
  return msg;
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
      const ct = mime[path.extname(p).toLowerCase()] || 'application/octet-stream';
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': ct });
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
function startPrintServer() {
  const serverPath = path.join(__dirname, '..', 'print-server', 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.warn('⚠️ Print server not found at', serverPath);
    return;
  }
  console.log('🖨️ Starting print server...');
  printServerProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..', 'print-server'),
    stdio: 'pipe',
    env: { ...process.env },
  });
  printServerProcess.stdout.on('data', d => process.stdout.write('[PRINT] ' + d));
  printServerProcess.stderr.on('data', d => process.stderr.write('[PRINT ERR] ' + d));
  printServerProcess.on('exit', (code) => {
    console.log(`🖨️ Print server exited (${code}) — restarting in 5s...`);
    printServerProcess = null;
    setTimeout(startPrintServer, 5000); // auto-restart
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
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL(getUrl(route));
  win.on('closed', () => { delete windows[name]; });
  windows[name] = win;
  return win;
}

// ─── Launcher ────────────────────────────────────────────────────────────────
function createLauncher() {
  if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.focus(); return; }
  launcherWin = new BrowserWindow({
    title: 'TwinPizza Hub', width: 1400, height: 860, minWidth: 1100, minHeight: 700,
    center: true, autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      webviewTag: true,
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

// ─── Tray ────────────────────────────────────────────────────────────────────
function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'favicon.png')).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('TwinPizza Hub');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '🍕 TwinPizza Hub', enabled: false },
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
    dialog.showErrorBox('TwinPizza Hub',
      'Le site n\'est pas compilé.\n\nLancez d\'abord:\nnpm run build\n\ndans le dossier twinbite-order, puis relancez.\n\nErreur: ' + err.message);
    app.quit();
    return;
  }

  createLauncher();
  createTray();

  // Start print server as child process (auto-restarts if crashes)
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
  broadcastPrinterStatus();
  setInterval(broadcastPrinterStatus, 15000);

  initSupabase();
  initWhatsApp();

  app.on('activate', createLauncher);
});

app.on('window-all-closed', () => { /* stay in tray */ });

app.on('before-quit', () => {
  if (viteProcess)       try { viteProcess.kill();        } catch(_) {}
  if (fileServer)        try { fileServer.close();         } catch(_) {}
  if (printServerProcess) try { printServerProcess.kill(); } catch(_) {}
});
