import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface KioskOrderTypeProps {
    onSelect: (type: 'surplace' | 'emporter') => void;
    onBack: () => void;
}

export function KioskOrderType({ onSelect, onBack }: KioskOrderTypeProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            {/* Back button */}
            <Button
                variant="ghost"
                size="lg"
                onClick={onBack}
                className="absolute top-6 left-6 text-white/70 hover:text-white hover:bg-white/10 h-14 px-6 text-lg"
            >
                <ArrowLeft className="w-6 h-6 mr-2" /> Retour
            </Button>

            <h2 className="text-5xl font-bold text-white mb-4 text-center">
                Où souhaitez-vous manger ?
            </h2>
            <p className="text-xl text-white/50 mb-16">
                Choisissez votre type de commande
            </p>

            <div className="flex gap-8 max-w-4xl w-full">
                {/* Sur Place */}
                <Card
                    className="flex-1 p-12 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all border-2 border-transparent hover:border-amber-400/50 backdrop-blur group"
                    onClick={() => onSelect('surplace')}
                >
                    <div className="text-center">
                        <span className="text-8xl block mb-6">🍽️</span>
                        <h3 className="text-4xl font-bold text-slate-900 mb-3">Sur Place</h3>
                        <p className="text-lg text-slate-500">Je mange ici</p>
                    </div>
                </Card>

                {/* À Emporter */}
                <Card
                    className="flex-1 p-12 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all border-2 border-transparent hover:border-emerald-400/50 backdrop-blur group"
                    onClick={() => onSelect('emporter')}
                >
                    <div className="text-center">
                        <span className="text-8xl block mb-6">🛍️</span>
                        <h3 className="text-4xl font-bold text-slate-900 mb-3">À Emporter</h3>
                        <p className="text-lg text-slate-500">Je prends à emporter</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
