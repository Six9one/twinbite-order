import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Package, Camera, FileText, Thermometer, Check, X, Trash2, Calendar, RefreshCw, Clock } from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';

interface ReceptionLog { id: string; supplier_name: string; invoice_photo_url: string | null; delivery_photo_url: string | null; temp_on_receipt: number | null; status: string; notes: string | null; received_at: string; received_by: string | null; }

export function ReceptionTab() {
    const [receptions, setReceptions] = useState<ReceptionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [notes, setNotes] = useState('');
    const [tempOnReceipt, setTempOnReceipt] = useState('');
    const [invoicePhoto, setInvoicePhoto] = useState<string | null>(null);
    const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null);
    const deliveryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchReceptions(); }, []);

    const fetchReceptions = async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('kitchen_reception_logs' as any).select('*').gte('received_at', `${today}T00:00:00`).order('received_at', { ascending: false });
        if (data) setReceptions(data as unknown as ReceptionLog[]);
        setLoading(false);
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, setPhoto: (p: string | null) => void) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setPhoto(reader.result as string); reader.readAsDataURL(file); }
    };

    const handleSave = async () => {
        if (!supplierName.trim()) { toast.error('Nom fournisseur requis'); return; }
        if (!invoicePhoto || !deliveryPhoto) { toast.error('2 photos obligatoires'); return; }
        setUploading(true);
        try {
            const ts = Date.now();
            const invoiceUrl = await uploadToKitchenStorage(KITCHEN_BUCKETS.INVOICES_FACTURES, invoicePhoto, `invoice_${ts}`);
            const deliveryUrl = await uploadToKitchenStorage(KITCHEN_BUCKETS.DELIVERY_PROOFS, deliveryPhoto, `delivery_${ts}`);
            if (!invoiceUrl || !deliveryUrl) throw new Error('Upload failed');
            const { data, error } = await supabase.from('kitchen_reception_logs' as any).insert({ supplier_name: supplierName.trim(), invoice_photo_url: invoiceUrl, delivery_photo_url: deliveryUrl, temp_on_receipt: tempOnReceipt ? parseFloat(tempOnReceipt) : null, notes: notes.trim() || null, received_by: 'Staff', status: 'received' } as any).select().single();
            if (error) throw error;
            setReceptions(prev => [data as unknown as ReceptionLog, ...prev]);
            resetForm();
            toast.success('✅ Réception enregistrée!');
        } catch { toast.error('Erreur enregistrement'); } finally { setUploading(false); }
    };

    const resetForm = () => { setSupplierName(''); setNotes(''); setTempOnReceipt(''); setInvoicePhoto(null); setDeliveryPhoto(null); setIsAdding(false); };

    const handleDelete = async (id: string) => { const { error } = await supabase.from('kitchen_reception_logs' as any).delete().eq('id', id); if (!error) { setReceptions(prev => prev.filter(r => r.id !== id)); toast.success('Supprimé'); } };

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-green-500 animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-white">Réception Marchandises</h2><p className="text-slate-400 text-sm">Photographiez factures et livraisons</p></div>
                {!isAdding && <Button onClick={() => setIsAdding(true)} className="bg-green-600 hover:bg-green-700"><Package className="mr-2 h-5 w-5" />Nouvelle Livraison</Button>}
            </div>

            {isAdding && (
                <Card className="bg-slate-800 border-green-500/30">
                    <CardHeader className="pb-3"><CardTitle className="text-white text-lg flex items-center gap-2"><Package className="h-5 w-5 text-green-500" />Nouvelle Réception</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label className="text-slate-300">Fournisseur *</Label><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Metro, Transgourmet..." className="bg-slate-900 border-slate-600 text-white h-12" /></div>
                        <div className="space-y-2"><Label className="text-slate-300 flex items-center gap-2"><Thermometer className="h-4 w-4" />Température (°C)</Label><Input type="number" step="0.1" value={tempOnReceipt} onChange={e => setTempOnReceipt(e.target.value)} placeholder="3.5" className="bg-slate-900 border-slate-600 text-white h-12" /></div>
                        <input ref={invoiceInputRef} type="file" accept="image/*" capture="environment" onChange={e => handlePhotoCapture(e, setInvoicePhoto)} className="hidden" />
                        <input ref={deliveryInputRef} type="file" accept="image/*" capture="environment" onChange={e => handlePhotoCapture(e, setDeliveryPhoto)} className="hidden" />
                        <div className="space-y-2"><Label className="text-slate-300 flex items-center gap-2"><FileText className="h-4 w-4" />Photo Facture *{!invoicePhoto && <Badge variant="destructive" className="text-xs">Obligatoire</Badge>}</Label>
                            {invoicePhoto ? <div className="relative"><img src={invoicePhoto} alt="Facture" className="w-full h-32 object-cover rounded-lg border-2 border-green-500" /><Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setInvoicePhoto(null)}><X className="h-4 w-4" /></Button></div>
                                : <Button variant="outline" className="w-full h-24 border-dashed border-2 border-red-500/50 text-slate-400" onClick={() => invoiceInputRef.current?.click()}><Camera className="mr-2 h-8 w-8" />📄 FACTURE</Button>}
                        </div>
                        <div className="space-y-2"><Label className="text-slate-300 flex items-center gap-2"><Package className="h-4 w-4" />Photo Marchandise *{!deliveryPhoto && <Badge variant="destructive" className="text-xs">Obligatoire</Badge>}</Label>
                            {deliveryPhoto ? <div className="relative"><img src={deliveryPhoto} alt="Marchandise" className="w-full h-32 object-cover rounded-lg border-2 border-green-500" /><Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setDeliveryPhoto(null)}><X className="h-4 w-4" /></Button></div>
                                : <Button variant="outline" className="w-full h-24 border-dashed border-2 border-red-500/50 text-slate-400" onClick={() => deliveryInputRef.current?.click()}><Camera className="mr-2 h-8 w-8" />📦 MARCHANDISE</Button>}
                        </div>
                        <div className="space-y-2"><Label className="text-slate-300">Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques..." className="bg-slate-900 border-slate-600 text-white h-12" /></div>
                        <div className="flex gap-3 pt-2"><Button variant="outline" onClick={resetForm} disabled={uploading} className="flex-1 h-14 border-slate-600 text-slate-300"><X className="mr-2 h-5 w-5" />Annuler</Button><Button onClick={handleSave} disabled={uploading || !supplierName || !invoicePhoto || !deliveryPhoto} className="flex-1 h-14 bg-green-600 hover:bg-green-700">{uploading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}Enregistrer</Button></div>
                    </CardContent>
                </Card>
            )}

            {receptions.length === 0 && !isAdding ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-600"><Package className="h-16 w-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400 text-lg">Aucune réception aujourd'hui</p></div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" />Réceptions ({receptions.length})</h3>
                    {receptions.map(r => (
                        <Card key={r.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex gap-2 flex-shrink-0">{r.delivery_photo_url && <img src={r.delivery_photo_url} alt="Marchandise" className="w-16 h-16 object-cover rounded-lg border border-slate-600" />}{r.invoice_photo_url && <img src={r.invoice_photo_url} alt="Facture" className="w-16 h-16 object-cover rounded-lg border border-green-600/50" />}</div>
                                    <div className="flex-1 min-w-0"><h4 className="text-white font-medium truncate">{r.supplier_name}</h4><div className="flex items-center gap-3 text-slate-400 text-sm mt-1"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>{r.temp_on_receipt !== null && <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{r.temp_on_receipt}°C</span>}</div>{r.notes && <p className="text-slate-500 text-sm mt-1 truncate">{r.notes}</p>}</div>
                                    <div className="flex items-center gap-2"><Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Reçu</Badge><Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => handleDelete(r.id)}><Trash2 className="h-5 w-5" /></Button></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ReceptionTab;
