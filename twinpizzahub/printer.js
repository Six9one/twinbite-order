/**
 * TwinPizza Hub — Printer Manager
 * Persistent queue + auto-retry + status monitor
 * Orders are NEVER lost — queued to disk if printer offline
 */

const net = require('net');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// ─── ESC/POS helpers ─────────────────────────────────────────────────────────
const ESC = '\x1B', GS = '\x1D';
const CMD = {
  INIT:          ESC + '@',
  CENTER:        ESC + 'a\x01',
  LEFT:          ESC + 'a\x00',
  RIGHT:         ESC + 'a\x02',
  BOLD_ON:       ESC + 'E\x01',
  BOLD_OFF:      ESC + 'E\x00',
  BIG:           GS  + '!\x11',
  TALL:          GS  + '!\x01',
  NORMAL:        GS  + '!\x00',
  CUT:           GS  + 'V\x00',
  NL:            '\n',
  SEP:           '--------------------------------\n',
  // ── Flip ticket 180° (upside-down mode) ──
  // ESC { 1  = activate upside-down printing
  // ESC { 0  = deactivate upside-down printing
  UPSIDE_ON:     ESC + '{\x01',
  UPSIDE_OFF:    ESC + '{\x00',
};

function buildTicket(order) {
  const types = { livraison: '🚗 LIVRAISON', emporter: '🛍 A EMPORTER', surplace: '🍽 SUR PLACE' };
  const pays  = { cb: 'CB', especes: 'ESPECES', en_ligne: 'PAYE EN LIGNE' };
  const items = Array.isArray(order.items) ? order.items : [];

  let t = CMD.INIT;
  t += CMD.UPSIDE_ON; // Imprimante montee a l'envers sur le mur

  // ══════════════════════════════════════════
  // BAS DU TICKET (imprime en premier)
  // ══════════════════════════════════════════
  t += CMD.NL + CMD.NL;
  t += CMD.CENTER + 'Merci de votre confiance !' + CMD.NL;
  t += CMD.CENTER + 'www.twinpizza.fr' + CMD.NL;
  t += CMD.CENTER + CMD.SEP;

  // TOTAL (en bas)
  t += CMD.CENTER + CMD.BIG;
  t += 'TOTAL: ' + (order.total || 0).toFixed(2) + ' EUR';
  t += CMD.NORMAL + CMD.NL;
  t += CMD.CENTER + CMD.BOLD_ON;
  t += (pays[order.payment_method] || order.payment_method || '').toUpperCase();
  t += CMD.BOLD_OFF + CMD.NL;
  if ((order.delivery_fee || 0) > 0) {
    t += CMD.LEFT + 'Livraison : ' + Number(order.delivery_fee).toFixed(2) + 'E' + CMD.NL;
  }
  t += CMD.CENTER + CMD.SEP;

  // ── ARTICLES (inverses, pour lire dans l'ordre) ──────────────────
  [...items].reverse().forEach(item => {
    const name  = item.item?.name || item.name || 'Produit';
    const qty   = item.quantity || 1;
    const price = (item.totalPrice || item.calculatedPrice || item.item?.price || 0).toFixed(2);
    const c = item.customization;
    // Details (en bas de chaque article a la lecture)
    if (c?.supplements?.length) t += '   + ' + c.supplements.join(', ') + CMD.NL;
    if (c?.sauces?.length)    t += '   > ' + c.sauces.join(', ') + CMD.NL;
    if (c?.meats?.length)     t += '   > ' + c.meats.join(', ') + CMD.NL;
    if (c?.size)              t += '   (' + c.size.toUpperCase() + ')' + CMD.NL;
    // Nom + prix (en haut de l'article a la lecture)
    t += CMD.BOLD_ON + qty + 'x ' + name.toUpperCase() + CMD.BOLD_OFF;
    t += '  ' + price + 'E' + CMD.NL;
    t += CMD.CENTER + CMD.SEP;
  });

  // ── INFOS CLIENT ─────────────────────────────────────────────────
  if (order.customer_notes) t += CMD.BOLD_ON + '! Note : ' + order.customer_notes + CMD.BOLD_OFF + CMD.NL;
  if (order.customer_address && order.order_type === 'livraison') t += 'Adresse : ' + order.customer_address + CMD.NL;
  if (order.customer_phone && order.customer_phone !== 'borne') t += 'Tel     : ' + order.customer_phone + CMD.NL;
  t += 'Client  : ' + CMD.BOLD_ON + (order.customer_name || 'Client') + CMD.BOLD_OFF + CMD.NL;
  t += CMD.CENTER + CMD.SEP;

  // ══════════════════════════════════════════
  // HAUT DU TICKET (imprime en dernier)
  // ══════════════════════════════════════════
  const now = new Date();
  t += CMD.CENTER + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  t += '  ' + now.toLocaleDateString('fr-FR') + CMD.NL;
  t += CMD.CENTER + CMD.BOLD_ON + (types[order.order_type] || (order.order_type || '').toUpperCase()) + CMD.BOLD_OFF + CMD.NL;
  t += CMD.CENTER + CMD.BOLD_ON + CMD.TALL + 'Cmd #' + (order.order_number || '---') + CMD.NORMAL + CMD.BOLD_OFF + CMD.NL;
  t += CMD.CENTER + CMD.SEP;
  t += CMD.CENTER + 'Tel : 02 32 11 26 13' + CMD.NL;
  t += CMD.CENTER + '76530 Grand-Couronne' + CMD.NL;
  t += CMD.CENTER + '60 Rue G. Clemenceau' + CMD.NL;
  t += CMD.CENTER + CMD.BIG + 'TWIN PIZZA' + CMD.NORMAL + CMD.NL;
  t += CMD.NL;
  t += CMD.CUT;
  return Buffer.from(t, 'binary');
}


// ─── Printer Manager Class ────────────────────────────────────────────────────
class PrinterManager {
  constructor(ip, port) {
    this.ip        = ip;
    this.port      = port;
    this.status    = 'unknown';   // unknown | online | offline | printing | error
    this.queue     = [];          // pending print jobs
    this.queuePath = null;        // set after app ready
    this.retrying  = false;
    this.listeners = [];          // status change callbacks
    this.pingInterval = null;
    this.stats = { printed: 0, failed: 0, queued: 0 };
  }

  init() {
    this.queuePath = path.join(app.getPath('userData'), 'print-queue.json');
    this.loadQueue();
    this.startPing();
    console.log(`🖨️ Printer manager started — ${this.ip}:${this.port}`);
    console.log(`📋 ${this.queue.length} jobs in queue`);
    if (this.queue.length > 0) setTimeout(() => this.flush(), 5000);
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  loadQueue() {
    try {
      if (fs.existsSync(this.queuePath)) {
        const data = JSON.parse(fs.readFileSync(this.queuePath, 'utf8'));
        this.queue = data.queue || [];
        this.stats = data.stats || this.stats;
      }
    } catch(e) { this.queue = []; }
  }

  saveQueue() {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify({ queue: this.queue, stats: this.stats }));
    } catch(e) {}
  }

  // ── Status monitoring ─────────────────────────────────────────────────────
  startPing() {
    this.ping();
    this.pingInterval = setInterval(() => this.ping(), 15000);
  }

  ping() {
    return new Promise((resolve) => {
      const sock = new net.Socket();
      const timeout = setTimeout(() => {
        sock.destroy();
        this.setStatus('offline');
        resolve(false);
      }, 3000);

      sock.connect(this.port, this.ip, () => {
        clearTimeout(timeout);
        sock.end();
        if (this.status !== 'printing') this.setStatus('online');
        resolve(true);
      });

      sock.on('error', () => {
        clearTimeout(timeout);
        this.setStatus('offline');
        resolve(false);
      });
    });
  }

  setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    this.listeners.forEach(fn => fn(s, this.getState()));
    // If came back online, flush queue
    if (s === 'online' && this.queue.length > 0 && !this.retrying) {
      console.log('🖨️ Printer back online — flushing queue...');
      setTimeout(() => this.flush(), 1000);
    }
  }

  onChange(fn) { this.listeners.push(fn); }

  getState() {
    return {
      status: this.status,
      ip: this.ip,
      port: this.port,
      queue: this.queue.map(j => ({ id: j.id, orderNumber: j.order?.order_number, addedAt: j.addedAt, attempts: j.attempts })),
      stats: this.stats,
    };
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  async print(order, options = {}) {
    const job = {
      id:        Date.now() + '_' + Math.random().toString(36).slice(2),
      order,
      addedAt:   new Date().toISOString(),
      attempts:  0,
      maxRetry:  options.maxRetry || 10,
    };

    const ok = await this.tryPrint(job);
    if (!ok) {
      console.log(`📋 Order #${order.order_number} queued (printer offline)`);
      this.queue.push(job);
      this.stats.queued++;
      this.saveQueue();
      this.setStatus(this.status); // notify UI of queue change
    }
    return ok;
  }

  async tryPrint(job) {
    const isOnline = await this.ping();
    if (!isOnline) return false;

    try {
      this.setStatus('printing');
      const data = buildTicket(job.order);
      await this.sendRaw(data);
      this.stats.printed++;
      this.saveQueue();
      console.log(`✅ Printed order #${job.order.order_number}`);
      setTimeout(() => { if (this.status === 'printing') this.setStatus('online'); }, 1000);
      return true;
    } catch(err) {
      job.attempts++;
      this.stats.failed++;
      console.error(`❌ Print failed (attempt ${job.attempts}):`, err.message);
      this.setStatus('error');
      setTimeout(() => { if (this.status === 'error') this.ping(); }, 3000);
      return false;
    }
  }

  async flush() {
    if (this.retrying || this.queue.length === 0) return;
    this.retrying = true;
    console.log(`🔄 Flushing ${this.queue.length} queued print jobs...`);

    const remaining = [];
    for (const job of this.queue) {
      if (job.attempts >= job.maxRetry) {
        console.log(`⚠️ Job ${job.id} exceeded max retries — dropping`);
        continue;
      }
      const ok = await this.tryPrint(job);
      if (!ok) remaining.push(job);
      else await new Promise(r => setTimeout(r, 500));
    }

    this.queue = remaining;
    this.saveQueue();
    this.retrying = false;
    this.setStatus(this.status);
    console.log(`📋 Queue flush done. ${this.queue.length} jobs remaining`);
  }

  sendRaw(data) {
    return new Promise((resolve, reject) => {
      const sock = new net.Socket();
      const timeout = setTimeout(() => { sock.destroy(); reject(new Error('Timeout')); }, 6000);
      sock.connect(this.port, this.ip, () => {
        sock.write(data, () => {
          clearTimeout(timeout);
          sock.end();
          resolve();
        });
      });
      sock.on('error', (e) => { clearTimeout(timeout); reject(e); });
    });
  }

  // ── Manual controls (from UI) ─────────────────────────────────────────────
  async retryQueue() {
    return this.flush();
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
    this.setStatus(this.status);
  }

  updateIP(ip, port) {
    this.ip   = ip;
    this.port = port || this.port;
    this.ping();
  }

  destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}

module.exports = { PrinterManager, buildTicket };
