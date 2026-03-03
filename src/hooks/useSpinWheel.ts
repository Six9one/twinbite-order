import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Prize definitions with probabilities (must sum to 100)
export interface Prize {
    name: string;
    emoji: string;
    color: string;        // Wheel segment color
    probability: number;  // Percentage (0-100)
}

export const PRIZES: Prize[] = [
    { name: 'Boisson au choix', emoji: '🥤', color: '#f97316', probability: 10 },
    { name: 'Supplément viande', emoji: '🥩', color: '#dc2626', probability: 10 },
    { name: 'Kinder Bueno', emoji: '🍫', color: '#92400e', probability: 8 },
    { name: 'Eau minérale', emoji: '💧', color: '#3b82f6', probability: 12 },
    { name: 'Eau + Sirop', emoji: '🧃', color: '#10b981', probability: 10 },
    { name: 'Perdu', emoji: '❌', color: '#6b7280', probability: 25 },
    { name: 'Perdu', emoji: '😢', color: '#4b5563', probability: 25 },
];

export type SpinState = 'ready' | 'spinning' | 'won' | 'lost' | 'name-input' | 'reviewing' | 'prize-display' | 'already-played';

// Generate a simple device fingerprint from browser info
function generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('TwinPizza🍕', 2, 2);
    }
    const canvasData = canvas.toDataURL();

    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvasData.slice(-50),
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// Generate a random 6-digit prize code
function generatePrizeCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Select a prize based on weighted probabilities
function selectPrize(): Prize {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const prize of PRIZES) {
        cumulative += prize.probability;
        if (rand <= cumulative) {
            return prize;
        }
    }
    return PRIZES[PRIZES.length - 1]; // Fallback
}

// Calculate the rotation angle for a specific prize index
export function getRotationForPrize(prizeIndex: number): number {
    const segmentAngle = 360 / PRIZES.length;
    // We want the prize to land at the top (pointer position)
    // Add some randomness within the segment
    const segmentStart = prizeIndex * segmentAngle;
    const randomOffset = Math.random() * (segmentAngle * 0.6) + (segmentAngle * 0.2);
    // 5 full rotations + position so prize ends at top
    const totalRotation = 360 * 5 + (360 - segmentStart - randomOffset);
    return totalRotation;
}

// Google Review URL for Twin Pizza
const GOOGLE_REVIEW_URL = 'https://g.page/r/CXpZZnzoTBFREAE/review';

export function useSpinWheel() {
    const [state, setState] = useState<SpinState>('ready');
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [prizeCode, setPrizeCode] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [rotation, setRotation] = useState<number>(0);
    const [entryId, setEntryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user already played today on mount
    useEffect(() => {
        const checkAlreadyPlayed = () => {
            const lastPlayed = localStorage.getItem('twinpizza_spin_last');
            if (lastPlayed) {
                const lastDate = new Date(lastPlayed);
                const now = new Date();
                const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                    setState('already-played');
                    setIsLoading(false);
                    return;
                }
            }
            setIsLoading(false);
        };
        checkAlreadyPlayed();
    }, []);

    const spin = useCallback(async () => {
        if (state !== 'ready') return;

        const fingerprint = generateFingerprint();

        // Check in Supabase for recent spins with this fingerprint
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recentSpins } = await (supabase as any)
                .from('spin_wheel_entries')
                .select('id')
                .eq('device_fingerprint', fingerprint)
                .gte('created_at', twentyFourHoursAgo);

            if (recentSpins && recentSpins.length > 0) {
                localStorage.setItem('twinpizza_spin_last', new Date().toISOString());
                setState('already-played');
                return;
            }
        } catch (err) {
            console.error('Error checking recent spins:', err);
        }

        // Select prize
        const prize = selectPrize();
        const prizeIndex = PRIZES.indexOf(prize);
        const targetRotation = getRotationForPrize(prizeIndex);

        setSelectedPrize(prize);
        setRotation(targetRotation);
        setState('spinning');

        // Wait for spin animation to complete (4 seconds)
        setTimeout(async () => {
            const isWin = prize.name !== 'Perdu';
            const code = generatePrizeCode();
            const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            setPrizeCode(code);
            setExpiresAt(expires);

            // Save to localStorage
            localStorage.setItem('twinpizza_spin_last', new Date().toISOString());

            // Save to Supabase
            try {
                const { data } = await (supabase as any)
                    .from('spin_wheel_entries')
                    .insert({
                        prize: isWin ? prize.name : null,
                        prize_code: code,
                        device_fingerprint: fingerprint,
                        expires_at: expires.toISOString(),
                    })
                    .select('id')
                    .single();

                if (data) {
                    setEntryId(data.id);
                }
            } catch (err) {
                console.error('Error saving spin entry:', err);
            }

            // Send Telegram notification
            try {
                await supabase.functions.invoke('send-spin-notification', {
                    body: {
                        prize: isWin ? prize.name : null,
                        prizeEmoji: prize.emoji,
                        prizeCode: code,
                        expiresAt: expires.toISOString(),
                        isWin,
                    },
                });
            } catch (err) {
                console.error('Error sending notification:', err);
            }

            if (isWin) {
                setState('name-input');
            } else {
                setState('lost');
            }
        }, 4500);
    }, [state]);

    const submitName = useCallback(async (name: string) => {
        setClientName(name);

        // Update entry with client name
        if (entryId) {
            try {
                await (supabase as any)
                    .from('spin_wheel_entries')
                    .update({ client_name: name })
                    .eq('id', entryId);
            } catch (err) {
                console.error('Error updating client name:', err);
            }

            // Update Telegram with the client name
            try {
                await supabase.functions.invoke('send-spin-notification', {
                    body: {
                        prize: selectedPrize?.name,
                        prizeEmoji: selectedPrize?.emoji,
                        prizeCode,
                        expiresAt: expiresAt?.toISOString(),
                        isWin: true,
                        clientName: name,
                        isNameUpdate: true,
                    },
                });
            } catch (err) {
                console.error('Error sending name update notification:', err);
            }
        }

        setState('reviewing');
    }, [entryId, selectedPrize, prizeCode, expiresAt]);

    const openGoogleReview = useCallback(() => {
        window.open(GOOGLE_REVIEW_URL, '_blank');

        // Mark as reviewed in Supabase
        if (entryId) {
            (supabase as any)
                .from('spin_wheel_entries')
                .update({ reviewed: true })
                .eq('id', entryId)
                .then(() => { });
        }

        // After 30 seconds, show the prize
        setTimeout(() => {
            setState('prize-display');
        }, 30000);
    }, [entryId]);

    const skipToPrize = useCallback(() => {
        setState('prize-display');
    }, []);

    return {
        state,
        selectedPrize,
        prizeCode,
        clientName,
        expiresAt,
        rotation,
        isLoading,
        spin,
        submitName,
        openGoogleReview,
        skipToPrize,
        setClientName,
    };
}
