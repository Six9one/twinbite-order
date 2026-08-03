import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/hooks/useSupabaseData';
import {
    Search, Printer, Download, RefreshCw, Clock, ChefHat, CheckCircle, XCircle,
    Package, Ban, CreditCard, Banknote, Globe, TrendingUp, ShoppingBag, Receipt,
} from 'lucide-react';

const PRINT_SERVER = 'http://localhost:3001';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
    preparing: { label: 'En préparation', color: 'bg-blue-500', icon: ChefHat },
    ready: { label: 'Prêt', color: 'bg-green-500', icon: Package },
    completed: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
    cancelled: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
};

const paymentConfig: Record<string, { label: string; icon: any; color: string }> = {
    en_ligne: { label: 'En ligne', icon: Globe, color: 'bg-violet-100 text-violet-700 border-violet-200' },
    cb: { label: 'CB', icon: CreditCard, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    especes: { label: 'Espèces', icon: Banknote, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

type RangePreset = 'today' | '7d' | '30d' | 'month';

function rangeFor(preset: RangePreset): { start: Date; end: Date } {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (preset === '7d') start.setDate(start.getDate() - 6);
    if (preset === '30d') start.setDate(start.getDate() - 29);
    if (preset === 'month') start.setDate(1);
    return { start, end };
}

const eur = (n: number) => `${Number(n || 0).toFixed(2).replace('.', ',')} €`;

export function OrdersManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState<RangePreset>('today');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [selected, setSelected] = useState<Order | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const { start, end } = rangeFor(preset);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[OrdersManager]', error);
            toast.error('Erreur de chargement');
        } else {
            setOrders((data as Order[]) || []);
        }
        setLoading(false);
    }, [preset]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Live updates so the kitchen screen and this list never disagree.
    useEffect(() => {
        const channel = supabase
            .channel('orders-manager-' + Date.now())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchOrders]);

    const filtered = useMemo(() => orders.filter((o) => {
        const q = search.trim().toLowerCase();
        const matchesSearch = !q
            || o.order_number.toLowerCase().includes(q)
            || (o.customer_name || '').toLowerCase().includes(q)
            || (o.customer_phone || '').includes(q);
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesPayment = paymentFilter === 'all' || o.payment_method === paymentFilter;
        return matchesSearch && matchesStatus && matchesPayment;
    }), [orders, search, statusFilter, paymentFilter]);

    // Cancelled orders still exist as records but must not inflate revenue.
    const stats = useMemo(() => {
        const billable = filtered.filter((o) => o.status !== 'cancelled');
        const revenue = billable.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const byPayment = billable.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
            const key = o.payment_method || 'autre';
            acc[key] = acc[key] || { count: 0, total: 0 };
            acc[key].count += 1;
            acc[key].total += Number(o.total || 0);
            return acc;
        }, {});
        return {
            revenue,
            count: billable.length,
            average: billable.length ? revenue / billable.length : 0,
            byPayment,
            paidOnline: billable.filter((o) => o.payment_status === 'Paid').length,
        };
    }, [filtered]);

    const handlePrint = async (order: Order) => {
        setPrintingId(order.id);
        try {
            const res = await fetch(`${PRINT_SERVER}/reprint/${encodeURIComponent(order.order_number)}`, { method: 'POST' });
            if (!res.ok) throw new Error(String(res.status));
            toast.success(`Ticket #${order.order_number} envoyé aux imprimantes`);
        } catch {
            toast.error("Imprimante injoignable — le TwinPizza Hub est-il lancé ?");
        } finally {
            setPrintingId(null);
        }
    };

    // Orders are never deleted: French bookkeeping rules require keeping them.
    const handleCancel = async () => {
        if (!cancelTarget || !cancelReason.trim()) return;
        const stamp = new Date().toLocaleString('fr-FR');
        const note = `[ANNULÉ ${stamp}] ${cancelReason.trim()}`;
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                customer_notes: cancelTarget.customer_notes ? `${cancelTarget.customer_notes}\n${note}` : note,
                updated_at: new Date().toISOString(),
            })
            .eq('id', cancelTarget.id);

        if (error) {
            toast.error("Échec de l'annulation");
        } else {
            toast.success(`Commande #${cancelTarget.order_number} annulée`);
            setCancelTarget(null);
            setCancelReason('');
            fetchOrders();
        }
    };

    const exportCsv = () => {
        const head = ['Numero', 'Date', 'Heure', 'Client', 'Telephone', 'Type', 'Statut',
            'Paiement', 'Statut paiement', 'Transaction', 'Sous-total HT', 'TVA', 'Total TTC'];
        const rows = filtered.map((o) => {
            const d = new Date(o.created_at);
            return [
                o.order_number,
                d.toLocaleDateString('fr-FR'),
                d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                o.customer_name, o.customer_phone, o.order_type, o.status,
                o.payment_method, o.payment_status || '', o.transaction_id || '',
                Number(o.subtotal || 0).toFixed(2), Number(o.tva || 0).toFixed(2), Number(o.total || 0).toFixed(2),
            ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';');
        });
        // BOM so Excel opens accented characters correctly
        const blob = new Blob(['﻿' + [head.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(`${filtered.length} commandes exportées`);
    };

    const presets: { key: RangePreset; label: string }[] = [
        { key: 'today', label: "Aujourd'hui" },
        { key: '7d', label: '7 jours' },
        { key: '30d', label: '30 jours' },
        { key: 'month', label: 'Ce mois' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {presets.map((p) => (
                    <Button key={p.key} size="sm" variant={preset === p.key ? 'default' : 'outline'}
                        onClick={() => setPreset(p.key)}>{p.label}</Button>
                ))}
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading} className="gap-1.5">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={eur(stats.revenue)} />
                <StatCard icon={ShoppingBag} label="Commandes" value={String(stats.count)} />
                <StatCard icon={Receipt} label="Panier moyen" value={eur(stats.average)} />
                <StatCard icon={Globe} label="Payées en ligne" value={String(stats.paidOnline)} />
            </div>

            <Card className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Nom, téléphone ou n° de commande"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <FilterSelect value={statusFilter} onChange={setStatusFilter}
                        options={[['all', 'Tous les statuts'], ...Object.entries(statusConfig).map(([k, v]) => [k, v.label] as [string, string])]} />
                    <FilterSelect value={paymentFilter} onChange={setPaymentFilter}
                        options={[['all', 'Tous les paiements'], ...Object.entries(paymentConfig).map(([k, v]) => [k, v.label] as [string, string])]} />
                </div>

                {Object.keys(stats.byPayment).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                        {Object.entries(stats.byPayment).map(([method, v]) => {
                            const cfg = paymentConfig[method];
                            return (
                                <span key={method} className={`text-xs px-2.5 py-1 rounded-md border ${cfg?.color || 'bg-muted'}`}>
                                    {cfg?.label || method} : <strong>{eur(v.total)}</strong> ({v.count})
                                </span>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Card className="divide-y">
                {loading ? (
                    <p className="p-8 text-center text-muted-foreground">Chargement…</p>
                ) : filtered.length === 0 ? (
                    <p className="p-8 text-center text-muted-foreground">Aucune commande</p>
                ) : filtered.map((order) => {
                    const st = statusConfig[order.status] || statusConfig.pending;
                    const pay = paymentConfig[order.payment_method];
                    const isPaidOnline = order.payment_method === 'en_ligne' && order.payment_status === 'Paid';
                    return (
                        <div key={order.id} className="p-3 hover:bg-muted/40 cursor-pointer flex items-center gap-3 flex-wrap"
                            onClick={() => setSelected(order)}>
                            <span className="font-mono font-bold w-16">#{order.order_number}</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{order.customer_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(order.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {' · '}{order.customer_phone}
                                </p>
                            </div>
                            {isPaidOnline && (
                                <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded tracking-wider">
                                    PAYÉ EN LIGNE
                                </span>
                            )}
                            {pay && <Badge variant="outline" className={pay.color}>{pay.label}</Badge>}
                            <Badge className={`${st.color} text-white`}>{st.label}</Badge>
                            <span className="font-bold w-20 text-right">{eur(order.total)}</span>
                            <Button size="sm" variant="ghost" disabled={printingId === order.id}
                                onClick={(e) => { e.stopPropagation(); handlePrint(order); }}>
                                <Printer className={`w-4 h-4 ${printingId === order.id ? 'animate-pulse' : ''}`} />
                            </Button>
                        </div>
                    );
                })}
            </Card>

            <OrderDetailDialog
                order={selected}
                onClose={() => setSelected(null)}
                onPrint={handlePrint}
                onCancel={(o) => { setSelected(null); setCancelTarget(o); }}
            />

            <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(''); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Annuler la commande #{cancelTarget?.order_number}</DialogTitle>
                        <DialogDescription>
                            La commande est conservée en base — elle passe simplement en « Annulé » et sort du chiffre d'affaires.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea placeholder="Motif de l'annulation (obligatoire)" value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)} rows={3} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Retour</Button>
                        <Button variant="destructive" disabled={!cancelReason.trim()} onClick={handleCancel} className="gap-1.5">
                            <Ban className="w-4 h-4" /> Confirmer l'annulation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </Card>
    );
}

function FilterSelect({ value, onChange, options }: {
    value: string; onChange: (v: string) => void; options: [string, string][];
}) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm">
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    );
}

function OrderDetailDialog({ order, onClose, onPrint, onCancel }: {
    order: Order | null;
    onClose: () => void;
    onPrint: (o: Order) => void;
    onCancel: (o: Order) => void;
}) {
    if (!order) return null;
    const isPaidOnline = order.payment_method === 'en_ligne' && order.payment_status === 'Paid';
    const items = Array.isArray(order.items) ? order.items : [];

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Commande #{order.order_number}
                        {isPaidOnline && (
                            <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded tracking-wider">
                                PAYÉ EN LIGNE
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                    <Row label="Client" value={order.customer_name} />
                    <Row label="Téléphone" value={order.customer_phone} />
                    {order.customer_address && <Row label="Adresse" value={order.customer_address} />}
                    <Row label="Type" value={order.order_type} />
                    <Row label="Date" value={new Date(order.created_at).toLocaleString('fr-FR')} />

                    <Separator />
                    <p className="font-semibold">Articles</p>
                    {items.map((it: any, i: number) => (
                        <div key={i} className="flex justify-between">
                            <span>{it.quantity}× {it.name}</span>
                            <span>{eur((it.price || 0) * (it.quantity || 1))}</span>
                        </div>
                    ))}

                    <Separator />
                    <Row label="Sous-total HT" value={eur(order.subtotal || 0)} />
                    <Row label="TVA" value={eur(order.tva || 0)} />
                    <div className="flex justify-between font-bold text-base">
                        <span>Total TTC</span><span>{eur(order.total)}</span>
                    </div>

                    <Separator />
                    <p className="font-semibold">Paiement</p>
                    <Row label="Méthode" value={paymentConfig[order.payment_method]?.label || order.payment_method} />
                    <Row label="Statut" value={order.payment_status || '—'} />
                    {order.payment_provider && <Row label="Prestataire" value={order.payment_provider} />}
                    {order.transaction_id && <Row label="ID transaction" value={order.transaction_id} mono />}
                    {order.payment_reference && <Row label="Référence" value={order.payment_reference} mono />}
                    {order.paid_at && <Row label="Payé le" value={new Date(order.paid_at).toLocaleString('fr-FR')} />}
                    {order.payment_amount != null && <Row label="Montant encaissé" value={eur(order.payment_amount)} />}

                    {order.customer_notes && (
                        <>
                            <Separator />
                            <p className="font-semibold">Notes</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">{order.customer_notes}</p>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    {order.status !== 'cancelled' && (
                        <Button variant="outline" onClick={() => onCancel(order)} className="gap-1.5">
                            <Ban className="w-4 h-4" /> Annuler
                        </Button>
                    )}
                    <Button onClick={() => onPrint(order)} className="gap-1.5">
                        <Printer className="w-4 h-4" /> Imprimer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        </div>
    );
}
