import { useState, useEffect } from 'react';
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
    RotateCcw,
    Power,
    Sunrise,
    Globe
} from 'lucide-react';
import { useSystemHealth, formatLastChecked } from '@/hooks/useSystemHealth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ServerLog {
    server_name: string;
    is_online: boolean;
    last_log: string;
    last_heartbeat: string;
}

export function SystemHealthPanel() {
    const { health, refresh, isAllHealthy } = useSystemHealth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pendingCmd, setPendingCmd] = useState<string | null>(null);
    const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);

    // Fetch live status and logs from system_status table
    const fetchLiveLogs = async () => {
        const { data, error } = await supabase
            .from('system_status' as any)
            .select('*')
            .order('updated_at', { ascending: false });

        if (data) setServerLogs(data as ServerLog[]);
    };

    useEffect(() => {
        fetchLiveLogs();
        const interval = setInterval(fetchLiveLogs, 5000);

        // Subscribe to real-time status updates
        const channel = supabase
            .channel('system-status-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_status' }, () => {
                fetchLiveLogs();
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        await fetchLiveLogs();
        setIsRefreshing(false);
        toast.success('Statuts mis à jour');
    };

    const sendRemoteCommand = async (server: string, command: string) => {
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
            toast.success(`Commande envoyée : ${command.toUpperCase()}`);
            setTimeout(() => { refresh(); fetchLiveLogs(); }, 3000);
        } catch (error: any) {
            toast.error(`Erreur : ${error.message}`);
        } finally {
            setPendingCmd(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Morning Mode Hero Section */}
            <Card className="p-8 border-none bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 text-white rounded-[2rem] shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-xl animate-pulse">
                        <Sunrise className="w-12 h-12" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Mode Matinal</h2>
                        <p className="text-white/80 font-bold text-lg mt-2">Démarrage complet du restaurant Twin Pizza</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <Button
                            size="lg"
                            onClick={() => sendRemoteCommand('system', 'morning_start')}
                            disabled={pendingCmd === 'system-morning_start'}
                            className="bg-white text-orange-600 hover:bg-white/90 font-black text-xl py-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex-1"
                        >
                            {pendingCmd === 'system-morning_start' ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2" />}
                            LANCER TOUT
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => sendRemoteCommand('system', 'open_whatsapp')}
                            className="border-white/40 text-white hover:bg-white/10 font-bold rounded-2xl flex-1 backdrop-blur-sm"
                        >
                            <Globe className="mr-2 w-5 h-5" /> WhatsApp Web
                        </Button>
                    </div>

                    <div className="flex items-center gap-6 pt-4 text-xs font-black uppercase tracking-widest text-white/60">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${health.printer.isOnline ? 'bg-green-400' : 'bg-white/20'}`} /> IMPRIMANTE
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${health.whatsappBot.isOnline ? 'bg-green-400' : 'bg-white/20'}`} /> BOT WHATSAPP
                        </div>
                    </div>
                </div>
                <Sunrise className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5 rotate-12 transition-transform group-hover:rotate-0" />
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time Console Log */}
                <Card className="lg:col-span-2 p-6 bg-slate-950 border-none rounded-[2rem] shadow-xl flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-white font-black flex items-center gap-2 uppercase tracking-wider text-sm">
                            <Terminal className="w-4 h-4 text-amber-500" />
                            Console Serveur Direct
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse ml-2" />
                        </h3>
                        <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-white/40 hover:text-white hover:bg-white/5">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex-1 bg-black/50 rounded-2xl p-6 font-mono text-[13px] overflow-y-auto custom-scrollbar border border-white/5">
                        <div className="space-y-3">
                            {serverLogs.length > 0 ? serverLogs.map((log, i) => (
                                <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-amber-500/50 mr-2">[{new Date(log.last_heartbeat).toLocaleTimeString()}]</span>
                                    <span className={cn(
                                        "font-black mr-2 uppercase",
                                        log.server_name === 'whatsapp' ? "text-emerald-500" : "text-blue-500"
                                    )}>
                                        {log.server_name}:
                                    </span>
                                    <span className="text-slate-300">{log.last_log || "Attente d'activité..."}</span>
                                </div>
                            )) : (
                                <div className="text-slate-600 italic">Initialisation de la console...</div>
                            )}
                            <div className="flex items-center gap-2 text-white/20 italic pt-4">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>En attente de nouveaux logs...</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Individual Controls Area */}
                <div className="space-y-6">
                    {/* Printer Control */}
                    <Card className="p-6 bg-white border-border/50 rounded-3xl shadow-sm group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-3 rounded-2xl bg-gradient-to-br text-white", health.printer.isOnline ? "from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20" : "bg-slate-200 text-slate-400")}>
                                <Printer className="w-6 h-6" />
                            </div>
                            <ServiceBadge isOnline={health.printer.isOnline} />
                        </div>
                        <h4 className="font-black text-lg">Imprimante Ticket</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-6">Gestion des commandes cuisines.</p>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!!pendingCmd}
                                onClick={() => sendRemoteCommand('printer', 'restart')}
                                className="rounded-xl border-amber-500/20 text-amber-600 font-bold"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" /> Relancer
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!!pendingCmd || !health.printer.isOnline}
                                onClick={() => sendRemoteCommand('printer', 'stop')}
                                className="rounded-xl border-red-500/20 text-red-600 font-bold"
                            >
                                <Power className="w-4 h-4 mr-1.5" /> Arrêter
                            </Button>
                        </div>
                    </Card>

                    {/* WhatsApp Control */}
                    <Card className="p-6 bg-white border-border/50 rounded-3xl shadow-sm group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-3 rounded-2xl bg-gradient-to-br text-white", health.whatsappBot.isOnline ? "from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20" : "bg-slate-200 text-slate-400")}>
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <ServiceBadge isOnline={health.whatsappBot.isOnline} />
                        </div>
                        <h4 className="font-black text-lg">Bot WhatsApp</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-6">Notifications clients automatiques.</p>

                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!!pendingCmd}
                                    onClick={() => sendRemoteCommand('whatsapp', 'restart')}
                                    className="rounded-xl border-amber-500/20 text-amber-600 font-bold"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1.5" /> Relancer
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!!pendingCmd || !health.whatsappBot.isOnline}
                                    onClick={() => sendRemoteCommand('whatsapp', 'stop')}
                                    className="rounded-xl border-red-500/20 text-red-600 font-bold"
                                >
                                    <Power className="w-4 h-4 mr-1.5" /> Arrêter
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => sendRemoteCommand('system', 'open_whatsapp')}
                                className="rounded-xl border-blue-500/20 text-blue-600 font-bold"
                            >
                                <Globe className="w-4 h-4 mr-1.5" /> WhatsApp Web
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Info Card */}
            <Card className="p-10 border-none bg-slate-100 rounded-[2.5rem] relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl">
                        <Terminal className="w-12 h-12 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black">Besoin de réinitialiser le PC ?</h3>
                        <p className="text-slate-500 mt-2 max-w-xl">
                            Si les boutons ne répondent pas, fermez les terminaux ouverts sur le PC local et lancez le fichier <code className="bg-white px-2 py-0.5 rounded border">START.bat</code> à la racine du dossier projet.
                        </p>
                        <div className="flex gap-4 mt-6">
                            <Button variant="outline" className="rounded-xl font-bold border-slate-300" onClick={() => window.open('file:///C:/Users/Slicydicy/Documents/GitHub/twinbite-order/', '_blank')}>
                                Accès Dossier Local
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function ServiceBadge({ isOnline }: { isOnline: boolean }) {
    return (
        <Badge variant="outline" className={cn(
            "rounded-full px-3 py-1 font-black text-[10px] tracking-widest uppercase border-2 transition-all",
            isOnline ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
        )}>
            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Badge>
    );
}
