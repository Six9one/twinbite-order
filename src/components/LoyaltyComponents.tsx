import React, { useState } from 'react';
import { useLoyalty } from '@/context/LoyaltyContext';
import { useLanguage } from '@/context/LanguageContext';
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
    Trophy,
    Loader2,
    Phone,
    User,
    ChevronRight,
    Sparkles,
    Crown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Tier colors and icons
const tierStyles = {
    bronze: {
        bg: 'bg-gradient-to-r from-amber-600 to-amber-700',
        text: 'text-amber-600',
        icon: '🥉'
    },
    silver: {
        bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
        text: 'text-gray-500',
        icon: '🥈'
    },
    gold: {
        bg: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
        text: 'text-yellow-500',
        icon: '🥇'
    },
    platinum: {
        bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
        text: 'text-purple-500',
        icon: '👑'
    }
};

export function LoyaltyCard() {
    const { t } = useLanguage();
    const {
        customer,
        isLoading,
        getTier,
        getNextTier,
        logout
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
                                <h3 className="font-bold">{t('loyalty.title')}</h3>
                                <p className="text-sm text-white/90">{t('loyalty.earn')}</p>
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

    const tier = customer.tier;
    const style = tierStyles[tier];
    const nextTier = getNextTier(tier);

    return (
        <Card className={`p-4 ${style.bg} text-white overflow-hidden relative`}>
            {/* Sparkles decoration */}
            <div className="absolute top-2 right-2 flex gap-1">
                <Sparkles className="w-4 h-4 animate-pulse opacity-50" />
                <Sparkles className="w-3 h-3 animate-pulse opacity-30" style={{ animationDelay: '0.5s' }} />
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {style.icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-white/80">Bonjour</p>
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                    <p className="text-xs text-white/70 capitalize flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Membre {tier}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold">{customer.points}</p>
                    <p className="text-sm text-white/80">{t('loyalty.points')}</p>
                </div>
            </div>

            {/* Progress to next tier */}
            {nextTier && (
                <div className="mt-2">
                    <div className="flex justify-between text-xs text-white/80 mb-1">
                        <span>{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                        <span>{nextTier.name}</span>
                    </div>
                    <Progress
                        value={100 - (nextTier.pointsNeeded / (nextTier.pointsNeeded + customer.points % 500) * 100)}
                        className="h-2 bg-white/20"
                    />
                    <p className="text-xs text-white/70 mt-1 text-center">
                        Plus que {nextTier.pointsNeeded} points pour {nextTier.name}!
                    </p>
                </div>
            )}
        </Card>
    );
}

export function LoyaltyLogin({ onClose }: { onClose?: () => void }) {
    const { t } = useLanguage();
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
                description: 'Vous avez reçu 10 points de bienvenue!',
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
                    {t('loyalty.title')}
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
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
                                Créez votre compte et recevez <strong>10 points</strong> de bienvenue! 🎁
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
                            S'inscrire et gagner 10 points
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
    const { t } = useLanguage();
    const {
        customer,
        rewards,
        transactions,
        redeemReward,
        isLoading,
        logout
    } = useLoyalty();

    const [selectedReward, setSelectedReward] = useState<string | null>(null);

    const handleRedeem = async (rewardId: string) => {
        const result = await redeemReward(rewardId);
        if (result.success) {
            toast({
                title: '🎁 Récompense obtenue!',
                description: result.discount
                    ? `${result.discount}€ de réduction appliqué`
                    : 'Votre récompense est prête',
            });
            setSelectedReward(null);
        } else {
            toast({
                title: 'Erreur',
                description: 'Impossible d\'échanger la récompense',
                variant: 'destructive'
            });
        }
    };

    if (!customer) return null;

    return (
        <div className="space-y-6">
            <LoyaltyCard />

            <Tabs defaultValue="rewards" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rewards" className="gap-2">
                        <Gift className="w-4 h-4" />
                        {t('loyalty.rewards')}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        {t('loyalty.history')}
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
                                onClick={() => canAfford && setSelectedReward(reward.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${canAfford
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{reward.name}</h4>
                                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${canAfford ? 'text-primary' : ''}`}>
                                            {reward.pointsCost} pts
                                        </p>
                                        {canAfford && (
                                            <Button size="sm" variant="ghost" className="text-xs">
                                                Échanger
                                            </Button>
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
            <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer l'échange</DialogTitle>
                    </DialogHeader>
                    {selectedReward && (
                        <div className="space-y-4">
                            <p>
                                Voulez-vous échanger{' '}
                                <strong>{rewards.find(r => r.id === selectedReward)?.pointsCost} points</strong>{' '}
                                pour obtenir{' '}
                                <strong>{rewards.find(r => r.id === selectedReward)?.name}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSelectedReward(null)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => handleRedeem(selectedReward)}
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
