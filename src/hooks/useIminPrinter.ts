/**
 * iMin Printer SDK hook for the D4-503 POS terminal.
 * Uses the IminPrintInstance JS API available in the iMin browser.
 * 
 * IMPORTANT: NO window.print() fallback — that opens a dialog and breaks kiosk fullscreen.
 * If not on iMin device, printing is handled silently by the print server via Supabase realtime.
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
        } else {
            console.log('🖨️ Not on iMin device — printing will be handled by print server via Supabase');
        }
    };

    const printKioskTicket = (order: KioskOrderData) => {
        if (isIminDevice) {
            printViaiMin(order);
        } else {
            // NO browser print dialog — the print server handles it silently
            // via Supabase realtime subscription (order INSERT triggers auto-print)
            console.log('🖨️ [KIOSK] Not iMin device — skipping local print. Print server will handle via Supabase realtime.');
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

                // Price on right
                p.setAlignment(2);
                p.printText(`${(item.price * item.quantity).toFixed(2)}E\n`);
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
            p.printText(`Sous-total: ${order.subtotal.toFixed(2)}E\n`);
            p.printText(`TVA (10%): ${order.tva.toFixed(2)}E\n`);
            p.setTextSize(28);
            p.setTextStyle(1);
            p.printText(`TOTAL: ${order.total.toFixed(2)}E\n`);
            p.setTextStyle(0);

            // Loyalty info
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

            // Cut paper
            p.partialCut();

            console.log('✅ Ticket printed via iMin built-in printer (silent, no dialog)');
        } catch (e) {
            console.error('iMin print error:', e);
            // Do NOT fallback to window.print() — it opens a dialog and breaks kiosk fullscreen
            // The print server will handle it via Supabase realtime
            console.log('🖨️ iMin print failed — print server will handle via Supabase realtime');
        }
    };

    return { initPrinter, printKioskTicket, isIminDevice };
}

export type { KioskOrderData };
