import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, BellOff, BellRing, Clock, Sun, Moon, AlertTriangle } from 'lucide-react';
import {
    isNotificationSupported,
    requestNotificationPermission,
    getNotificationPermission,
    initializeNotifications,
    showNotification,
} from '@/lib/kitchenNotifications';

export function NotificationSettings() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        setIsSupported(isNotificationSupported());
        setPermission(getNotificationPermission());
    }, []);

    const handleEnableNotifications = async () => {
        const result = await requestNotificationPermission();
        setPermission(getNotificationPermission());

        if (result.granted) {
            toast.success('🔔 Notifications activées!');
            initializeNotifications();

            // Show test notification
            setTimeout(() => {
                showNotification('✅ Notifications activées', {
                    body: 'Vous recevrez des rappels pour les relevés température.',
                    tag: 'test-notification',
                });
            }, 1000);
        } else {
            toast.error(result.message);
        }
    };

    const handleTestNotification = () => {
        showNotification('🧪 Test de notification', {
            body: 'Les notifications fonctionnent correctement!',
            tag: 'test',
        });
        toast.success('Notification envoyée!');
    };

    if (!isSupported) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                    <BellOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Les notifications ne sont pas supportées sur ce navigateur.</p>
                    <p className="text-slate-500 text-sm mt-2">Utilisez Chrome, Firefox, ou Edge sur mobile ou desktop.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Notifications de rappel
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                        {permission === 'granted' ? (
                            <BellRing className="h-6 w-6 text-green-400" />
                        ) : (
                            <BellOff className="h-6 w-6 text-red-400" />
                        )}
                        <div>
                            <span className="text-white font-medium">Statut</span>
                            <p className="text-slate-400 text-sm">
                                {permission === 'granted' ? 'Activées' : permission === 'denied' ? 'Bloquées' : 'Non configurées'}
                            </p>
                        </div>
                    </div>
                    <Badge className={permission === 'granted' ? 'bg-green-600' : 'bg-red-600'}>
                        {permission === 'granted' ? '✓ ON' : '✗ OFF'}
                    </Badge>
                </div>

                {/* Schedule Info */}
                <div className="space-y-2">
                    <h4 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Rappels programmés
                    </h4>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Sun className="h-5 w-5 text-orange-400" />
                                <span className="text-orange-300">Relevé Matin</span>
                            </div>
                            <span className="text-orange-400 font-mono">11:30</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Moon className="h-5 w-5 text-indigo-400" />
                                <span className="text-indigo-300">Relevé Soir</span>
                            </div>
                            <span className="text-indigo-400 font-mono">23:00</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                                <span className="text-red-300">Viandes expirantes</span>
                            </div>
                            <span className="text-red-400 text-sm">Auto</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {permission !== 'granted' ? (
                    <Button
                        onClick={handleEnableNotifications}
                        className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold"
                    >
                        <Bell className="mr-2 h-5 w-5" />
                        Activer les notifications
                    </Button>
                ) : (
                    <div className="space-y-2">
                        <Button
                            onClick={handleTestNotification}
                            variant="outline"
                            className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <BellRing className="mr-2 h-5 w-5" />
                            Tester une notification
                        </Button>
                        <Button
                            onClick={() => {
                                toast.success('🧪 Test: Matin dans 30s, Soir dans 60s!');
                                setTimeout(() => {
                                    showNotification('☀️ Relevé Matin (TEST)', {
                                        body: 'Cliquez pour ouvrir le relevé matin!',
                                        tag: 'test-morning',
                                        requireInteraction: true,
                                        data: { url: '/kitchen?tab=temp-rounds&shift=Morning' },
                                    });
                                }, 30000);
                                setTimeout(() => {
                                    showNotification('🌙 Relevé Soir (TEST)', {
                                        body: 'Cliquez pour ouvrir le relevé soir!',
                                        tag: 'test-night',
                                        requireInteraction: true,
                                        data: { url: '/kitchen?tab=temp-rounds&shift=Night' },
                                    });
                                }, 60000);
                            }}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                        >
                            <Clock className="mr-2 h-5 w-5" />
                            Démo: Matin (30s) + Soir (60s)
                        </Button>
                        <p className="text-center text-slate-500 text-xs">
                            Gardez l'app ouverte pour recevoir les rappels.
                        </p>
                    </div>
                )}

                {permission === 'denied' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">
                            ⚠️ Les notifications sont bloquées. Pour les activer:
                        </p>
                        <ol className="text-red-300/80 text-sm mt-2 list-decimal list-inside space-y-1">
                            <li>Cliquez sur l'icône 🔒 dans la barre d'adresse</li>
                            <li>Trouvez "Notifications"</li>
                            <li>Changez en "Autoriser"</li>
                            <li>Rechargez la page</li>
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default NotificationSettings;
