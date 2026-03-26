import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Printer, Clock, RefreshCw, Copy, Tag, X } from 'lucide-react';
import { printDateLabel } from '@/config/printConfig';

// Common items for quick-select
const QUICK_ITEMS = [
    { name: 'Algérienne', color: '#f59e0b' },
    { name: 'Samouraï', color: '#ef4444' },
    { name: 'Ketchup', color: '#dc2626' },
    { name: 'Mayonnaise', color: '#fbbf24' },
    { name: 'Biggy Burger', color: '#f97316' },
    { name: 'Blanche', color: '#e2e8f0' },
    { name: 'Harissa', color: '#b91c1c' },
    { name: 'Barbecue', color: '#92400e' },
    { name: 'Pâte', color: '#a3a3a3' },
    { name: 'Champignons', color: '#78716c' },
    { name: 'Olives', color: '#365314' },
    { name: 'Poivrons', color: '#16a34a' },
    { name: 'Oignons', color: '#eab308' },
    { name: 'Fromage râpé', color: '#fbbf24' },
];

// DLC duration options (optional - can print without)
const DLC_OPTIONS = [
    { label: '24h', hours: 24 },
    { label: '48h', hours: 48 },
    { label: '72h', hours: 72 },
    { label: '5j', hours: 120 },
    { label: '7j', hours: 168 },
    { label: '14j', hours: 336 },
    { label: '30j', hours: 720 },
    { label: '90j', hours: 2160 },
];

interface RecentLabel {
    id: string;
    product_name: string;
    action_date: string;
    dlc_date: string;
    created_at: string;
}

export function DateLabelTab() {
    const [productName, setProductName] = useState('');
    const [actionType, setActionType] = useState<'fait' | 'ouvert'>('fait');
    const [dlcHours, setDlcHours] = useState<number | null>(null);
    const [copies, setCopies] = useState(1);
    const [printing, setPrinting] = useState(false);
    const [recentLabels, setRecentLabels] = useState<RecentLabel[]>([]);

    useEffect(() => {
        fetchRecentLabels();
    }, []);

    const fetchRecentLabels = async () => {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const { data } = await supabase
                .from('haccp_print_queue' as any)
                .select('id, product_name, action_date, dlc_date, created_at')
                .gte('created_at', todayStart.toISOString())
                .like('notes', '%date_label%')
                .order('created_at', { ascending: false })
                .limit(10);
            if (data) {
                const seen = new Set<string>();
                const unique = (data as unknown as RecentLabel[]).filter(item => {
                    const key = `${item.product_name}|${item.action_date}|${item.dlc_date}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                setRecentLabels(unique);
            }
        } catch (err) {
            console.error('Error fetching recent labels:', err);
        }
    };

    const getNowFormatted = () => {
        const now = new Date();
        return now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const calculateUseByDate = (hours: number) => {
        const date = new Date(Date.now() + hours * 60 * 60 * 1000);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const handlePrint = async () => {
        if (!productName.trim()) {
            toast.error('Choisissez un produit');
            return;
        }
        setPrinting(true);
        try {
            const madeDate = getNowFormatted();
            const useByDate = dlcHours ? calculateUseByDate(dlcHours) : undefined;

            const success = await printDateLabel({
                productName: productName.trim(),
                madeDate,
                useByDate,
                actionType,
                operator: 'Staff',
                copies,
            });

            if (success) {
                toast.success(`✅ ${copies}x "${productName}" envoyé à l'imprimante!`);
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                fetchRecentLabels();
            } else {
                toast.error('❌ Erreur — vérifiez l\'imprimante et le serveur');
            }
        } catch {
            toast.error('Erreur lors de l\'impression');
        } finally {
            setPrinting(false);
        }
    };

    const handleReprint = async (label: RecentLabel) => {
        setPrinting(true);
        try {
            const success = await printDateLabel({
                productName: label.product_name,
                madeDate: label.action_date,
                useByDate: label.dlc_date || undefined,
                actionType,
                operator: 'Staff',
                copies: 1,
            });
            toast[success ? 'success' : 'error'](success ? `✅ Réimprimé: ${label.product_name}` : '❌ Erreur');
        } catch {
            toast.error('Erreur');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Action Type Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={actionType === 'fait' ? 'default' : 'outline'}
                    onClick={() => setActionType('fait')}
                    className={actionType === 'fait'
                        ? 'flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold'
                        : 'flex-1 h-11 border-slate-600 text-slate-300'}
                >
                    Fait le
                </Button>
                <Button
                    variant={actionType === 'ouvert' ? 'default' : 'outline'}
                    onClick={() => setActionType('ouvert')}
                    className={actionType === 'ouvert'
                        ? 'flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold'
                        : 'flex-1 h-11 border-slate-600 text-slate-300'}
                >
                    Ouvert le
                </Button>
            </div>

            {/* Quick Select Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {QUICK_ITEMS.map(item => (
                    <Button
                        key={item.name}
                        onClick={() => setProductName(item.name)}
                        className={`h-12 text-xs font-bold transition-all ${
                            productName === item.name ? 'ring-2 ring-white scale-105 shadow-lg' : 'hover:scale-105'
                        }`}
                        style={{
                            backgroundColor: productName === item.name ? item.color : `${item.color}99`,
                            color: ['#e2e8f0', '#fbbf24', '#eab308', '#a3a3a3'].includes(item.color) ? '#1e293b' : '#fff'
                        }}
                    >
                        {item.name}
                    </Button>
                ))}
            </div>

            {/* Custom Name */}
            <div className="flex gap-2">
                <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ou tapez un nom..."
                    className="bg-slate-900 border-slate-600 text-white h-11 flex-1"
                />
                {productName && (
                    <Button variant="ghost" size="icon" onClick={() => setProductName('')} className="text-slate-400 hover:text-white h-11 w-11">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* DLC Duration (Optional) */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Durée DLC (optionnel)
                    </h4>
                    {dlcHours !== null && (
                        <Button variant="ghost" size="sm" onClick={() => setDlcHours(null)} className="text-xs text-slate-500 hover:text-white h-6 px-2">
                            Pas de DLC
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                    {DLC_OPTIONS.map(opt => (
                        <Button
                            key={opt.hours}
                            variant={dlcHours === opt.hours ? 'default' : 'outline'}
                            onClick={() => setDlcHours(dlcHours === opt.hours ? null : opt.hours)}
                            className={`h-10 text-sm font-bold ${
                                dlcHours === opt.hours
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'border-slate-600 text-slate-300 hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
                {dlcHours !== null && (
                    <p className="mt-1 text-xs text-green-400">
                        → {calculateUseByDate(dlcHours)}
                    </p>
                )}
            </div>

            {/* Copies */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400"><Copy className="w-3 h-3 inline mr-1" />Copies:</span>
                {[1, 2, 3, 5].map(n => (
                    <Button
                        key={n}
                        variant={copies === n ? 'default' : 'outline'}
                        onClick={() => setCopies(n)}
                        size="sm"
                        className={`h-8 w-10 text-sm font-bold ${
                            copies === n ? 'bg-purple-600 text-white' : 'border-slate-600 text-slate-300'
                        }`}
                    >
                        {n}x
                    </Button>
                ))}
            </div>

            {/* Preview */}
            {productName && (
                <Card className="bg-white/95 border-2 border-amber-500">
                    <CardContent className="p-3 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Aperçu</p>
                        <p className="text-xl font-black text-slate-900">{productName}</p>
                        <p className="text-xs text-slate-600 mt-1">
                            {actionType === 'fait' ? 'Fait le' : 'Ouvert le'}: <strong>{getNowFormatted()}</strong>
                        </p>
                        {dlcHours !== null && (
                            <p className="text-sm font-bold text-red-600 mt-1">
                                À consommer avant le: {calculateUseByDate(dlcHours)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Print Button */}
            <Button
                onClick={handlePrint}
                disabled={!productName.trim() || printing}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-lg font-bold shadow-xl disabled:opacity-40"
            >
                {printing ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
                Imprimer {copies > 1 ? `${copies}x` : ''} Étiquette{copies > 1 ? 's' : ''}
            </Button>

            {/* Recent Labels */}
            {recentLabels.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Aujourd'hui
                    </h4>
                    {recentLabels.map(label => (
                        <Card key={label.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-2 flex items-center justify-between">
                                <div>
                                    <span className="text-white text-sm font-medium">{label.product_name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <span>{label.action_date}</span>
                                        {label.dlc_date && <><span>→</span><span className="text-amber-400">{label.dlc_date}</span></>}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleReprint(label)} disabled={printing}
                                    className="text-amber-400 hover:text-amber-300 h-8 px-2 text-xs">
                                    <Printer className="h-3 w-3 mr-1" />Réimpr.
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DateLabelTab;
