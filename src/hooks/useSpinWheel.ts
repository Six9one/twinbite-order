import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Prize {
    name: string;
    emoji: string;
    color: string;
    probability: number;
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

// Flow: name → google-review → ready → spinning → result → (prize-display | lost)
export type SpinState = 'loading' | 'name-input' | 'google-review' | 'ready' | 'spinning' | 'prize-display' | 'lost' | 'already-played';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CXpZZnzoTBFREAE/review';

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
        navigator.userAgent, navigator.language,
        screen.width + 'x' + screen.height, screen.colorDepth,
        new Date().getTimezoneOffset(), canvasData.slice(-50),
    ].join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

function generatePrizeCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function selectPrize(): Prize {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const prize of PRIZES) {
        cumulative += prize.probability;
        if (rand <= cumulative) return prize;
    }
    return PRIZES[PRIZES.length - 1];
}

export function getRotationForPrize(prizeIndex: number): number {
    const segmentAngle = 360 / PRIZES.length;
    const segmentStart = prizeIndex * segmentAngle;
    const randomOffset = Math.random() * (segmentAngle * 0.6) + (segmentAngle * 0.2);
    return 360 * 5 + (360 - segmentStart - randomOffset);
}

export function useSpinWheel() {
    const [state, setState] = useState<SpinState>('loading');
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [prizeCode, setPrizeCode] = useState('');
    const [clientName, setClientName] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [rotation, setRotation] = useState(0);

    // ?test in URL = bypass anti-cheat for testing
    const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('test');

    // Check anti-cheat on mount (skipped in test mode)
    useEffect(() => {
        if (isTestMode) {
            localStorage.removeItem('twinpizza_spin_last');
            setState('name-input');
            return;
        }
        const lastPlayed = localStorage.getItem('twinpizza_spin_last');
        if (lastPlayed) {
            const diffHours = (Date.now() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60);
            if (diffHours < 24) { setState('already-played'); return; }
        }
        setState('name-input');
    }, []);

    // Submit name → go to Google Review
    const submitName = useCallback((name: string) => {
        setClientName(name);
        setState('google-review');
    }, []);

    // Open Google Review → after return, show wheel
    const openGoogleReview = useCallback(() => {
        window.open(GOOGLE_REVIEW_URL, '_blank');
        // After user returns, they click "J'ai laissé mon avis" to proceed
    }, []);

    // Mark review done → show wheel
    const reviewDone = useCallback(() => {
        setState('ready');
    }, []);

    // Spin the wheel
    const spin = useCallback(async () => {
        if (state !== 'ready') return;
        const fingerprint = generateFingerprint();

        // Anti-cheat check in DB (skipped in test mode)
        if (!isTestMode) {
            try {
                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: recent } = await (supabase as any)
                    .from('spin_wheel_entries').select('id')
                    .eq('device_fingerprint', fingerprint).gte('created_at', cutoff);
                if (recent && recent.length > 0) {
                    localStorage.setItem('twinpizza_spin_last', new Date().toISOString());
                    setState('already-played');
                    return;
                }
            } catch (e) { console.error(e); }
        }

        const prize = selectPrize();
        const prizeIndex = PRIZES.indexOf(prize);
        setSelectedPrize(prize);
        setRotation(getRotationForPrize(prizeIndex));
        setState('spinning');

        // Wait for animation
        setTimeout(async () => {
            const isWin = prize.name !== 'Perdu';
            const code = generatePrizeCode();
            const expires = new Date(Date.now() + 15 * 60 * 1000);
            setPrizeCode(code);
            setExpiresAt(expires);
            localStorage.setItem('twinpizza_spin_last', new Date().toISOString());

            // Save to DB
            try {
                await (supabase as any).from('spin_wheel_entries').insert({
                    client_name: clientName,
                    prize: isWin ? prize.name : null,
                    prize_code: code,
                    device_fingerprint: fingerprint,
                    expires_at: expires.toISOString(),
                    reviewed: true,
                });
            } catch (e) { console.error(e); }

            // Single Telegram notification
            try {
                await supabase.functions.invoke('send-spin-notification', {
                    body: {
                        prize: isWin ? prize.name : null,
                        prizeEmoji: prize.emoji,
                        prizeCode: code,
                        expiresAt: expires.toISOString(),
                        isWin,
                        clientName,
                    },
                });
            } catch (e) { console.error(e); }

            setState(isWin ? 'prize-display' : 'lost');
        }, 4500);
    }, [state, clientName]);

    return {
        state, selectedPrize, prizeCode, clientName, expiresAt, rotation,
        submitName, openGoogleReview, reviewDone, spin, setClientName,
    };
}
