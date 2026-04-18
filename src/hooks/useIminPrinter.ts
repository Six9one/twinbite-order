/**
 * iMin Printer SDK hook for the D4-503 POS terminal.
 * Uses the IminPrintInstance JS API available in the iMin browser.
 * Falls back to window.print() when not on an iMin device.
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
    // Loyalty info (optional)
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
                console.log('🖨️ iMin printer initialized');
            } catch (e) {
                console.error('Failed to init iMin printer:', e);
            }
        }
    };

    const printKioskTicket = (order: KioskOrderData) => {
        if (isIminDevice) {
            printViaiMin(order);
        } else {
            printViaBrowser(order);
        }
    };

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
            const typeLabel = order.orderType === 'surplace' ? '🍽️ SUR PLACE' : '🛍️ A EMPORTER';
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

                // Price on right
                p.setAlignment(2);
                p.printText(`${(item.price * item.quantity).toFixed(2)}€\n`);
                p.setAlignment(0);

                // Customizations
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
            p.printText(`Sous-total: ${order.subtotal.toFixed(2)}€\n`);
            p.printText(`TVA (10%): ${order.tva.toFixed(2)}€\n`);
            p.setTextSize(28);
            p.setTextStyle(1);
            p.printText(`TOTAL: ${order.total.toFixed(2)}€\n`);
            p.setTextStyle(0);

            // Loyalty info
            if (order.stampsEarned && order.stampsEarned > 0) {
                p.setAlignment(1);
                p.setTextSize(20);
                p.printText("================================\n");
                p.setTextSize(22);
                p.printText(`🎁 FIDÉLITÉ: +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''}\n`);
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
            p.printText("Présentez ce ticket à la\n");
            p.printText("caisse pour payer\n");
            p.setTextSize(22);
            p.setTextStyle(0);
            p.printText(`Merci ${order.customerName}! 🍕\n`);
            p.printText("\n\n\n");

            // Cut paper
            p.partialCut();

            console.log('✅ Ticket printed via iMin printer');
        } catch (e) {
            console.error('iMin print error:', e);
            // Fallback to browser print
            printViaBrowser(order);
        }
    };

    const printViaBrowser = (order: KioskOrderData) => {
        const typeLabel = order.orderType === 'surplace' ? '🍽️ SUR PLACE' : '🛍️ A EMPORTER';

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
            itemsHtml += `<div class="item"><span>${item.quantity}x ${item.name}</span><span>${(item.price * item.quantity).toFixed(2)}€</span></div>`;
            if (details.length > 0) {
                itemsHtml += `<div class="details">${details.join(' | ')}</div>`;
            }
        });

        let loyaltyHtml = '';
        if (order.stampsEarned && order.stampsEarned > 0) {
            loyaltyHtml = `
                <div class="sep">================================</div>
                <div class="loyalty">🎁 FIDÉLITÉ: +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''}</div>
                ${order.totalStamps !== undefined ? `<div class="loyalty">Total tampons: ${order.totalStamps}/10</div>` : ''}
            `;
        }

        const html = `<!DOCTYPE html><html><head><title>Ticket ${order.orderNumber}</title>
<style>
@page{size:80mm auto;margin:0}
body{font-family:'Courier New',monospace;width:80mm;margin:0;padding:3mm;font-size:13px;color:#000}
.center{text-align:center}
.bold{font-weight:bold}
.big{font-size:18px}
.item{display:flex;justify-content:space-between;margin:3px 0;font-weight:bold}
.details{font-size:10px;color:#666;margin-left:10px;margin-bottom:4px}
.total{font-size:18px;font-weight:bold;text-align:right;margin-top:8px}
.sep{text-align:center;color:#999}
.loyalty{text-align:center;font-size:13px}
</style></head><body>
<div class="center bold big">TWIN PIZZA</div>
<div class="center">Grand-Couronne</div>
<div class="sep">================================</div>
<div class="center bold big">TICKET N° ${order.orderNumber}</div>
<div class="center">${new Date().toLocaleString('fr-FR')}</div>
<div class="sep">================================</div>
<div class="center bold">${typeLabel}</div>
<div class="center bold">Client: ${order.customerName.toUpperCase()}</div>
<div class="sep">--------------------------------</div>
${itemsHtml}
<div class="sep">--------------------------------</div>
<div style="text-align:right">Sous-total: ${order.subtotal.toFixed(2)}€</div>
<div style="text-align:right">TVA (10%): ${order.tva.toFixed(2)}€</div>
<div class="total">TOTAL: ${order.total.toFixed(2)}€</div>
${loyaltyHtml}
<div class="sep">================================</div>
<div class="center bold">Présentez ce ticket à la caisse pour payer</div>
<div class="center">Merci ${order.customerName}! 🍕</div>
</body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => iframe.remove(), 3000);
            }, 300);
        }
        console.log('✅ Ticket printed via browser fallback');
    };

    return { initPrinter, printKioskTicket, isIminDevice };
}

export type { KioskOrderData };
