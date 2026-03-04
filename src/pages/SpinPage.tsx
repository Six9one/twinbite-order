import { SpinWheel } from '@/components/SpinWheel';
import { toast } from 'sonner';

const PIZZA_SEGMENTS = [
    { label: '🍕', color: '#EA4335' },
    { label: '🎁', color: '#F9AB00' },
    { label: '🥤', color: '#34A853' },
    { label: '⭐', color: '#4285F4' },
    { label: '🍟', color: '#EA4335' },
    { label: '💰', color: '#F9AB00' },
    { label: '🎉', color: '#0F9D58' },
    { label: '🔥', color: '#4285F4' },
];

const PRIZE_NAMES: Record<string, string> = {
    '🍕': 'Une part de pizza offerte !',
    '🎁': 'Un cadeau surprise !',
    '🥤': 'Une boisson offerte !',
    '⭐': '+50 points fidélité !',
    '🍟': 'Un accompagnement offert !',
    '💰': '-10% sur la commande !',
    '🎉': 'Un dessert offert !',
    '🔥': 'Double points fidélité !',
};

export default function SpinPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl" />
            </div>

            {/* Title */}
            <div className="text-center mb-8 relative z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">
                    🎰 Roue de la Chance
                </h1>
                <p className="text-slate-400 text-lg">
                    Tentez votre chance et gagnez des récompenses !
                </p>
            </div>

            {/* Spin Wheel */}
            <div className="relative z-10">
                <SpinWheel
                    segments={PIZZA_SEGMENTS}
                    size={340}
                    onResult={(segment) => {
                        const prizeName = PRIZE_NAMES[segment.label] || 'Bravo !';
                        toast.success(`${segment.label} ${prizeName}`, {
                            duration: 5000,
                            style: {
                                fontSize: '1.15rem',
                                fontWeight: 'bold',
                            },
                        });
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    }}
                />
            </div>

            {/* Footer */}
            <p className="text-slate-600 text-xs mt-8 text-center relative z-10">
                Twin Pizza — Programme Fidélité
            </p>
        </div>
    );
}
