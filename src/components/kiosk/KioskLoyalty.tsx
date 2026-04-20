import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLoyalty } from '@/context/LoyaltyContext';
import { ArrowLeft, Delete, Check, Gift, Phone } from 'lucide-react';

interface KioskLoyaltyProps {
    onComplete: (phone: string | null, stampsEarned: number, totalStamps: number) => void;
    onSkip: () => void;
    cartItems: any[];
}

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function KioskLoyalty({ onComplete, onSkip, cartItems }: KioskLoyaltyProps) {
    const [phone, setPhone] = useState('');
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [customerFound, setCustomerFound] = useState<{ name: string; stamps: number; totalStamps: number } | null>(null);
    const { findOrCreateCustomer, addStamps } = useLoyalty();

    // Count qualifying items for stamps
    const countStamps = () => {
        return cartItems.reduce((count: number, item: any) => count + (item.quantity || 1), 0);
    };

    const handleKey = (key: string) => {
        if (phone.length < 14) {
            setPhone(prev => {
                const raw = prev + key;
                // Auto-format: 06 XX XX XX XX
                const digits = raw.replace(/\s/g, '');
                if (digits.length <= 2) return digits;
                if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
                if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
                if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
                return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
            });
        }
    };

    const handleBackspace = () => {
        setPhone(prev => {
            const digits = prev.replace(/\s/g, '').slice(0, -1);
            if (digits.length <= 2) return digits;
            if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
            if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
            if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
            return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
        });
    };

    const handleConfirm = async () => {
        const digits = phone.replace(/\s/g, '');
        if (digits.length < 10) return;

        setIsLookingUp(true);
        try {
            const customer = await findOrCreateCustomer(digits, 'Client Borne');
            if (customer) {
                const stampsToEarn = countStamps();
                setCustomerFound({
                    name: customer.name,
                    stamps: customer.stamps,
                    totalStamps: customer.totalStamps,
                });

                // Award stamps
                if (stampsToEarn > 0) {
                    await addStamps(`kiosk-${Date.now()}`, stampsToEarn, `+${stampsToEarn} tampon(s) (Borne)`);
                }

                const newTotal = customer.totalStamps + stampsToEarn;
                onComplete(digits, stampsToEarn, newTotal);
            } else {
                onComplete(digits, 0, 0);
            }
        } catch (e) {
            console.error('Loyalty lookup failed:', e);
            onComplete(digits, 0, 0);
        } finally {
            setIsLookingUp(false);
        }
    };

    const stampsToEarn = countStamps();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
            <div className="max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <Gift className="w-10 h-10 text-amber-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Carte de Fidélité
                    </h2>
                    <p className="text-lg text-white/50">
                        Gagnez <span className="text-amber-400 font-bold">+{stampsToEarn} tampon{stampsToEarn > 1 ? 's' : ''}</span> avec cette commande !
                    </p>
                </div>

                {/* Phone input display */}
                <div className="mb-6">
                    <div className="bg-white/10 backdrop-blur rounded-2xl border-2 border-amber-400/30 px-6 py-5 text-center flex items-center justify-center gap-3">
                        <Phone className="w-6 h-6 text-amber-400" />
                        {phone ? (
                            <span className="text-4xl font-bold text-white tracking-wider">{phone}</span>
                        ) : (
                            <span className="text-2xl text-white/30">06 XX XX XX XX</span>
                        )}
                    </div>
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {NUMPAD_KEYS.slice(0, 9).map((key) => (
                        <Button
                            key={key}
                            variant="outline"
                            onClick={() => handleKey(key)}
                            className="h-16 text-3xl font-bold !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {key}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        onClick={handleBackspace}
                        className="h-16 text-xl !bg-red-500/20 !border-red-500/30 !text-red-300 hover:!bg-red-500/30"
                    >
                        <Delete className="w-6 h-6" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleKey('0')}
                        className="h-16 text-3xl font-bold !bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
                    >
                        0
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={phone.replace(/\s/g, '').length < 10 || isLookingUp}
                        className="h-16 text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white disabled:opacity-30"
                    >
                        {isLookingUp ? '...' : <Check className="w-6 h-6" />}
                    </Button>
                </div>

                {/* Skip button */}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={onSkip}
                    className="w-full h-14 text-lg !bg-white/5 !border-white/20 !text-white/60 hover:!text-white hover:!bg-white/10"
                >
                    Non merci, passer →
                </Button>

                <p className="text-center text-white/30 text-xs mt-4">
                    Votre numéro sera utilisé pour votre carte de fidélité et un récapitulatif WhatsApp
                </p>
            </div>
        </div>
    );
}
