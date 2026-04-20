/**
 * iMin Printer hook for the D4-503 POS terminal.
 * 
 * Printing strategy (in order):
 * 1. IminPrintInstance JS SDK (native iMin browser only)
 * 2. Fully Kiosk Browser API — fully.print() (if using Fully Kiosk Browser)
 * 3. Silent HTML print via hidden iframe (Chrome with --kiosk-printing)
 * 4. Print server via Supabase realtime (always works as backup)
 */

declare global {
    interface Window {
        IminPrintInstance?: {
            initPrinter: () => void;
            getPrinterStatus: () => string;
            printText: (text: string) => void;
            printAndLineFeed: () => void;
            printAndFeedPaper: (height: number) => void;
            setAlignment: (alignment: number) => void;
            setTextSize: (size: number) => void;
            setTextStyle: (style: number) => void;
            setTextWidth: (width: number) => void;
            partialCut: () => void;
            fullCut: () => void;
        };
        fully?: {
            print: () => void;
            getDeviceId: () => string;
            getCurrentUrl: () => string;
            loadUrl: (url: string) => void;
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
    const isFullyKiosk = typeof window !== 'undefined' && !!window.fully;

    const initPrinter = () => {
        if (isIminDevice) {
            try {
                window.IminPrintInstance!.initPrinter();
                console.log('🖨️ iMin printer initialized (JS SDK)');
            } catch (e) {
                console.error('Failed to init iMin printer:', e);
            }
        } else if (isFullyKiosk) {
            console.log('🖨️ Fully Kiosk Browser detected — will use fully.print()');
        } else {
            console.log('🖨️ Standard browser — will use iframe silent print');
        }
    };

    const printKioskTicket = (order: KioskOrderData) => {
        if (isIminDevice) {
            printViaiMin(order);
        } else {
            // For both Fully Kiosk and standard Chrome: use HTML print
            // Fully Kiosk intercepts window.print() and routes to system printer
            // Chrome with --kiosk-printing also prints silently
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

        const tryRawBTHttp = async (): Promise<boolean> => {
            try {
                // Generate simple ESC/POS text for RawBT
                let rawbtText = "[C]<font size='big'>TWIN PIZZA</font>\n";
                rawbtText += "[C]Grand-Couronne\n";
                rawbtText += "[C]02 32 11 26 13\n";
                rawbtText += "[C]================================\n";
                rawbtText += `[C]<font size='big'><b>TICKET N. ${order.orderNumber}</b></font>\n`;
                rawbtText += `[C]${new Date().toLocaleString('fr-FR')}\n`;
                rawbtText += "[C]================================\n";
                rawbtText += `[C]<font size='big'><b>${typeLabel}</b></font>\n`;
                rawbtText += `[L]Client: <b>${order.customerName.toUpperCase()}</b>\n`;
                rawbtText += "[C]--------------------------------\n";

                order.items.forEach(item => {
                    rawbtText += `[L]<b>${item.quantity}x ${item.name}</b>[R]${(item.price * item.quantity).toFixed(2)}E\n`;
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
                            rawbtText += `[L]<font size='small'>  ${details.join(' | ')}</font>\n`;
                        }
                    }
                });

                rawbtText += "[C]--------------------------------\n";
                rawbtText += `[R]Sous-total: ${order.subtotal.toFixed(2)}E\n`;
                rawbtText += `[R]TVA (10%): ${order.tva.toFixed(2)}E\n`;
                rawbtText += `[R]<font size='big'><b>TOTAL: ${order.total.toFixed(2)}E</b></font>\n`;

                if (order.stampsEarned && order.stampsEarned > 0) {
                    rawbtText += "[C]================================\n";
                    rawbtText += `[C]FIDELITE: +${order.stampsEarned} tampon${order.stampsEarned > 1 ? 's' : ''}\n`;
                    if (order.totalStamps !== undefined) {
                        rawbtText += `[C]Total tampons: ${order.totalStamps}/10\n`;
                    }
                }

                rawbtText += "[C]================================\n";
                rawbtText += "[C]<b>Presentez ce ticket a la caisse pour payer</b>\n";
                rawbtText += `[C]Merci ${order.customerName}!\n\n\n`;

                // Send to RawBT's hidden local server
                const response = await fetch("http://127.0.0.1:40213/", {
                    method: "POST",
                    body: rawbtText,
                    mode: "no-cors" // Essential to bypass CORS on localhost
                });
                console.log('✅ Sent silently to RawBT background service');
                return true;
            } catch (err) {
                console.error('RawBT print failed:', err);
                return false;
            }
        };

        // First try RawBT if installed, otherwise fallback to standard Android Print dialog
        const success = await tryRawBTHttp();
        if (success) return;

        // ===== STANDARD BROWSER FALLBACK (Chrome + AllPOS Printer or Fully Kiosk) =====
        // Create a print-only div overlay, print it, then remove it
        const printContainer = document.createElement('div');
        printContainer.id = 'kiosk-print-container';
        printContainer.innerHTML = `
            <style>
                @media screen { #kiosk-print-container { display: none !important; } }
                @media print {
                    body > *:not(#kiosk-print-container) { display: none !important; }
                    #kiosk-print-container { display: block !important; }
                    @page { size: 80mm auto; margin: 0; }
                    #kiosk-print-container {
                        font-family: 'Courier New', monospace;
                        width: 72mm; margin: 0 auto; padding: 2mm;
                        font-size: 12px; color: #000;
                    }
                    #kiosk-print-container .center { text-align: center; }
                    #kiosk-print-container .bold { font-weight: bold; }
                    #kiosk-print-container .big { font-size: 16px; }
                    #kiosk-print-container .item { display: flex; justify-content: space-between; margin: 2px 0; font-weight: bold; }
                    #kiosk-print-container .details { font-size: 10px; color: #333; margin-left: 8px; margin-bottom: 3px; }
                    #kiosk-print-container .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 6px; }
                    #kiosk-print-container .sep { text-align: center; color: #666; font-size: 11px; }
                    #kiosk-print-container .loyalty { text-align: center; font-size: 12px; }
                }
            </style>
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
        `;
        document.body.appendChild(printContainer);

        setTimeout(() => {
            try {
                if (isFullyKiosk && window.fully) {
                    window.fully!.print();
                    console.log('✅ Ticket printed via Fully Kiosk Browser fully.print()');
                } else {
                    window.print();
                    console.log('✅ Ticket printed via standard Android window.print() (AllPOS Printer trigger)');
                }
            } catch (e) {
                console.error('Print failed:', e);
            }
            // Clean up the print container
            setTimeout(() => {
                printContainer.remove();
            }, 3000);
        }, 300);
    };

    return { initPrinter, printKioskTicket, isIminDevice, isFullyKiosk };
}

export type { KioskOrderData };
