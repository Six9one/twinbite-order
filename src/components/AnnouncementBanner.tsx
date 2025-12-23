import { useStoreStatus } from '@/hooks/useSiteSettings';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function AnnouncementBanner() {
    const { status, isStoreClosed, closedMessage } = useStoreStatus();
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when banner message changes
    useEffect(() => {
        setDismissed(false);
    }, [status.bannerMessage]);

    // Show closed overlay if store is closed
    if (isStoreClosed && !dismissed) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-red-600 text-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300">
                    {/* Close button */}
                    <button
                        onClick={() => setDismissed(true)}
                        className="absolute top-4 right-4 hover:bg-white/20 p-2 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-2xl font-bold text-center mb-6">{closedMessage}</p>

                    {/* Close button */}
                    <Button
                        onClick={() => setDismissed(true)}
                        variant="outline"
                        className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        J'ai compris
                    </Button>
                </div>
            </div>
        );
    }

    // Show custom banner as big centered modal if enabled
    if (status.showBanner && status.bannerMessage && !dismissed) {
        const bgColor =
            status.bannerType === 'error' ? 'bg-red-600' :
                status.bannerType === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-600';

        const textColor = status.bannerType === 'warning' ? 'text-black' : 'text-white';
        const buttonBg = status.bannerType === 'warning' ? 'bg-black/10 border-black/30 text-black hover:bg-black/20' : 'bg-white/10 border-white/30 text-white hover:bg-white/20';

        const Icon =
            status.bannerType === 'error' ? AlertCircle :
                status.bannerType === 'warning' ? AlertTriangle :
                    Info;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className={`${bgColor} ${textColor} rounded-2xl shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300`}>
                    {/* Close button */}
                    <button
                        onClick={() => setDismissed(true)}
                        className={`absolute top-4 right-4 hover:bg-white/20 p-2 rounded-full transition-colors ${textColor}`}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className={`w-20 h-20 ${status.bannerType === 'warning' ? 'bg-black/10' : 'bg-white/20'} rounded-full flex items-center justify-center`}>
                            <Icon className="w-10 h-10" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-center mb-4">
                        {status.bannerType === 'error' ? '⚠️ Annonce Importante' :
                            status.bannerType === 'warning' ? '📢 Information' :
                                '📣 Annonce'}
                    </h2>

                    {/* Message */}
                    <p className="text-lg text-center mb-6 whitespace-pre-line">{status.bannerMessage}</p>

                    {/* Close button */}
                    <Button
                        onClick={() => setDismissed(true)}
                        variant="outline"
                        className={`w-full ${buttonBg}`}
                    >
                        J'ai compris
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
