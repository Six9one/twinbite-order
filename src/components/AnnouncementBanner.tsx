import { useStoreStatus } from '@/hooks/useSiteSettings';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function AnnouncementBanner() {
    const { status, isStoreClosed, closedMessage } = useStoreStatus();
    const [dismissed, setDismissed] = useState(false);

    // Show closed banner if store is closed
    if (isStoreClosed && !dismissed) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 relative">
                <div className="container mx-auto flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium text-center">{closedMessage}</p>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-white/20 p-1 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // Show custom banner if enabled
    if (status.showBanner && status.bannerMessage && !dismissed) {
        const bgColor =
            status.bannerType === 'error' ? 'bg-red-600' :
                status.bannerType === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-600';

        const textColor = status.bannerType === 'warning' ? 'text-black' : 'text-white';

        const Icon =
            status.bannerType === 'error' ? AlertCircle :
                status.bannerType === 'warning' ? AlertTriangle :
                    Info;

        return (
            <div className={`${bgColor} ${textColor} px-4 py-3 relative`}>
                <div className="container mx-auto flex items-center justify-center gap-2">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium text-center">{status.bannerMessage}</p>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 hover:bg-white/20 p-1 rounded ${textColor}`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return null;
}
