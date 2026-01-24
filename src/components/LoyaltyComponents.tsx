import React, { useState } from 'react';
import { useLoyalty } from '@/context/LoyaltyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
    Star,
    Gift,
    History,
    Loader2,
    Phone,
    User,
    ChevronRight,
    Sparkles,
    Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ============================================
// V1 SIMPLIFIED LOYALTY COMPONENTS
// - Progress bar to next reward
// - Clear reward selection UI
// - No tier display (simplified)
// ============================================

export function LoyaltyCard() {
    const {
        customer,
        getNextReward
    } = useLoyalty();

    const [showLogin, setShowLogin] = useState(false);

    if (!customer) {
        return (
            <Dialog open={showLogin} onOpenChange={setShowLogin}>
                <DialogTrigger asChild>
                    <Card className="p-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white cursor-pointer hover:opacity-95 transition-opacity">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Star className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold">Programme Fidélité</h3>
                                <p className="text-sm text-white/90">Gagnez 1 point par euro dépensé!</p>
                            </div>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <LoyaltyLogin onClose={() => setShowLogin(false)} />
                </DialogContent>
            </Dialog>
        );
    }

    const nextReward = getNextReward();
    const progressPercent = nextReward
        ? Math.min(100, (customer.points / nextReward.reward.pointsCost) * 100)
        : 100;

    return (
        <Card className="p-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white overflow-hidden relative">
            {/* Sparkles decoration */}
            <div className="absolute top-2 right-2 flex gap-1">
                <Sparkles className="w-4 h-4 animate-pulse opacity-50" />
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    ⭐
                </div>
                <div className="flex-1">
                    <p className="text-sm text-white/80">Bonjour</p>
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold">{customer.points}</p>
                    <p className="text-sm text-white/80">points</p>
                </div>
            </div>

            {/* Progress to next reward */}
            {nextReward && (
                <div className="mt-2">
                    <div className="flex justify-between text-xs text-white/80 mb-1">
                        <span>{customer.points} pts</span>
                        <span>{nextReward.reward.pointsCost} pts</span>
                    </div>
                    <Progress
                        value={progressPercent}
                        className="h-2 bg-white/20"
                    />
                    <p className="text-sm text-white/90 mt-2 text-center">
                        Plus que <strong>{nextReward.pointsNeeded}</strong> points pour {nextReward.reward.name.toLowerCase()}! 🎁
                    </p>
                </div>
            )}

            {!nextReward && (
                <div className="mt-2 text-center">
                    <p className="text-sm text-white/90">
                        🎉 Vous pouvez échanger vos points contre des récompenses!
                    </p>
                </div>
            )}
        </Card>
    );
}

export function LoyaltyLogin({ onClose }: { onClose?: () => void }) {
    const { lookupCustomer, registerCustomer, isLoading } = useLoyalty();
    const [mode, setMode] = useState<'lookup' | 'register'>('lookup');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleLookup = async () => {
        setError('');
        if (!phone || phone.length < 10) {
            setError('Veuillez entrer un numéro de téléphone valide');
            return;
        }

        const customer = await lookupCustomer(phone);
        if (customer) {
            toast({
                title: `Bienvenue ${customer.name}! 🎉`,
                description: `Vous avez ${customer.points} points`,
            });
            onClose?.();
        } else {
            setMode('register');
        }
    };

    const handleRegister = async () => {
        setError('');
        if (!phone || phone.length < 10) {
            setError('Veuillez entrer un numéro de téléphone valide');
            return;
        }
        if (!name || name.length < 2) {
            setError('Veuillez entrer votre nom');
            return;
        }

        const customer = await registerCustomer(phone, name);
        if (customer) {
            toast({
                title: `Bienvenue ${customer.name}! 🎉`,
                description: 'Passez votre première commande pour gagner 40 points bonus!',
            });
            onClose?.();
        } else {
            setError('Erreur lors de l\'inscription');
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    Programme Fidélité
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
                {/* Benefit summary */}
                <Card className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200">
                    <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            1 point par euro dépensé
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            +10 points par commande en ligne
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            +30 points sur votre 1ère commande
                        </li>
                    </ul>
                </Card>

                {mode === 'lookup' ? (
                    <>
                        <div className="text-center mb-4">
                            <p className="text-muted-foreground">
                                Entrez votre numéro pour retrouver vos points
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Numéro de téléphone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="06 XX XX XX XX"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button
                            onClick={handleLookup}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Retrouver mes points
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Pas encore membre?{' '}
                            <button
                                onClick={() => setMode('register')}
                                className="text-primary hover:underline"
                            >
                                S'inscrire
                            </button>
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-center mb-4">
                            <p className="text-muted-foreground">
                                Inscrivez-vous et gagnez <strong>40 points</strong> sur votre 1ère commande! 🎁
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reg-name">Votre nom</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="reg-name"
                                        placeholder="Prénom"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-phone">Numéro de téléphone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="reg-phone"
                                        type="tel"
                                        placeholder="06 XX XX XX XX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button
                            onClick={handleRegister}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            S'inscrire
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Déjà membre?{' '}
                            <button
                                onClick={() => setMode('lookup')}
                                className="text-primary hover:underline"
                            >
                                Se connecter
                            </button>
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

export function LoyaltyDashboard() {
    const {
        customer,
        rewards,
        transactions,
        redeemReward,
        isLoading,
        logout,
        getNextReward
    } = useLoyalty();

    const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);

    const handleRedeem = async (rewardId: string) => {
        const result = await redeemReward(rewardId);
        if (result.success) {
            toast({
                title: '🎁 Récompense obtenue!',
                description: result.discount
                    ? result.discountType === 'percentage'
                        ? `${result.discount}% de réduction appliqué`
                        : `${result.discount}€ de réduction appliqué`
                    : 'Votre récompense est prête',
            });
            setSelectedRewardId(null);
        } else {
            toast({
                title: 'Erreur',
                description: 'Impossible d\'échanger la récompense',
                variant: 'destructive'
            });
        }
    };

    if (!customer) return null;

    const nextReward = getNextReward();
    const progressPercent = nextReward
        ? Math.min(100, (customer.points / nextReward.reward.pointsCost) * 100)
        : 100;

    return (
        <div className="space-y-6">
            <LoyaltyCard />

            {/* Progress message */}
            {nextReward && (
                <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            🎯
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">
                                Vous avez {customer.points} points
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Plus que <strong>{nextReward.pointsNeeded}</strong> pour {nextReward.reward.name.toLowerCase()}! 🥤
                            </p>
                        </div>
                    </div>
                    <Progress
                        value={progressPercent}
                        className="h-2 mt-3"
                    />
                </Card>
            )}

            <Tabs defaultValue="rewards" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rewards" className="gap-2">
                        <Gift className="w-4 h-4" />
                        Récompenses
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Historique
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rewards" className="space-y-4 mt-4">
                    {rewards.map((reward) => {
                        const canAfford = customer.points >= reward.pointsCost;

                        return (
                            <Card
                                key={reward.id}
                                className={`p-4 transition-all ${canAfford
                                    ? 'hover:border-primary cursor-pointer'
                                    : 'opacity-60'
                                    }`}
                                onClick={() => canAfford && setSelectedRewardId(reward.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${canAfford
                                        ? 'bg-primary/10'
                                        : 'bg-muted'
                                        }`}>
                                        {reward.id === 'free-drink' && '🥤'}
                                        {reward.id === 'discount-10-percent' && '💰'}
                                        {reward.id === 'free-side' && '🍟'}
                                        {reward.id === 'free-pizza' && '🍕'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{reward.name}</h4>
                                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${canAfford ? 'text-primary' : ''}`}>
                                            {reward.pointsCost} pts
                                        </p>
                                        {canAfford ? (
                                            <Button size="sm" variant="ghost" className="text-xs">
                                                Échanger
                                            </Button>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                -{reward.pointsCost - customer.points} pts
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="history" className="space-y-3 mt-4">
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>Pas encore de transactions</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {tx.type === 'earn' ? '+' : '-'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{tx.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-bold ${tx.type === 'earn' ? 'text-green-600' : 'text-orange-600'
                                    }`}>
                                    {tx.type === 'earn' ? '+' : ''}{tx.points} pts
                                </span>
                            </div>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            <Button
                variant="outline"
                className="w-full"
                onClick={logout}
            >
                Déconnexion
            </Button>

            {/* Redeem confirmation dialog */}
            <Dialog open={!!selectedRewardId} onOpenChange={() => setSelectedRewardId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer l'échange</DialogTitle>
                    </DialogHeader>
                    {selectedRewardId && (
                        <div className="space-y-4">
                            <p>
                                Voulez-vous échanger{' '}
                                <strong>{rewards.find(r => r.id === selectedRewardId)?.pointsCost} points</strong>{' '}
                                pour obtenir{' '}
                                <strong>{rewards.find(r => r.id === selectedRewardId)?.name}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSelectedRewardId(null)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => handleRedeem(selectedRewardId)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Confirmer'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Compact loyalty section for checkout
export function CheckoutLoyaltySection({
    hasPromoCode = false,
    onRewardSelect
}: {
    hasPromoCode?: boolean;
    onRewardSelect?: (reward: { id: string; type: string; value: number } | null) => void;
}) {
    const { customer, rewards, selectedReward, selectReward, canUseReward, calculatePointsToEarn } = useLoyalty();
    const [total] = useState(0); // This will be passed from parent

    if (!customer) return null;

    const pointsToEarn = calculatePointsToEarn(total);
    const availableRewards = rewards.filter(r => canUseReward(r.id, hasPromoCode));

    const handleSelectReward = (reward: typeof rewards[0] | null) => {
        selectReward(reward);
        onRewardSelect?.(reward ? { id: reward.id, type: reward.type, value: reward.value } : null);
    };

    return (
        <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Fidélité
                </h3>
                <span className="text-sm font-medium">{customer.points} points</span>
            </div>

            {/* Promo code warning */}
            {hasPromoCode && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    ⚠️ Les récompenses ne sont pas cumulables avec les codes promo
                </p>
            )}

            {/* Available rewards */}
            {!hasPromoCode && availableRewards.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Utiliser une récompense:</p>
                    {availableRewards.map((reward) => (
                        <button
                            key={reward.id}
                            onClick={() => handleSelectReward(selectedReward?.id === reward.id ? null : reward)}
                            className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${selectedReward?.id === reward.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Gift className="w-4 h-4" />
                                <span className="font-medium">{reward.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{reward.pointsCost} pts</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Points to earn */}
            {pointsToEarn > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                    <Sparkles className="w-4 h-4" />
                    <span>Vous gagnerez <strong>+{pointsToEarn} points</strong> avec cette commande!</span>
                </div>
            )}
        </Card>
    );
}
