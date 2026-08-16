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
    getBusinessDate,
    getBusinessDateRange,
    formatBusinessDateDisplay,
    detectOrderSource,
    getSourceBadgeProps,
    getSourceLabel,
    calculateBusinessStats,
    type OrderSource,
} from '@/lib/orderUtils';
import {
    Search, Printer, Download, RefreshCw, Clock, ChefHat, CheckCircle, XCircle,
    Package, Ban, CreditCard, Banknote, Globe, TrendingUp, ShoppingBag, Receipt,
    Utensils, Store, Wifi
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
    en_ligne: { label: 'En ligne', icon: Globe, color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300' },
    cb: { label: 'CB', icon: CreditCard, color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' },
    especes: { label: 'Espèces', icon: Banknote, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
    divise: { label: 'Divisé', icon: CreditCard, color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
};

type RangePreset = 'today' | '7d' | '30d' | 'month';

function rangeFor(preset: RangePreset): { start: Date; end: Date } {
    const todayBiz = getBusinessDate(new Date(), 4);
    const { start: todayStart, end: todayEnd } = getBusinessDateRange(todayBiz, 4);

    if (preset === 'today') {
        return { start: todayStart, end: todayEnd };
    }

    const end = todayEnd;
    const start = new Date(todayStart);

    if (preset === '7d') {
        start.setDate(start.getDate() - 6);
    } else if (preset === '30d') {
        start.setDate(start.getDate() - 29);
    } else if (preset === 'month') {
        start.setDate(1);
    }

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
    const [sourceFilter, setSourceFilter] = useState<'all' | OrderSource>('all');
    const [selected, setSelected] = useState<Order | null>(null);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [showZReportModal, setShowZReportModal] = useState(false);
    const [showItemsSummary, setShowItemsSummary] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');

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
        const matchesSource = sourceFilter === 'all' || detectOrderSource(o) === sourceFilter;
        return matchesSearch && matchesStatus && matchesPayment && matchesSource;
    }), [orders, search, statusFilter, paymentFilter, sourceFilter]);

    // Comprehensive multi-channel stats
    const bizStats = useMemo(() => calculateBusinessStats(filtered), [filtered]);

    const stats = useMemo(() => {
        return {
            revenue: bizStats.totalRevenue,
            count: bizStats.totalOrdersCount,
            average: bizStats.avgOrderValue,
            bySource: bizStats.bySource,
            byPayment: bizStats.payments,
            paidOnline: bizStats.validOrders.filter((o) => o.payment_status === 'Paid' || o.payment_method === 'en_ligne').length,
            biz: bizStats,
        };
    }, [bizStats]);

    const filteredItemsList = useMemo(() => {
        if (!itemSearchQuery.trim()) return bizStats.items.list;
        const q = itemSearchQuery.toLowerCase();
        return bizStats.items.list.filter(it => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
    }, [bizStats.items.list, itemSearchQuery]);

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
        const head = ['Numero', 'Origine', 'Date', 'Heure', 'Client', 'Telephone', 'Type', 'Statut',
            'Paiement', 'Statut paiement', 'Transaction', 'Sous-total HT', 'TVA', 'Total TTC'];
        const rows = filtered.map((o) => {
            const d = new Date(o.created_at);
            const source = getSourceLabel(o);
            return [
                o.order_number,
                source,
                d.toLocaleDateString('fr-FR'),
                d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                o.customer_name, o.customer_phone, o.order_type, o.status,
                o.payment_method, o.payment_status || '', o.transaction_id || '',
                Number(o.subtotal || 0).toFixed(2), Number(o.tva || 0).toFixed(2), Number(o.total || 0).toFixed(2),
            ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';');
        });
        // BOM so Excel opens accented characters correctly
        const blob = new Blob(['\uFEFF' + [head.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `commandes-${getBusinessDate(new Date(), 4)}.csv`;
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
                <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
                    onClick={() => setShowZReportModal(true)}>
                    <Receipt className="w-4 h-4" /> 🔒 Clôture & Rapport Z
                </Button>
                <Button size="sm" variant={showItemsSummary ? 'secondary' : 'outline'}
                    onClick={() => setShowItemsSummary(!showItemsSummary)} className="gap-1.5 font-medium">
                    <Package className="w-4 h-4" /> 📦 Articles Vendus ({bizStats.items.totalCount})
                </Button>
                <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading} className="gap-1.5">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
                </Button>
                <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            {/* Quick KPI Cards (Consolidated Web + Borne + POS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={eur(stats.revenue)} />
                <StatCard icon={ShoppingBag} label="Commandes" value={String(stats.count)} />
                <StatCard icon={Receipt} label="Panier moyen" value={eur(stats.average)} />
                <StatCard icon={Globe} label="Payées en ligne" value={String(stats.paidOnline)} />
            </div>

            {/* Multi-channel summary bar (What we did) */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                        <span>📲 Borne</span>
                    </div>
                    <span className="font-mono font-black text-sm">{eur(stats.bySource.borne.revenue)}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span>💻 POS</span>
                    </div>
                    <span className="font-mono font-black text-sm">{eur(stats.bySource.pos.revenue)}</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                        <span>🌐 Web</span>
                    </div>
                    <span className="font-mono font-black text-sm">{eur(stats.bySource.web.revenue)}</span>
                </div>
            </div>

            {/* Collapsible Sold Items Summary ("What we sold") */}
            {showItemsSummary && (
                <Card className="p-4 bg-muted/20 border-amber-500/30">
                    <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-500" />
                            <h4 className="font-bold text-sm">Détail des articles vendus sur cette période ({bizStats.items.totalCount} pièces)</h4>
                        </div>
                        <Input
                            placeholder="🔍 Filtrer les articles..."
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            className="w-64 h-8 text-xs bg-background"
                        />
                    </div>
                    {filteredItemsList.length === 0 ? (
                        <p className="text-center py-6 text-sm text-muted-foreground">Aucun article trouvé.</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto rounded border bg-card">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/50 text-muted-foreground uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="text-left p-2.5">Article</th>
                                        <th className="text-left p-2.5">Catégorie</th>
                                        <th className="text-center p-2.5">Qté</th>
                                        <th className="text-right p-2.5">Total (€)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredItemsList.map((it) => (
                                        <tr key={it.name} className="hover:bg-muted/30">
                                            <td className="p-2.5 font-medium">{it.name}</td>
                                            <td className="p-2.5 text-muted-foreground capitalize">{it.category}</td>
                                            <td className="p-2.5 text-center font-bold text-amber-600 dark:text-amber-400">{it.quantity}</td>
                                            <td className="p-2.5 text-right font-bold font-mono">{eur(it.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            <Card className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Nom, téléphone ou n° de commande"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {/* Source filter */}
                    <FilterSelect
                        value={sourceFilter}
                        onChange={(v) => setSourceFilter(v as any)}
                        options={[
                            ['all', 'Toutes origines (Web+Borne+POS)'],
                            ['borne', '📲 Borne Tactile'],
                            ['pos', '💻 Caisse (POS)'],
                            ['web', '🌐 Site Web (En Ligne)'],
                        ]}
                    />
                    <FilterSelect value={statusFilter} onChange={setStatusFilter}
                        options={[['all', 'Tous les statuts'], ...Object.entries(statusConfig).map(([k, v]) => [k, v.label] as [string, string])]} />
                    <FilterSelect value={paymentFilter} onChange={setPaymentFilter}
                        options={[['all', 'Tous les paiements'], ...Object.entries(paymentConfig).map(([k, v]) => [k, v.label] as [string, string])]} />
                </div>
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
                    const srcBadge = getSourceBadgeProps(order);

                    return (
                        <div key={order.id} className="p-3 hover:bg-muted/40 cursor-pointer flex items-center gap-3 flex-wrap"
                            onClick={() => setSelected(order)}>
                            <span className="font-mono font-bold w-16">#{order.order_number}</span>
                            
                            {/* Source badge */}
                            <Badge variant="outline" className={`text-[10px] font-bold ${srcBadge.badgeClass}`}>
                                {srcBadge.emoji} {srcBadge.shortLabel}
                            </Badge>

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

            {/* Clôture de Caisse & Rapport Z Dialog */}
            <AdminZReportDialog
                open={showZReportModal}
                onClose={() => setShowZReportModal(false)}
                orders={orders}
            />
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
    const srcBadge = getSourceBadgeProps(order);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Commande #{order.order_number}
                        <Badge variant="outline" className={`text-xs font-bold ${srcBadge.badgeClass}`}>
                            {srcBadge.emoji} {srcBadge.label}
                        </Badge>
                        {isPaidOnline && (
                            <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded tracking-wider">
                                PAYÉ EN LIGNE
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                    <Row label="Origine" value={srcBadge.label} />
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

function AdminZReportDialog({ open, onClose, orders }: {
    open: boolean;
    onClose: () => void;
    orders: Order[];
}) {
    const [bizDate, setBizDate] = useState(() => getBusinessDate(new Date(), 4));
    const [activeTab, setActiveTab] = useState<'synthese' | 'articles' | 'caisse'>('synthese');
    const [itemSearch, setItemSearch] = useState('');
    const [fondDeCaisse, setFondDeCaisse] = useState<number>(() => {
        try { return Number(localStorage.getItem('pos-fond-caisse')) || 100; } catch { return 100; }
    });
    const [especesComptes, setEspecesComptes] = useState<number>(0);
    const [printing, setPrinting] = useState(false);
    const [dayOrders, setDayOrders] = useState<Order[]>(orders);
    const [loadingDay, setLoadingDay] = useState(false);

    useEffect(() => {
        try { localStorage.setItem('pos-fond-caisse', String(fondDeCaisse)); } catch {}
    }, [fondDeCaisse]);

    // Fetch orders for the selected business date
    useEffect(() => {
        if (!open) return;
        async function loadSelectedDay() {
            setLoadingDay(true);
            try {
                const { start, end } = getBusinessDateRange(bizDate, 4);
                const { data } = await supabase
                    .from('orders')
                    .select('*')
                    .gte('created_at', start.toISOString())
                    .lte('created_at', end.toISOString())
                    .order('created_at', { ascending: false });
                setDayOrders((data as Order[]) || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingDay(false);
            }
        }
        loadSelectedDay();
    }, [bizDate, open]);

    const stats = useMemo(() => calculateBusinessStats(dayOrders), [dayOrders]);

    const expectedCashInDrawer = fondDeCaisse + stats.payments.especes.total;
    const variance = (especesComptes || expectedCashInDrawer) - expectedCashInDrawer;

    const filteredItems = useMemo(() => {
        if (!itemSearch.trim()) return stats.items.list;
        const q = itemSearch.toLowerCase();
        return stats.items.list.filter(it => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
    }, [stats.items.list, itemSearch]);

    const handlePrintReport = async (type: 'X' | 'Z') => {
        setPrinting(true);
        const nowStr = new Date().toLocaleString('fr-FR');
        const reportTitle = type === 'X' ? 'RAPPORT X (POINTAGE INTERMÉDIAIRE)' : 'RAPPORT Z (CLÔTURE DE JOURNÉE)';

        const printPayload = {
            type: `RAPPORT_${type}`,
            reportType: type,
            businessDate: bizDate,
            businessDateDisplay: formatBusinessDateDisplay(bizDate),
            date: nowStr,
            totalTurnover: stats.totalRevenue.toFixed(2),
            totalHT: stats.taxes.ht.toFixed(2),
            totalTVA: stats.taxes.tva.toFixed(2),
            totalOrders: stats.totalOrdersCount,
            avgOrder: stats.avgOrderValue.toFixed(2),
            cancelledCount: stats.cancelledOrdersCount,
            cancelledTotal: stats.cancelledRevenue.toFixed(2),
            // Multi-channel
            borneCount: stats.bySource.borne.count,
            borneTotal: stats.bySource.borne.revenue.toFixed(2),
            bornePct: stats.bySource.borne.percentage.toFixed(0),
            posCount: stats.bySource.pos.count,
            posTotal: stats.bySource.pos.revenue.toFixed(2),
            posPct: stats.bySource.pos.percentage.toFixed(0),
            webCount: stats.bySource.web.count,
            webTotal: stats.bySource.web.revenue.toFixed(2),
            webPct: stats.bySource.web.percentage.toFixed(0),
            // Payments
            especesTotal: stats.payments.especes.total.toFixed(2),
            especesCount: stats.payments.especes.count,
            cbTotal: stats.payments.cb.total.toFixed(2),
            cbCount: stats.payments.cb.count,
            enLigneTotal: stats.payments.enLigne.total.toFixed(2),
            enLigneCount: stats.payments.enLigne.count,
            // Types
            surPlaceCount: stats.byType.surplace?.count || 0,
            surPlaceTotal: (stats.byType.surplace?.revenue || 0).toFixed(2),
            emporterCount: stats.byType.emporter?.count || 0,
            emporterTotal: (stats.byType.emporter?.revenue || 0).toFixed(2),
            livraisonCount: stats.byType.livraison?.count || 0,
            livraisonTotal: (stats.byType.livraison?.revenue || 0).toFixed(2),
            // Cash
            fondDeCaisse: fondDeCaisse.toFixed(2),
            expectedCashInDrawer: expectedCashInDrawer.toFixed(2),
            especesComptes: (especesComptes || expectedCashInDrawer).toFixed(2),
            variance: variance.toFixed(2),
            // Items
            totalItemsSold: stats.items.totalCount,
            items: stats.items.list.map(it => ({
                name: it.name,
                category: it.category,
                quantity: it.quantity,
                revenue: it.revenue.toFixed(2)
            })),
        };

        try {
            let printed = false;
            try {
                const res = await fetch(`${PRINT_SERVER}/print-report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(printPayload),
                    signal: AbortSignal.timeout(3000),
                });
                if (res.ok) printed = true;
            } catch {}

            if (!printed) {
                const itemsRowsHtml = stats.items.list.map(it => `
                    <div style="display:flex;justify-content:space-between;padding:1px 0;font-size:11px;">
                        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${it.quantity}x ${it.name}</span>
                        <span style="font-weight:bold;margin-left:8px;">${it.revenue.toFixed(2)} €</span>
                    </div>
                `).join('');

                const html = `
                    <div style="font-family:monospace;width:80mm;padding:3mm;font-size:12px;color:#000;line-height:1.35;">
                        <div style="text-align:center;font-weight:bold;font-size:16px;">TWIN PIZZA</div>
                        <div style="text-align:center;font-size:10px;color:#555;">60 Rue Georges Clemenceau, Grand-Couronne</div>
                        <div style="text-align:center;font-weight:bold;margin:6px 0;font-size:13px;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;">
                            ${reportTitle}
                        </div>
                        <div style="font-size:11px;">
                            <div><strong>Journée :</strong> ${formatBusinessDateDisplay(bizDate)}</div>
                            <div><strong>Tiré le :</strong> ${nowStr}</div>
                            <div><strong>Coupure :</strong> 04:00 -> 04:00 (J+1)</div>
                        </div>
                        <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />
                        <div style="font-size:14px;font-weight:bold;display:flex;justify-content:space-between;">
                            <span>CA TOTAL TTC :</span>
                            <span>${stats.totalRevenue.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>Total HT :</span>
                            <span>${stats.taxes.ht.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>TVA (10%) :</span>
                            <span>${stats.taxes.tva.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>Commandes valides :</span>
                            <span>${stats.totalOrdersCount} (Panier: ${stats.avgOrderValue.toFixed(2)} €)</span>
                        </div>
                        <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />
                        <div style="font-weight:bold;font-size:12px;margin-bottom:3px;">VENTES PAR CANAL (ORIGINE)</div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>📲 Borne Tactile (${stats.bySource.borne.count}) :</span>
                            <span>${stats.bySource.borne.revenue.toFixed(2)} € (${stats.bySource.borne.percentage.toFixed(0)}%)</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>💻 Caisse POS (${stats.bySource.pos.count}) :</span>
                            <span>${stats.bySource.pos.revenue.toFixed(2)} € (${stats.bySource.pos.percentage.toFixed(0)}%)</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>🌐 Site Web (${stats.bySource.web.count}) :</span>
                            <span>${stats.bySource.web.revenue.toFixed(2)} € (${stats.bySource.web.percentage.toFixed(0)}%)</span>
                        </div>
                        <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />
                        <div style="font-weight:bold;font-size:12px;margin-bottom:3px;">VENTES PAR RÈGLEMENT</div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>💵 Espèces (${stats.payments.especes.count}) :</span>
                            <span>${stats.payments.especes.total.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>💳 Carte CB (${stats.payments.cb.count}) :</span>
                            <span>${stats.payments.cb.total.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>🌐 En Ligne (${stats.payments.enLigne.count}) :</span>
                            <span>${stats.payments.enLigne.total.toFixed(2)} €</span>
                        </div>
                        <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />
                        <div style="font-weight:bold;font-size:12px;margin-bottom:3px;">RÉCONCILIATION TIROIR</div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>Fond de caisse :</span>
                            <span>${fondDeCaisse.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>Espèces attendues :</span>
                            <span>${expectedCashInDrawer.toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:11px;">
                            <span>Espèces comptées :</span>
                            <span>${(especesComptes || expectedCashInDrawer).toFixed(2)} €</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;">
                            <span>Écart de caisse :</span>
                            <span>${variance >= 0 ? '+' : ''}${variance.toFixed(2)} €</span>
                        </div>
                        <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />
                        <div style="font-weight:bold;font-size:12px;margin-bottom:3px;">
                            ARTICLES VENDUS (${stats.items.totalCount} pièces)
                        </div>
                        ${itemsRowsHtml || '<div style="font-size:10px;color:#777;">Aucun article</div>'}
                        <hr style="border:none;border-top:1px dashed #000;margin:8px 0;" />
                        <div style="text-align:center;font-size:10px;color:#444;">
                            Document certifié - TWIN PIZZA<br/>Fin de rapport
                        </div>
                    </div>
                `;

                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
                document.body.appendChild(iframe);
                const doc = iframe.contentWindow?.document;
                if (doc) {
                    doc.open();
                    doc.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title><style>@page{size:80mm auto;margin:0;}</style></head><body>${html}</body></html>`);
                    doc.close();
                    setTimeout(() => {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        setTimeout(() => iframe.remove(), 4000);
                    }, 300);
                }
            }

            toast.success(`✅ ${reportTitle} imprimé !`);
            if (type === 'Z') {
                try {
                    localStorage.setItem('pos-last-z-report', JSON.stringify({
                        date: nowStr,
                        businessDate: bizDate,
                        turnover: stats.totalRevenue
                    }));
                } catch {}
                toast.success('🔒 Clôture de journée Z enregistrée');
                onClose();
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Erreur d'impression du rapport");
        } finally {
            setPrinting(false);
        }
    };

    const todayBiz = useMemo(() => getBusinessDate(new Date(), 4), []);
    const yesterdayBiz = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return getBusinessDate(d, 4);
    }, []);

    if (!open) return null;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b bg-muted/20">
                    <DialogTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-500 font-black">
                        <Receipt className="w-5 h-5" /> Rapport de Caisse & Clôture Z
                    </DialogTitle>
                    <DialogDescription>
                        Journée d'activité du <strong>{formatBusinessDateDisplay(bizDate)}</strong> (Service actif jusqu'à 04:00)
                    </DialogDescription>
                </DialogHeader>

                {/* Date switcher banner */}
                <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                        <Button size="sm" variant={bizDate === todayBiz ? 'default' : 'outline'} className="h-7 text-xs"
                            onClick={() => setBizDate(todayBiz)}>
                            Aujourd'hui
                        </Button>
                        <Button size="sm" variant={bizDate === yesterdayBiz ? 'default' : 'outline'} className="h-7 text-xs"
                            onClick={() => setBizDate(yesterdayBiz)}>
                            Hier
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Autre date:</span>
                        <input
                            type="date"
                            value={bizDate}
                            onChange={(e) => e.target.value && setBizDate(e.target.value)}
                            className="h-7 px-2 rounded border bg-background text-xs"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-muted/10 text-xs font-bold">
                    <button
                        onClick={() => setActiveTab('synthese')}
                        className={`flex-1 py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'synthese' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'border-transparent text-muted-foreground'}`}>
                        📈 Synthèse & Canaux
                    </button>
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`flex-1 py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'articles' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'border-transparent text-muted-foreground'}`}>
                        📦 Articles Vendus ({stats.items.totalCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('caisse')}
                        className={`flex-1 py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'caisse' ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'border-transparent text-muted-foreground'}`}>
                        💵 Tiroir & Écart
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                    {loadingDay ? (
                        <div className="py-12 text-center text-muted-foreground">⏳ Chargement des données de la journée...</div>
                    ) : (
                        <>
                            {activeTab === 'synthese' && (
                                <div className="space-y-4">
                                    {/* CA Banner */}
                                    <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">Chiffre d'Affaires Global (TTC)</p>
                                            <p className="text-3xl font-black mt-1">{eur(stats.totalRevenue)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">HT : {eur(stats.taxes.ht)} | TVA (10%) : {eur(stats.taxes.tva)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{stats.totalOrdersCount} commandes</p>
                                            <p className="text-xs text-muted-foreground">Panier : {eur(stats.avgOrderValue)}</p>
                                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.items.totalCount} articles vendus</p>
                                        </div>
                                    </div>

                                    {/* Multi-channel breakdown */}
                                    <div>
                                        <p className="text-xs font-black uppercase text-muted-foreground mb-2">Ventes par Canal (Origine)</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg">
                                                <p className="text-xs font-bold text-purple-600 dark:text-purple-400">📲 Borne Tactile</p>
                                                <p className="text-base font-black mt-1">{eur(stats.bySource.borne.revenue)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.bySource.borne.count} cmd ({stats.bySource.borne.percentage.toFixed(0)}%)</p>
                                            </div>
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">💻 Caisse (POS)</p>
                                                <p className="text-base font-black mt-1">{eur(stats.bySource.pos.revenue)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.bySource.pos.count} cmd ({stats.bySource.pos.percentage.toFixed(0)}%)</p>
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg">
                                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">🌐 Site Web</p>
                                                <p className="text-base font-black mt-1">{eur(stats.bySource.web.revenue)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.bySource.web.count} cmd ({stats.bySource.web.percentage.toFixed(0)}%)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payments breakdown */}
                                    <div>
                                        <p className="text-xs font-black uppercase text-muted-foreground mb-2">Ventes par Mode de Règlement</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-card border p-2.5 rounded-lg">
                                                <p className="text-xs text-muted-foreground">💵 Espèces (Cash)</p>
                                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">{eur(stats.payments.especes.total)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.payments.especes.count} pmt</p>
                                            </div>
                                            <div className="bg-card border p-2.5 rounded-lg">
                                                <p className="text-xs text-muted-foreground">💳 Carte Bancaire</p>
                                                <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">{eur(stats.payments.cb.total)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.payments.cb.count} pmt</p>
                                            </div>
                                            <div className="bg-card border p-2.5 rounded-lg">
                                                <p className="text-xs text-muted-foreground">🌐 En Ligne (Stripe)</p>
                                                <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-1">{eur(stats.payments.enLigne.total)}</p>
                                                <p className="text-[11px] text-muted-foreground">{stats.payments.enLigne.count} pmt</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'articles' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Input
                                            placeholder="🔍 Filtrer les articles ou catégories..."
                                            value={itemSearch}
                                            onChange={(e) => setItemSearch(e.target.value)}
                                            className="h-8 text-xs flex-1"
                                        />
                                        <span className="text-xs text-muted-foreground font-bold">{filteredItems.length} articles</span>
                                    </div>
                                    <div className="rounded border max-h-72 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 text-muted-foreground uppercase font-bold sticky top-0">
                                                <tr>
                                                    <th className="text-left p-2.5">Article</th>
                                                    <th className="text-left p-2.5">Catégorie</th>
                                                    <th className="text-center p-2.5">Qté</th>
                                                    <th className="text-right p-2.5">Total (€)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredItems.map((it) => (
                                                    <tr key={it.name} className="hover:bg-muted/30">
                                                        <td className="p-2.5 font-medium">{it.name}</td>
                                                        <td className="p-2.5 text-muted-foreground capitalize">{it.category}</td>
                                                        <td className="p-2.5 text-center font-bold text-amber-600 dark:text-amber-400">{it.quantity}</td>
                                                        <td className="p-2.5 text-right font-bold font-mono">{eur(it.revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'caisse' && (
                                <div className="space-y-4">
                                    <div className="bg-card border rounded-xl p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground block mb-1">Fond de caisse initial (€)</label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={fondDeCaisse}
                                                    onChange={(e) => setFondDeCaisse(Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="h-9 text-sm font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground block mb-1">Espèces physiques comptées (€)</label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={especesComptes || ''}
                                                    onChange={(e) => setEspecesComptes(Math.max(0, parseFloat(e.target.value) || 0))}
                                                    placeholder={expectedCashInDrawer.toFixed(2)}
                                                    className="h-9 text-sm font-mono"
                                                />
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ventes espèces de la journée :</span>
                                                <span className="font-bold">{eur(stats.payments.especes.total)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Espèces attendues (Fond + Ventes) :</span>
                                                <span className="font-bold text-amber-600 dark:text-amber-400">{eur(expectedCashInDrawer)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Espèces réelles dans le tiroir :</span>
                                                <span className="font-bold">{eur(especesComptes || expectedCashInDrawer)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t text-sm font-bold">
                                                <span>Écart de caisse :</span>
                                                <span className={variance === 0 ? 'text-emerald-600 dark:text-emerald-400' : variance < 0 ? 'text-red-500' : 'text-blue-500'}>
                                                    {variance >= 0 ? '+' : ''}{eur(variance)} {variance === 0 ? '✓ Équilibré' : variance < 0 ? '⚠️ Manquant' : 'ℹ️ Excédent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Buttons */}
                <DialogFooter className="p-3 border-t bg-muted/20 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePrintReport('X')} disabled={printing || loadingDay}>
                        📄 Imprimer Rapport X (Pointage)
                    </Button>
                    <Button variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        onClick={() => handlePrintReport('Z')} disabled={printing || loadingDay}>
                        🔒 Valider & Imprimer Rapport Z (Clôture)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
