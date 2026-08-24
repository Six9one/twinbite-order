import { useStoreStatus } from '@/hooks/useSiteSettings';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TG_TOKEN = '8559920192:AAEShBygRAFZ59yRLKLzGsnXKW2lx1xmUFk';
const TG_CHAT  = '5838660893';

async function sendTelegram(text: string) {
    try {
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
        });
    } catch (_) {
        // silent fail — never block the UI
    }
}

export function AnnouncementBanner() {
    const { status, isStoreClosed, closedMessage } = useStoreStatus();
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when banner message changes
    useEffect(() => {
        setDismissed(false);
    }, [status.bannerMessage]);

    // Track visit + notify Telegram when banner appears
    useEffect(() => {
        const shouldShow = isStoreClosed || (status.showBanner && !!status.bannerMessage);
        if (!shouldShow) return;

        // Only fire once per page load (session flag)
        const flag = 'vacation_visit_tracked';
        if (sessionStorage.getItem(flag)) return;
        sessionStorage.setItem(flag, '1');

        // Increment counter then notify Telegram
        supabase
            .from('site_settings' as any)
            .select('key, value')
            .eq('key', 'vacation_visitors')
            .maybeSingle()
            .then(({ data }: { data: { key: string; value: string } | null }) => {
                const current = parseInt((data as any)?.value ?? '0', 10) || 0;
                const newCount = current + 1;

                supabase
                    .from('site_settings' as any)
                    .upsert({ key: 'vacation_visitors', value: String(newCount) }, { onConflict: 'key' })
                    .then(() => {
                        // Build Telegram message
                        const now = new Date().toLocaleString('fr-FR', {
                            timeZone: 'Europe/Paris',
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                        });
                        const msg =
                            `🍕 <b>Twin Pizza — twinpizza.fr</b>\n\n` +
                            `👤 <b>Nouveau visiteur sur le site !</b>\n` +
                            `🕐 ${now}\n\n` +
                            `📊 <b>Total visiteurs vacances : ${newCount}</b>`;
                        sendTelegram(msg);
                    });
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStoreClosed, status.showBanner, status.bannerMessage]);

    const shouldShow = isStoreClosed || (status.showBanner && !!status.bannerMessage);
    if (!shouldShow || dismissed) return null;

    const isClosedOverlay = isStoreClosed;
    const bannerType = status.bannerType;

    const bgColor = isClosedOverlay ? 'bg-red-600' :
        bannerType === 'error' ? 'bg-red-600' :
        bannerType === 'warning' ? 'bg-red-600' :
        'bg-blue-600';

    const Icon = isClosedOverlay ? AlertTriangle :
        bannerType === 'error' ? AlertCircle :
        bannerType === 'warning' ? AlertTriangle :
        Info;

    const message = isClosedOverlay ? closedMessage : status.bannerMessage;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
                onClick={() => setDismissed(true)}
            />

            {/* Card */}
            <div
                className={`${bgColor} relative z-10 rounded-3xl shadow-2xl w-full max-w-sm p-7 text-white text-center`}
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* Close button */}
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <Icon className="w-8 h-8" />
                    </div>
                </div>

                {/* Message */}
                <p className="text-xl font-bold leading-snug mb-6 whitespace-pre-line">{message}</p>

                {/* Button */}
                <button
                    onClick={() => setDismissed(true)}
                    className="w-full h-12 rounded-2xl bg-white/15 border border-white/30 text-white font-bold hover:bg-white/25 transition-colors"
                >
                    J'ai compris
                </button>
            </div>
        </div>
    );
}
