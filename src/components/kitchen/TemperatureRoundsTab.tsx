import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sun, Moon, Thermometer, CheckCircle, AlertTriangle, Clock, RefreshCw, ChevronRight } from 'lucide-react';

interface Equipment {
    id: string;
    name: string;
    type: 'fridge' | 'freezer';
    location: string;
    min_temp: number;
    max_temp: number;
    display_order: number;
    image_url: string | null;
}


interface Shift {
    id: string;
    shift_type: 'Morning' | 'Night';
    staff_name: string;
    started_at: string;
    completed_at: string | null;
    shift_date: string;
}

interface TempLog {
    id: string;
    equipment_id: string;
    equipment_name: string;
    value: number;
    is_compliant: boolean;
    corrective_action: string | null;
    corrective_reason: string | null;
    shift_id: string;
    logged_at: string;
}

export function TemperatureRoundsTab() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    const [tempLogs, setTempLogs] = useState<TempLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [showKeypad, setShowKeypad] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: equipData } = await supabase.from('kitchen_equipment' as any).select('*').eq('is_active', true).order('display_order');
        if (equipData) setEquipment(equipData as unknown as Equipment[]);
        const { data: shiftData } = await supabase.from('kitchen_shifts' as any).select('*').eq('shift_date', today);
        if (shiftData) setTodayShifts(shiftData as unknown as Shift[]);
        const { data: logData } = await supabase.from('kitchen_temp_logs' as any).select('*').gte('logged_at', `${today}T00:00:00`).lte('logged_at', `${today}T23:59:59`);
        if (logData) setTempLogs(logData as unknown as TempLog[]);
        setLoading(false);
    };

    const startShift = async (type: 'Morning' | 'Night') => {
        const existing = todayShifts.find(s => s.shift_type === type);
        if (existing) { setCurrentShift(existing); toast.info(`Reprise du relevé ${type === 'Morning' ? 'Matin' : 'Soir'}`); return; }
        const { data, error } = await supabase.from('kitchen_shifts' as any).insert({ shift_type: type, staff_name: 'Staff', shift_date: today } as any).select().single();
        if (error) { toast.error('Erreur lors du démarrage'); return; }
        const newShift = data as unknown as Shift;
        setCurrentShift(newShift);
        setTodayShifts(prev => [...prev, newShift]);
        toast.success(`Relevé ${type === 'Morning' ? 'Matin' : 'Soir'} démarré!`);
    };

    const getEquipmentStatus = (equip: Equipment) => {
        if (!currentShift) return 'pending';
        const log = tempLogs.find(l => l.equipment_id === equip.id && l.shift_id === currentShift.id);
        if (!log) return 'pending';
        return log.is_compliant ? 'ok' : 'warning';
    };

    const getEquipmentTemp = (equip: Equipment) => {
        if (!currentShift) return null;
        const log = tempLogs.find(l => l.equipment_id === equip.id && l.shift_id === currentShift.id);
        return log?.value ?? null;
    };

    const handleEquipmentClick = (equip: Equipment) => {
        if (!currentShift) { toast.error('Sélectionnez d\'abord un relevé (Matin ou Soir)'); return; }
        setSelectedEquipment(equip);
        setShowKeypad(true);
    };

    const handleSaveTemperature = async (temp: number, status: 'ok' | 'warning', correctiveAction?: string, correctiveReason?: string) => {
        if (!selectedEquipment || !currentShift) return;
        const isCompliant = status === 'ok';
        if (!isCompliant && (!correctiveAction || !correctiveReason)) { toast.error('Action corrective requise'); return; }
        const { data, error } = await supabase.from('kitchen_temp_logs' as any).insert({
            equipment_id: selectedEquipment.id, equipment_name: selectedEquipment.name, equipment_type: selectedEquipment.type,
            value: temp, is_compliant: isCompliant, corrective_action: correctiveAction || null, corrective_reason: correctiveReason || null,
            shift_id: currentShift.id, logged_by: 'Staff'
        } as any).select().single();
        if (error) { toast.error('Erreur enregistrement'); return; }
        setTempLogs(prev => [...prev, data as unknown as TempLog]);
        setShowKeypad(false);
        setSelectedEquipment(null);
        toast.success(`${isCompliant ? '✓' : '⚠️'} ${selectedEquipment.name}: ${temp}°C`);
        const allLogged = equipment.every(e => tempLogs.some(l => l.equipment_id === e.id && l.shift_id === currentShift.id) || e.id === selectedEquipment.id);
        if (allLogged) {
            await supabase.from('kitchen_shifts' as any).update({ completed_at: new Date().toISOString() } as any).eq('id', currentShift.id);
            toast.success('🎉 Relevé terminé!');
            setCurrentShift(null);
            fetchData();
        }
    };

    const getShiftStatus = (type: 'Morning' | 'Night') => {
        const shift = todayShifts.find(s => s.shift_type === type);
        if (!shift) return 'pending';
        if (shift.completed_at) return 'completed';
        return 'in_progress';
    };

    const getCompletedCount = () => currentShift ? tempLogs.filter(l => l.shift_id === currentShift.id).length : 0;

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-orange-500 animate-spin" /></div>;

    if (!currentShift) {
        return (
            <div className="space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Relevés Température</h2>
                    <p className="text-slate-400">Sélectionnez le relevé à effectuer</p>
                </div>
                <div className="grid gap-4">
                    <Button onClick={() => startShift('Morning')} disabled={getShiftStatus('Morning') === 'completed'}
                        className={`h-32 rounded-2xl text-white shadow-lg ${getShiftStatus('Morning') === 'completed' ? 'bg-green-600/50' : getShiftStatus('Morning') === 'in_progress' ? 'bg-gradient-to-br from-orange-500 to-amber-600 animate-pulse' : 'bg-gradient-to-br from-orange-600 to-amber-700 hover:from-orange-500'}`}>
                        <div className="flex items-center gap-4">
                            <Sun className="h-12 w-12" />
                            <div className="text-left">
                                <span className="text-2xl font-bold block">Relevé Matin</span>
                                <span className="text-sm opacity-80">{getShiftStatus('Morning') === 'completed' ? '✓ Terminé' : getShiftStatus('Morning') === 'in_progress' ? '⏳ En cours...' : 'À effectuer'}</span>
                            </div>
                            {getShiftStatus('Morning') === 'completed' && <CheckCircle className="h-8 w-8 ml-auto" />}
                        </div>
                    </Button>
                    <Button onClick={() => startShift('Night')} disabled={getShiftStatus('Night') === 'completed'}
                        className={`h-32 rounded-2xl text-white shadow-lg ${getShiftStatus('Night') === 'completed' ? 'bg-green-600/50' : getShiftStatus('Night') === 'in_progress' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse' : 'bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500'}`}>
                        <div className="flex items-center gap-4">
                            <Moon className="h-12 w-12" />
                            <div className="text-left">
                                <span className="text-2xl font-bold block">Relevé Soir</span>
                                <span className="text-sm opacity-80">{getShiftStatus('Night') === 'completed' ? '✓ Terminé' : getShiftStatus('Night') === 'in_progress' ? '⏳ En cours...' : 'À effectuer'}</span>
                            </div>
                            {getShiftStatus('Night') === 'completed' && <CheckCircle className="h-8 w-8 ml-auto" />}
                        </div>
                    </Button>
                </div>
                <Card className="p-4 bg-slate-800/50 border-slate-700">
                    <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />Aujourd'hui</h3>
                    <div className="flex gap-4">
                        <Badge variant={getShiftStatus('Morning') === 'completed' ? 'default' : 'secondary'} className={getShiftStatus('Morning') === 'completed' ? 'bg-green-600' : ''}><Sun className="w-3 h-3 mr-1" />Matin: {getShiftStatus('Morning') === 'completed' ? 'OK' : 'En attente'}</Badge>
                        <Badge variant={getShiftStatus('Night') === 'completed' ? 'default' : 'secondary'} className={getShiftStatus('Night') === 'completed' ? 'bg-green-600' : ''}><Moon className="w-3 h-3 mr-1" />Soir: {getShiftStatus('Night') === 'completed' ? 'OK' : 'En attente'}</Badge>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card className={`p-4 border-2 ${currentShift.shift_type === 'Morning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {currentShift.shift_type === 'Morning' ? <Sun className="h-6 w-6 text-orange-500" /> : <Moon className="h-6 w-6 text-indigo-400" />}
                        <div>
                            <h3 className="font-bold text-white">Relevé {currentShift.shift_type === 'Morning' ? 'Matin' : 'Soir'}</h3>
                            <p className="text-xs text-slate-400">{getCompletedCount()}/{equipment.length} appareils</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentShift(null)} className="border-slate-600 text-slate-300">Retour</Button>
                </div>
            </Card>
            <div className="grid gap-3">
                {equipment.map(equip => {
                    const status = getEquipmentStatus(equip);
                    const temp = getEquipmentTemp(equip);
                    const isFreezer = equip.type === 'freezer';
                    return (
                        <Button key={equip.id} onClick={() => handleEquipmentClick(equip)} disabled={status !== 'pending'}
                            className={`h-24 justify-between px-4 rounded-xl ${status === 'ok' ? 'bg-green-600/20 border-2 border-green-500/50 text-green-400' : status === 'warning' ? 'bg-red-600/20 border-2 border-red-500/50 text-red-400' : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white'}`}>
                            <div className="flex items-center gap-3">
                                {equip.image_url ? (
                                    <img src={equip.image_url} alt={equip.name} className="w-16 h-16 object-cover rounded-lg border-2 border-slate-600" />
                                ) : (
                                    <div className={`p-3 rounded-lg ${isFreezer ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                                        <Thermometer className={`h-8 w-8 ${isFreezer ? 'text-blue-400' : 'text-orange-400'}`} />
                                    </div>
                                )}
                                <div className="text-left">
                                    <span className="font-bold block text-lg">{equip.name}</span>
                                    <span className="text-xs opacity-60">{equip.location || (isFreezer ? '❄️ Congélateur' : '🧊 Frigo')} • Max {equip.max_temp}°C</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {status === 'ok' && <><span className="text-xl font-bold">{temp}°C</span><CheckCircle className="h-7 w-7" /></>}
                                {status === 'warning' && <><span className="text-xl font-bold">{temp}°C</span><AlertTriangle className="h-7 w-7" /></>}
                                {status === 'pending' && <ChevronRight className="h-7 w-7 text-slate-500" />}
                            </div>
                        </Button>
                    );
                })}
            </div>

            {showKeypad && selectedEquipment && <TemperatureKeypadWithCorrectiveAction equipment={selectedEquipment} onSave={handleSaveTemperature} onClose={() => { setShowKeypad(false); setSelectedEquipment(null); }} />}
        </div>
    );
}

function TemperatureKeypadWithCorrectiveAction({ equipment, onSave, onClose }: { equipment: Equipment; onSave: (temp: number, status: 'ok' | 'warning', action?: string, reason?: string) => void; onClose: () => void }) {
    const [display, setDisplay] = useState('');
    const [isNegative, setIsNegative] = useState(equipment.type === 'freezer');
    const [showCorrectiveDialog, setShowCorrectiveDialog] = useState(false);
    const [pendingTemp, setPendingTemp] = useState<number | null>(null);
    const [correctiveReason, setCorrectiveReason] = useState('');
    const [correctiveAction, setCorrectiveAction] = useState('');
    const REASONS = ['Porte restée ouverte', 'Panne technique', 'Coupure de courant', 'Surcharge appareil', 'Autre'];
    const ACTIONS = ['Thermostat ajusté', 'Technicien appelé', 'Produits déplacés', 'Appareil redémarré', 'Autre'];

    const appendDigit = (digit: string) => { if (display.length >= 4) return; if (digit === '.' && display.includes('.')) return; if (digit === '.' && display === '') { setDisplay('0.'); return; } setDisplay(display + digit); };
    const handleSubmit = () => {
        if (!display) return;
        let temp = parseFloat(display);
        if (isNegative) temp = -temp;
        const isCompliant = temp <= equipment.max_temp;
        if (!isCompliant) { setPendingTemp(temp); setShowCorrectiveDialog(true); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); }
        else onSave(temp, 'ok');
    };
    const handleCorrectiveSubmit = () => { if (!correctiveReason || !correctiveAction || pendingTemp === null) { toast.error('Remplissez tous les champs'); return; } onSave(pendingTemp, 'warning', correctiveAction, correctiveReason); };
    const currentTemp = display ? (isNegative ? `-${display}` : display) : '--';

    if (showCorrectiveDialog) {
        return (
            <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                <div className="flex items-center justify-between p-4 bg-red-900/80"><div className="flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-red-400" /><span className="text-xl font-bold text-white">⚠️ Température Non-Conforme</span></div></div>
                <div className="flex-1 p-4 overflow-auto">
                    <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 mb-6 text-center"><span className="text-4xl font-bold text-white block mb-2">{pendingTemp}°C</span><span className="text-red-400">{equipment.name}</span><br /><span className="text-sm text-red-300">Max: {equipment.max_temp}°C</span></div>
                    <div className="space-y-4">
                        <div><label className="text-slate-300 text-sm font-medium block mb-2">Cause *</label><div className="grid grid-cols-2 gap-2">{REASONS.map(r => <Button key={r} variant={correctiveReason === r ? 'default' : 'outline'} onClick={() => setCorrectiveReason(r)} className={`h-12 text-sm ${correctiveReason === r ? 'bg-red-600' : 'border-slate-600 text-slate-300'}`}>{r}</Button>)}</div></div>
                        <div><label className="text-slate-300 text-sm font-medium block mb-2">Action corrective *</label><div className="grid grid-cols-2 gap-2">{ACTIONS.map(a => <Button key={a} variant={correctiveAction === a ? 'default' : 'outline'} onClick={() => setCorrectiveAction(a)} className={`h-12 text-sm ${correctiveAction === a ? 'bg-green-600' : 'border-slate-600 text-slate-300'}`}>{a}</Button>)}</div></div>
                    </div>
                </div>
                <div className="p-4 bg-slate-900/80 flex gap-3"><Button variant="outline" onClick={() => { setShowCorrectiveDialog(false); setPendingTemp(null); }} className="flex-1 h-14 border-slate-600 text-slate-300">Annuler</Button><Button onClick={handleCorrectiveSubmit} disabled={!correctiveReason || !correctiveAction} className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white">Enregistrer</Button></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-slate-900/80"><div className="flex items-center gap-3"><Thermometer className="h-6 w-6 text-orange-500" /><span className="text-xl font-bold text-white truncate">{equipment.name}</span></div><Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800">✕</Button></div>
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="text-center mb-8"><div className="text-7xl font-bold text-white mb-2">{currentTemp}<span className="text-4xl text-slate-400">°C</span></div><p className="text-slate-400">{equipment.type === 'fridge' ? '🧊 Réfrigérateur' : '❄️ Congélateur'} (max {equipment.max_temp}°C)</p></div>
                <div className="w-full max-w-sm">
                    <div className="grid grid-cols-3 gap-3 mb-4">{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <Button key={d} onClick={() => appendDigit(d)} className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white">{d}</Button>)}<Button onClick={() => setIsNegative(!isNegative)} className={`h-20 text-2xl font-bold ${isNegative ? 'bg-blue-600' : 'bg-slate-700'} text-white`}>+/-</Button><Button onClick={() => appendDigit('0')} className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white">0</Button><Button onClick={() => appendDigit('.')} className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white">.</Button></div>
                    <div className="grid grid-cols-3 gap-3"><Button onClick={() => setDisplay('')} className="h-16 text-lg bg-slate-600 hover:bg-slate-500 text-white">C</Button><Button onClick={() => setDisplay(display.slice(0, -1))} className="h-16 bg-slate-600 hover:bg-slate-500 text-white">⌫</Button><Button onClick={handleSubmit} disabled={!display} className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">✓</Button></div>
                </div>
            </div>
        </div>
    );
}

export default TemperatureRoundsTab;
