import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Package,
  Camera,
  FileText,
  Thermometer,
  Check,
  X,
  Trash2,
  Calendar,
  RefreshCw,
  Clock,
  ShoppingBag,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';
import { getPendingOrdersHistory } from '@/lib/coursesService';

interface ReceptionLog {
  id: string;
  supplier_name: string;
  invoice_photo_url: string | null;
  delivery_photo_url: string | null;
  temp_on_receipt: number | null;
  status: string;
  notes: string | null;
  received_at: string;
  received_by: string | null;
}

export function ReceptionTab() {
  const [receptions, setReceptions] = useState<ReceptionLog[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [tempOnReceipt, setTempOnReceipt] = useState('');
  const [invoicePhoto, setInvoicePhoto] = useState<string | null>(null);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);

  // Selected pending order to check
  const [selectedPendingOrder, setSelectedPendingOrder] = useState<any | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const deliveryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReceptions();
    loadPendingOrders();
  }, []);

  const loadPendingOrders = () => {
    const orders = getPendingOrdersHistory();
    setPendingOrders(orders);
  };

  const fetchReceptions = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('kitchen_reception_logs' as any)
      .select('*')
      .gte('received_at', `${today}T00:00:00`)
      .order('received_at', { ascending: false });
    if (data) setReceptions(data as unknown as ReceptionLog[]);
    setLoading(false);
  };

  const handlePhotoCapture = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPhoto: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startReconcileOrder = (order: any) => {
    setSelectedPendingOrder(order);
    setSupplierName(order.supplier_name || 'KFA DISTRIBUTION');
    const initialChecked: Record<string, boolean> = {};
    (order.items_json || []).forEach((item: any) => {
      initialChecked[item.id] = true; // Default checked
    });
    setCheckedItems(initialChecked);
    setIsAdding(true);
  };

  const toggleItemChecked = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSave = async () => {
    if (!supplierName.trim()) {
      toast.error('Nom fournisseur requis');
      return;
    }
    if (!invoicePhoto || !deliveryPhoto) {
      toast.error('2 photos obligatoires (Facture & Marchandise)');
      return;
    }
    setUploading(true);
    try {
      const ts = Date.now();
      const invoiceUrl = await uploadToKitchenStorage(
        KITCHEN_BUCKETS.INVOICES_FACTURES,
        invoicePhoto,
        `invoice_${ts}`
      );
      const deliveryUrl = await uploadToKitchenStorage(
        KITCHEN_BUCKETS.DELIVERY_PROOFS,
        deliveryPhoto,
        `delivery_${ts}`
      );
      if (!invoiceUrl || !deliveryUrl) throw new Error('Upload failed');

      let finalNotes = notes.trim();
      if (selectedPendingOrder && selectedPendingOrder.items_json) {
        const unchecked = selectedPendingOrder.items_json.filter(
          (i: any) => !checkedItems[i.id]
        );
        if (unchecked.length > 0) {
          const missingStr = unchecked.map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
          finalNotes = `⚠️ Articles manquants: ${missingStr}. ${finalNotes}`.trim();
        }
      }

      const { data, error } = await supabase
        .from('kitchen_reception_logs' as any)
        .insert({
          supplier_name: supplierName.trim(),
          invoice_photo_url: invoiceUrl,
          delivery_photo_url: deliveryUrl,
          temp_on_receipt: tempOnReceipt ? parseFloat(tempOnReceipt) : null,
          notes: finalNotes || null,
          received_by: 'Staff Cuisine',
          status: 'received',
        } as any)
        .select()
        .single();

      if (error) throw error;
      setReceptions((prev) => [data as unknown as ReceptionLog, ...prev]);

      // Remove from pending orders list if linked
      if (selectedPendingOrder) {
        const remaining = pendingOrders.filter((o) => o.id !== selectedPendingOrder.id);
        localStorage.setItem('twinpizza_sent_orders_history', JSON.stringify(remaining));
        setPendingOrders(remaining);
      }

      resetForm();
      toast.success('✅ Réception validée et enregistrée !');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setNotes('');
    setTempOnReceipt('');
    setInvoicePhoto(null);
    setDeliveryPhoto(null);
    setSelectedPendingOrder(null);
    setCheckedItems({});
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('kitchen_reception_logs' as any)
      .delete()
      .eq('id', id);
    if (!error) {
      setReceptions((prev) => prev.filter((r) => r.id !== id));
      toast.success('Supprimé');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Direct Link to /courses */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Réception Marchandises
          </h2>
          <p className="text-slate-400 text-xs">
            Contrôle livraison, pointage et archivage factures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/courses"
            className="flex-1 sm:flex-initial h-11 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Faire les Courses (/courses)</span>
          </a>

          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700"
            >
              + Nouvelle Livraison
            </Button>
          )}
        </div>
      </div>

      {/* Pending Orders Waiting for Delivery */}
      {pendingOrders.length > 0 && !isAdding && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Commandes en attente de livraison ({pendingOrders.length})
          </h3>
          <div className="grid gap-2">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">
                      {order.supplier_name}
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                      {(order.items_json || []).length} articles
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Commandé le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    {order.requested_delivery_date && ` • Souhaité: ${order.requested_delivery_date}`}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => startReconcileOrder(order)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex-shrink-0"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Pointer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adding / Reconciling Form */}
      {isAdding && (
        <Card className="bg-slate-900 border-emerald-500/40 rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-white text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-400" />
                {selectedPendingOrder ? 'Pointage Livraison Commande' : 'Nouvelle Réception'}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* If reconciling a pending order, show checklist */}
            {selectedPendingOrder && selectedPendingOrder.items_json && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Articles commandés (Cochez ce qui est reçu)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {Object.values(checkedItems).filter(Boolean).length} /{' '}
                    {selectedPendingOrder.items_json.length} reçus
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedPendingOrder.items_json.map((item: any) => {
                    const isChecked = checkedItems[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItemChecked(item.id)}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isChecked
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                            : 'bg-red-950/30 border-red-500/50 text-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate">{item.name}</span>
                        </div>
                        <span
                          className={`text-xs font-bold flex-shrink-0 ${
                            isChecked ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Fournisseur *</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="KFA, Metro, Transgourmet..."
                  className="bg-slate-950 border-slate-700 text-white h-11 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-emerald-400" />
                  Température à réception (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tempOnReceipt}
                  onChange={(e) => setTempOnReceipt(e.target.value)}
                  placeholder="Ex: 3.5"
                  className="bg-slate-950 border-slate-700 text-white h-11 text-xs"
                />
              </div>
            </div>

            <input
              ref={invoiceInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoCapture(e, setInvoicePhoto)}
              className="hidden"
            />
            <input
              ref={deliveryInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoCapture(e, setDeliveryPhoto)}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo Facture */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    Photo Facture *
                  </span>
                  {!invoicePhoto && (
                    <span className="text-[10px] text-red-400 font-semibold">Obligatoire</span>
                  )}
                </Label>
                {invoicePhoto ? (
                  <div className="relative">
                    <img
                      src={invoicePhoto}
                      alt="Facture"
                      className="w-full h-32 object-cover rounded-xl border-2 border-emerald-500"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg"
                      onClick={() => setInvoicePhoto(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 border-dashed border-2 border-slate-700 hover:border-emerald-500 text-slate-400 rounded-xl flex flex-col items-center justify-center gap-1.5"
                    onClick={() => invoiceInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-emerald-400" />
                    <span className="text-xs font-semibold">Prendre la Facture</span>
                  </Button>
                )}
              </div>

              {/* Photo Marchandise */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-400" />
                    Photo Marchandise *
                  </span>
                  {!deliveryPhoto && (
                    <span className="text-[10px] text-red-400 font-semibold">Obligatoire</span>
                  )}
                </Label>
                {deliveryPhoto ? (
                  <div className="relative">
                    <img
                      src={deliveryPhoto}
                      alt="Marchandise"
                      className="w-full h-32 object-cover rounded-xl border-2 border-emerald-500"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-lg"
                      onClick={() => setDeliveryPhoto(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 border-dashed border-2 border-slate-700 hover:border-emerald-500 text-slate-400 rounded-xl flex flex-col items-center justify-center gap-1.5"
                    onClick={() => deliveryInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-emerald-400" />
                    <span className="text-xs font-semibold">Prendre la Marchandise</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Notes / Remarques</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: DLC courte sur la mozza, 1 carton manquant..."
                className="bg-slate-950 border-slate-700 text-white h-11 text-xs"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={uploading}
                className="flex-1 h-12 border-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={uploading || !supplierName || !invoicePhoto || !deliveryPhoto}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-xs text-white"
              >
                {uploading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Valider la Réception
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      {receptions.length === 0 && !isAdding ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-semibold">Aucune réception aujourd'hui</p>
          <p className="text-slate-500 text-xs mt-1">
            Les réceptions du jour s'afficheront ici après validation.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Réceptions du jour ({receptions.length})
          </h3>
          {receptions.map((r) => (
            <Card key={r.id} className="bg-slate-900 border-slate-800 rounded-2xl">
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex gap-1.5 flex-shrink-0">
                    {r.delivery_photo_url && (
                      <img
                        src={r.delivery_photo_url}
                        alt="Marchandise"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                      />
                    )}
                    {r.invoice_photo_url && (
                      <img
                        src={r.invoice_photo_url}
                        alt="Facture"
                        className="w-14 h-14 object-cover rounded-xl border border-emerald-600/50"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm truncate">{r.supplier_name}</h4>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.received_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {r.temp_on_receipt !== null && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Thermometer className="h-3 w-3" />
                          {r.temp_on_receipt}°C
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{r.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-600 text-white text-[10px] py-0.5">
                      <Check className="w-3 h-3 mr-1" />
                      Reçu
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
