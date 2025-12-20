import React, { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { X, Download, Bell, BellOff, Smartphone, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function PWAInstallPrompt() {
    const { t } = useLanguage();
    const {
        isInstallable,
        isInstalled,
        isOnline,
        isUpdateAvailable,
        installApp,
        updateApp,
        subscribeToPush,
        unsubscribeFromPush,
        isPushSupported,
        isPushSubscribed
    } = usePWA();

    const [isDismissed, setIsDismissed] = useState(() => {
        return localStorage.getItem('twinpizza-pwa-dismissed') === 'true';
    });

    const handleInstall = async () => {
        const success = await installApp();
        if (success) {
            toast({
                title: '🎉 Application installée!',
                description: 'Twin Pizza a été ajouté à votre écran d\'accueil.',
            });
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('twinpizza-pwa-dismissed', 'true');
    };

    const handleTogglePush = async () => {
        if (isPushSubscribed) {
            await unsubscribeFromPush();
            toast({
                title: 'Notifications désactivées',
                description: 'Vous ne recevrez plus de notifications.',
            });
        } else {
            const sub = await subscribeToPush();
            if (sub) {
                toast({
                    title: '🔔 Notifications activées!',
                    description: 'Vous recevrez des notifications pour vos commandes.',
                });
            } else {
                toast({
                    title: 'Erreur',
                    description: 'Impossible d\'activer les notifications.',
                    variant: 'destructive'
                });
            }
        }
    };

    // Don't show if already installed, dismissed, or not installable
    if (!isInstallable || isDismissed || isInstalled) {
        return null;
    }

    return (
        <Card className="fixed bottom-20 left-4 right-4 z-50 p-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-2xl animate-slide-up mx-auto max-w-md">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-8 h-8" />
                </div>

                <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{t('pwa.install')}</h3>
                    <p className="text-sm text-white/90 mb-3">{t('pwa.installDesc')}</p>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleInstall}
                            className="bg-white text-orange-600 hover:bg-white/90 gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {t('pwa.installBtn')}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleDismiss}
                            className="text-white hover:bg-white/20"
                        >
                            {t('pwa.notNow')}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// Notification settings component for settings page
export function NotificationSettings() {
    const {
        isPushSupported,
        isPushSubscribed,
        subscribeToPush,
        unsubscribeFromPush,
        isInstalled,
        isOnline,
        isUpdateAvailable,
        updateApp
    } = usePWA();

    const handleToggle = async () => {
        if (isPushSubscribed) {
            await unsubscribeFromPush();
        } else {
            await subscribeToPush();
        }
    };

    return (
        <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                    {isOnline ? (
                        <Wifi className="w-5 h-5 text-green-500" />
                    ) : (
                        <WifiOff className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                        <p className="font-medium">Connexion</p>
                        <p className="text-sm text-muted-foreground">
                            {isOnline ? 'En ligne' : 'Hors ligne'}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isOnline ? 'Connecté' : 'Déconnecté'}
                </span>
            </div>

            {/* Push Notifications */}
            {isPushSupported && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                        {isPushSubscribed ? (
                            <Bell className="w-5 h-5 text-primary" />
                        ) : (
                            <BellOff className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                            <p className="font-medium">Notifications Push</p>
                            <p className="text-sm text-muted-foreground">
                                Recevoir des alertes pour vos commandes
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={isPushSubscribed}
                        onCheckedChange={handleToggle}
                    />
                </div>
            )}

            {/* App Update */}
            {isUpdateAvailable && (
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        <div>
                            <p className="font-medium">Mise à jour disponible</p>
                            <p className="text-sm text-muted-foreground">
                                Une nouvelle version est prête
                            </p>
                        </div>
                    </div>
                    <Button size="sm" onClick={updateApp}>
                        Mettre à jour
                    </Button>
                </div>
            )}

            {/* Install Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">Application</p>
                        <p className="text-sm text-muted-foreground">
                            {isInstalled ? 'Installée sur votre appareil' : 'Web'}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${isInstalled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {isInstalled ? 'Installée' : 'Non installée'}
                </span>
            </div>
        </div>
    );
}

// Offline indicator
export function OfflineIndicator() {
    const { isOnline } = usePWA();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-[100] text-sm font-medium">
            <WifiOff className="inline w-4 h-4 mr-2" />
            Mode hors ligne - Certaines fonctionnalités sont limitées
        </div>
    );
}
