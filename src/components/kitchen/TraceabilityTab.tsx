import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Tag, Camera, Printer, Clock, Calendar, Check, X, RefreshCw, AlertTriangle, Snowflake, Leaf, Plus, ScanText, Edit3 } from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';
import { printHACCPDirect, printFreezerLabel } from '@/config/printConfig';

interface HACCPCategory { id: string; name: string; slug: string; color: string; dlc_hours: number; storage_temp_min: number; storage_temp_max: number; }
interface HACCPProduct { id: string; category_id: string; name: string; dlc_hours_override: number | null; }
interface TraceabilityRecord { id: string; product_name: string; batch_number: string | null; label_photo_url: string | null; secondary_dlc: string; dlc_hours: number; opened_at: string; opened_by: string | null; is_disposed: boolean; }
interface FreezerEntry { id: string; product_name: string; original_dlc: string | null; lot_number: string | null; weight: string | null; origin: string | null; frozen_at: string; expiry_date: string | null; is_removed: boolean; }

interface OCRResult {
    productName: string;
    dlc: string;
    lotNumber: string;
    origin: string;
    weight: string;
    rawText: string;
    confidence: number;
}

export function TraceabilityTab() {
    const [categories, setCategories] = useState<HACCPCategory[]>([]);
    const [products, setProducts] = useState<HACCPProduct[]>([]);
    const [records, setRecords] = useState<TraceabilityRecord[]>([]);
    const [freezerEntries, setFreezerEntries] = useState<FreezerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('');
    const [mainTab, setMainTab] = useState('etiquettes'); // 'etiquettes' or 'congelation'

    // Étiquettes form state
    const [showNewLabel, setShowNewLabel] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<HACCPProduct | null>(null);
    const [batchNumber, setBatchNumber] = useState('');
    const [labelPhoto, setLabelPhoto] = useState<string | null>(null);
    const [customDlcHours, setCustomDlcHours] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);

    // Congélation/Freezer form state
    const [showFreezerForm, setShowFreezerForm] = useState(false);
    const [freezerPhoto, setFreezerPhoto] = useState<string | null>(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [freezerProductName, setFreezerProductName] = useState('');
    const [freezerDlc, setFreezerDlc] = useState('');
    const [freezerLotNumber, setFreezerLotNumber] = useState('');
    const [freezerWeight, setFreezerWeight] = useState('');
    const [freezerOrigin, setFreezerOrigin] = useState('');

    const photoInputRef = useRef<HTMLInputElement>(null);
    const freezerPhotoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: catData } = await supabase.from('haccp_categories' as any).select('*').eq('is_active', true).order('display_order');
        if (catData) { const cats = catData as unknown as HACCPCategory[]; setCategories(cats); if (cats.length > 0) setActiveCategory(cats[0].slug); }
        const { data: prodData } = await supabase.from('haccp_products' as any).select('*').eq('is_active', true).order('display_order');
        if (prodData) setProducts(prodData as unknown as HACCPProduct[]);
        const { data: recData } = await supabase.from('kitchen_traceability' as any).select('*').eq('is_disposed', false).order('secondary_dlc', { ascending: true }).limit(20);
        if (recData) setRecords(recData as unknown as TraceabilityRecord[]);
        // Fetch freezer entries
        const { data: freezerData } = await supabase.from('kitchen_freezer_entries' as any).select('*').eq('is_removed', false).order('frozen_at', { ascending: false }).limit(20);
        if (freezerData) setFreezerEntries(freezerData as unknown as FreezerEntry[]);
        setLoading(false);
    };

    const getActiveProducts = () => { const cat = categories.find(c => c.slug === activeCategory); return cat ? products.filter(p => p.category_id === cat.id) : []; };
    const getActiveCategory = () => categories.find(c => c.slug === activeCategory);
    const calculateSecondaryDlc = (dlcHours: number) => new Date(Date.now() + dlcHours * 60 * 60 * 1000);

    const handleQuickPrint = async (product: HACCPProduct) => {
        const category = categories.find(c => c.id === product.category_id);
        if (!category) return;
        setPrinting(product.id);
        try {
            const now = new Date();
            const dlcHours = product.dlc_hours_override || category.dlc_hours;
            const dlcDate = calculateSecondaryDlc(dlcHours);
            const storageTemp = `${category.storage_temp_min}°C à +${category.storage_temp_max}°C`;
            await supabase.from('kitchen_traceability' as any).insert({ product_name: product.name, dlc_hours: dlcHours, secondary_dlc: dlcDate.toISOString(), opened_by: 'Staff' } as any);
            await supabase.from('haccp_history' as any).insert({ product_id: product.id, category_id: category.id, product_name: product.name, category_name: category.name, action_type: category.slug === 'congele-decongele' ? 'defrost' : 'open', action_datetime: now.toISOString(), dlc_datetime: dlcDate.toISOString(), storage_temp: storageTemp, printed_by: 'Staff' } as any);
            const actionLabel = category.slug === 'congele-decongele' ? 'Décongélation' : 'Ouverture';
            const printSuccess = await printHACCPDirect({ productName: product.name, categoryName: category.name, categoryColor: category.color, actionDate: now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), dlcDate: dlcDate.toLocaleDateString('fr-FR') + ' ' + dlcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), storageTemp, operator: 'Staff', dlcHours, actionLabel });
            toast.success(printSuccess ? `✅ Imprimé: ${product.name}` : '⚠️ Enregistré mais impression échouée');
            fetchData();
        } catch { toast.error('Erreur'); } finally { setPrinting(null); }
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setLabelPhoto(reader.result as string); reader.readAsDataURL(file); } };

    const handleSaveLabel = async () => {
        if (!selectedProduct) return;
        setUploading(true);
        try {
            const category = categories.find(c => c.id === selectedProduct.category_id);
            const dlcHours = customDlcHours || selectedProduct.dlc_hours_override || category?.dlc_hours || 72;
            const dlcDate = calculateSecondaryDlc(dlcHours);
            let photoUrl = null;
            if (labelPhoto) photoUrl = await uploadToKitchenStorage(KITCHEN_BUCKETS.TRACEABILITY_LABELS, labelPhoto, `label_${selectedProduct.id}_${Date.now()}`);
            await supabase.from('kitchen_traceability' as any).insert({ product_name: selectedProduct.name, batch_number: batchNumber || null, label_photo_url: photoUrl, dlc_hours: dlcHours, secondary_dlc: dlcDate.toISOString(), opened_by: 'Staff' } as any);
            if (category) {
                const storageTemp = `${category.storage_temp_min}°C à +${category.storage_temp_max}°C`;
                const actionLabel = category.slug === 'congele-decongele' ? 'Décongélation' : 'Ouverture';
                await printHACCPDirect({ productName: selectedProduct.name, categoryName: category.name, categoryColor: category.color, actionDate: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), dlcDate: dlcDate.toLocaleDateString('fr-FR') + ' ' + dlcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), storageTemp, operator: 'Staff', dlcHours, actionLabel });
            }
            toast.success(`✅ ${selectedProduct.name} enregistré!`);
            resetForm(); fetchData();
        } catch { toast.error('Erreur'); } finally { setUploading(false); }
    };

    const resetForm = () => { setShowNewLabel(false); setSelectedProduct(null); setBatchNumber(''); setLabelPhoto(null); setCustomDlcHours(null); };
    const markAsDisposed = async (record: TraceabilityRecord) => { await supabase.from('kitchen_traceability' as any).update({ is_disposed: true, disposed_at: new Date().toISOString(), disposed_reason: 'DLC dépassée' } as any).eq('id', record.id); setRecords(prev => prev.filter(r => r.id !== record.id)); toast.success('Produit jeté'); };
    const getCategoryIcon = (slug: string) => slug === 'congele-decongele' ? Snowflake : Leaf;

    // === FREEZER/CONGÉLATION FUNCTIONS ===

    const handleFreezerPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setFreezerPhoto(base64);

            // Call OCR.space API directly (FREE - 500/day)
            setOcrLoading(true);
            try {
                const formData = new FormData();
                formData.append('base64Image', base64);
                formData.append('language', 'fre');
                formData.append('isOverlayRequired', 'false');
                formData.append('OCREngine', '2');
                formData.append('scale', 'true');

                const response = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    headers: {
                        'apikey': 'K88888888888957', // Free demo key
                    },
                    body: formData
                });

                const ocrData = await response.json();
                console.log('OCR Response:', ocrData);

                if (ocrData.IsErroredOnProcessing) {
                    throw new Error(ocrData.ErrorMessage?.[0] || 'OCR failed');
                }

                const rawText = ocrData.ParsedResults?.[0]?.ParsedText || '';
                const data = parseOCRText(rawText);

                setOcrResult(data);
                setFreezerProductName(data.productName || '');
                setFreezerDlc(data.dlc || '');
                setFreezerLotNumber(data.lotNumber || '');
                setFreezerWeight(data.weight || '');
                setFreezerOrigin(data.origin || '');
                toast.success('✅ Étiquette analysée!');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } catch (err) {
                console.error('OCR Error:', err);
                toast.error('Erreur OCR - Entrez les données manuellement');
            } finally {
                setOcrLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // Parse OCR text to extract product info
    const parseOCRText = (text: string): OCRResult => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const result: OCRResult = { productName: '', dlc: '', lotNumber: '', origin: '', weight: '', rawText: text, confidence: 0.9 };

        // Date patterns
        const dateMatch = text.match(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);
        if (dateMatch) result.dlc = dateMatch[1];

        // Lot number
        const lotMatch = text.match(/(?:LOT|L)[:\s]*([A-Z0-9\-\.]+)/i);
        if (lotMatch) result.lotNumber = lotMatch[1];

        // Weight
        const weightMatch = text.match(/(\d+(?:[.,]\d+)?\s*(?:KG|G|ML|L))/i);
        if (weightMatch) result.weight = weightMatch[1];

        // Origin
        const originMatch = text.match(/(FRANCE|ITALIE|ESPAGNE|ALLEMAGNE|BELGIQUE|POLOGNE|IRLANDE)/i);
        if (originMatch) result.origin = originMatch[1];

        // Product name - find first descriptive line
        for (const line of lines) {
            if (line.length > 3 && line.length < 50 &&
                !line.match(/^(LOT|L:|DLC|DDM|ORIGINE|POIDS|\d)/i) &&
                !line.match(/^\d{1,2}[\/\-\.]/)) {
                result.productName = line;
                break;
            }
        }

        return result;
    };

    const handleSaveFreezerEntry = async () => {
        if (!freezerProductName.trim()) {
            toast.error('Veuillez entrer le nom du produit');
            return;
        }

        setUploading(true);
        try {
            // Upload photo if captured
            let photoUrl = null;
            if (freezerPhoto) {
                photoUrl = await uploadToKitchenStorage(KITCHEN_BUCKETS.TRACEABILITY_LABELS, freezerPhoto, `freezer_${Date.now()}`);
            }

            // Calculate expiry date (3 months from now)
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 3);

            // Save to database
            const { error } = await supabase.from('kitchen_freezer_entries' as any).insert({
                product_name: freezerProductName.trim(),
                original_dlc: freezerDlc || null,
                lot_number: freezerLotNumber || null,
                weight: freezerWeight || null,
                origin: freezerOrigin || null,
                original_label_photo_url: photoUrl,
                frozen_at: new Date().toISOString(),
                frozen_by: 'Staff',
                max_freeze_months: 3,
                expiry_date: expiryDate.toISOString().split('T')[0]
            } as any);

            if (error) throw error;

            // Print freezer label
            const printSuccess = await printFreezerLabel({
                productName: freezerProductName.trim(),
                frozenDate: new Date().toLocaleDateString('fr-FR'),
                originalDlc: freezerDlc || 'N/A',
                lotNumber: freezerLotNumber || 'N/A',
                weight: freezerWeight || '',
                expiryDate: expiryDate.toLocaleDateString('fr-FR'),
                operator: 'Staff'
            });

            toast.success(printSuccess ? `✅ ${freezerProductName} - Étiquette imprimée!` : '⚠️ Enregistré mais impression échouée');

            // Reset form and refresh
            resetFreezerForm();
            fetchData();
        } catch (err) {
            console.error('Save freezer entry error:', err);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setUploading(false);
        }
    };

    const resetFreezerForm = () => {
        setShowFreezerForm(false);
        setFreezerPhoto(null);
        setOcrResult(null);
        setFreezerProductName('');
        setFreezerDlc('');
        setFreezerLotNumber('');
        setFreezerWeight('');
        setFreezerOrigin('');
    };

    const removeFreezerEntry = async (entry: FreezerEntry) => {
        if (!confirm(`Retirer "${entry.product_name}" du congélateur?`)) return;
        await supabase.from('kitchen_freezer_entries' as any).update({ is_removed: true, removed_at: new Date().toISOString() } as any).eq('id', entry.id);
        setFreezerEntries(prev => prev.filter(e => e.id !== entry.id));
        toast.success('Produit retiré');
    };

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-amber-500 animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-white mb-2">Étiquettes HACCP</h2><p className="text-slate-400 text-sm">DLC secondaire automatique</p></div>

            {/* Main Tab Selector */}
            <Tabs value={mainTab} onValueChange={setMainTab}>
                <TabsList className="grid w-full grid-cols-2 h-auto bg-slate-800">
                    <TabsTrigger value="etiquettes" className="py-3 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <Tag className="w-4 h-4 mr-2" />Étiquettes
                    </TabsTrigger>
                    <TabsTrigger value="congelation" className="py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Snowflake className="w-4 h-4 mr-2" />Congélation
                    </TabsTrigger>
                </TabsList>

                {/* === ÉTIQUETTES TAB === */}
                <TabsContent value="etiquettes" className="mt-4 space-y-4">
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                        <TabsList className="grid w-full grid-cols-2 h-auto bg-slate-800/50">
                            {categories.map(cat => { const Icon = getCategoryIcon(cat.slug); return <TabsTrigger key={cat.slug} value={cat.slug} className="py-3 data-[state=active]:text-white" style={{ backgroundColor: activeCategory === cat.slug ? cat.color : undefined }}><Icon className="w-4 h-4 mr-2" />{cat.name}</TabsTrigger>; })}
                        </TabsList>
                        {categories.map(cat => (
                            <TabsContent key={cat.slug} value={cat.slug} className="mt-4">
                                <Card className="p-4 mb-4 bg-slate-800/50" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
                                    <div className="flex flex-wrap gap-4 text-sm"><div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>DLC: <strong>{cat.dlc_hours}h</strong></span></div><div className="flex items-center gap-2"><Tag className="w-4 h-4" /><span>Conservation: <strong>{cat.storage_temp_min}°C à +{cat.storage_temp_max}°C</strong></span></div></div>
                                </Card>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {getActiveProducts().map(product => {
                                        const dlcHours = product.dlc_hours_override || cat.dlc_hours;
                                        return <Button key={product.id} onClick={() => handleQuickPrint(product)} disabled={printing === product.id} className="h-24 flex flex-col items-center justify-center gap-2 text-white font-bold shadow-lg hover:scale-105 transition-all" style={{ backgroundColor: cat.color }}>{printing === product.id ? <Printer className="w-6 h-6 animate-pulse" /> : <><span className="text-sm text-center leading-tight">{product.name}</span><Badge variant="secondary" className="text-[10px] bg-white/20">+{dlcHours}h</Badge></>}</Button>;
                                    })}
                                    <Button variant="outline" onClick={() => { const c = getActiveCategory(); if (c) { setSelectedProduct({ id: 'custom', category_id: c.id, name: '', dlc_hours_override: null }); setCustomDlcHours(c.dlc_hours); setShowNewLabel(true); } }} className="h-24 border-2 border-dashed border-slate-600 text-slate-400 hover:text-white"><Plus className="w-6 h-6" /></Button>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>

                    {records.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Produits ouverts ({records.length})</h3>
                            {records.map(record => {
                                const dlcDate = new Date(record.secondary_dlc);
                                const hoursRemaining = Math.max(0, (dlcDate.getTime() - Date.now()) / (1000 * 60 * 60));
                                const isExpiringSoon = hoursRemaining <= 24;
                                const isExpired = hoursRemaining <= 0;
                                return (
                                    <Card key={record.id} className={`p-3 ${isExpired ? 'bg-red-600/20 border-red-500' : isExpiringSoon ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-800/50 border-slate-700'}`}>
                                        <div className="flex items-center justify-between">
                                            <div><h4 className="text-white font-medium">{record.product_name}</h4><div className="flex items-center gap-2 text-sm text-slate-400 mt-1"><Calendar className="h-3 w-3" /><span>DLC: {dlcDate.toLocaleDateString('fr-FR')} {dlcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div></div>
                                            <div className="flex items-center gap-2">{isExpired ? <Badge variant="destructive">PÉRIMÉ</Badge> : isExpiringSoon ? <Badge className="bg-amber-600">{Math.round(hoursRemaining)}h</Badge> : <Badge variant="secondary">{Math.round(hoursRemaining)}h</Badge>}<Button variant="ghost" size="icon" onClick={() => markAsDisposed(record)} className="text-red-400 hover:text-red-300"><X className="h-5 w-5" /></Button></div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* === CONGÉLATION TAB === */}
                <TabsContent value="congelation" className="mt-4 space-y-4">
                    {/* Add Freezer Entry Button */}
                    {!showFreezerForm && (
                        <Button
                            onClick={() => setShowFreezerForm(true)}
                            className="w-full h-20 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-lg font-bold shadow-lg"
                        >
                            <Camera className="w-6 h-6 mr-3" />
                            Scanner Étiquette Origine
                        </Button>
                    )}

                    {/* Freezer Form */}
                    {showFreezerForm && (
                        <Card className="bg-slate-800/80 border-blue-500/50 border-2">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Snowflake className="w-5 h-5 text-blue-400" />
                                        Mise en Congélation
                                    </h3>
                                    <Button variant="ghost" size="icon" onClick={resetFreezerForm} className="text-slate-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Photo Capture */}
                                <div>
                                    <input
                                        ref={freezerPhotoInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleFreezerPhotoCapture}
                                        className="hidden"
                                    />

                                    {freezerPhoto ? (
                                        <div className="relative">
                                            <img src={freezerPhoto} alt="Label" className="w-full h-40 object-cover rounded-xl border-2 border-blue-500" />
                                            {ocrLoading && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
                                                    <div className="text-center">
                                                        <ScanText className="w-10 h-10 text-blue-400 animate-pulse mx-auto mb-2" />
                                                        <p className="text-white">Analyse OCR...</p>
                                                    </div>
                                                </div>
                                            )}
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setFreezerPhoto(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => freezerPhotoInputRef.current?.click()}
                                            className="w-full h-24 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Camera className="w-8 h-8" />
                                                <span className="text-lg font-bold">📸 Photographier l'étiquette</span>
                                            </div>
                                        </Button>
                                    )}
                                </div>

                                {/* OCR Confidence Badge */}
                                {ocrResult && (
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-green-600">
                                            ✓ OCR: {Math.round(ocrResult.confidence * 100)}% confiance
                                        </Badge>
                                        <span className="text-xs text-slate-400">Vérifiez et corrigez si nécessaire</span>
                                    </div>
                                )}

                                {/* Extracted/Manual Fields */}
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-slate-300 flex items-center gap-1">
                                            Nom du produit *
                                            {ocrResult?.productName && <Edit3 className="w-3 h-3 text-blue-400" />}
                                        </Label>
                                        <Input
                                            value={freezerProductName}
                                            onChange={(e) => setFreezerProductName(e.target.value)}
                                            placeholder="Viande hachée 20%..."
                                            className="bg-slate-900 border-slate-600 text-white h-12"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-slate-300">DLC Origine</Label>
                                            <Input
                                                value={freezerDlc}
                                                onChange={(e) => setFreezerDlc(e.target.value)}
                                                placeholder="01/02/2026"
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">N° Lot</Label>
                                            <Input
                                                value={freezerLotNumber}
                                                onChange={(e) => setFreezerLotNumber(e.target.value)}
                                                placeholder="L123456"
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-slate-300">Poids</Label>
                                            <Input
                                                value={freezerWeight}
                                                onChange={(e) => setFreezerWeight(e.target.value)}
                                                placeholder="1kg"
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Origine</Label>
                                            <Input
                                                value={freezerOrigin}
                                                onChange={(e) => setFreezerOrigin(e.target.value)}
                                                placeholder="France"
                                                className="bg-slate-900 border-slate-600 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Info Card */}
                                <Card className="bg-blue-600/20 border-blue-500/50 p-3">
                                    <div className="flex items-center gap-2 text-blue-300 text-sm">
                                        <Snowflake className="w-4 h-4" />
                                        <span>Conservation: <strong>-18°C</strong> | Validité: <strong>3 mois max</strong></span>
                                    </div>
                                </Card>

                                {/* Submit Button */}
                                <Button
                                    onClick={handleSaveFreezerEntry}
                                    disabled={!freezerProductName.trim() || uploading || ocrLoading}
                                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                    ) : (
                                        <Printer className="w-5 h-5 mr-2" />
                                    )}
                                    Imprimer Étiquette Congélation
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Freezer Entries List */}
                    {freezerEntries.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                <Snowflake className="w-4 h-4 text-blue-400" />
                                Au congélateur ({freezerEntries.length})
                            </h3>
                            {freezerEntries.map(entry => {
                                const expiryDate = entry.expiry_date ? new Date(entry.expiry_date) : null;
                                const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                const isExpiringSoon = daysRemaining !== null && daysRemaining <= 14;
                                const isExpired = daysRemaining !== null && daysRemaining <= 0;

                                return (
                                    <Card key={entry.id} className={`p-3 ${isExpired ? 'bg-red-600/20 border-red-500' : isExpiringSoon ? 'bg-amber-600/20 border-amber-500' : 'bg-blue-600/10 border-blue-500/30'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-white font-medium">{entry.product_name}</h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                    <span>🧊 {new Date(entry.frozen_at).toLocaleDateString('fr-FR')}</span>
                                                    {entry.weight && <span>{entry.weight}</span>}
                                                    {entry.lot_number && <span>Lot: {entry.lot_number}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isExpired ? (
                                                    <Badge variant="destructive">EXPIRÉ</Badge>
                                                ) : daysRemaining !== null ? (
                                                    <Badge className={isExpiringSoon ? 'bg-amber-600' : 'bg-blue-600'}>{daysRemaining}j</Badge>
                                                ) : null}
                                                <Button variant="ghost" size="icon" onClick={() => removeFreezerEntry(entry)} className="text-red-400 hover:text-red-300">
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* New Label Modal (existing) */}
            {showNewLabel && selectedProduct && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-slate-900/80"><div className="flex items-center gap-3"><Tag className="h-6 w-6 text-amber-500" /><span className="text-xl font-bold text-white">Nouvelle Étiquette</span></div><Button variant="ghost" size="icon" onClick={resetForm} className="text-white hover:bg-slate-800"><X className="h-6 w-6" /></Button></div>
                    <div className="flex-1 p-4 overflow-auto">
                        <div className="max-w-md mx-auto space-y-4">
                            {selectedProduct.id === 'custom' && <div className="space-y-2"><Label className="text-slate-300">Nom du produit *</Label><Input value={selectedProduct.name} onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })} placeholder="Mozzarella" className="bg-slate-900 border-slate-600 text-white h-12" /></div>}
                            <div className="space-y-2"><Label className="text-slate-300">N° de lot</Label><Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="LOT2026012201" className="bg-slate-900 border-slate-600 text-white h-12" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">Durée DLC (heures)</Label><div className="flex gap-2">{[24, 48, 72, 96].map(h => <Button key={h} variant={customDlcHours === h ? 'default' : 'outline'} onClick={() => setCustomDlcHours(h)} className={customDlcHours === h ? 'bg-amber-600' : 'border-slate-600 text-slate-300'}>{h}h</Button>)}</div><p className="text-xs text-slate-500">DLC: {customDlcHours && calculateSecondaryDlc(customDlcHours).toLocaleString('fr-FR')}</p></div>
                            <div className="space-y-2"><Label className="text-slate-300 flex items-center gap-2"><Camera className="h-4 w-4" />Photo étiquette</Label><input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />{labelPhoto ? <div className="relative"><img src={labelPhoto} alt="Étiquette" className="w-full h-32 object-cover rounded-lg border-2 border-amber-500" /><Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setLabelPhoto(null)}><X className="h-4 w-4" /></Button></div> : <Button variant="outline" className="w-full h-16 border-dashed border-2 border-slate-600 text-slate-400" onClick={() => photoInputRef.current?.click()}><Camera className="mr-2 h-5 w-5" />Photo étiquette origine</Button>}</div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/80 flex gap-3"><Button variant="outline" onClick={resetForm} disabled={uploading} className="flex-1 h-14 border-slate-600 text-slate-300">Annuler</Button><Button onClick={handleSaveLabel} disabled={uploading || (selectedProduct.id === 'custom' && !selectedProduct.name)} className="flex-1 h-14 bg-amber-600 hover:bg-amber-700 text-white">{uploading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}Imprimer</Button></div>
                </div>
            )}
        </div>
    );
}

export default TraceabilityTab;
