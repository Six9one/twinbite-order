import { supabase } from '@/integrations/supabase/client';

interface SendSMSOptions {
    to: string;
    message: string;
    type?: 'order_notification' | 'supplier_order' | 'custom';
}

interface SMSResponse {
    success: boolean;
    sid?: string;
    error?: string;
}

/**
 * Envoie un SMS via Twilio (Edge Function Supabase)
 */
export async function sendSMS({ to, message, type = 'custom' }: SendSMSOptions): Promise<SMSResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
            body: { to, message, type },
        });

        if (error) {
            console.error('❌ SMS Error:', error);
            return { success: false, error: error.message };
        }

        return data as SMSResponse;
    } catch (err: any) {
        console.error('❌ SMS Error:', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

/**
 * Envoie une notification de commande au client
 */
export async function sendOrderNotification(
    phoneNumber: string,
    orderNumber: string,
    orderType: string,
    total: number
): Promise<SMSResponse> {
    const message = `🍕 TWIN PIZZA
Commande ${orderNumber} confirmée!
Type: ${orderType.toUpperCase()}
Total: ${total.toFixed(2)}€

Merci de votre confiance!`;

    return sendSMS({
        to: phoneNumber,
        message,
        type: 'order_notification',
    });
}

/**
 * Envoie une commande fournisseur par SMS
 */
export async function sendSupplierOrder(
    supplierPhone: string,
    items: Array<{ name: string; quantity: number; unit: string }>
): Promise<SMSResponse> {
    const date = new Date().toLocaleDateString('fr-FR');

    let message = `📦 COMMANDE TWIN PIZZA\n📅 ${date}\n\n`;

    items.forEach((item, i) => {
        message += `${i + 1}. ${item.quantity} ${item.unit} ${item.name}\n`;
    });

    message += `\n✅ Total: ${items.length} produits\nMerci!`;

    return sendSMS({
        to: supplierPhone,
        message,
        type: 'supplier_order',
    });
}
