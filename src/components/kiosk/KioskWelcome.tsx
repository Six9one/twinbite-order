import { Button } from '@/components/ui/button';
import logoImage from '@/assets/logo.png';

interface KioskWelcomeProps {
    onStart: () => void;
}

export function KioskWelcome({ onStart }: KioskWelcomeProps) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 via-orange-950 to-red-950 relative overflow-hidden cursor-pointer"
            onClick={onStart}
        >
            {/* Animated background circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/10 animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange-500/10 animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-red-500/5 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Logo */}
            <div className="relative z-10 mb-8 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-amber-400/50 shadow-2xl shadow-amber-500/30 bg-white/10 backdrop-blur-sm">
                    <img src={logoImage} alt="Twin Pizza" className="w-full h-full object-contain p-2" />
                </div>
            </div>

            {/* Title */}
            <h1 className="relative z-10 text-6xl font-extrabold text-white tracking-tight mb-4 text-center">
                TWIN PIZZA
            </h1>
            <p className="relative z-10 text-2xl text-amber-200/80 mb-12 text-center font-medium">
                Grand-Couronne
            </p>

            {/* CTA Button */}
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    onStart();
                }}
                className="relative z-10 h-24 px-20 text-3xl font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-2xl shadow-amber-500/40 transition-all hover:scale-105 active:scale-95 border-2 border-amber-400/30"
            >
                🍕 Commander
            </Button>

            {/* Tap anywhere hint */}
            <p className="relative z-10 text-amber-400/50 text-lg mt-8 animate-pulse">
                Touchez l'écran pour commencer
            </p>
        </div>
    );
}
