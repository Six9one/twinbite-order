import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Camera, X, RefreshCw, AlertTriangle, Clock, Calendar, Snowflake, Check, ImageIcon } from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';

interface DisposalItem {
    id: string;
    product_name: string;
    source: 'traceability' | 'freezer';
    expiry_date: Date;
    opened_at?: string;
    frozen_at?: string;
    batch_number?: string | null;
    lot_number?: string | null;
    weight?: string | null;
    label_photo_url?: string | null;
}

const DISPOSAL_REASONS = [
    { value: 'dlc_expired', label: '📅 DLC dépassée', color: 'bg-red-600' },
    { value: 'bad_appearance', label: '👁️ Aspect non conforme', color: 'bg-amber-600' },
    { value: 'bad_smell', label: '👃 Odeur suspecte', color: 'bg-orange-600' },
    { value: 'damaged', label: '📦 Emballage endommagé', color: 'bg-yellow-600' },
    { value: 'other', label: '❓ Autre', color: 'bg-slate-600' },
];

export function WasteDisposalTab() {
    const [items, setItems] = useState<DisposalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDisposal, setShowDisposal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DisposalItem | null>(null);
    const [disposalPhoto, setDisposalPhoto] = useState<string | null>(null);
    const [selectedReason, setSelectedReason] = useState('dlc_expired');
    const [uploading, setUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchExpiredItems(); }, []);

    const fetchExpiredItems = async () => {
        setLoading(true);
        try {
            // Fetch open traceability records
            const { data: traceData } = await supabase
                .from('kitchen_traceability' as any)
                .select('*')
                .eq('is_disposed', false)
                .order('secondary_dlc', { ascending: true })
                .limit(50);

            // Fetch freezer entries
            const { data: freezerData } = await supabase
                .from('kitchen_freezer_entries' as any)
                .select('*')
                .eq('is_removed', false)
                .order('expiry_date', { ascending: true })
                .limit(50);

            const allItems: DisposalItem[] = [];

            if (traceData) {
                for (const r of traceData as any[]) {
                    allItems.push({
                        id: r.id,
                        product_name: r.product_name,
                        source: 'traceability',
                        expiry_date: new Date(r.secondary_dlc),
                        opened_at: r.opened_at,
                        batch_number: r.batch_number,
                        label_photo_url: r.label_photo_url,
                    });
                }
            }

            if (freezerData) {
                for (const f of freezerData as any[]) {
                    if (f.expiry_date) {
                        allItems.push({
                            id: f.id,
                            product_name: f.product_name,
                            source: 'freezer',
                            expiry_date: new Date(f.expiry_date),
                            frozen_at: f.frozen_at,
                            lot_number: f.lot_number,
                            weight: f.weight,
                        });
                    }
                }
            }

            // Sort by expiry date (most urgent first)
            allItems.sort((a, b) => a.expiry_date.getTime() - b.expiry_date.getTime());
            setItems(allItems);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const getExpiryStatus = (expiryDate: Date) => {
        const now = Date.now();
        const hoursRemaining = (expiryDate.getTime() - now) / (1000 * 60 * 60);
        if (hoursRemaining <= 0) return { status: 'expired', label: 'PÉRIMÉ', hours: Math.abs(Math.round(hoursRemaining)), color: 'bg-red-600', borderColor: 'border-red-500', bgColor: 'bg-red-600/20' };
        if (hoursRemaining <= 24) return { status: 'critical', label: `${Math.round(hoursRemaining)}h`, hours: Math.round(hoursRemaining), color: 'bg-amber-600', borderColor: 'border-amber-500', bgColor: 'bg-amber-600/20' };
        const days = Math.round(hoursRemaining / 24);
        return { status: 'warning', label: `${days}j`, hours: Math.round(hoursRemaining), color: 'bg-slate-600', borderColor: 'border-slate-600', bgColor: 'bg-slate-800/50' };
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setDisposalPhoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const openDisposalDialog = (item: DisposalItem) => {
        setSelectedItem(item);
        setDisposalPhoto(null);
        setSelectedReason('dlc_expired');
        setShowDisposal(true);
    };

    const handleConfirmDisposal = async () => {
        if (!selectedItem) return;
        if (!disposalPhoto) {
            toast.error('📸 Prenez une photo avant de jeter !');
            return;
        }

        setUploading(true);
        try {
            // Upload photo
            const photoUrl = await uploadToKitchenStorage(
                KITCHEN_BUCKETS.WASTE_PHOTOS,
                disposalPhoto,
                `waste_${selectedItem.source}_${selectedItem.id}_${Date.now()}`
            );

            const reasonLabel = DISPOSAL_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

            if (selectedItem.source === 'traceability') {
                await supabase
                    .from('kitchen_traceability' as any)
                    .update({
                        is_disposed: true,
                        disposed_at: new Date().toISOString(),
                        disposed_reason: reasonLabel,
                        disposed_photo_url: photoUrl,
                    } as any)
                    .eq('id', selectedItem.id);
            } else {
                await supabase
                    .from('kitchen_freezer_entries' as any)
                    .update({
                        is_removed: true,
                        removed_at: new Date().toISOString(),
                        removed_reason: reasonLabel,
                        disposed_photo_url: photoUrl,
                    } as any)
                    .eq('id', selectedItem.id);
            }

            toast.success(`🗑️ ${selectedItem.product_name} — jeté avec preuve photo`);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            setShowDisposal(false);
            setSelectedItem(null);
            setDisposalPhoto(null);
            fetchExpiredItems();
        } catch (err) {
            console.error('Disposal error:', err);
            toast.error('Erreur lors de la mise au rebut');
        } finally {
            setUploading(false);
        }
    };

    const expiredItems = items.filter(i => getExpiryStatus(i.expiry_date).status === 'expired');
    const criticalItems = items.filter(i => getExpiryStatus(i.expiry_date).status === 'critical');
    const otherItems = items.filter(i => getExpiryStatus(i.expiry_date).status === 'warning');

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-red-500 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Mise au rebut</h2>
                <p className="text-slate-400 text-sm">Photographier avant de jeter — traçabilité HACCP</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-red-600/20 border-red-500 p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{expiredItems.length}</div>
                    <div className="text-xs text-red-300">Périmés</div>
                </Card>
                <Card className="bg-amber-600/20 border-amber-500 p-3 text-center">
                    <div className="text-2xl font-bold text-amber-400">{criticalItems.length}</div>
                    <div className="text-xs text-amber-300">{"< 24h"}</div>
                </Card>
                <Card className="bg-slate-800/50 border-slate-600 p-3 text-center">
                    <div className="text-2xl font-bold text-slate-300">{otherItems.length}</div>
                    <div className="text-xs text-slate-400">En stock</div>
                </Card>
            </div>

            {/* Expired Items - Must throw */}
            {expiredItems.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4" />
                        À jeter immédiatement ({expiredItems.length})
                    </h3>
                    {expiredItems.map(item => {
                        const status = getExpiryStatus(item.expiry_date);
                        return (
                            <Card key={`${item.source}-${item.id}`}
                                className="bg-red-600/20 border-red-500 cursor-pointer hover:bg-red-600/30 transition-all active:scale-[0.98]"
                                onClick={() => openDisposalDialog(item)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {item.source === 'freezer' && <Snowflake className="w-4 h-4 text-blue-400" />}
                                                <h4 className="text-white font-bold">{item.product_name}</h4>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    DLC: {item.expiry_date.toLocaleDateString('fr-FR')}
                                                </span>
                                                {item.batch_number && <span>Lot: {item.batch_number}</span>}
                                                {item.lot_number && <span>Lot: {item.lot_number}</span>}
                                                {item.weight && <span>{item.weight}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="destructive" className="animate-pulse">
                                                {status.label}
                                            </Badge>
                                            <Trash2 className="w-5 h-5 text-red-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Critical Items - Expiring within 24h */}
            {criticalItems.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                        <Clock className="w-4 h-4" />
                        Expire dans moins de 24h ({criticalItems.length})
                    </h3>
                    {criticalItems.map(item => {
                        const status = getExpiryStatus(item.expiry_date);
                        return (
                            <Card key={`${item.source}-${item.id}`}
                                className="bg-amber-600/20 border-amber-500 cursor-pointer hover:bg-amber-600/30 transition-all active:scale-[0.98]"
                                onClick={() => openDisposalDialog(item)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {item.source === 'freezer' && <Snowflake className="w-4 h-4 text-blue-400" />}
                                                <h4 className="text-white font-medium">{item.product_name}</h4>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    DLC: {item.expiry_date.toLocaleDateString('fr-FR')} {item.expiry_date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={status.color}>{status.label}</Badge>
                                            <Trash2 className="w-5 h-5 text-amber-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Other items */}
            {otherItems.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        En stock ({otherItems.length})
                    </h3>
                    {otherItems.map(item => {
                        const status = getExpiryStatus(item.expiry_date);
                        return (
                            <Card key={`${item.source}-${item.id}`}
                                className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-all active:scale-[0.98]"
                                onClick={() => openDisposalDialog(item)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {item.source === 'freezer' && <Snowflake className="w-3 h-3 text-blue-400" />}
                                                <h4 className="text-white text-sm">{item.product_name}</h4>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">{status.label}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {items.length === 0 && (
                <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white">Tout est en ordre !</h3>
                    <p className="text-slate-400 text-sm mt-1">Aucun produit en stock actuellement</p>
                </Card>
            )}

            {/* Refresh Button */}
            <Button
                variant="outline"
                onClick={fetchExpiredItems}
                className="w-full border-slate-600 text-slate-300 hover:text-white"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
            </Button>

            {/* === DISPOSAL DIALOG === */}
            {showDisposal && selectedItem && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-red-900/50 border-b border-red-800">
                        <div className="flex items-center gap-3">
                            <Trash2 className="h-6 w-6 text-red-400" />
                            <div>
                                <span className="text-lg font-bold text-white">Mise au rebut</span>
                                <p className="text-xs text-red-300">{selectedItem.product_name}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowDisposal(false)} className="text-white hover:bg-red-800">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-md mx-auto space-y-5">
                            {/* Product Info */}
                            <Card className="bg-slate-800/80 border-slate-700 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {selectedItem.source === 'freezer' && <Snowflake className="w-4 h-4 text-blue-400" />}
                                    <h3 className="text-white font-bold text-lg">{selectedItem.product_name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        DLC: {selectedItem.expiry_date.toLocaleDateString('fr-FR')}
                                    </span>
                                    {selectedItem.batch_number && <span>Lot: {selectedItem.batch_number}</span>}
                                    {selectedItem.lot_number && <span>Lot: {selectedItem.lot_number}</span>}
                                    {selectedItem.weight && <span>{selectedItem.weight}</span>}
                                </div>
                            </Card>

                            {/* Photo Capture - REQUIRED */}
                            <div>
                                <label className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                    <Camera className="w-4 h-4 text-red-400" />
                                    Photo obligatoire avant mise au rebut
                                </label>

                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />

                                {disposalPhoto ? (
                                    <div className="relative">
                                        <img
                                            src={disposalPhoto}
                                            alt="Photo du produit"
                                            className="w-full h-48 object-cover rounded-xl border-2 border-green-500"
                                        />
                                        <Badge className="absolute top-2 left-2 bg-green-600">
                                            <Check className="w-3 h-3 mr-1" /> Photo prise
                                        </Badge>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2"
                                            onClick={() => setDisposalPhoto(null)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => photoInputRef.current?.click()}
                                        className="w-full h-32 bg-gradient-to-br from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl border-2 border-dashed border-red-400"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <Camera className="w-10 h-10" />
                                            <span className="text-lg font-bold">📸 Photographier le produit</span>
                                        </div>
                                    </Button>
                                )}
                            </div>

                            {/* Reason Selection */}
                            <div>
                                <label className="text-sm font-bold text-white mb-3 block">
                                    Motif de mise au rebut
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {DISPOSAL_REASONS.map(reason => (
                                        <Button
                                            key={reason.value}
                                            variant={selectedReason === reason.value ? 'default' : 'outline'}
                                            onClick={() => setSelectedReason(reason.value)}
                                            className={`h-12 justify-start text-left ${selectedReason === reason.value
                                                ? `${reason.color} text-white border-transparent`
                                                : 'border-slate-600 text-slate-300 hover:text-white'
                                                }`}
                                        >
                                            {reason.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Warning */}
                            <Card className="bg-red-600/20 border-red-500/50 p-3">
                                <div className="flex items-center gap-2 text-red-300 text-sm">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>La photo sera sauvegardée pour la <strong>traçabilité HACCP</strong>. Cette action est irréversible.</span>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="p-4 bg-slate-900/80 flex gap-3 border-t border-slate-800">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisposal(false)}
                            disabled={uploading}
                            className="flex-1 h-14 border-slate-600 text-slate-300"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleConfirmDisposal}
                            disabled={!disposalPhoto || uploading}
                            className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50"
                        >
                            {uploading ? (
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-5 h-5 mr-2" />
                            )}
                            Jeter
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WasteDisposalTab;
