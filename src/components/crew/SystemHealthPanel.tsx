import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
    Printer,
    MessageSquare,
    Database,
    RefreshCw,
    Power,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ExternalLink,
    Play,
    Square,
    Terminal,
    Loader2,
} from 'lucide-react';
import { useSystemHealth, formatLastChecked } from '@/hooks/useSystemHealth';

export function SystemHealthPanel() {
    const { health, refresh, setWhatsAppBotOnline, isAllHealthy } = useSystemHealth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isStartingBot, setIsStartingBot] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setIsRefreshing(false);
        toast.success('Statuts mis à jour');
    };

    const handleStartWhatsAppBot = async () => {
        setIsStartingBot(true);

        try {
            // Try to open the WhatsApp bot in a new window
            // This will launch the batch file if browser supports it
            const botPath = 'file:///C:/Users/Slicydicy/Documents/GitHub/twinbite-order/whatsapp-bot-python/START_BOT.bat';

            // For security reasons, we can't directly run batch files from browser
            // Instead, show instructions
            toast.info('Lancez le bot depuis le dossier whatsapp-bot-python', {
                description: 'Double-cliquez sur START_BOT.bat',
                duration: 5000,
            });

            // Mark as starting (user needs to confirm manually)
            setTimeout(() => {
                setIsStartingBot(false);
            }, 2000);

        } catch (error) {
            toast.error('Erreur lors du lancement du bot');
            setIsStartingBot(false);
        }
    };

    const handleConfirmBotOnline = () => {
        setWhatsAppBotOnline(true);
        toast.success('Bot WhatsApp marqué comme en ligne');
    };

    const handleConfirmBotOffline = () => {
        setWhatsAppBotOnline(false);
        toast.info('Bot WhatsApp marqué comme hors ligne');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Terminal className="w-6 h-6 text-orange-500" />
                        Santé du Système
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Surveillez l'état de vos services
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="border-orange-500/20"
                >
                    {isRefreshing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Actualiser
                </Button>
            </div>

            {/* Overall Status */}
            <Card className={`p-4 ${isAllHealthy ? 'bg-green-950/20 border-green-500/20' : 'bg-red-950/20 border-red-500/20'}`}>
                <div className="flex items-center gap-3">
                    {isAllHealthy ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    )}
                    <div>
                        <p className={`font-bold ${isAllHealthy ? 'text-green-400' : 'text-red-400'}`}>
                            {isAllHealthy ? 'Tous les systèmes opérationnels' : 'Attention : certains services sont hors ligne'}
                        </p>
                        <p className="text-sm text-gray-400">
                            Dernière vérification : {formatLastChecked(health.supabase.lastChecked)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Printer Status */}
                <ServiceCard
                    icon={<Printer className="w-6 h-6" />}
                    name="Imprimante"
                    status={health.printer}
                    description="Impression des tickets"
                />

                {/* Supabase Status */}
                <ServiceCard
                    icon={<Database className="w-6 h-6" />}
                    name="Base de données"
                    status={health.supabase}
                    description="Supabase (commandes, stocks)"
                />

                {/* WhatsApp Bot Status - Special Card */}
                <Card className={`p-4 ${health.whatsappBot.isOnline ? 'bg-green-950/10 border-green-500/20' : 'bg-[#161618] border-white/5'}`}>
                    <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${health.whatsappBot.isOnline ? 'bg-green-500/20' : 'bg-white/5'}`}>
                            <MessageSquare className={`w-6 h-6 ${health.whatsappBot.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                        </div>
                        <StatusBadge isOnline={health.whatsappBot.isOnline} />
                    </div>
                    <h3 className="font-bold mb-1">Bot WhatsApp</h3>
                    <p className="text-xs text-gray-500 mb-3">Notifications clients</p>

                    {/* Bot Controls */}
                    <div className="space-y-2">
                        {!health.whatsappBot.isOnline ? (
                            <>
                                <Button
                                    size="sm"
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={handleStartWhatsAppBot}
                                    disabled={isStartingBot}
                                >
                                    {isStartingBot ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4 mr-2" />
                                    )}
                                    Lancer le Bot
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full border-green-500/20 text-green-400"
                                    onClick={handleConfirmBotOnline}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Confirmer en ligne
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-red-500/20 text-red-400"
                                onClick={handleConfirmBotOffline}
                            >
                                <Square className="w-4 h-4 mr-2" />
                                Marquer hors ligne
                            </Button>
                        )}
                    </div>
                </Card>
            </div>

            {/* WhatsApp Bot Info Panel */}
            <Card className="p-6 bg-[#161618] border-white/5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    Contrôle du Bot WhatsApp
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Instructions */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400">Comment lancer le bot :</h4>
                        <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside">
                            <li>Ouvrez le dossier <code className="bg-white/5 px-1 rounded">whatsapp-bot-python</code></li>
                            <li>Double-cliquez sur <code className="bg-white/5 px-1 rounded">START_BOT.bat</code></li>
                            <li>Scannez le QR code avec votre téléphone</li>
                            <li>Cliquez "Confirmer en ligne" ci-dessus</li>
                        </ol>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                                // Open the folder in explorer
                                window.open('file:///C:/Users/Slicydicy/Documents/GitHub/twinbite-order/whatsapp-bot-python/', '_blank');
                            }}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ouvrir le dossier
                        </Button>
                    </div>

                    {/* Status Info */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400">Statut actuel :</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">État</span>
                                <span className={health.whatsappBot.isOnline ? 'text-green-400' : 'text-red-400'}>
                                    {health.whatsappBot.isOnline ? 'En ligne' : 'Hors ligne'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Dernière vérification</span>
                                <span className="text-gray-400">
                                    {formatLastChecked(health.whatsappBot.lastChecked)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Port Chrome</span>
                                <span className="text-gray-400">9222</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function ServiceCard({
    icon,
    name,
    status,
    description
}: {
    icon: React.ReactNode;
    name: string;
    status: { isOnline: boolean; lastChecked: Date | null; error: string | null };
    description: string;
}) {
    return (
        <Card className={`p-4 ${status.isOnline ? 'bg-green-950/10 border-green-500/20' : 'bg-[#161618] border-white/5'}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${status.isOnline ? 'bg-green-500/20' : 'bg-white/5'}`}>
                    <div className={status.isOnline ? 'text-green-500' : 'text-gray-400'}>
                        {icon}
                    </div>
                </div>
                <StatusBadge isOnline={status.isOnline} />
            </div>
            <h3 className="font-bold mb-1">{name}</h3>
            <p className="text-xs text-gray-500">{description}</p>
            {status.error && (
                <p className="text-xs text-red-400 mt-2">{status.error}</p>
            )}
        </Card>
    );
}

function StatusBadge({ isOnline }: { isOnline: boolean }) {
    return (
        <Badge
            className={`${isOnline
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
        >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Badge>
    );
}
