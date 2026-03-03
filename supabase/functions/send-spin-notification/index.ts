import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_CHAT_IDS = (Deno.env.get("TELEGRAM_ADMIN_CHAT_IDS") || "").split(",").map((id: string) => id.trim()).filter(Boolean);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { isWin, prize, prizeEmoji, prizeCode, clientName, expiresAt } = await req.json();

        let message = "";
        if (isWin) {
            message = [
                `🎰 *SPIN WHEEL — GAGNÉ !*`,
                ``,
                `👤 Client: *${clientName || "Anonyme"}*`,
                `🎁 Prix: ${prizeEmoji} *${prize}*`,
                `🔢 Code: \`${prizeCode}\``,
                `⏰ Expire: ${new Date(expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
            ].join("\n");
        } else {
            message = [
                `🎰 *SPIN WHEEL — Perdu*`,
                ``,
                `👤 Client: *${clientName || "Anonyme"}*`,
                `❌ Pas de lot`,
            ].join("\n");
        }

        for (const chatId of ADMIN_CHAT_IDS) {
            if (!chatId) continue;
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: "Markdown",
                }),
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
