import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Printer,
    MessageSquare,
    Database,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Play,
    Square,
    Terminal,
    Loader2,
    Activity,
    Server,
    Smartphone,
    Power,
    RotateCcw
} from 'lucide-react';
import { useSystemHealth, formatLastChecked } from '@/hooks/useSystemHealth';
import { cn } from '@/lib/utils';

import { supabase } from '@/integrations/supabase/client';

export function SystemHealthPanel() {
    const { health, refresh, setWhatsAppBotOnline, isAllHealthy } = useSystemHealth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pendingCmd, setPendingCmd] = useState<string | null>(null);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setIsRefreshing(false);
        toast.success('Statuts mis à jour');
    };

    const sendRemoteCommand = async (server: 'whatsapp' | 'printer', command: 'start' | 'stop' | 'restart') => {
        const cmdId = `${server}-${command}`;
        setPendingCmd(cmdId);

        try {
            const { error } = await (supabase as any)
                .from('system_remote_commands')
                .insert({
                    server_name: server,
                    command: command,
                    status: 'pending'
                });

            if (error) throw error;

            toast.success(`Commande [${command.toUpperCase()}] envoyée au serveur ${server}`);

            // Auto refresh after a short delay to see status change
            setTimeout(refresh, 5000);
        } catch (error: any) {
            console.error('Remote command error:', error);
            toast.error(`Erreur d'envoi : ${error.message}`);
        } finally {
            setPendingCmd(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-amber-500" />
                        Santé du Système
                    </h1>
                    <p className="text-muted-foreground">Surveillance et contrôle à distance des serveurs locaux.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="rounded-xl border-amber-500/20 hover:bg-amber-50 text-amber-600 font-bold"
                    >
                        {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Actualiser Statuts
                    </Button>
                </div>
            </div>

            {/* Global Status Banner */}
            <div className={cn(
                "p-6 rounded-3xl border-none shadow-xl flex flex-col md:flex-row items-center gap-6 transition-all duration-500",
                isAllHealthy
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20"
                    : "bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-red-500/20"
            )}>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                    {isAllHealthy ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-black italic uppercase tracking-wider">
                        {isAllHealthy ? 'Système 100% Opérationnel' : 'Action Requise : Services Interrompus'}
                    </h2>
                    <p className="text-white/80 font-medium">
                        Dernière analyse complète effectuée à {formatLastChecked(health.supabase.lastChecked)}
                    </p>
                </div>
                {!isAllHealthy && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                sendRemoteCommand('whatsapp', 'restart');
                                sendRemoteCommand('printer', 'restart');
                            }}
                            className="bg-white text-red-600 font-black hover:bg-white/90"
                        >
                            Relancer tout
                        </Button>
                    </div>
                )}
            </div>

            {/* Detailed Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Printer Card */}
                <ServiceCardPremiumWithControls
                    icon={<Printer className="w-7 h-7" />}
                    name="Imprimante Ticket"
                    description="Serveur d'impression local (80mm)"
                    status={health.printer}
                    gradient="from-blue-500 to-indigo-600"
                    onStart={() => sendRemoteCommand('printer', 'start')}
                    onStop={() => sendRemoteCommand('printer', 'stop')}
                    onRestart={() => sendRemoteCommand('printer', 'restart')}
                    isPending={!!pendingCmd?.startsWith('printer')}
                />

                {/* Database Card */}
                <ServiceCardPremium
                    icon={<Database className="w-7 h-7" />}
                    name="Base de Données"
                    description="Cloud Supabase & Realtime Sync"
                    status={health.supabase}
                    gradient="from-violet-500 to-purple-600"
                />

                {/* WhatsApp Bot Card - Integrated Controls */}
                <ServiceCardPremiumWithControls
                    icon={<MessageSquare className="w-7 h-7" />}
                    name="Bot WhatsApp"
                    description="Envoi automatique des tickets clients."
                    status={health.whatsappBot}
                    gradient="from-emerald-500 to-teal-600"
                    onStart={() => sendRemoteCommand('whatsapp', 'start')}
                    onStop={() => sendRemoteCommand('whatsapp', 'stop')}
                    onRestart={() => sendRemoteCommand('whatsapp', 'restart')}
                    isPending={!!pendingCmd?.startsWith('whatsapp')}
                />
            </div>

            {/* Technical Documentation / Guide Section */}
            <Card className="p-8 border-none bg-slate-900 text-white rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black flex items-center gap-2">
                            <Terminal className="w-6 h-6 text-amber-500" />
                            Guide de Dépannage
                        </h3>
                        <div className="space-y-4 pt-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-black shrink-0">1</div>
                                <p className="text-slate-300 text-sm">Vérifiez que le PC principal est allumé et connecté à l'imprimante via USB.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-black shrink-0">2</div>
                                <p className="text-slate-300 text-sm">Le bot WhatsApp nécessite une fenêtre Chrome ouverte en arrière-plan (port 9222).</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-black shrink-0">3</div>
                                <p className="text-slate-300 text-sm">En cas de logo rouge sur l'imprimante, relancez le script <code className="bg-white/10 px-1 rounded text-amber-400">START_PRINT_SERVER.bat</code>.</p>
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            className="mt-6 bg-amber-500 text-black font-black hover:bg-amber-400 border-none rounded-xl"
                            onClick={() => window.open('file:///C:/Users/Slicydicy/Documents/GitHub/twinbite-order/', '_blank')}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir dossier racine
                        </Button>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                        <h4 className="font-bold text-amber-500 mb-4 uppercase tracking-widest text-xs">Informations Système</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-400 text-sm">WhatsApp Port</span>
                                <span className="font-mono text-sm">9222</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-400 text-sm">Socket.io Service</span>
                                <span className="text-emerald-400 text-sm font-bold">ACTIF</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-400 text-sm">Dernier Ping Bot</span>
                                <span className="text-slate-200 text-sm">{formatLastChecked(health.whatsappBot.lastChecked)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 text-sm">OS Host</span>
                                <span className="text-slate-200 text-sm">Windows Server / PC</span>
                            </div>
                        </div>
                    </div>
                </div>
                <Server className="absolute -left-8 -bottom-8 w-48 h-48 text-white/5 -rotate-12" />
            </Card>
        </div>
    );
}

function ServiceCardPremium({
    icon,
    name,
    description,
    status,
    gradient
}: {
    icon: React.ReactNode;
    name: string;
    description: string;
    status: { isOnline: boolean; error: string | null };
    gradient: string;
}) {
    return (
        <Card className="p-6 border-border/50 shadow-sm rounded-3xl overflow-hidden relative group">
            <div className={cn(
                "absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity",
                status.isOnline ? "text-emerald-500" : "text-red-500"
            )}>
                {icon}
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={cn(
                        "p-3 rounded-2xl bg-gradient-to-br text-white shadow-lg",
                        status.isOnline ? gradient : "from-gray-400 to-gray-600"
                    )}>
                        {icon}
                    </div>
                    <StatusBadgePremium isOnline={status.isOnline} />
                </div>

                <h3 className="text-lg font-black tracking-tight">{name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>

                {status.error && (
                    <div className="mt-2 p-2 bg-red-50 text-red-600 text-[10px] rounded-lg font-bold uppercase overflow-hidden text-ellipsis whitespace-nowrap">
                        ❌ {status.error}
                    </div>
                )}
            </div>
        </Card>
    );
}

function ServiceCardPremiumWithControls({
    icon,
    name,
    description,
    status,
    gradient,
    onStart,
    onStop,
    onRestart,
    isPending
}: {
    icon: React.ReactNode;
    name: string;
    description: string;
    status: { isOnline: boolean; error: string | null };
    gradient: string;
    onStart: () => void;
    onStop: () => void;
    onRestart: () => void;
    isPending: boolean;
}) {
    return (
        <Card className="p-6 border-border/50 shadow-sm rounded-3xl overflow-hidden relative group">
            <div className={cn(
                "absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity",
                status.isOnline ? "text-emerald-500" : "text-red-500"
            )}>
                {icon}
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={cn(
                        "p-3 rounded-2xl bg-gradient-to-br text-white shadow-lg",
                        status.isOnline ? gradient : "from-gray-400 to-gray-600"
                    )}>
                        {icon}
                    </div>
                    <StatusBadgePremium isOnline={status.isOnline} />
                </div>

                <h3 className="text-lg font-black tracking-tight">{name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{description}</p>

                <div className="grid grid-cols-1 gap-2">
                    {!status.isOnline ? (
                        <Button
                            onClick={onStart}
                            disabled={isPending}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                            Démarrer
                        </Button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={onRestart}
                                disabled={isPending}
                                className="border-amber-500/20 text-amber-600 font-bold rounded-xl"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                                Relancer
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onStop}
                                disabled={isPending}
                                className="border-red-500/20 text-red-500 font-bold rounded-xl hover:bg-red-50"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
                                Arrêter
                            </Button>
                        </div>
                    )}
                </div>

                {status.error && (
                    <div className="mt-4 p-2 bg-red-50 text-red-600 text-[10px] rounded-lg font-bold uppercase overflow-hidden text-ellipsis whitespace-nowrap">
                        ❌ {status.error}
                    </div>
                )}
            </div>
        </Card>
    );
}

function StatusBadgePremium({ isOnline }: { isOnline: boolean }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "rounded-full px-3 py-1 font-black text-[10px] tracking-widest uppercase border-2",
                isOnline
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
            )}
        >
            <span className={cn(
                "w-2 h-2 rounded-full mr-2",
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            {isOnline ? 'Online' : 'Offline'}
        </Badge>
    );
}
