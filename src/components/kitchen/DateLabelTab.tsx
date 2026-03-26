import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Printer, Clock, RefreshCw, Copy, Tag, X, Check } from 'lucide-react';
import { printDateLabel } from '@/config/printConfig';

// Common items for quick-select
const QUICK_ITEMS = [
    // Sauces
    { name: 'Algérienne', category: 'sauce', color: '#f59e0b' },
    { name: 'Samouraï', category: 'sauce', color: '#ef4444' },
    { name: 'Ketchup', category: 'sauce', color: '#dc2626' },
    { name: 'Mayonnaise', category: 'sauce', color: '#fbbf24' },
    { name: 'Biggy Burger', category: 'sauce', color: '#f97316' },
    { name: 'Blanche', category: 'sauce', color: '#e2e8f0' },
    { name: 'Harissa', category: 'sauce', color: '#b91c1c' },
    { name: 'Barbecue', category: 'sauce', color: '#92400e' },
    // Ingredients
    { name: 'Pâte', category: 'ingredient', color: '#a3a3a3' },
    { name: 'Champignons', category: 'ingredient', color: '#78716c' },
    { name: 'Olives', category: 'ingredient', color: '#365314' },
    { name: 'Poivrons', category: 'ingredient', color: '#16a34a' },
    { name: 'Oignons', category: 'ingredient', color: '#eab308' },
    { name: 'Fromage râpé', category: 'ingredient', color: '#fbbf24' },
];

// DLC duration options
const DLC_OPTIONS = [
    { label: '24h', hours: 24 },
    { label: '48h', hours: 48 },
    { label: '72h', hours: 72 },
    { label: '5j', hours: 120 },
    { label: '7j', hours: 168 },
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
    const [loadingRecent, setLoadingRecent] = useState(true);

    useEffect(() => {
        fetchRecentLabels();
    }, []);

    const fetchRecentLabels = async () => {
        setLoadingRecent(true);
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
                // Deduplicate by product_name + action_date + dlc_date
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
        } finally {
            setLoadingRecent(false);
        }
    };

    const calculateUseByDate = (hours: number) => {
        const date = new Date(Date.now() + hours * 60 * 60 * 1000);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const handlePrint = async () => {
        if (!productName.trim() || dlcHours === null) {
            toast.error('Choisissez un produit et une durée DLC');
            return;
        }

        setPrinting(true);
        try {
            const now = new Date();
            const madeDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const useByDate = calculateUseByDate(dlcHours);

            const success = await printDateLabel({
                productName: productName.trim(),
                madeDate,
                useByDate,
                actionType,
                operator: 'Staff',
                copies,
            });

            if (success) {
                toast.success(`✅ ${copies}x étiquette${copies > 1 ? 's' : ''} "${productName}" imprimée${copies > 1 ? 's' : ''}!`);
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                fetchRecentLabels();
            } else {
                toast.error('❌ Erreur d\'impression — vérifiez l\'imprimante');
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
                useByDate: label.dlc_date,
                actionType,
                operator: 'Staff',
                copies: 1,
            });

            if (success) {
                toast.success(`✅ Réimprimé: ${label.product_name}`);
            } else {
                toast.error('❌ Erreur d\'impression');
            }
        } catch {
            toast.error('Erreur');
        } finally {
            setPrinting(false);
        }
    };

    const handleQuickSelect = (itemName: string) => {
        setProductName(itemName);
    };

    const resetForm = () => {
        setProductName('');
        setDlcHours(null);
        setCopies(1);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Étiquettes Date</h2>
                <p className="text-slate-400 text-sm">Sauces, bouteilles, préparations — coller sur le produit</p>
            </div>

            {/* Action Type Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={actionType === 'fait' ? 'default' : 'outline'}
                    onClick={() => setActionType('fait')}
                    className={actionType === 'fait'
                        ? 'flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold'
                        : 'flex-1 h-12 border-slate-600 text-slate-300'}
                >
                    Fait le
                </Button>
                <Button
                    variant={actionType === 'ouvert' ? 'default' : 'outline'}
                    onClick={() => setActionType('ouvert')}
                    className={actionType === 'ouvert'
                        ? 'flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold'
                        : 'flex-1 h-12 border-slate-600 text-slate-300'}
                >
                    Ouvert le
                </Button>
            </div>

            {/* Quick Select Grid */}
            <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Sélection rapide
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {QUICK_ITEMS.map(item => (
                        <Button
                            key={item.name}
                            onClick={() => handleQuickSelect(item.name)}
                            className={`h-14 text-sm font-bold transition-all ${
                                productName === item.name
                                    ? 'ring-2 ring-white scale-105 shadow-lg'
                                    : 'hover:scale-105'
                            }`}
                            style={{
                                backgroundColor: productName === item.name ? item.color : `${item.color}99`,
                                color: ['#e2e8f0', '#fbbf24', '#eab308', '#a3a3a3'].includes(item.color) ? '#1e293b' : '#ffffff'
                            }}
                        >
                            {item.name}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Custom Product Name */}
            <div>
                <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ou tapez un nom personnalisé..."
                    className="bg-slate-900 border-slate-600 text-white h-12 text-lg"
                />
                {productName && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductName('')}
                        className="mt-1 text-slate-400 hover:text-white text-xs"
                    >
                        <X className="w-3 h-3 mr-1" /> Effacer
                    </Button>
                )}
            </div>

            {/* DLC Duration Selector */}
            <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Durée avant péremption
                </h3>
                <div className="flex gap-2">
                    {DLC_OPTIONS.map(opt => (
                        <Button
                            key={opt.hours}
                            variant={dlcHours === opt.hours ? 'default' : 'outline'}
                            onClick={() => setDlcHours(opt.hours)}
                            className={`flex-1 h-14 text-lg font-bold ${
                                dlcHours === opt.hours
                                    ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-400'
                                    : 'border-slate-600 text-slate-300 hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
                {dlcHours !== null && (
                    <p className="mt-2 text-sm text-green-400">
                        À consommer avant le: <strong>{calculateUseByDate(dlcHours)}</strong>
                    </p>
                )}
            </div>

            {/* Copies Selector */}
            <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Copy className="w-4 h-4" /> Nombre de copies
                </h3>
                <div className="flex gap-2">
                    {[1, 2, 3, 5].map(n => (
                        <Button
                            key={n}
                            variant={copies === n ? 'default' : 'outline'}
                            onClick={() => setCopies(n)}
                            className={`flex-1 h-12 text-lg font-bold ${
                                copies === n
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : 'border-slate-600 text-slate-300 hover:text-white'
                            }`}
                        >
                            {n}x
                        </Button>
                    ))}
                </div>
            </div>

            {/* Print Button */}
            <Button
                onClick={handlePrint}
                disabled={!productName.trim() || dlcHours === null || printing}
                className="w-full h-16 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xl font-bold shadow-xl disabled:opacity-40 transition-all hover:scale-[1.02]"
            >
                {printing ? (
                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                ) : (
                    <Printer className="w-6 h-6 mr-3" />
                )}
                Imprimer {copies > 1 ? `${copies}x ` : ''}Étiquette{copies > 1 ? 's' : ''}
            </Button>

            {/* Preview Card */}
            {productName && dlcHours !== null && (
                <Card className="bg-white/95 border-2 border-amber-500 shadow-xl">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Aperçu étiquette</p>
                        <p className="text-2xl font-black text-slate-900 mb-2">{productName}</p>
                        <div className="border-t border-slate-200 pt-2 space-y-1">
                            <p className="text-sm text-slate-600">
                                {actionType === 'fait' ? 'Fait le' : 'Ouvert le'}:{' '}
                                <strong className="text-slate-900">
                                    {new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </strong>
                            </p>
                            <p className="text-base font-bold text-red-600">
                                À consommer avant le: {calculateUseByDate(dlcHours)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Labels */}
            {!loadingRecent && recentLabels.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Imprimées aujourd'hui
                    </h3>
                    {recentLabels.map(label => (
                        <Card key={label.id} className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-medium">{label.product_name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <span>{label.action_date}</span>
                                        <span>→</span>
                                        <span className="text-amber-400">{label.dlc_date}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReprint(label)}
                                    disabled={printing}
                                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                >
                                    <Printer className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Réimprimer</span>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reset */}
            {(productName || dlcHours !== null) && (
                <Button
                    variant="ghost"
                    onClick={resetForm}
                    className="w-full text-slate-400 hover:text-white"
                >
                    <X className="w-4 h-4 mr-2" /> Tout effacer
                </Button>
            )}
        </div>
    );
}

export default DateLabelTab;
