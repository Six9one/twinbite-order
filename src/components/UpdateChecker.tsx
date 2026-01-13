import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

const APP_VERSION = '2.1.0';
const VERSION_CHECK_INTERVAL = 60000; // Check every 60 seconds

interface VersionInfo {
    version: string;
    buildTime: string;
    forceRefresh: boolean;
}

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [forceRefresh, setForceRefresh] = useState(false);

    const checkForUpdates = useCallback(async () => {
        try {
            // Add cache buster to avoid getting cached version
            const response = await fetch(`/version.json?t=${Date.now()}`);
            if (!response.ok) return;

            const data: VersionInfo = await response.json();

            if (data.version !== APP_VERSION) {
                setUpdateAvailable(true);

                // If force refresh is enabled, reload immediately
                if (data.forceRefresh) {
                    setForceRefresh(true);
                }
            }
        } catch (error) {
            // Silently fail - version check is not critical
            console.log('[UpdateChecker] Version check failed:', error);
        }
    }, []);

    useEffect(() => {
        // Check immediately on mount
        checkForUpdates();

        // Set up periodic checks
        const interval = setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [checkForUpdates]);

    // Handle force refresh
    useEffect(() => {
        if (forceRefresh) {
            // Small delay to show the message
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }, [forceRefresh]);

    const handleRefresh = () => {
        // Clear cache and reload
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name);
                });
            });
        }
        window.location.reload();
    };

    const handleDismiss = () => {
        setDismissed(true);
        // Remember dismissal for 5 minutes
        setTimeout(() => setDismissed(false), 5 * 60 * 1000);
    };

    if (!updateAvailable || dismissed) return null;

    if (forceRefresh) {
        return (
            <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 mx-4 text-center max-w-sm">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                    <h2 className="text-xl font-bold mb-2">Mise à jour en cours...</h2>
                    <p className="text-muted-foreground">
                        Une mise à jour importante est disponible. La page va se rafraîchir automatiquement.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[99999] animate-in slide-in-from-bottom duration-300">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg shadow-lg p-4">
                <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Nouvelle version disponible!</p>
                        <p className="text-xs opacity-90 mt-1">
                            Rafraîchissez pour voir les dernières nouveautés.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={handleRefresh}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Rafraîchir
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-white/80 hover:text-white hover:bg-white/10"
                                onClick={handleDismiss}
                            >
                                Plus tard
                            </Button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-white/70 hover:text-white p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
