import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Calendar, AlertTriangle, Coffee, Save, RefreshCw, Power, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface StoreStatus {
    is_open: boolean;
    is_pause: boolean;
    pause_message: string;
    is_temp_closed: boolean;
    temp_closed_until: string;
    temp_closed_message: string;
    show_banner: boolean;
    banner_message: string;
    banner_type: 'info' | 'warning' | 'error';
}

interface DayHours {
    id?: string;
    day_of_week: number;
    is_open: boolean;
    open_time: string;
    close_time: string;
    open_time_evening: string;
    close_time_evening: string;
    is_continuous: boolean;
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const defaultStatus: StoreStatus = {
    is_open: true,
    is_pause: false,
    pause_message: 'Nous sommes en pause. Retour dans quelques minutes!',
    is_temp_closed: false,
    temp_closed_until: '',
    temp_closed_message: 'Fermé exceptionnellement. Réouverture bientôt!',
    show_banner: false,
    banner_message: '',
    banner_type: 'info',
};

const defaultHours: DayHours[] = [
    { day_of_week: 0, is_open: false, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '22:00', is_continuous: false },
    { day_of_week: 1, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '22:00', is_continuous: false },
    { day_of_week: 2, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '22:00', is_continuous: false },
    { day_of_week: 3, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '22:00', is_continuous: false },
    { day_of_week: 4, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '22:00', is_continuous: false },
    { day_of_week: 5, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '23:00', is_continuous: false },
    { day_of_week: 6, is_open: true, open_time: '11:00', close_time: '14:00', open_time_evening: '18:00', close_time_evening: '23:00', is_continuous: false },
];

export function StoreStatusManager() {
    const [status, setStatus] = useState<StoreStatus>(defaultStatus);
    const [hours, setHours] = useState<DayHours[]>(defaultHours);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // Fetch store status from site_settings
        const { data: settingsData } = await supabase
            .from('site_settings' as any)
            .select('*');

        if (settingsData) {
            const settings = settingsData as unknown as { key: string; value: string }[];
            const statusFromDb: Partial<StoreStatus> = {};

            settings.forEach(s => {
                if (s.key === 'store_is_open') statusFromDb.is_open = s.value === 'true';
                if (s.key === 'store_is_pause') statusFromDb.is_pause = s.value === 'true';
                if (s.key === 'store_pause_message') statusFromDb.pause_message = s.value;
                if (s.key === 'store_is_temp_closed') statusFromDb.is_temp_closed = s.value === 'true';
                if (s.key === 'store_temp_closed_until') statusFromDb.temp_closed_until = s.value;
                if (s.key === 'store_temp_closed_message') statusFromDb.temp_closed_message = s.value;
                if (s.key === 'store_show_banner') statusFromDb.show_banner = s.value === 'true';
                if (s.key === 'store_banner_message') statusFromDb.banner_message = s.value;
                if (s.key === 'store_banner_type') statusFromDb.banner_type = s.value as any;
            });

            setStatus({ ...defaultStatus, ...statusFromDb });
        }

        // Fetch opening hours
        const { data: hoursData } = await supabase
            .from('opening_hours' as any)
            .select('*')
            .order('day_of_week');

        if (hoursData && hoursData.length > 0) {
            setHours(hoursData as unknown as DayHours[]);
        }

        setLoading(false);
    };

    const handleSaveStatus = async () => {
        setSaving(true);

        const statusSettings = [
            { key: 'store_is_open', value: String(status.is_open), category: 'store' },
            { key: 'store_is_pause', value: String(status.is_pause), category: 'store' },
            { key: 'store_pause_message', value: status.pause_message, category: 'store' },
            { key: 'store_is_temp_closed', value: String(status.is_temp_closed), category: 'store' },
            { key: 'store_temp_closed_until', value: status.temp_closed_until, category: 'store' },
            { key: 'store_temp_closed_message', value: status.temp_closed_message, category: 'store' },
            { key: 'store_show_banner', value: String(status.show_banner), category: 'store' },
            { key: 'store_banner_message', value: status.banner_message, category: 'store' },
            { key: 'store_banner_type', value: status.banner_type, category: 'store' },
        ];

        for (const setting of statusSettings) {
            await supabase
                .from('site_settings' as any)
                .upsert(setting, { onConflict: 'key' });
        }

        toast.success('Statut sauvegardé!');
        setSaving(false);
    };

    const handleSaveHours = async () => {
        setSaving(true);

        for (const day of hours) {
            if (day.id) {
                await supabase
                    .from('opening_hours' as any)
                    .update({
                        is_open: day.is_open,
                        open_time: day.open_time,
                        close_time: day.close_time,
                        open_time_evening: day.open_time_evening,
                        close_time_evening: day.close_time_evening,
                        is_continuous: day.is_continuous,
                    })
                    .eq('id', day.id);
            } else {
                await supabase
                    .from('opening_hours' as any)
                    .upsert({
                        day_of_week: day.day_of_week,
                        is_open: day.is_open,
                        open_time: day.open_time,
                        close_time: day.close_time,
                        open_time_evening: day.open_time_evening,
                        close_time_evening: day.close_time_evening,
                        is_continuous: day.is_continuous,
                    });
            }
        }

        toast.success('Horaires sauvegardés!');
        setSaving(false);
    };

    const updateDayHours = (dayIndex: number, field: keyof DayHours, value: any) => {
        setHours(prev => prev.map((h, i) => i === dayIndex ? { ...h, [field]: value } : h));
    };

    const getStoreStatusBadge = () => {
        if (status.is_temp_closed) return <Badge className="bg-red-500">FERMÉ TEMPORAIREMENT</Badge>;
        if (status.is_pause) return <Badge className="bg-yellow-500">EN PAUSE</Badge>;
        if (!status.is_open) return <Badge className="bg-red-500">FERMÉ</Badge>;
        return <Badge className="bg-green-500">OUVERT</Badge>;
    };

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="w-6 h-6 text-amber-500" />
                        Statut & Horaires
                    </h2>
                    {getStoreStatusBadge()}
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>
            </div>

            <Tabs defaultValue="status" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="status">
                        <Power className="w-4 h-4 mr-2" />
                        Statut
                    </TabsTrigger>
                    <TabsTrigger value="hours">
                        <Calendar className="w-4 h-4 mr-2" />
                        Horaires
                    </TabsTrigger>
                    <TabsTrigger value="banner">
                        <Bell className="w-4 h-4 mr-2" />
                        Annonces
                    </TabsTrigger>
                </TabsList>

                {/* Status Tab */}
                <TabsContent value="status" className="space-y-4">
                    {/* Quick Open/Close */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Power className="w-5 h-5" />
                            Contrôle rapide
                        </h3>

                        <div className="space-y-4">
                            {/* Main Open/Close toggle */}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                                <div>
                                    <Label className="text-lg font-medium">Restaurant ouvert</Label>
                                    <p className="text-sm text-muted-foreground">Activer/désactiver les commandes</p>
                                </div>
                                <Switch
                                    checked={status.is_open}
                                    onCheckedChange={(checked) => setStatus({ ...status, is_open: checked })}
                                    className="scale-150"
                                />
                            </div>

                            {/* Pause mode */}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <div className="flex items-center gap-3">
                                    <Coffee className="w-6 h-6 text-yellow-600" />
                                    <div>
                                        <Label className="text-lg font-medium">Mode pause</Label>
                                        <p className="text-sm text-muted-foreground">Pause temporaire (ex: entre services)</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={status.is_pause}
                                    onCheckedChange={(checked) => setStatus({ ...status, is_pause: checked })}
                                />
                            </div>

                            {status.is_pause && (
                                <div className="ml-4 space-y-2">
                                    <Label>Message de pause</Label>
                                    <Textarea
                                        value={status.pause_message}
                                        onChange={(e) => setStatus({ ...status, pause_message: e.target.value })}
                                        placeholder="Ex: Pause midi, retour à 18h!"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Temporary Closure */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Fermeture exceptionnelle
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div>
                                    <Label className="text-lg font-medium">Fermeture temporaire</Label>
                                    <p className="text-sm text-muted-foreground">Pour congés, travaux, etc.</p>
                                </div>
                                <Switch
                                    checked={status.is_temp_closed}
                                    onCheckedChange={(checked) => setStatus({ ...status, is_temp_closed: checked })}
                                />
                            </div>

                            {status.is_temp_closed && (
                                <div className="space-y-4 ml-4">
                                    <div className="space-y-2">
                                        <Label>Date de réouverture</Label>
                                        <Input
                                            type="date"
                                            value={status.temp_closed_until}
                                            onChange={(e) => setStatus({ ...status, temp_closed_until: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message de fermeture</Label>
                                        <Textarea
                                            value={status.temp_closed_message}
                                            onChange={(e) => setStatus({ ...status, temp_closed_message: e.target.value })}
                                            placeholder="Ex: Fermé du 24 au 26 décembre. Joyeuses fêtes!"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Button onClick={handleSaveStatus} disabled={saving} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder le statut'}
                    </Button>
                </TabsContent>

                {/* Hours Tab */}
                <TabsContent value="hours" className="space-y-4">
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4">Horaires d'ouverture</h3>

                        <div className="space-y-3">
                            {hours.map((day, index) => (
                                <div
                                    key={day.day_of_week}
                                    className={`p-3 rounded-lg border ${day.is_open ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/50 border-muted'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={day.is_open}
                                                onCheckedChange={(checked) => updateDayHours(index, 'is_open', checked)}
                                            />
                                            <span className="font-medium w-24">{dayNames[day.day_of_week]}</span>
                                        </div>
                                        {day.is_open && (
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={day.is_continuous}
                                                    onCheckedChange={(checked) => updateDayHours(index, 'is_continuous', checked)}
                                                />
                                                <span className="text-sm text-muted-foreground">Service continu</span>
                                            </div>
                                        )}
                                    </div>

                                    {day.is_open && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                            <div>
                                                <Label className="text-xs">Ouverture</Label>
                                                <Input
                                                    type="time"
                                                    value={day.open_time}
                                                    onChange={(e) => updateDayHours(index, 'open_time', e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            {!day.is_continuous && (
                                                <>
                                                    <div>
                                                        <Label className="text-xs">Fermeture midi</Label>
                                                        <Input
                                                            type="time"
                                                            value={day.close_time}
                                                            onChange={(e) => updateDayHours(index, 'close_time', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Réouverture soir</Label>
                                                        <Input
                                                            type="time"
                                                            value={day.open_time_evening}
                                                            onChange={(e) => updateDayHours(index, 'open_time_evening', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <Label className="text-xs">Fermeture</Label>
                                                <Input
                                                    type="time"
                                                    value={day.close_time_evening}
                                                    onChange={(e) => updateDayHours(index, 'close_time_evening', e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Button onClick={handleSaveHours} disabled={saving} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
                    </Button>
                </TabsContent>

                {/* Banner Tab */}
                <TabsContent value="banner" className="space-y-4">
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Bannière d'annonce
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                                <div>
                                    <Label className="text-lg font-medium">Afficher la bannière</Label>
                                    <p className="text-sm text-muted-foreground">Bandeau d'information en haut du site</p>
                                </div>
                                <Switch
                                    checked={status.show_banner}
                                    onCheckedChange={(checked) => setStatus({ ...status, show_banner: checked })}
                                />
                            </div>

                            {status.show_banner && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Type de bannière</Label>
                                        <div className="flex gap-2">
                                            {(['info', 'warning', 'error'] as const).map(type => (
                                                <Button
                                                    key={type}
                                                    variant={status.banner_type === type ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setStatus({ ...status, banner_type: type })}
                                                    className={
                                                        type === 'info' ? (status.banner_type === type ? 'bg-blue-500' : '') :
                                                            type === 'warning' ? (status.banner_type === type ? 'bg-yellow-500' : '') :
                                                                (status.banner_type === type ? 'bg-red-500' : '')
                                                    }
                                                >
                                                    {type === 'info' ? '🔵 Information' : type === 'warning' ? '🟡 Attention' : '🔴 Urgent'}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Message de la bannière</Label>
                                        <Textarea
                                            value={status.banner_message}
                                            onChange={(e) => setStatus({ ...status, banner_message: e.target.value })}
                                            placeholder="Ex: 🎉 -20% sur toutes les pizzas ce weekend!"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Preview */}
                                    {status.banner_message && (
                                        <div className={`p-3 rounded-lg text-center text-white ${status.banner_type === 'info' ? 'bg-blue-500' :
                                                status.banner_type === 'warning' ? 'bg-yellow-500 text-black' :
                                                    'bg-red-500'
                                            }`}>
                                            <p className="font-medium">Aperçu: {status.banner_message}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Button onClick={handleSaveStatus} disabled={saving} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder l\'annonce'}
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}
