import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Search, Calendar, Thermometer, Package, Tag, Sparkles, Trash2,
    X, ChevronLeft, ChevronRight, RefreshCw, Eye, Clock,
    Filter, Sun, Moon, AlertTriangle, Check
} from 'lucide-react';

type RecordType = 'all' | 'temperature' | 'reception' | 'traceability' | 'cleaning' | 'waste';

interface HistoryRecord {
    id: string;
    type: RecordType;
    date: string;
    title: string;
    subtitle: string;
    status: 'ok' | 'warning' | 'pending';
    shift?: 'Morning' | 'Night';
    photos: string[];
    details: Record<string, any>;
}

export function HistoryArchive() {
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<RecordType>('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchAllRecords();

        // Real-time subscription
        const channel = supabase.channel('kitchen-history')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_temp_logs' }, () => fetchAllRecords())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_reception_logs' }, () => fetchAllRecords())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_traceability' }, () => fetchAllRecords())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_cleaning_tasks' }, () => fetchAllRecords())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_waste_log' }, () => fetchAllRecords())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchAllRecords = async () => {
        setLoading(true);

        const [temps, receptions, traces, cleaning, wasteLog] = await Promise.all([
            supabase.from('kitchen_temp_logs' as any).select('*').order('logged_at', { ascending: false }).limit(100),
            supabase.from('kitchen_reception_logs' as any).select('*').order('received_at', { ascending: false }).limit(50),
            supabase.from('kitchen_traceability' as any).select('*').order('opened_at', { ascending: false }).limit(50),
            supabase.from('kitchen_cleaning_tasks' as any).select('*').order('scheduled_date', { ascending: false }).limit(50),
            supabase.from('kitchen_waste_log' as any).select('*').order('disposed_at', { ascending: false }).limit(50),
        ]);

        const allRecords: HistoryRecord[] = [];

        // Temperature logs
        (temps.data || []).forEach((t: any) => {
            const hour = new Date(t.logged_at).getHours();
            allRecords.push({
                id: t.id,
                type: 'temperature',
                date: t.logged_at,
                title: t.equipment_name,
                subtitle: `${t.value}°C`,
                status: t.is_compliant ? 'ok' : 'warning',
                shift: hour < 16 ? 'Morning' : 'Night',
                photos: [],
                details: t,
            });
        });

        // Reception logs
        (receptions.data || []).forEach((r: any) => {
            const photos = [];
            if (r.invoice_photo_url) photos.push(r.invoice_photo_url);
            if (r.delivery_photo_url) photos.push(r.delivery_photo_url);
            allRecords.push({
                id: r.id,
                type: 'reception',
                date: r.received_at,
                title: r.supplier_name,
                subtitle: r.temp_on_receipt ? `${r.temp_on_receipt}°C` : 'Réception',
                status: 'ok',
                photos,
                details: r,
            });
        });

        // Traceability
        (traces.data || []).forEach((t: any) => {
            const photos = t.label_photo_url ? [t.label_photo_url] : [];
            allRecords.push({
                id: t.id,
                type: 'traceability',
                date: t.opened_at,
                title: t.product_name,
                subtitle: `DLC: ${new Date(t.secondary_dlc).toLocaleDateString('fr-FR')}`,
                status: t.is_disposed ? 'warning' : 'ok',
                photos,
                details: t,
            });
        });

        // Cleaning
        (cleaning.data || []).forEach((c: any) => {
            const photos = c.proof_photo_url ? [c.proof_photo_url] : [];
            allRecords.push({
                id: c.id,
                type: 'cleaning',
                date: c.completed_at || c.scheduled_date,
                title: c.zone_name,
                subtitle: c.status === 'completed' ? 'Terminé' : 'En attente',
                status: c.status === 'completed' ? 'ok' : 'pending',
                photos,
                details: c,
            });
        });

        // Waste log
        (wasteLog.data || []).forEach((w: any) => {
            const photos = w.photo_url ? [w.photo_url] : [];
            allRecords.push({
                id: w.id,
                type: 'waste',
                date: w.disposed_at,
                title: w.product_name,
                subtitle: w.reason || 'Jeté',
                status: 'warning',
                photos,
                details: w,
            });
        });

        // Sort by date
        allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(allRecords);
        setLoading(false);
    };

    const getTypeIcon = (type: RecordType) => {
        switch (type) {
            case 'temperature': return <Thermometer className="h-4 w-4" />;
            case 'reception': return <Package className="h-4 w-4" />;
            case 'traceability': return <Tag className="h-4 w-4" />;
            case 'cleaning': return <Sparkles className="h-4 w-4" />;
            case 'waste': return <Trash2 className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getTypeColor = (type: RecordType) => {
        switch (type) {
            case 'temperature': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'reception': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'traceability': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'cleaning': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'waste': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const filteredRecords = records.filter(r => {
        if (filterType !== 'all' && r.type !== filterType) return false;
        if (selectedDate && !r.date.startsWith(selectedDate)) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q);
        }
        return true;
    });

    const paginatedRecords = filteredRecords.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">📚 Historique</h2>
                    <p className="text-slate-400 text-sm">{filteredRecords.length} enregistrements</p>
                </div>
                <Button variant="outline" size="icon" onClick={fetchAllRecords} disabled={loading} className="border-slate-600">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                        className="pl-10 bg-slate-800 border-slate-600 text-white"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['all', 'temperature', 'reception', 'traceability', 'cleaning', 'waste'] as RecordType[]).map(t => (
                        <Button
                            key={t}
                            variant={filterType === t ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setFilterType(t); setPage(0); }}
                            className={filterType === t ? 'bg-orange-600' : 'border-slate-600 text-slate-300'}
                        >
                            {t === 'all' && <Filter className="h-3 w-3 mr-1" />}
                            {t === 'temperature' && <Thermometer className="h-3 w-3 mr-1" />}
                            {t === 'reception' && <Package className="h-3 w-3 mr-1" />}
                            {t === 'traceability' && <Tag className="h-3 w-3 mr-1" />}
                            {t === 'cleaning' && <Sparkles className="h-3 w-3 mr-1" />}
                            {t === 'waste' && <Trash2 className="h-3 w-3 mr-1" />}
                            {t === 'all' ? 'Tout' : t === 'temperature' ? 'Temp' : t === 'traceability' ? 'DLC' : t === 'waste' ? 'Déchets' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={e => { setSelectedDate(e.target.value); setPage(0); }}
                        className="flex-1 bg-slate-800 border-slate-600 text-white"
                    />
                    {selectedDate && (
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDate('')} className="text-slate-400">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Records List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
                    </div>
                ) : paginatedRecords.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun enregistrement trouvé</p>
                    </div>
                ) : (
                    paginatedRecords.map(record => (
                        <Card
                            key={`${record.type}-${record.id}`}
                            className={`bg-slate-800/50 border-l-4 cursor-pointer hover:bg-slate-800 transition-all ${record.status === 'ok' ? 'border-l-green-500' :
                                record.status === 'warning' ? 'border-l-red-500' : 'border-l-amber-500'
                                }`}
                            onClick={() => setSelectedRecord(record)}
                        >
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getTypeColor(record.type)}`}>
                                    {getTypeIcon(record.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium truncate">{record.title}</span>
                                        {record.shift && (
                                            <Badge className={record.shift === 'Morning' ? 'bg-amber-600/30 text-amber-300' : 'bg-indigo-600/30 text-indigo-300'}>
                                                {record.shift === 'Morning' ? <Sun className="h-3 w-3 mr-1" /> : <Moon className="h-3 w-3 mr-1" />}
                                                {record.shift === 'Morning' ? 'Matin' : 'Soir'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <span>{formatDateTime(record.date)}</span>
                                        <span>•</span>
                                        <span className={record.status === 'warning' ? 'text-red-400' : ''}>{record.subtitle}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {record.photos.length > 0 && (
                                        <div className="flex -space-x-2">
                                            {record.photos.slice(0, 2).map((photo, i) => (
                                                <img
                                                    key={i}
                                                    src={photo}
                                                    alt=""
                                                    className="w-10 h-10 rounded-lg object-cover border-2 border-slate-700 cursor-pointer hover:scale-110 transition-transform"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedImage(photo); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className={`p-1 rounded-full ${record.status === 'ok' ? 'bg-green-500/20' :
                                        record.status === 'warning' ? 'bg-red-500/20' : 'bg-amber-500/20'
                                        }`}>
                                        {record.status === 'ok' ? <Check className="h-4 w-4 text-green-400" /> :
                                            record.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
                                                <Clock className="h-4 w-4 text-amber-400" />}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="border-slate-600"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-slate-400 text-sm">{page + 1} / {totalPages}</span>
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                        className="border-slate-600"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                    <img
                        src={selectedImage}
                        alt="Preview"
                        className="max-w-full max-h-full rounded-lg"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Record Detail Modal */}
            {selectedRecord && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex flex-col"
                    onClick={() => setSelectedRecord(null)}
                >
                    <div className="flex items-center justify-between p-4 bg-slate-900/80">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(selectedRecord.type)}`}>
                                {getTypeIcon(selectedRecord.type)}
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{selectedRecord.title}</h3>
                                <p className="text-slate-400 text-sm">{formatDateTime(selectedRecord.date)}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(null)} className="text-white">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex-1 p-4 overflow-auto" onClick={e => e.stopPropagation()}>
                        {/* Photos */}
                        {selectedRecord.photos.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-slate-400 text-sm mb-2">📷 Photos</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedRecord.photos.map((photo, i) => (
                                        <img
                                            key={i}
                                            src={photo}
                                            alt=""
                                            className="w-full rounded-lg cursor-pointer hover:opacity-90"
                                            onClick={() => setSelectedImage(photo)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Details */}
                        <div className="space-y-3">
                            <h4 className="text-slate-400 text-sm">📋 Détails</h4>
                            {Object.entries(selectedRecord.details).map(([key, value]) => {
                                if (key === 'id' || key.includes('photo') || key.includes('url')) return null;
                                return (
                                    <div key={key} className="flex justify-between p-3 bg-slate-800 rounded-lg">
                                        <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-white font-medium">
                                            {typeof value === 'boolean' ? (value ? '✓ Oui' : '✗ Non') :
                                                value === null ? '-' :
                                                    key.includes('_at') || key.includes('date') || key.includes('dlc') ? formatDateTime(String(value)) :
                                                        String(value)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HistoryArchive;
