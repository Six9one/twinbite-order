import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, Camera, X, RefreshCw, AlertTriangle, Clock, Calendar, Snowflake, Check, ImageIcon, Plus } from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';

interface WasteLogEntry {
    id: string;
    product_name: string;
    photo_url: string;
    reason: string;
    disposed_at: string;
    disposed_by: string;
}

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
    const [wasteLog, setWasteLog] = useState<WasteLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Quick dispose state
    const [showQuickDispose, setShowQuickDispose] = useState(false);
    const [quickPhoto, setQuickPhoto] = useState<string | null>(null);
    const [quickProductName, setQuickProductName] = useState('');
    const [quickReason, setQuickReason] = useState('dlc_expired');
    const [quickUploading, setQuickUploading] = useState(false);
    const quickPhotoRef = useRef<HTMLInputElement>(null);

    // Existing product dispose state
    const [showDisposal, setShowDisposal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DisposalItem | null>(null);
    const [disposalPhoto, setDisposalPhoto] = useState<string | null>(null);
    const [selectedReason, setSelectedReason] = useState('dlc_expired');
    const [uploading, setUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch existing tracked products
            const { data: traceData } = await supabase
                .from('kitchen_traceability' as any)
                .select('*')
                .eq('is_disposed', false)
                .order('secondary_dlc', { ascending: true })
                .limit(50);

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
                        id: r.id, product_name: r.product_name, source: 'traceability',
                        expiry_date: new Date(r.secondary_dlc), opened_at: r.opened_at,
                        batch_number: r.batch_number, label_photo_url: r.label_photo_url,
                    });
                }
            }
            if (freezerData) {
                for (const f of freezerData as any[]) {
                    if (f.expiry_date) {
                        allItems.push({
                            id: f.id, product_name: f.product_name, source: 'freezer',
                            expiry_date: new Date(f.expiry_date), frozen_at: f.frozen_at,
                            lot_number: f.lot_number, weight: f.weight,
                        });
                    }
                }
            }
            allItems.sort((a, b) => a.expiry_date.getTime() - b.expiry_date.getTime());
            setItems(allItems);

            // Fetch recent waste log
            const { data: logData } = await supabase
                .from('kitchen_waste_log' as any)
                .select('*')
                .order('disposed_at', { ascending: false })
                .limit(20);
            if (logData) setWasteLog(logData as unknown as WasteLogEntry[]);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // === QUICK DISPOSE (direct photo) ===
    const handleQuickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setQuickPhoto(reader.result as string);
                setShowQuickDispose(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQuickDispose = async () => {
        if (!quickProductName.trim()) { toast.error('Entrez le nom du produit'); return; }

        setQuickUploading(true);
        try {
            let photoUrl: string | null = null;
            if (quickPhoto) {
                photoUrl = await uploadToKitchenStorage(
                    KITCHEN_BUCKETS.WASTE_PHOTOS,
                    quickPhoto,
                    `waste_quick_${Date.now()}`
                );
            }

            const reasonLabel = DISPOSAL_REASONS.find(r => r.value === quickReason)?.label || quickReason;

            const { error: insertError } = await supabase.from('kitchen_waste_log' as any).insert({
                product_name: quickProductName.trim(),
                photo_url: photoUrl,
                reason: reasonLabel,
                disposed_at: new Date().toISOString(),
                disposed_by: 'Staff',
            } as any);

            if (insertError) throw insertError;

            toast.success(`🗑️ ${quickProductName} — jeté${photoUrl ? ' avec photo' : ''}`);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            resetQuickForm();
            fetchAll();
        } catch (err) {
            console.error('Quick dispose error:', err);
            toast.error('Erreur');
        } finally {
            setQuickUploading(false);
        }
    };

    const resetQuickForm = () => {
        setShowQuickDispose(false);
        setQuickPhoto(null);
        setQuickProductName('');
        setQuickReason('dlc_expired');
    };

    // === EXISTING PRODUCT DISPOSE ===
    const getExpiryStatus = (expiryDate: Date) => {
        const now = Date.now();
        const hoursRemaining = (expiryDate.getTime() - now) / (1000 * 60 * 60);
        if (hoursRemaining <= 0) return { status: 'expired', label: 'PÉRIMÉ', hours: Math.abs(Math.round(hoursRemaining)), color: 'bg-red-600' };
        if (hoursRemaining <= 24) return { status: 'critical', label: `${Math.round(hoursRemaining)}h`, hours: Math.round(hoursRemaining), color: 'bg-amber-600' };
        const days = Math.round(hoursRemaining / 24);
        return { status: 'warning', label: `${days}j`, hours: Math.round(hoursRemaining), color: 'bg-slate-600' };
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

        setUploading(true);
        try {
            let photoUrl: string | null = null;
            if (disposalPhoto) {
                photoUrl = await uploadToKitchenStorage(
                    KITCHEN_BUCKETS.WASTE_PHOTOS, disposalPhoto,
                    `waste_${selectedItem.source}_${selectedItem.id}_${Date.now()}`
                );
            }
            const reasonLabel = DISPOSAL_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

            if (selectedItem.source === 'traceability') {
                const { error: updateErr } = await supabase.from('kitchen_traceability' as any).update({
                    is_disposed: true, disposed_at: new Date().toISOString(),
                    disposed_reason: reasonLabel, disposed_photo_url: photoUrl,
                } as any).eq('id', selectedItem.id);
                if (updateErr) throw updateErr;
            } else {
                const { error: updateErr } = await supabase.from('kitchen_freezer_entries' as any).update({
                    is_removed: true, removed_at: new Date().toISOString(),
                    removed_reason: reasonLabel, disposed_photo_url: photoUrl,
                } as any).eq('id', selectedItem.id);
                if (updateErr) throw updateErr;
            }

            // Also log to waste log
            const { error: logErr } = await supabase.from('kitchen_waste_log' as any).insert({
                product_name: selectedItem.product_name,
                photo_url: photoUrl,
                reason: reasonLabel,
                disposed_at: new Date().toISOString(),
                disposed_by: 'Staff',
            } as any);
            if (logErr) throw logErr;

            toast.success(`🗑️ ${selectedItem.product_name} — jeté${photoUrl ? ' avec preuve photo' : ''}`);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setShowDisposal(false); setSelectedItem(null); setDisposalPhoto(null);
            fetchAll();
        } catch (err) {
            console.error('Disposal error:', err);
            toast.error('Erreur');
        } finally {
            setUploading(false);
        }
    };

    const expiredItems = items.filter(i => getExpiryStatus(i.expiry_date).status === 'expired');
    const criticalItems = items.filter(i => getExpiryStatus(i.expiry_date).status === 'critical');

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-red-500 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Mise au rebut</h2>
                <p className="text-slate-400 text-sm">Photographier avant de jeter — traçabilité HACCP</p>
            </div>

            {/* ===== BIG QUICK DISPOSE BUTTON ===== */}
            <input
                ref={quickPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQuickPhoto}
                className="hidden"
            />

            {!showQuickDispose && (
                <Button
                    onClick={() => setShowQuickDispose(true)}
                    className="w-full h-24 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-2xl text-xl font-bold shadow-lg shadow-red-900/30 active:scale-[0.98] transition-all"
                >
                    <Trash2 className="w-8 h-8 mr-3" />
                    🗑️ Jeter un produit
                </Button>
            )}

            {/* ===== QUICK DISPOSE FORM (after photo taken) ===== */}
            {showQuickDispose && (
                <Card className="bg-slate-800/80 border-red-500/50 border-2">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-400" />
                                Mise au rebut
                            </h3>
                            <Button variant="ghost" size="icon" onClick={resetQuickForm} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Photo (Optional) */}
                        {quickPhoto ? (
                            <div className="relative">
                                <img src={quickPhoto} alt="Produit à jeter" className="w-full h-48 object-cover rounded-xl border-2 border-green-500" />
                                <Badge className="absolute top-2 left-2 bg-green-600">
                                    <Check className="w-3 h-3 mr-1" /> Photo prise
                                </Badge>
                                <Button variant="destructive" size="icon" className="absolute top-2 right-2"
                                    onClick={() => setQuickPhoto(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => quickPhotoRef.current?.click()}
                                className="w-full h-20 border-slate-600 border-dashed text-slate-400 hover:text-white hover:border-slate-400"
                            >
                                <Camera className="w-6 h-6 mr-2" />
                                📸 Ajouter une photo (optionnel)
                            </Button>
                        )}

                        {/* Product Name */}
                        <div>
                            <Label className="text-slate-300">Nom du produit *</Label>
                            <Input
                                value={quickProductName}
                                onChange={(e) => setQuickProductName(e.target.value)}
                                placeholder="Ex: Viande hachée, Poulet, Steak..."
                                className="bg-slate-900 border-slate-600 text-white h-12 text-lg"
                                autoFocus
                            />
                        </div>

                        {/* Reason */}
                        <div>
                            <Label className="text-slate-300 mb-2 block">Motif</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {DISPOSAL_REASONS.map(reason => (
                                    <Button
                                        key={reason.value}
                                        variant={quickReason === reason.value ? 'default' : 'outline'}
                                        onClick={() => setQuickReason(reason.value)}
                                        className={`h-11 justify-start text-left ${quickReason === reason.value
                                            ? `${reason.color} text-white border-transparent`
                                            : 'border-slate-600 text-slate-300 hover:text-white'
                                            }`}
                                    >
                                        {reason.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleQuickDispose}
                            disabled={!quickProductName.trim() || quickUploading}
                            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50"
                        >
                            {quickUploading ? (
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-5 h-5 mr-2" />
                            )}
                            Enregistrer et jeter
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ===== EXPIRED PRODUCTS FROM STOCK ===== */}
            {expiredItems.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4" />
                        Périmés en stock ({expiredItems.length})
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
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="destructive" className="animate-pulse">{status.label}</Badge>
                                            <Trash2 className="w-5 h-5 text-red-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Critical items */}
            {criticalItems.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                        <Clock className="w-4 h-4" />
                        Expire bientôt ({criticalItems.length})
                    </h3>
                    {criticalItems.map(item => {
                        const status = getExpiryStatus(item.expiry_date);
                        return (
                            <Card key={`${item.source}-${item.id}`}
                                className="bg-amber-600/20 border-amber-500 cursor-pointer hover:bg-amber-600/30 transition-all active:scale-[0.98]"
                                onClick={() => openDisposalDialog(item)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {item.source === 'freezer' && <Snowflake className="w-3 h-3 text-blue-400" />}
                                            <h4 className="text-white text-sm">{item.product_name}</h4>
                                        </div>
                                        <Badge className={status.color}>{status.label}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ===== RECENT WASTE LOG ===== */}
            {wasteLog.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Historique des déchets
                    </h3>
                    {wasteLog.map(entry => (
                        <Card key={entry.id} className="bg-slate-800/30 border-slate-700">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                    {entry.photo_url && (
                                        <img src={entry.photo_url} alt={entry.product_name}
                                            className="w-14 h-14 object-cover rounded-lg border border-slate-600 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-medium text-sm truncate">{entry.product_name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <span>{new Date(entry.disposed_at).toLocaleDateString('fr-FR')} {new Date(entry.disposed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>•</span>
                                            <span className="truncate">{entry.reason}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Refresh */}
            <Button variant="outline" onClick={fetchAll} className="w-full border-slate-600 text-slate-300 hover:text-white">
                <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
            </Button>

            {/* === EXISTING PRODUCT DISPOSAL DIALOG === */}
            {showDisposal && selectedItem && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
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
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-md mx-auto space-y-5">
                            <Card className="bg-slate-800/80 border-slate-700 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {selectedItem.source === 'freezer' && <Snowflake className="w-4 h-4 text-blue-400" />}
                                    <h3 className="text-white font-bold text-lg">{selectedItem.product_name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />DLC: {selectedItem.expiry_date.toLocaleDateString('fr-FR')}</span>
                                </div>
                            </Card>

                            <div>
                                <label className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                    <Camera className="w-4 h-4 text-slate-400" /> Photo (optionnel)
                                </label>
                                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
                                {disposalPhoto ? (
                                    <div className="relative">
                                        <img src={disposalPhoto} alt="Photo" className="w-full h-48 object-cover rounded-xl border-2 border-green-500" />
                                        <Badge className="absolute top-2 left-2 bg-green-600"><Check className="w-3 h-3 mr-1" /> Photo prise</Badge>
                                        <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setDisposalPhoto(null)}><X className="w-4 h-4" /></Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={() => photoInputRef.current?.click()} className="w-full h-20 border-slate-600 border-dashed text-slate-400 hover:text-white hover:border-slate-400 rounded-xl">
                                        <Camera className="w-6 h-6 mr-2" /> 📸 Ajouter une photo (optionnel)
                                    </Button>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-white mb-3 block">Motif</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {DISPOSAL_REASONS.map(reason => (
                                        <Button key={reason.value}
                                            variant={selectedReason === reason.value ? 'default' : 'outline'}
                                            onClick={() => setSelectedReason(reason.value)}
                                            className={`h-11 justify-start text-left ${selectedReason === reason.value ? `${reason.color} text-white border-transparent` : 'border-slate-600 text-slate-300 hover:text-white'}`}
                                        >{reason.label}</Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/80 flex gap-3 border-t border-slate-800">
                        <Button variant="outline" onClick={() => setShowDisposal(false)} disabled={uploading} className="flex-1 h-14 border-slate-600 text-slate-300">Annuler</Button>
                        <Button onClick={handleConfirmDisposal} disabled={uploading} className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white text-lg font-bold disabled:opacity-50">
                            {uploading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />}Jeter
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WasteDisposalTab;
