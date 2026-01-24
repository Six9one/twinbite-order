import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Camera, Check, X, Clock, RefreshCw, AlertTriangle, Calendar, ChevronRight } from 'lucide-react';
import { uploadToKitchenStorage, KITCHEN_BUCKETS } from '@/lib/kitchenStorage';

interface CleaningZone { id: string; name: string; description: string | null; is_high_risk: boolean; frequency: string; display_order: number; }
interface CleaningTask { id: string; zone_id: string; zone_name: string; scheduled_date: string; status: string; proof_photo_url: string | null; completed_at: string | null; completed_by: string | null; notes: string | null; }

export function CleaningPlanTab() {
    const [zones, setZones] = useState<CleaningZone[]>([]);
    const [tasks, setTasks] = useState<CleaningTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [showPhotoCapture, setShowPhotoCapture] = useState<string | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: zoneData } = await supabase.from('kitchen_cleaning_zones' as any).select('*').eq('is_active', true).order('display_order');
        if (zoneData) setZones(zoneData as unknown as CleaningZone[]);
        const { data: taskData } = await supabase.from('kitchen_cleaning_tasks' as any).select('*').eq('scheduled_date', today);
        if (taskData) setTasks(taskData as unknown as CleaningTask[]);
        setLoading(false);
    };

    const getTaskForZone = (zoneId: string) => tasks.find(t => t.zone_id === zoneId);

    const handleZoneClick = async (zone: CleaningZone) => {
        const existingTask = getTaskForZone(zone.id);
        if (existingTask?.status === 'completed') { toast.info('Déjà complété'); return; }
        if (zone.is_high_risk) { setShowPhotoCapture(zone.id); return; }
        await completeTask(zone, null);
    };

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => setCapturedPhoto(reader.result as string); reader.readAsDataURL(file); }
    };

    const completeTask = async (zone: CleaningZone, photoUrl: string | null) => {
        setUploading(zone.id);
        try {
            let finalPhotoUrl = photoUrl;
            if (capturedPhoto && !photoUrl) finalPhotoUrl = await uploadToKitchenStorage(KITCHEN_BUCKETS.CLEANING_PROOFS, capturedPhoto, `cleaning_${zone.id}_${Date.now()}`);
            const existingTask = getTaskForZone(zone.id);
            if (existingTask) {
                await supabase.from('kitchen_cleaning_tasks' as any).update({ status: 'completed', proof_photo_url: finalPhotoUrl, completed_at: new Date().toISOString(), completed_by: 'Staff' } as any).eq('id', existingTask.id);
                setTasks(prev => prev.map(t => t.id === existingTask.id ? { ...t, status: 'completed', proof_photo_url: finalPhotoUrl, completed_at: new Date().toISOString() } : t));
            } else {
                const { data } = await supabase.from('kitchen_cleaning_tasks' as any).insert({ zone_id: zone.id, zone_name: zone.name, scheduled_date: today, status: 'completed', proof_photo_url: finalPhotoUrl, completed_at: new Date().toISOString(), completed_by: 'Staff' } as any).select().single();
                if (data) setTasks(prev => [...prev, data as unknown as CleaningTask]);
            }
            toast.success(`✓ ${zone.name} nettoyé!`);
            setShowPhotoCapture(null); setCapturedPhoto(null);
        } catch { toast.error('Erreur'); } finally { setUploading(null); }
    };

    const getCompletedCount = () => {
        const dailyZones = zones.filter(z => z.frequency === 'daily');
        return { completed: tasks.filter(t => t.status === 'completed' && dailyZones.some(z => z.id === t.zone_id)).length, total: dailyZones.length };
    };

    if (loading) return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-purple-500 animate-spin" /></div>;

    const { completed, total } = getCompletedCount();
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const dailyZones = zones.filter(z => z.frequency === 'daily');
    const weeklyZones = zones.filter(z => z.frequency === 'weekly');

    return (
        <div className="space-y-6">
            <div><h2 className="text-2xl font-bold text-white mb-2">Plan de Nettoyage</h2><p className="text-slate-400 text-sm">Validez les zones nettoyées</p></div>
            <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3"><span className="text-white font-medium">Progression</span><Badge className={progress === 100 ? 'bg-green-600' : 'bg-purple-600'}>{completed}/{total}</Badge></div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} style={{ width: `${progress}%` }} /></div>
                    {progress === 100 && <p className="text-green-400 text-sm mt-2 text-center">🎉 Tout est terminé!</p>}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" />Tâches quotidiennes</h3>
                {dailyZones.map(zone => {
                    const task = getTaskForZone(zone.id);
                    const isCompleted = task?.status === 'completed';
                    const isUploading = uploading === zone.id;
                    return (
                        <Button key={zone.id} onClick={() => handleZoneClick(zone)} disabled={isCompleted || isUploading}
                            className={`w-full h-auto py-4 justify-between px-4 rounded-xl ${isCompleted ? 'bg-green-600/20 border-2 border-green-500/50 text-green-400' : zone.is_high_risk ? 'bg-red-600/10 border-2 border-red-500/30 hover:border-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20' : zone.is_high_risk ? 'bg-red-500/20' : 'bg-purple-500/20'}`}><Sparkles className={`h-6 w-6 ${isCompleted ? 'text-green-400' : zone.is_high_risk ? 'text-red-400' : 'text-purple-400'}`} /></div>
                                <div className="text-left"><span className="font-bold block">{zone.name}</span><span className="text-xs opacity-60">{zone.is_high_risk ? '📸 Photo requise' : 'Validation rapide'}</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isCompleted && <><span className="text-xs">{task?.completed_at && new Date(task.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span><Check className="h-6 w-6" /></>}
                                {zone.is_high_risk && !isCompleted && <Camera className="h-5 w-5 text-red-400" />}
                                {!isCompleted && !zone.is_high_risk && <ChevronRight className="h-6 w-6 text-slate-500" />}
                                {isUploading && <RefreshCw className="h-5 w-5 animate-spin" />}
                            </div>
                        </Button>
                    );
                })}
            </div>

            {weeklyZones.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" />Hebdomadaires</h3>
                    {weeklyZones.map(zone => {
                        const task = getTaskForZone(zone.id);
                        const isCompleted = task?.status === 'completed';
                        return <Button key={zone.id} onClick={() => handleZoneClick(zone)} disabled={isCompleted} className={`w-full h-auto py-3 justify-between px-4 rounded-xl ${isCompleted ? 'bg-blue-600/20 border-2 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 hover:bg-slate-700 border-2 border-slate-700 text-slate-300'}`}><span>{zone.name}</span>{isCompleted ? <Check className="h-5 w-5" /> : <Badge variant="secondary" className="text-xs">Hebdo</Badge>}</Button>;
                    })}
                </div>
            )}

            {showPhotoCapture && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-slate-900/80"><div className="flex items-center gap-3"><Camera className="h-6 w-6 text-red-500" /><span className="text-xl font-bold text-white">Photo requise</span></div><Button variant="ghost" size="icon" onClick={() => { setShowPhotoCapture(null); setCapturedPhoto(null); }} className="text-white hover:bg-slate-800"><X className="h-6 w-6" /></Button></div>
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
                        <div className="w-full max-w-md space-y-4">
                            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 text-center"><AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" /><p className="text-white font-medium">Zone à haut risque</p><p className="text-sm text-red-300">{zones.find(z => z.id === showPhotoCapture)?.name}</p></div>
                            {capturedPhoto ? <div className="relative"><img src={capturedPhoto} alt="Preuve" className="w-full h-64 object-cover rounded-xl border-2 border-green-500" /><Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => setCapturedPhoto(null)}><X className="h-4 w-4" /></Button></div>
                                : <Button onClick={() => photoInputRef.current?.click()} className="w-full h-32 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl"><div className="flex flex-col items-center gap-2"><Camera className="h-10 w-10" /><span className="text-lg font-bold">Prendre la photo</span></div></Button>}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/80"><Button onClick={() => { const zone = zones.find(z => z.id === showPhotoCapture); if (zone && capturedPhoto) completeTask(zone, null); }} disabled={!capturedPhoto || !!uploading} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">{uploading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}Valider</Button></div>
                </div>
            )}
        </div>
    );
}

export default CleaningPlanTab;
