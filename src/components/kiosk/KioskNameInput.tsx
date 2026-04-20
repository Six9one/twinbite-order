import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete, Check } from 'lucide-react';

interface KioskNameInputProps {
    onSubmit: (name: string) => void;
    onBack: () => void;
}

const KEYBOARD_ROWS = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['W', 'X', 'C', 'V', 'B', 'N', '-', "'"],
];

export function KioskNameInput({ onSubmit, onBack }: KioskNameInputProps) {
    const [name, setName] = useState('');

    const handleKey = (key: string) => {
        if (name.length < 20) {
            setName(prev => prev + key);
        }
    };

    const handleBackspace = () => {
        setName(prev => prev.slice(0, -1));
    };

    const handleSpace = () => {
        if (name.length < 20 && name.length > 0 && !name.endsWith(' ')) {
            setName(prev => prev + ' ');
        }
    };

    const handleConfirm = () => {
        const trimmed = name.trim();
        if (trimmed.length >= 1) {
            onSubmit(trimmed);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            {/* Back button */}
            <Button
                variant="ghost"
                size="lg"
                onClick={onBack}
                className="absolute top-6 left-6 text-white/70 hover:text-white hover:bg-white/10 h-14 px-6 text-lg"
            >
                <ArrowLeft className="w-6 h-6 mr-2" /> Retour
            </Button>

            {/* Title */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">
                    👤 Quel est votre prénom ?
                </h2>
                <p className="text-lg text-white/50 mb-8">
                    Pour retrouver votre commande à la caisse
                </p>

                {/* Name display */}
                <div className="w-full max-w-2xl mb-8">
                    <div className="bg-white/10 backdrop-blur rounded-2xl border-2 border-amber-400/30 px-8 py-6 text-center min-h-[80px] flex items-center justify-center">
                        {name ? (
                            <span className="text-5xl font-bold text-slate-900 tracking-wider">{name}</span>
                        ) : (
                            <span className="text-3xl text-slate-400">Tapez votre prénom...</span>
                        )}
                    </div>
                </div>

                {/* AZERTY Keyboard */}
                <div className="w-full max-w-3xl space-y-2">
                    {KEYBOARD_ROWS.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex justify-center gap-1.5">
                            {row.map((key) => (
                                <Button
                                    key={key}
                                    variant="outline"
                                    onClick={() => handleKey(key)}
                                    className="w-16 h-16 text-2xl font-bold text-slate-900 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {key}
                                </Button>
                            ))}
                            {rowIndex === 2 && (
                                <Button
                                    variant="outline"
                                    onClick={handleBackspace}
                                    className="w-24 h-16 text-xl bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Delete className="w-6 h-6" />
                                </Button>
                            )}
                        </div>
                    ))}

                    {/* Space and Confirm row */}
                    <div className="flex justify-center gap-2 mt-3">
                        <Button
                            variant="outline"
                            onClick={handleSpace}
                            className="w-64 h-14 text-xl text-slate-900 hover:bg-slate-100"
                        >
                            Espace
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={name.trim().length < 1}
                            className="w-48 h-14 text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
                        >
                            <Check className="w-6 h-6 mr-2" /> Valider
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
