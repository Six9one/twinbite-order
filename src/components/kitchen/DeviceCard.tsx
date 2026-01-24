import { Thermometer, Clock, AlertCircle, CheckCircle } from "lucide-react";
import type { Device } from "./DeviceManager";

interface DeviceCardProps {
    device: Device;
    onClick: () => void;
}

export const DeviceCard = ({ device, onClick }: DeviceCardProps) => {
    const hasRecentLog = device.lastLoggedAt
        ? new Date().getTime() - new Date(device.lastLoggedAt).getTime() < 24 * 60 * 60 * 1000
        : false;

    const isWarning = device.status === "warning";

    return (
        <button
            onClick={onClick}
            className={`w-full p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${isWarning
                    ? "bg-red-900/30 border-red-500 animate-pulse"
                    : hasRecentLog
                        ? "bg-green-900/20 border-green-600/50"
                        : "bg-slate-800 border-slate-600 hover:border-orange-500/50"
                }`}
        >
            <div className="flex items-start gap-4">
                {/* Photo or Icon */}
                {device.photo ? (
                    <img
                        src={device.photo}
                        alt={device.name}
                        className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                ) : (
                    <div
                        className={`w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 ${device.type === "fridge" ? "bg-blue-900/50" : "bg-indigo-900/50"
                            }`}
                    >
                        <Thermometer
                            className={`h-10 w-10 ${device.type === "fridge" ? "text-blue-400" : "text-indigo-400"
                                }`}
                        />
                    </div>
                )}

                {/* Info */}
                <div className="flex-1 text-left">
                    <h3 className="text-white font-bold text-lg mb-1">{device.name}</h3>
                    <p className="text-slate-400 text-sm mb-3">
                        {device.type === "fridge" ? "🧊 Réfrigérateur" : "❄️ Congélateur"}
                    </p>

                    {/* Last Log */}
                    {device.lastTemp !== undefined ? (
                        <div className="flex items-center gap-2">
                            {isWarning ? (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            <span
                                className={`text-2xl font-bold ${isWarning ? "text-red-400" : "text-green-400"
                                    }`}
                            >
                                {device.lastTemp}°C
                            </span>
                            {device.lastLoggedAt && (
                                <span className="text-slate-500 text-sm flex items-center gap-1 ml-2">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(device.lastLoggedAt)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="h-4 w-4" />
                            <span>Aucun relevé</span>
                        </div>
                    )}
                </div>

                {/* Arrow indicator */}
                <div className="flex items-center justify-center h-full">
                    <div className="text-slate-500 text-3xl">›</div>
                </div>
            </div>
        </button>
    );
};

// Helper function for relative time
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default DeviceCard;
