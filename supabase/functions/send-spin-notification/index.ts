import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpinNotification {
    prize: string | null;
    prizeEmoji: string;
    prizeCode: string;
    expiresAt: string;
    isWin: boolean;
    clientName?: string;
    isNameUpdate?: boolean;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const data: SpinNotification = await req.json();

        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const chatIds = [
            Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_1'),
            Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_2'),
            Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_3'),
            Deno.env.get('TELEGRAM_ADMIN_CHAT_ID_4'),
        ].filter(Boolean);

        if (!botToken || chatIds.length === 0) {
            console.error('Missing Telegram configuration');
            return new Response(JSON.stringify({ error: 'Missing Telegram configuration' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let message = '';

        if (data.isNameUpdate) {
            // Name update notification
            message = `📝 *ROUE - NOM CLIENT*\n`;
            message += `👤 Client: *${data.clientName}*\n`;
            message += `${data.prizeEmoji} Prix: *${data.prize}*\n`;
            message += `🔑 Code: \`${data.prizeCode}\`\n`;
            const expiresDate = new Date(data.expiresAt);
            const formattedTime = expiresDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Paris'
            });
            message += `⏰ Expire à: ${formattedTime}`;
        } else if (data.isWin) {
            // Win notification
            message = `🎉🎡 *GAIN ROUE!*\n\n`;
            message += `${data.prizeEmoji} Prix: *${data.prize}*\n`;
            message += `🔑 Code: \`${data.prizeCode}\`\n`;
            const expiresDate = new Date(data.expiresAt);
            const formattedTime = expiresDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Paris'
            });
            message += `⏰ Expire à: ${formattedTime}\n`;
            message += `\n_Le client va laisser un avis Google_`;
        } else {
            // Lose notification
            const now = new Date();
            const formattedTime = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Paris'
            });
            message = `❌🎡 *ROUE: Perdu*\n⏰ ${formattedTime}`;
        }

        console.log('Sending spin wheel notification to chats:', chatIds);

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const results = await Promise.all(
            chatIds.map(async (chatId) => {
                try {
                    const response = await fetch(telegramUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: message,
                            parse_mode: 'Markdown',
                        }),
                    });
                    const result = await response.json();
                    console.log(`Telegram sent to ${chatId}:`, result.ok ? 'success' : result.description);
                    return result;
                } catch (err) {
                    console.error(`Failed to send to ${chatId}:`, err);
                    return { ok: false };
                }
            })
        );

        const successCount = results.filter(r => r.ok).length;
        console.log(`Spin notifications sent: ${successCount}/${chatIds.length}`);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error sending spin notification:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
