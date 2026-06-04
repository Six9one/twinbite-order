// ============================================================
// FACTURE MANUELLE — Imprimante Ethernet directe
// Connexion TCP directe sur 192.168.1.200:9100
// ============================================================
import { Socket } from 'net';

const PRINTER_IP   = '192.168.1.200';
const PRINTER_PORT = 9100;

// ---- ESC/POS Commands ----
const ESC = '\x1B';
const GS  = '\x1D';
const INIT          = ESC + '@';
const SET_CP1252    = ESC + 't' + '\x10';
const CENTER        = ESC + 'a' + '\x01';
const LEFT          = ESC + 'a' + '\x00';
const RIGHT         = ESC + 'a' + '\x02';
const BOLD_ON       = ESC + 'E' + '\x01';
const BOLD_OFF      = ESC + 'E' + '\x00';
const DBL_SIZE      = GS  + '!' + '\x30';
const DBL_HEIGHT    = GS  + '!' + '\x10';
const NORMAL_SIZE   = GS  + '!' + '\x00';
const FEED          = ESC + 'd' + '\x03';
const PARTIAL_CUT   = GS  + 'V' + '\x01';
const LINE          = '-'.repeat(42) + '\n';

// ---- French char → CP1252 ----
function toCP1252(text) {
    const map = {
        'é':'\xE9','è':'\xE8','ê':'\xEA','ë':'\xEB',
        'à':'\xE0','â':'\xE2','ä':'\xE4',
        'ù':'\xF9','û':'\xFB','ü':'\xFC',
        'ô':'\xF4','ö':'\xF6',
        'î':'\xEE','ï':'\xEF',
        'ç':'\xE7',
        'É':'\xC9','È':'\xC8','Ê':'\xCA',
        'À':'\xC0','Â':'\xC2',
        'Ç':'\xC7',
        '€':'\x80','°':'\xB0',
        '\u2019':"'",'\u2018':"'",
    };
    let r = '';
    for (const c of text) r += map[c] !== undefined ? map[c] : c;
    return r;
}

// ---- Build the invoice ticket ----
function buildInvoice() {
    const TVA_RATE   = 10;
    const totalTTC   = 217.00;
    const totalHT    = totalTTC / (1 + TVA_RATE / 100);
    const tvaAmount  = totalTTC - totalHT;

    const dateStr    = '04/06/2026';
    const heureStr   = '19:38:09';
    const invoiceNum = 'FA-MANUEL-193809';

    let t = '';
    t += INIT + SET_CP1252;

    // ── Header ──────────────────────────────
    t += CENTER;
    t += DBL_SIZE + BOLD_ON;
    t += 'FACTURE\n';
    t += NORMAL_SIZE + BOLD_OFF;
    t += '\n';
    t += BOLD_ON + 'TWIN PIZZA\n' + BOLD_OFF;
    t += '60 Rue Georges Clemenceau\n';
    t += '76530 Grand-Couronne\n';
    t += 'Tel: 02 32 11 26 13\n';
    t += LINE;

    // ── Legals ──────────────────────────────
    t += LEFT;
    t += BOLD_ON + 'SIRET: ' + BOLD_OFF + '942 617 358 00018\n';
    t += BOLD_ON + 'N\xB0 TVA: ' + BOLD_OFF + 'FR28942617358\n';
    t += LINE;

    // ── Invoice info ────────────────────────
    t += BOLD_ON + `Facture : ${invoiceNum}\n` + BOLD_OFF;
    t += `Date    : ${dateStr}\n`;
    t += `Heure   : ${heureStr}\n`;
    t += LINE;

    // ── Items ───────────────────────────────
    t += BOLD_ON + 'ARTICLES:\n' + BOLD_OFF;
    t += ` 1x Repas`;
    t += ' '.repeat(Math.max(1, 42 - ' 1x Repas'.length - '217.00\x80'.length));
    t += '217.00\x80\n';
    t += LINE;

    // ── TVA breakdown ───────────────────────
    t += LEFT;
    t += BOLD_ON + ' Code  TAUX    HT       TVA     TTC\n' + BOLD_OFF;
    t += ` (001) ${TVA_RATE}%  ${totalHT.toFixed(2)}  ${tvaAmount.toFixed(2)}  ${totalTTC.toFixed(2)}\n`;
    t += LINE;

    // ── Totals ──────────────────────────────
    t += RIGHT;
    t += `Total HT  : ${totalHT.toFixed(2)}\x80\n`;
    t += `TVA (${TVA_RATE}%) : ${tvaAmount.toFixed(2)}\x80\n`;
    t += DBL_HEIGHT + BOLD_ON;
    t += `TOTAL TTC : ${totalTTC.toFixed(2)}\x80\n`;
    t += NORMAL_SIZE + BOLD_OFF;
    t += LINE;

    // ── Payment ─────────────────────────────
    t += CENTER;
    t += DBL_HEIGHT + BOLD_ON + 'A PAYER\n' + NORMAL_SIZE + BOLD_OFF;
    t += `Carte bancaire — 217.00\x80\n`;
    t += LINE;

    // ── Footer ──────────────────────────────
    t += CENTER;
    t += '\nTwin Pizza - Entreprise individuelle\n';
    t += 'SIRET: 942 617 358 00018\n';
    t += 'TVA: FR28942617358\n';
    t += '\nMerci de votre visite !\n';
    t += '\n' + FEED + PARTIAL_CUT;

    return toCP1252(t);
}

// ---- Send via TCP ----
function printTCP(data) {
    return new Promise((resolve, reject) => {
        const sock = new Socket();
        sock.setTimeout(5000);

        sock.on('timeout', () => { sock.destroy(); reject(new Error('Timeout connexion')); });
        sock.on('error',   (err) => reject(err));
        sock.on('close',   () => resolve());

        sock.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log(`📡 Connecte a ${PRINTER_IP}:${PRINTER_PORT}`);
            sock.write(data, 'binary', () => {
                console.log('📤 Donnees envoyees');
                sock.end();
            });
        });
    });
}

// ---- Main ----
console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   FACTURE MANUELLE — Twin Pizza          ║');
console.log('║   Imprimante Ethernet 192.168.1.200      ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');
console.log('   Montant : 217.00 EUR');
console.log('   Heure   : 19:38:09');
console.log('   TVA 10% : incluse');
console.log('');

const ticketData = buildInvoice();

printTCP(ticketData)
    .then(() => {
        console.log('✅ Facture imprimee avec succes sur 192.168.1.200 !');
    })
    .catch((err) => {
        console.error('❌ Echec impression :', err.message);
        process.exit(1);
    });
