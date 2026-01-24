import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, BellOff, BellRing, Clock, Sun, Moon, AlertTriangle, Smartphone, CheckCircle } from 'lucide-react';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isSubscribed } from '@/lib/pushService';
import {
    initializeNotifications,
    showNotification,
} from '@/lib/kitchenNotifications';

export function NotificationSettings() {
    const [pushEnabled, setPushEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setIsSupported(isPushSupported());
        const subscribed = await isSubscribed();
        setPushEnabled(subscribed);
        setLoading(false);
    };

    const handleEnablePush = async () => {
        setLoading(true);

        // Improved iOS detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

        console.log('Push Debug - isIOS:', isIOS, 'isStandalone:', isStandalone);

        if (isIOS && !isStandalone) {
            toast.error("📱 Sur iPhone, vous devez impérativement ouvrir l'app depuis l'icône sur votre écran d'accueil pour activer les notifications.", {
                duration: 6000
            });
            setLoading(false);
            return;
        }

        try {
            // Check if Service Worker is ready first (crucial for iOS)
            const registration = await navigator.serviceWorker.ready;
            console.log('SW Registration ready:', !!registration);

            // Request permission
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);

            if (permission !== 'granted') {
                toast.error('Veuillez autoriser les notifications dans les réglages de votre navigateur');
                setLoading(false);
                return;
            }

            // Small delay for iOS stability after permission grant
            await new Promise(resolve => setTimeout(resolve, 500));

            // Subscribe to push - now it throws on error
            const subscription = await subscribeToPush();

            if (subscription) {
                setPushEnabled(true);
                toast.success('🔔 Notifications push activées!');

                // Initialize local notifications too
                initializeNotifications();

                // Show test notification
                setTimeout(() => {
                    showNotification('✅ Push activé!', {
                        body: 'Vous recevrez des notifications même si l\'app est fermée.',
                    });
                }, 1000);
            }
        } catch (error: any) {
            console.error('Push activation error:', error);
            // More specific error messages for the user
            let message = error.message || 'Erreur inconnue';
            if (message.includes('registration')) message = "Le Service Worker n'est pas encore prêt. Réessayez dans 2 secondes.";
            if (message.includes('applicationServerKey')) message = "Clé de sécurité (VAPID) invalide.";

            toast.error(`❌ ${message}`, { duration: 5000 });
        }

        setLoading(false);
    };

    const handleDisablePush = async () => {
        setLoading(true);
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast.success('Notifications désactivées');
        setLoading(false);
    };

    const handleTestPush = () => {
        showNotification('🧪 Test Push', {
            body: 'Si vous voyez ceci, les notifications fonctionnent!',
        });
        toast.success('Notification envoyée!');
    };

    if (!isSupported) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                    <BellOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Les notifications push ne sont pas supportées.</p>
                    <p className="text-slate-500 text-sm mt-2">Utilisez Chrome, Firefox, ou Edge.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    Notifications Push
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status Card */}
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${pushEnabled
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                    }`}>
                    <div className="flex items-center gap-3">
                        {pushEnabled ? (
                            <div className="p-2 bg-green-500/20 rounded-full">
                                <CheckCircle className="h-6 w-6 text-green-400" />
                            </div>
                        ) : (
                            <div className="p-2 bg-red-500/20 rounded-full">
                                <BellOff className="h-6 w-6 text-red-400" />
                            </div>
                        )}
                        <div>
                            <span className="text-white font-medium block">
                                {pushEnabled ? 'Notifications activées' : 'Notifications désactivées'}
                            </span>
                            <span className="text-slate-400 text-sm">
                                {pushEnabled ? 'Fonctionne même app fermée' : 'Activez pour recevoir les alertes'}
                            </span>
                        </div>
                    </div>
                    <Badge className={pushEnabled ? 'bg-green-600' : 'bg-red-600'}>
                        {pushEnabled ? '✓ ON' : '✗ OFF'}
                    </Badge>
                </div>

                {/* Schedule Info */}
                <div className="space-y-2">
                    <h4 className="text-slate-300 text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Notifications automatiques
                    </h4>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Sun className="h-5 w-5 text-orange-400" />
                                <span className="text-orange-300">Relevé Matin</span>
                            </div>
                            <span className="text-orange-400 font-mono font-bold">11:30</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Moon className="h-5 w-5 text-indigo-400" />
                                <span className="text-indigo-300">Relevé Soir</span>
                            </div>
                            <span className="text-indigo-400 font-mono font-bold">23:00</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                                <span className="text-red-300">Produits expirants</span>
                            </div>
                            <span className="text-red-400 text-sm">Automatique</span>
                        </div>
                    </div>
                </div>

                {/* Device Info */}
                <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                    <Smartphone className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-400 text-sm">
                        Cet appareil recevra les notifications push
                    </span>
                </div>

                {/* Actions */}
                {!pushEnabled ? (
                    <Button
                        onClick={handleEnablePush}
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-lg"
                    >
                        <BellRing className="mr-2 h-5 w-5" />
                        {loading ? 'Activation...' : 'Activer les notifications'}
                    </Button>
                ) : (
                    <div className="space-y-2">
                        <Button
                            onClick={handleTestPush}
                            variant="outline"
                            className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <BellRing className="mr-2 h-5 w-5" />
                            Tester une notification
                        </Button>
                        <Button
                            onClick={handleDisablePush}
                            variant="ghost"
                            disabled={loading}
                            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <BellOff className="mr-2 h-4 w-4" />
                            Désactiver les notifications
                        </Button>
                    </div>
                )}

                {/* Info */}
                <p className="text-center text-slate-500 text-xs">
                    📱 Les notifications fonctionnent même quand l'app est fermée
                </p>
            </CardContent>
        </Card>
    );
}

export default NotificationSettings;
