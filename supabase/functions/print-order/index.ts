import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

interface PrintOrderPayload {
    orderId?: string;
    orderNumber?: string;
    // Direct order data (alternative to fetching from DB)
    order?: OrderData;
}

interface OrderData {
    id: string;
    order_number: string;
    order_type: 'emporter' | 'livraison' | 'surplace';
    status: string;
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    customer_notes?: string;
    items: any[];
    subtotal: number;
    tva: number;
    delivery_fee: number;
    total: number;
    payment_method: string;
    is_scheduled?: boolean;
    scheduled_for?: string;
    created_at: string;
}

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';
const ESCPOS = {
    INIT: ESC + '@',                    // Initialize printer
    CENTER: ESC + 'a' + '\x01',         // Center alignment
    LEFT: ESC + 'a' + '\x00',           // Left alignment
    RIGHT: ESC + 'a' + '\x02',          // Right alignment
    BOLD_ON: ESC + 'E' + '\x01',        // Bold on
    BOLD_OFF: ESC + 'E' + '\x00',       // Bold off
    DOUBLE_HEIGHT: GS + '!' + '\x10',   // Double height
    DOUBLE_WIDTH: GS + '!' + '\x20',    // Double width
    DOUBLE_SIZE: GS + '!' + '\x30',     // Double height + width
    NORMAL_SIZE: GS + '!' + '\x00',     // Normal size
    UNDERLINE_ON: ESC + '-' + '\x01',   // Underline on
    UNDERLINE_OFF: ESC + '-' + '\x00',  // Underline off
    CUT: GS + 'V' + '\x00',             // Full cut
    PARTIAL_CUT: GS + 'V' + '\x01',     // Partial cut
    FEED: ESC + 'd' + '\x03',           // Feed 3 lines
    LINE: '-'.repeat(42) + '\n',        // Separator line
    DOUBLE_LINE: '='.repeat(42) + '\n', // Double separator
};

// Format order for ESC/POS printing
function formatOrderForPrint(order: OrderData, ticketSettings: any): string {
    let ticket = '';

    // Initialize printer
    ticket += ESCPOS.INIT;

    // Header
    ticket += ESCPOS.CENTER;
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += (ticketSettings.header || 'TWIN PIZZA') + '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += (ticketSettings.subheader || 'Grand-Couronne') + '\n';
    ticket += (ticketSettings.phone || '02 32 11 26 13') + '\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LINE;

    // Order number (large, centered)
    ticket += ESCPOS.DOUBLE_SIZE;
    ticket += ESCPOS.BOLD_ON;
    ticket += `N° ${order.order_number}\n`;
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    // Date/time
    const orderDate = new Date(order.created_at);
    ticket += orderDate.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }) + '\n';

    ticket += ESCPOS.LINE;

    // Order type (highlighted)
    const orderTypeLabels: Record<string, string> = {
        livraison: 'LIVRAISON',
        emporter: 'À EMPORTER',
        surplace: 'SUR PLACE'
    };
    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += ESCPOS.BOLD_ON;
    ticket += orderTypeLabels[order.order_type] || order.order_type.toUpperCase();
    ticket += '\n';
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    // Scheduled order info
    if (order.is_scheduled && order.scheduled_for) {
        const scheduledDate = new Date(order.scheduled_for);
        ticket += ESCPOS.BOLD_ON;
        ticket += '\n⏰ PROGRAMMÉE POUR:\n';
        ticket += scheduledDate.toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) + '\n';
        ticket += ESCPOS.BOLD_OFF;
    }

    ticket += ESCPOS.LINE;

    // Customer info
    ticket += ESCPOS.LEFT;
    ticket += ESCPOS.BOLD_ON;
    ticket += 'Client: ' + order.customer_name + '\n';
    ticket += ESCPOS.BOLD_OFF;
    ticket += 'Tél: ' + (order.customer_phone || '') + '\n';

    if (order.customer_address) {
        ticket += 'Adresse: ' + order.customer_address + '\n';
    }

    if (order.customer_notes) {
        ticket += '\n';
        ticket += ESCPOS.BOLD_ON;
        ticket += '📝 Note: ';
        ticket += ESCPOS.BOLD_OFF;
        ticket += order.customer_notes + '\n';
    }

    ticket += ESCPOS.LINE;

    // Items
    ticket += ESCPOS.BOLD_ON;
    ticket += 'ARTICLES:\n';
    ticket += ESCPOS.BOLD_OFF;

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((cartItem: any) => {
        const productName = cartItem.item?.name || cartItem.name || 'Produit';
        const quantity = cartItem.quantity || 1;
        const price = cartItem.totalPrice || cartItem.calculatedPrice || cartItem.price || 0;

        ticket += ESCPOS.BOLD_ON;
        ticket += `${quantity}x ${productName}`;
        ticket += ESCPOS.BOLD_OFF;
        ticket += ` - ${price.toFixed(2)}€\n`;

        // Customization details
        const customization = cartItem.customization;
        if (customization) {
            const details: string[] = [];

            if (customization.size) {
                details.push(`📏 ${customization.size.toUpperCase()}`);
            }
            if (customization.base) {
                details.push(`Base ${customization.base}`);
            }
            if (customization.meats?.length) {
                details.push(`🥩 ${customization.meats.join(', ')}`);
            }
            if (customization.meat) {
                details.push(`🥩 ${customization.meat}`);
            }
            if (customization.sauces?.length) {
                details.push(`🍯 ${customization.sauces.join(', ')}`);
            }
            if (customization.sauce) {
                details.push(`🍯 ${customization.sauce}`);
            }
            if (customization.garnitures?.length) {
                details.push(`🥗 ${customization.garnitures.join(', ')}`);
            }
            if (customization.supplements?.length) {
                details.push(`➕ ${customization.supplements.join(', ')}`);
            }
            if (customization.menuOption && customization.menuOption !== 'none') {
                const menuLabels: Record<string, string> = {
                    'frites': '+Frites',
                    'boisson': '+Boisson',
                    'menu': '+Menu'
                };
                details.push(menuLabels[customization.menuOption] || customization.menuOption);
            }
            if (customization.note) {
                details.push(`📝 ${customization.note}`);
            }

            if (details.length > 0) {
                ticket += `   ${details.join(' | ')}\n`;
            }
        }
    });

    ticket += ESCPOS.LINE;

    // Totals
    ticket += ESCPOS.RIGHT;
    ticket += `Sous-total: ${order.subtotal.toFixed(2)}€\n`;
    ticket += `TVA (10%): ${order.tva.toFixed(2)}€\n`;
    if (order.delivery_fee > 0) {
        ticket += `Livraison: ${order.delivery_fee.toFixed(2)}€\n`;
    }

    ticket += ESCPOS.DOUBLE_HEIGHT;
    ticket += ESCPOS.BOLD_ON;
    ticket += `TOTAL: ${order.total.toFixed(2)}€\n`;
    ticket += ESCPOS.NORMAL_SIZE;
    ticket += ESCPOS.BOLD_OFF;

    ticket += ESCPOS.CENTER;
    ticket += '\n';

    // Payment status
    const paymentLabels: Record<string, { label: string; paid: boolean }> = {
        'en_ligne': { label: 'PAYÉE ✓', paid: true },
        'cb': { label: 'CB (À PAYER)', paid: false },
        'especes': { label: 'ESPÈCES (À PAYER)', paid: false }
    };
    const payment = paymentLabels[order.payment_method] || { label: order.payment_method, paid: false };

    if (payment.paid) {
        ticket += ESCPOS.BOLD_ON;
        ticket += '*** COMMANDE PAYÉE ***\n';
        ticket += ESCPOS.BOLD_OFF;
    } else {
        ticket += ESCPOS.DOUBLE_HEIGHT;
        ticket += ESCPOS.BOLD_ON;
        ticket += `À PAYER: ${payment.label}\n`;
        ticket += ESCPOS.NORMAL_SIZE;
        ticket += ESCPOS.BOLD_OFF;
    }

    ticket += ESCPOS.LINE;

    // Footer
    ticket += ticketSettings.footer || 'Merci de votre visite!';
    ticket += '\n\n';
    ticket += ESCPOS.FEED;
    ticket += ESCPOS.PARTIAL_CUT;

    return ticket;
}

// Send print command to network printer using raw TCP
async function sendToPrinter(printerIp: string, printerPort: number, data: string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[PRINT-ORDER] Connecting to printer at ${printerIp}:${printerPort}`);

        // Use Deno's TCP connection
        const conn = await Deno.connect({
            hostname: printerIp,
            port: printerPort,
        });

        try {
            // Convert string to bytes
            const encoder = new TextEncoder();
            const bytes = encoder.encode(data);

            // Send data to printer
            await conn.write(bytes);

            console.log(`[PRINT-ORDER] Print data sent successfully (${bytes.length} bytes)`);

            return { success: true };
        } finally {
            // Always close the connection
            conn.close();
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PRINT-ORDER] Printer connection failed: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}

// Retry function with exponential backoff
async function sendWithRetry(
    printerIp: string,
    printerPort: number,
    data: string,
    maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0;
    let lastError = '';

    while (attempts < maxRetries) {
        attempts++;
        console.log(`[PRINT-ORDER] Print attempt ${attempts}/${maxRetries}`);

        const result = await sendToPrinter(printerIp, printerPort, data);

        if (result.success) {
            return { success: true, attempts };
        }

        lastError = result.error || 'Unknown error';
        console.warn(`[PRINT-ORDER] Attempt ${attempts} failed: ${lastError}`);

        // Wait before retry (exponential backoff)
        if (attempts < maxRetries) {
            const delay = RETRY_DELAY_MS * attempts;
            console.log(`[PRINT-ORDER] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { success: false, attempts, lastError };
}

// Log print job to database
async function logPrintJob(
    supabase: any,
    orderId: string,
    status: 'success' | 'failed',
    attempts: number,
    error?: string
): Promise<void> {
    try {
        // Check if print_jobs table exists (create if needed for logging)
        await supabase.from('print_jobs').insert({
            order_id: orderId,
            status,
            attempts,
            error_message: error || null,
            printed_at: new Date().toISOString(),
        });
    } catch (err) {
        // Table might not exist, just log to console
        console.log(`[PRINT-ORDER] Print job log: ${status} after ${attempts} attempts`, error || '');
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload: PrintOrderPayload = await req.json();

        // Get printer configuration from environment
        const printerIp = Deno.env.get('PRINTER_IP');
        const printerPort = parseInt(Deno.env.get('PRINTER_PORT') || '9100', 10);

        if (!printerIp) {
            console.error('[PRINT-ORDER] PRINTER_IP not configured');
            return new Response(JSON.stringify({
                success: false,
                error: 'Printer IP not configured. Set PRINTER_IP environment variable.'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        let order: OrderData | null = null;

        // Get order data - either from payload or fetch from database
        if (payload.order) {
            order = payload.order;
        } else if (payload.orderId || payload.orderNumber) {
            // Fetch order from database
            let query = supabase.from('orders').select('*');

            if (payload.orderId) {
                query = query.eq('id', payload.orderId);
            } else if (payload.orderNumber) {
                query = query.eq('order_number', payload.orderNumber);
            }

            const { data, error } = await query.single();

            if (error || !data) {
                console.error('[PRINT-ORDER] Order not found:', error);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Order not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            order = data as OrderData;
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing orderId, orderNumber, or order data'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[PRINT-ORDER] Processing order ${order.order_number}`);

        // Get ticket settings from admin_settings (or use defaults)
        let ticketSettings = {
            header: 'TWIN PIZZA',
            subheader: 'Grand-Couronne',
            phone: '02 32 11 26 13',
            footer: 'Merci de votre visite!',
        };

        try {
            const { data: settingsData } = await supabase
                .from('admin_settings')
                .select('setting_value')
                .eq('setting_key', 'ticket_settings')
                .single();

            if (settingsData?.setting_value) {
                ticketSettings = { ...ticketSettings, ...settingsData.setting_value };
            }
        } catch (err) {
            // Use defaults if settings not found
        }

        // Format the ticket
        const ticketData = formatOrderForPrint(order, ticketSettings);

        console.log(`[PRINT-ORDER] Sending to printer ${printerIp}:${printerPort}`);

        // Send to printer with retry logic
        const result = await sendWithRetry(printerIp, printerPort, ticketData);

        // Log the print job
        await logPrintJob(supabase, order.id, result.success ? 'success' : 'failed', result.attempts, result.lastError);

        if (result.success) {
            console.log(`[PRINT-ORDER] ✓ Order ${order.order_number} printed successfully after ${result.attempts} attempt(s)`);
            return new Response(JSON.stringify({
                success: true,
                message: `Order printed successfully`,
                orderNumber: order.order_number,
                attempts: result.attempts
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } else {
            console.error(`[PRINT-ORDER] ✗ Failed to print order ${order.order_number} after ${result.attempts} attempts: ${result.lastError}`);
            return new Response(JSON.stringify({
                success: false,
                error: `Failed to print after ${result.attempts} attempts: ${result.lastError}`,
                orderNumber: order.order_number,
                attempts: result.attempts
            }), {
                status: 503, // Service Unavailable
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[PRINT-ORDER] Error:', errorMessage);
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
