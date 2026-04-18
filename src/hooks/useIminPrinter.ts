/**
 * iMin Printer hook for the D4-503 POS terminal.
 * 
 * Printing strategy (in order):
 * 1. IminPrintInstance JS SDK (native iMin browser only)
 * 2. Silent HTML print via hidden iframe (works when Chrome launched with --kiosk-printing)
 * 3. Print server via Supabase realtime (always works as backup)
 * 
 * IMPORTANT: On the iMin, launch Chrome with --kiosk-printing flag to enable 
 * silent printing without dialog. The iMin's built-in printer must be set as 
 * the default Android printer.
 */

declare global {
    interface Window {
        IminPrintInstance?: {
            initPrinter: () => void;
            getPrinterStatus: () => string;
            printText: (text: string) => void;
            printAndLineFeed: () => void;
            printAndFeedPaper: (height: number) => void;
            setAlignment: (alignment: number) => void; // 0=left, 1=center, 2=right
            setTextSize: (size: number) => void;
            setTextStyle: (style: number) => void; // 0=normal, 1=bold
            setTextWidth: (width: number) => void;
            partialCut: () => void;
            fullCut: () => void;
        };
    }
}

interface KioskOrderData {
    orderNumber: string;
    customerName: string;
    orderType: 'surplace' | 'emporter';
    items: {
        name: string;
        quantity: number;
        price: number;
        customization?: any;
    }[];
    total: number;
    subtotal: number;
    tva: number;
    loyaltyPhone?: string;
    stampsEarned?: number;
    totalStamps?: number;
}

export function useIminPrinter() {
    const isIminDevice = typeof window !== 'undefined' && !!window.IminPrintInstance;

    const initPrinter = () => {
        if (isIminDevice) {
            try {
                window.IminPrintInstance!.initPrinter();
                console.log('🖨️ iMin printer initialized (JS SDK)');
            } catch (e) {
                console.error('Failed to init iMin printer:', e);
            }
        } else {
            console.log('🖨️ iMin JS SDK not found — will use silent iframe print (requires --kiosk-printing)');
        }
    };

    const printKioskTicket = (order: KioskOrderData) => {
        if (isIminDevice) {
            printViaiMin(order);
        } else {
            // Use silent iframe print — works when Chrome is launched with --kiosk-printing
            // This prints to the system default printer WITHOUT showing a dialog
            printSilentHTML(order);
        }
    };

    // ========== Method 1: iMin JS SDK (native) ==========
    const printViaiMin = (order: KioskOrderData) => {
        const p = window.IminPrintInstance!;

        try {
            p.initPrinter();

            // Header
            p.setAlignment(1);
            p.setTextSize(32);
            p.setTextStyle(1);
            p.printText("TWIN PIZZA\n");
            p.setTextSize(22);
            p.setTextStyle(0);
            p.printText("Grand-Couronne\n");
            p.printText("02 32 11 26 13\n");
            p.setTextSize(20);
            p.printText("================================\n");

            // Order info
            p.setTextSize(28);
            p.setTextStyle(1);
            p.printText(`TICKET N° ${order.orderNumber}\n`);
            p.setTextSize(20);
            p.setTextStyle(0);
            p.printText(`${new Date().toLocaleString('fr-FR')}\n`);
            p.printText("================================\n");

            // Order type
            p.setTextSize(26);
            p.setTextStyle(1);
            const typeLabel = order.orderType === 'surplace' ? 'SUR PLACE' : 'A EMPORTER';
            p.printText(`${typeLabel}\n`);
            p.setTextSize(22);
            p.printText(`Client: ${order.customerName.toUpperCase()}\n`);
            p.setTextStyle(0);
            p.printText("--------------------------------\n");

            // Items
            p.setAlignment(0);
            p.setTextSize(22);
            order.items.forEach(item => {
                p.setTextStyle(1);
                p.printText(`${item.quantity}x ${item.name}\n`);
                p.setTextStyle(0);

                p.setAlignment(2);
                p.printText(`${(item.price * item.quantity).toFixed(2)}E\n`);
                p.setAlignment(0);

                if (item.customization) {
                    const details: string[] = [];
                    if (item.customization.size) details.push(item.customization.size.toUpperCase());
                    if (item.customization.meats?.length) details.push(item.customization.meats.join(', '));
                    if (item.customization.meat) details.push(item.customization.meat);
                    if (item.customization.sauces?.length) details.push(item.customization.sauces.join(', '));
                    if (item.customization.garnitures?.length) details.push(item.customization.garnitures.join(', '));
                    if (item.customization.supplements?.length) details.push(item.customization.supplements.join(', '));
                    if (item.customization.menuOption && item.customization.menuOption !== 'none') {
                        details.push(item.customization.menuOption);
                    }
                    if (details.length > 0) {
                        p.setTextSize(18);
                        p.printText(`  ${details.join(' | ')}\n`);
                        p.setTextSize(22);
                    }
                }
            });

            // Totals
            p.printText("--------------------------------\n");
            p.setAlignment(2);
            p.setTextSize(22);
            p.printText(`Sous-total: ${order.subtotal.toFixed(2)}E\n`);
            p.printText(`TVA (10%): ${order.tva.toFixed(2)}E\n`);
            p.setTextSize(28);
            p.setTextStyle(1);
            p.printText(`TOTAL: ${order.total.toFixed(2)}E\n`);
            p.setTextStyle(0);

            // Loyalty
            if (order.stampsEarned && order.stampsEarned > 0) {
                p.setAlignment(1);
                p.setTextSize(20);
                p.printText("================================\n");
                p.setTextSize(22);
                p.printText(`FIDELITE: +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''}\n`);
                if (order.totalStamps !== undefined) {
                    p.printText(`Total tampons: ${order.totalStamps}/10\n`);
                }
            }

            // Footer
            p.setAlignment(1);
            p.setTextSize(20);
            p.printText("================================\n");
            p.setTextSize(24);
            p.setTextStyle(1);
            p.printText("Presentez ce ticket a la\n");
            p.printText("caisse pour payer\n");
            p.setTextSize(22);
            p.setTextStyle(0);
            p.printText(`Merci ${order.customerName}!\n`);
            p.printText("\n\n\n");

            p.partialCut();
            console.log('✅ Ticket printed via iMin JS SDK');
        } catch (e) {
            console.error('iMin print error:', e);
            // Fallback to silent HTML print
            printSilentHTML(order);
        }
    };

    // ========== Method 2: Silent HTML print via hidden iframe ==========
    // Works when Chrome is launched with: --kiosk-printing
    // This sends to the DEFAULT system printer without any dialog
    const printSilentHTML = (order: KioskOrderData) => {
        const typeLabel = order.orderType === 'surplace' ? 'SUR PLACE' : 'A EMPORTER';

        let itemsHtml = '';
        order.items.forEach(item => {
            const details: string[] = [];
            if (item.customization) {
                if (item.customization.size) details.push(item.customization.size.toUpperCase());
                if (item.customization.meats?.length) details.push(item.customization.meats.join(', '));
                if (item.customization.meat) details.push(item.customization.meat);
                if (item.customization.sauces?.length) details.push(item.customization.sauces.join(', '));
                if (item.customization.garnitures?.length) details.push(item.customization.garnitures.join(', '));
                if (item.customization.supplements?.length) details.push(item.customization.supplements.join(', '));
                if (item.customization.menuOption && item.customization.menuOption !== 'none') {
                    details.push(item.customization.menuOption);
                }
            }
            itemsHtml += `<div class="item"><span>${item.quantity}x ${item.name}</span><span>${(item.price * item.quantity).toFixed(2)}E</span></div>`;
            if (details.length > 0) {
                itemsHtml += `<div class="details">${details.join(' | ')}</div>`;
            }
        });

        let loyaltyHtml = '';
        if (order.stampsEarned && order.stampsEarned > 0) {
            loyaltyHtml = `
                <div class="sep">================================</div>
                <div class="loyalty">FIDELITE: +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''}</div>
                ${order.totalStamps !== undefined ? `<div class="loyalty">Total tampons: ${order.totalStamps}/10</div>` : ''}
            `;
        }

        const html = `<!DOCTYPE html><html><head><title>Ticket ${order.orderNumber}</title>
<style>
@page{size:80mm auto;margin:0}
body{font-family:'Courier New',monospace;width:72mm;margin:0 auto;padding:2mm;font-size:12px;color:#000}
.center{text-align:center}
.bold{font-weight:bold}
.big{font-size:16px}
.item{display:flex;justify-content:space-between;margin:2px 0;font-weight:bold}
.details{font-size:10px;color:#333;margin-left:8px;margin-bottom:3px}
.total{font-size:16px;font-weight:bold;text-align:right;margin-top:6px}
.sep{text-align:center;color:#666;font-size:11px}
.loyalty{text-align:center;font-size:12px}
</style></head><body>
<div class="center bold big">TWIN PIZZA</div>
<div class="center">Grand-Couronne</div>
<div class="center">02 32 11 26 13</div>
<div class="sep">================================</div>
<div class="center bold big">TICKET N* ${order.orderNumber}</div>
<div class="center">${new Date().toLocaleString('fr-FR')}</div>
<div class="sep">================================</div>
<div class="center bold">${typeLabel}</div>
<div class="center bold">Client: ${order.customerName.toUpperCase()}</div>
<div class="sep">--------------------------------</div>
${itemsHtml}
<div class="sep">--------------------------------</div>
<div style="text-align:right">Sous-total: ${order.subtotal.toFixed(2)}E</div>
<div style="text-align:right">TVA (10%): ${order.tva.toFixed(2)}E</div>
<div class="total">TOTAL: ${order.total.toFixed(2)}E</div>
${loyaltyHtml}
<div class="sep">================================</div>
<div class="center bold">Presentez ce ticket a la caisse pour payer</div>
<div class="center">Merci ${order.customerName}!</div>
</body></html>`;

        // Create a hidden iframe, write the ticket, and trigger silent print
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();

            // Wait for content to render, then trigger print
            setTimeout(() => {
                try {
                    iframe.contentWindow?.print();
                    console.log('✅ Silent print triggered (requires --kiosk-printing flag on Chrome)');
                } catch (e) {
                    console.error('Silent print failed:', e);
                }
                // Clean up after print
                setTimeout(() => {
                    iframe.remove();
                }, 5000);
            }, 500);
        }
    };

    return { initPrinter, printKioskTicket, isIminDevice };
}

export type { KioskOrderData };
