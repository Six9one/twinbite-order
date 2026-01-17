import { Card } from '@/components/ui/card';
import { Gift } from 'lucide-react';
import { useState, useEffect } from 'react';

// Qualifying categories for stamps: buying items from these categories gives a stamp
const QUALIFYING_CATEGORIES = [
    'pizzas',
    'sandwiches',
    'soufflet',
    'makloub',
    'mlawi',
    'tacos',
    'panini',
];

// Total stamps needed for a free item
const STAMPS_FOR_FREE = 10;

interface LoyaltyStampCardProps {
    currentStamps: number;
    customerName?: string;
    customerPhone?: string; // Phone for fraud prevention
    newStampsEarned?: number; // Number of stamps earned from current order
    animated?: boolean;
}

export function LoyaltyStampCard({
    currentStamps,
    customerName,
    customerPhone,
    newStampsEarned = 0,
    animated = true
}: LoyaltyStampCardProps) {
    // Calculate display stamps (capped at 10, cycles after earning free item)
    const displayStamps = currentStamps % STAMPS_FOR_FREE;
    const freeItemsEarned = Math.floor(currentStamps / STAMPS_FOR_FREE);

    // Stamps before this order
    const previousStamps = Math.max(0, displayStamps - newStampsEarned);

    // Animation state for new stamps
    const [animatedStamps, setAnimatedStamps] = useState<number[]>([]);

    useEffect(() => {
        if (animated && newStampsEarned > 0) {
            // Animate new stamps one by one
            const newIndices: number[] = [];
            for (let i = 0; i < newStampsEarned; i++) {
                const idx = previousStamps + i;
                if (idx < STAMPS_FOR_FREE) {
                    setTimeout(() => {
                        setAnimatedStamps(prev => [...prev, idx]);
                    }, i * 300);
                    newIndices.push(idx);
                }
            }
        }
    }, [animated, newStampsEarned, previousStamps]);

    return (
        <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 text-center">
                <p className="text-sm font-medium opacity-90">CARTE DE FIDÉLITÉ</p>
                <p className="text-2xl font-bold font-display mt-1">Twin Pizza</p>
                {customerName && (
                    <p className="text-sm font-semibold mt-1">{customerName}</p>
                )}
                {customerPhone && (
                    <p className="text-xs opacity-90 font-mono mt-1">📱 {customerPhone}</p>
                )}
            </div>

            {/* Stamp Grid */}
            <div className="p-6">
                <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: STAMPS_FOR_FREE }).map((_, index) => {
                        const isStamped = index < displayStamps;
                        const isNewStamp = index >= previousStamps && index < displayStamps;
                        const isLastFreeSlot = index === STAMPS_FOR_FREE - 1;
                        const isAnimating = animatedStamps.includes(index);

                        return (
                            <div
                                key={index}
                                className="relative"
                            >
                                {/* Circle base */}
                                <div
                                    className={`
                    aspect-square rounded-full border-2 flex items-center justify-center
                    transition-all duration-500
                    ${isStamped
                                            ? 'bg-primary border-primary shadow-lg'
                                            : isLastFreeSlot
                                                ? 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400 border-dashed'
                                                : 'bg-white border-gray-300'
                                        }
                    ${isNewStamp && animated ? 'animate-bounce' : ''}
                    ${isAnimating ? 'scale-110' : ''}
                  `}
                                    style={{
                                        animationDelay: isNewStamp ? `${(index - previousStamps) * 0.2}s` : '0s',
                                        animationDuration: '0.5s',
                                        animationIterationCount: '2'
                                    }}
                                >
                                    {isStamped ? (
                                        <div className="text-white font-bold text-xs">
                                            🍕
                                        </div>
                                    ) : isLastFreeSlot ? (
                                        <div className="text-amber-600 text-center">
                                            <Gift className="w-4 h-4 mx-auto" />
                                            <span className="text-[8px] font-bold">OFFERT</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs font-medium">{index + 1}</span>
                                    )}
                                </div>

                                {/* New stamp sparkle effect */}
                                {isNewStamp && animated && (
                                    <div
                                        className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping"
                                        style={{
                                            animationDelay: `${(index - previousStamps) * 0.2}s`,
                                            animationDuration: '0.8s',
                                            animationIterationCount: '1'
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Progress info */}
                <div className="mt-4 text-center">
                    {displayStamps >= STAMPS_FOR_FREE - 1 ? (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full inline-block animate-pulse">
                            <span className="font-bold">🎉 Plus qu'1 achat pour votre cadeau!</span>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">{displayStamps}</span>
                            <span> / 9 tampons</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Plus que {9 - displayStamps} pour la 10ème OFFERTE!</span>
                        </p>
                    )}
                </div>

                {/* Free items info */}
                {freeItemsEarned > 0 && (
                    <div className="mt-3 bg-green-100 border border-green-300 rounded-lg p-3 text-center animate-pulse">
                        <p className="text-green-700 font-semibold">
                            🎁 Vous avez {freeItemsEarned} produit{freeItemsEarned > 1 ? 's' : ''} GRATUIT{freeItemsEarned > 1 ? 'S' : ''} (valeur 10€)!
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                            Demandez-le lors de votre prochaine commande
                        </p>
                    </div>
                )}

                {/* New stamps earned celebration */}
                {newStampsEarned > 0 && (
                    <div className="mt-3 bg-amber-100 border border-amber-300 rounded-lg p-2 text-center">
                        <p className="text-amber-700 font-medium">
                            +{newStampsEarned} nouveau{newStampsEarned > 1 ? 'x' : ''} tampon{newStampsEarned > 1 ? 's' : ''} ajouté{newStampsEarned > 1 ? 's' : ''}! 🎊
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                <p>Achetez 9 produits (pizza, sandwich, soufflet, makloub, mlawi, tacos, panini)</p>
                <p className="font-semibold text-primary mt-1">= 10ème produit GRATUIT (valeur 10€)! 🎁</p>
            </div>
        </Card >
    );
}

// Helper function to count qualifying items in a cart/order
export function countQualifyingItems(items: Array<{ item: { category?: string }, quantity: number }>): number {
    return items.reduce((count, cartItem) => {
        const category = cartItem.item.category?.toLowerCase() || '';
        if (QUALIFYING_CATEGORIES.some(cat => category.includes(cat))) {
            return count + cartItem.quantity;
        }
        return count;
    }, 0);
}

// Export constants for use elsewhere
export { QUALIFYING_CATEGORIES, STAMPS_FOR_FREE };
