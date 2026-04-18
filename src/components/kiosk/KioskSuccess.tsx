import { useEffect, useState } from 'react';
import { Check, Printer } from 'lucide-react';

interface KioskSuccessProps {
    orderNumber: string;
    customerName: string;
    stampsEarned?: number;
    totalStamps?: number;
    onReset: () => void;
}

export function KioskSuccess({ orderNumber, customerName, stampsEarned, totalStamps, onReset }: KioskSuccessProps) {
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onReset();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onReset]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-green-500/10 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Success icon */}
            <div className="relative z-10 mb-8">
                <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400/50 flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
                    <Check className="w-16 h-16 text-emerald-400" />
                </div>
            </div>

            {/* Thank you message */}
            <h1 className="relative z-10 text-5xl font-extrabold text-white mb-4 text-center">
                Merci {customerName} ! 🎉
            </h1>

            {/* Order number */}
            <div className="relative z-10 bg-white/10 backdrop-blur rounded-2xl border-2 border-emerald-400/30 px-12 py-6 mb-8">
                <p className="text-lg text-emerald-300/70 text-center mb-1">Votre commande</p>
                <p className="text-6xl font-black text-white text-center tracking-wider">
                    #{orderNumber}
                </p>
            </div>

            {/* Printer message */}
            <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-8 py-4 mb-6">
                <Printer className="w-6 h-6 text-emerald-400 animate-pulse" />
                <span className="text-xl text-white font-medium">
                    Récupérez votre ticket ci-dessous
                </span>
            </div>

            {/* Instructions */}
            <p className="relative z-10 text-2xl text-emerald-200/80 text-center max-w-lg mb-4">
                Présentez votre ticket à la <strong>caisse</strong> pour payer
            </p>

            {/* Loyalty info */}
            {stampsEarned && stampsEarned > 0 && (
                <div className="relative z-10 bg-amber-500/10 backdrop-blur rounded-xl border border-amber-400/30 px-8 py-4 mb-6">
                    <p className="text-xl text-amber-300 text-center">
                        🎁 +{stampsEarned} tampon{stampsEarned > 1 ? 's' : ''} fidélité
                        {totalStamps !== undefined && (
                            <span className="text-amber-400/60 ml-2">({totalStamps % 10}/10)</span>
                        )}
                    </p>
                </div>
            )}

            {/* Countdown */}
            <p className="relative z-10 text-emerald-400/40 text-lg mt-4">
                Retour à l'accueil dans {countdown}s
            </p>
        </div>
    );
}
