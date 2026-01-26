import { useState, useEffect } from 'react';
import { Cookie, X, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * GDPR/CNIL Cookie Consent Banner
 * 
 * Legal Requirements (France/EU):
 * - RGPD (GDPR) requires informed consent BEFORE non-essential cookies
 * - CNIL (French regulator) requires:
 *   1. Clear information about cookie purposes
 *   2. Accept AND Reject options equally visible
 *   3. User can change preference at any time
 *   4. Consent stored and respected
 * 
 * Penalties for non-compliance:
 * - Up to €20 million or 4% of annual revenue (GDPR)
 * - CNIL has fined companies like Google, Amazon, Facebook
 */

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_CONSENT_DATE_KEY = 'cookie_consent_date';

type ConsentStatus = 'accepted' | 'rejected' | 'pending';

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

        // Show banner if no consent recorded
        if (!consent) {
            // Small delay to not show immediately on page load
            const timer = setTimeout(() => setShowBanner(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString());
        setShowBanner(false);

        // Here you would enable analytics, tracking cookies, etc.
        // Example: initializeGoogleAnalytics();
    };

    const handleReject = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
        localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString());
        setShowBanner(false);

        // Essential cookies only - no tracking
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl border overflow-hidden">
                {/* Main Banner */}
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Cookie className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">🍪 Nous utilisons des cookies</h3>
                            <p className="text-sm text-gray-600">
                                Pour améliorer votre expérience et analyser notre trafic.
                                Vous pouvez accepter ou refuser les cookies non essentiels.
                            </p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                            onClick={handleReject}
                            variant="outline"
                            size="sm"
                            className="flex-1 min-w-[100px]"
                        >
                            Refuser
                        </Button>
                        <Button
                            onClick={handleAccept}
                            size="sm"
                            className="flex-1 min-w-[100px] bg-amber-500 hover:bg-amber-600"
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Accepter
                        </Button>
                    </div>

                    {/* Details toggle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-gray-500 hover:text-gray-700 mt-3 flex items-center gap-1 mx-auto"
                    >
                        <Settings className="w-3 h-3" />
                        {showDetails ? 'Masquer les détails' : 'En savoir plus'}
                    </button>
                </div>

                {/* Expanded Details */}
                {showDetails && (
                    <div className="border-t bg-gray-50 p-4 text-xs text-gray-600 space-y-3">
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-1">🔒 Cookies essentiels (toujours actifs)</h4>
                            <p>Nécessaires au fonctionnement du site : panier, connexion, préférences.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-1">📊 Cookies analytiques</h4>
                            <p>Nous aident à comprendre comment vous utilisez le site pour l'améliorer.</p>
                        </div>
                        <div className="pt-2 border-t text-[10px] text-gray-400">
                            <p>
                                Conformément au RGPD et aux directives de la CNIL, vous pouvez modifier
                                vos préférences à tout moment. Votre choix sera conservé pendant 13 mois.
                            </p>
                            <p className="mt-1">
                                Pour plus d'informations, consultez notre{' '}
                                <a href="/politique-confidentialite" className="underline hover:text-gray-600">
                                    politique de confidentialité
                                </a>.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Helper function to check if user has accepted cookies
 * Use this before initializing any tracking/analytics
 */
export function hasAcceptedCookies(): boolean {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
}

/**
 * Helper function to reset cookie consent (for testing or settings page)
 */
export function resetCookieConsent(): void {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_CONSENT_DATE_KEY);
}
