import React, { useState, useEffect } from 'react';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Users,
    Share2,
    Copy,
    Check,
    UserPlus,
    Crown,
    ShoppingCart,
    LogOut,
    Link2,
    Loader2,
    X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function GroupOrderBanner() {
    const { t } = useLanguage();
    const {
        isGroupMode,
        groupOrder,
        isHost,
        leaveGroupOrder,
        getAllItems,
        getGroupTotal
    } = useGroupOrder();

    if (!isGroupMode || !groupOrder) return null;

    return (
        <Card className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white mb-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold">{t('group.title')}</h3>
                            {isHost && (
                                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Hôte
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-white/90">
                            {groupOrder.participants.length} participants • {getAllItems().length} articles • {getGroupTotal().toFixed(2)}€
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <GroupShareButton />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={leaveGroupOrder}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export function GroupShareButton() {
    const { groupOrder, getShareableLink } = useGroupOrder();
    const [copied, setCopied] = useState(false);

    if (!groupOrder) return null;

    const handleShare = async () => {
        const link = getShareableLink();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Rejoignez ma commande Twin Pizza!',
                    text: `Utilisez le code ${groupOrder.code} ou cliquez sur le lien`,
                    url: link
                });
                return;
            } catch (e) {
                // Fall back to copy
            }
        }

        // Copy to clipboard
        await navigator.clipboard.writeText(link);
        setCopied(true);
        toast({
            title: 'Lien copié!',
            description: `Code: ${groupOrder.code}`,
        });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-2"
            onClick={handleShare}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4" />
                    Copié
                </>
            ) : (
                <>
                    <Share2 className="w-4 h-4" />
                    Partager
                </>
            )}
        </Button>
    );
}

export function GroupOrderButton() {
    const { t } = useLanguage();
    const { isGroupMode } = useGroupOrder();
    const [open, setOpen] = useState(false);

    // Check URL for group code on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const groupCode = params.get('group');
        if (groupCode && !isGroupMode) {
            setOpen(true);
        }
    }, [isGroupMode]);

    if (isGroupMode) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Users className="w-4 h-4" />
                    {t('group.title')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        {t('group.title')}
                    </DialogTitle>
                    <DialogDescription>
                        Commandez ensemble avec vos amis! L'hôte paie pour tout le monde.
                    </DialogDescription>
                </DialogHeader>
                <GroupOrderTabs onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

function GroupOrderTabs({ onClose }: { onClose: () => void }) {
    const { t } = useLanguage();
    const { orderType } = useOrder();
    const { createGroupOrder, joinGroupOrder } = useGroupOrder();

    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [hostName, setHostName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [participantName, setParticipantName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Check URL for group code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const groupCode = params.get('group');
        if (groupCode) {
            setJoinCode(groupCode);
            setActiveTab('join');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleCreate = async () => {
        if (!hostName.trim()) {
            toast({ title: 'Erreur', description: 'Entrez votre nom', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const code = await createGroupOrder(hostName.trim(), orderType);
            toast({
                title: '🎉 Commande créée!',
                description: `Partagez le code: ${code}`,
            });
            onClose();
        } catch (e) {
            toast({ title: 'Erreur', description: 'Impossible de créer la commande', variant: 'destructive' });
        }
        setIsLoading(false);
    };

    const handleJoin = async () => {
        if (!joinCode.trim() || !participantName.trim()) {
            toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const success = await joinGroupOrder(joinCode.trim(), participantName.trim());
            if (success) {
                toast({
                    title: '🎉 Vous avez rejoint la commande!',
                    description: 'Ajoutez vos articles au panier',
                });
                onClose();
            } else {
                toast({ title: 'Erreur', description: 'Code invalide ou commande expirée', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Erreur', description: 'Impossible de rejoindre', variant: 'destructive' });
        }
        setIsLoading(false);
    };

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'join')}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Créer
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2">
                    <Link2 className="w-4 h-4" />
                    Rejoindre
                </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="host-name">Votre nom</Label>
                    <Input
                        id="host-name"
                        placeholder="Entrez votre nom"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                    />
                </div>

                <Card className="p-3 bg-muted">
                    <p className="text-sm text-muted-foreground">
                        💡 En tant qu'hôte, vous paierez la commande complète.
                        Partagez le code avec vos amis pour qu'ils ajoutent leurs articles.
                    </p>
                </Card>

                <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    {t('group.create')}
                </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="join-code">Code de groupe</Label>
                    <Input
                        id="join-code"
                        placeholder="Ex: ABC123"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest font-mono"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="participant-name">Votre nom</Label>
                    <Input
                        id="participant-name"
                        placeholder="Entrez votre nom"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                    />
                </div>

                <Button
                    className="w-full"
                    onClick={handleJoin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                    )}
                    {t('group.join')}
                </Button>
            </TabsContent>
        </Tabs>
    );
}

export function GroupOrderSummary() {
    const { t } = useLanguage();
    const {
        groupOrder,
        isHost,
        getAllItems,
        getMyItems,
        getGroupTotal,
        currentParticipantId,
        closeGroupOrder
    } = useGroupOrder();

    if (!groupOrder) return null;

    const allItems = getAllItems();
    const myItems = getMyItems();

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t('group.title')}
                </h3>
                <Badge variant="outline">
                    Code: {groupOrder.code}
                </Badge>
            </div>

            {/* Participants */}
            <div className="space-y-3 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('group.participants')}</h4>
                {groupOrder.participants.map((participant) => (
                    <div
                        key={participant.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${participant.id === currentParticipantId ? 'bg-primary/10' : 'bg-muted'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                                {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{participant.name}</span>
                            {participant.isHost && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                            {participant.id === currentParticipantId && (
                                <span className="text-xs text-muted-foreground">(vous)</span>
                            )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {participant.items.length} article{participant.items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                ))}
            </div>

            <Separator className="my-4" />

            {/* Items summary */}
            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="all" className="gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Tout ({allItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="mine" className="gap-2">
                        Mes articles ({myItems.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-2">
                    {allItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            Aucun article encore
                        </p>
                    ) : (
                        allItems.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.item.name}</span>
                                <span>{((item.calculatedPrice || item.item.price) * item.quantity).toFixed(2)}€</span>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="mine" className="space-y-2">
                    {myItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            Vous n'avez pas encore ajouté d'articles
                        </p>
                    ) : (
                        myItems.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.item.name}</span>
                                <span>{((item.calculatedPrice || item.item.price) * item.quantity).toFixed(2)}€</span>
                            </div>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-between font-bold text-lg">
                <span>Total groupe</span>
                <span className="text-primary">{getGroupTotal().toFixed(2)}€</span>
            </div>

            {/* Host controls */}
            {isHost && groupOrder.status === 'open' && (
                <div className="mt-4 space-y-2">
                    <Button
                        className="w-full"
                        onClick={closeGroupOrder}
                    >
                        Fermer et commander
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Fermer empêche les autres d'ajouter des articles
                    </p>
                </div>
            )}
        </Card>
    );
}
