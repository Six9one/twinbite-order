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
    Link2,
    Loader2,
    X,
    Clock,
    MessageCircle,
    Send,
    QrCode,
    ExternalLink
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
    const { createGroupOrder, joinGroupOrder, groupOrder, getShareableLink } = useGroupOrder();

    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [hostName, setHostName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [participantName, setParticipantName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdCode, setCreatedCode] = useState('');
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

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
            setCreatedCode(code);
            setShowSuccess(true);
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

    const handleCopyCode = async () => {
        await navigator.clipboard.writeText(createdCode);
        setCodeCopied(true);
        toast({ title: '✅ Code copié!', description: createdCode });
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const handleCopyLink = async () => {
        const link = getShareableLink();
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        toast({ title: '✅ Lien copié!' });
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const link = getShareableLink();
        const message = encodeURIComponent(
            `🍕 Rejoignez ma commande Twin Pizza!\n\n` +
            `📌 Code: ${createdCode}\n` +
            `🔗 Lien: ${link}\n\n` +
            `⏰ Valide pendant 3 heures`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handleShareSMS = () => {
        const link = getShareableLink();
        const message = encodeURIComponent(
            `Rejoignez ma commande Twin Pizza! Code: ${createdCode} - Lien: ${link}`
        );
        window.open(`sms:?body=${message}`, '_blank');
    };

    const handleNativeShare = async () => {
        const link = getShareableLink();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Commande Groupe Twin Pizza',
                    text: `Rejoignez ma commande! Code: ${createdCode}`,
                    url: link
                });
            } catch (e) {
                // User cancelled
            }
        }
    };

    // Success screen after creation
    if (showSuccess) {
        return (
            <div className="space-y-6 py-4">
                {/* Success Header */}
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-600 mb-2">
                        Commande créée! 🎉
                    </h3>
                    <p className="text-muted-foreground">
                        Partagez le code avec vos amis pour qu'ils rejoignent
                    </p>
                </div>

                {/* Big Code Display */}
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-primary/20">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">CODE DE GROUPE</p>
                        <div className="text-4xl font-mono font-bold tracking-[0.5em] text-primary mb-4">
                            {createdCode}
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleCopyCode}
                            className="gap-2"
                        >
                            {codeCopied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    Copié!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copier le code
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Expiration Warning */}
                <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Valide 3 heures</strong> — Vos amis peuvent rejoindre et ajouter leurs articles jusqu'à l'expiration
                        </p>
                    </div>
                </Card>

                {/* Share Options */}
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Partager via:</p>

                    <div className="grid grid-cols-2 gap-3">
                        {/* WhatsApp */}
                        <Button
                            onClick={handleShareWhatsApp}
                            className="h-14 bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
                        >
                            <MessageCircle className="w-5 h-5" />
                            WhatsApp
                        </Button>

                        {/* SMS */}
                        <Button
                            onClick={handleShareSMS}
                            variant="outline"
                            className="h-14 gap-2"
                        >
                            <Send className="w-5 h-5" />
                            SMS
                        </Button>
                    </div>

                    {/* Copy Link */}
                    <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="w-full h-12 gap-2"
                    >
                        {linkCopied ? (
                            <>
                                <Check className="w-4 h-4 text-green-600" />
                                Lien copié!
                            </>
                        ) : (
                            <>
                                <Link2 className="w-4 h-4" />
                                Copier le lien
                            </>
                        )}
                    </Button>

                    {/* Native Share (Mobile) */}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <Button
                            onClick={handleNativeShare}
                            variant="secondary"
                            className="w-full h-12 gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Plus d'options...
                        </Button>
                    )}
                </div>

                {/* How it works */}
                <Card className="p-4 bg-muted/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Comment ça marche?
                    </h4>
                    <ol className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                            <span>Partagez le code avec vos amis</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                            <span>Chacun ajoute ses articles au panier</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                            <span>Vous (l'hôte) payez pour tout le monde</span>
                        </li>
                    </ol>
                </Card>

                {/* Continue Button */}
                <Button
                    onClick={onClose}
                    className="w-full h-14 text-lg"
                >
                    Continuer vers le menu
                </Button>
            </div>
        );
    }

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
                {/* Explanation */}
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Commande de Groupe</h4>
                            <p className="text-sm text-muted-foreground">
                                Créez un groupe et partagez le code. Vos amis ajoutent leurs articles, vous payez en une fois!
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="space-y-2">
                    <Label htmlFor="host-name">Votre nom</Label>
                    <Input
                        id="host-name"
                        placeholder="Entrez votre nom"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                    />
                </div>

                <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Le code sera valide <strong>3 heures</strong>. L'hôte paie pour tout le monde.
                        </p>
                    </div>
                </Card>

                <Button
                    className="w-full h-12"
                    onClick={handleCreate}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Créer la commande de groupe
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
                        className="text-center text-2xl tracking-widest font-mono h-14"
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

                <Card className="p-3 bg-muted">
                    <p className="text-sm text-muted-foreground">
                        💡 Demandez le code à la personne qui a créé la commande de groupe.
                    </p>
                </Card>

                <Button
                    className="w-full h-12"
                    onClick={handleJoin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Rejoindre la commande
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
