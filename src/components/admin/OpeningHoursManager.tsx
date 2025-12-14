import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Save, AlertCircle } from 'lucide-react';

interface OpeningHour {
  id: string;
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
}

const DEFAULT_HOURS: Omit<OpeningHour, 'id'>[] = [
  { day_of_week: 1, day_name: 'Lundi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 2, day_name: 'Mardi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 3, day_name: 'Mercredi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 4, day_name: 'Jeudi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 5, day_name: 'Vendredi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 6, day_name: 'Samedi', is_open: true, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  { day_of_week: 0, day_name: 'Dimanche', is_open: false, morning_open: null, morning_close: null, evening_open: null, evening_close: null },
];

export function OpeningHoursManager() {
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('opening_hours' as any)
      .select('*')
      .order('day_of_week', { ascending: true });
    
    if (!error && data) {
      setHours(data as unknown as OpeningHour[]);
    }
    setLoading(false);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    setHours(hours.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    
    for (const hour of hours) {
      const { error } = await supabase
        .from('opening_hours' as any)
        .update({
          is_open: hour.is_open,
          morning_open: hour.morning_open,
          morning_close: hour.morning_close,
          evening_open: hour.evening_open,
          evening_close: hour.evening_close,
        } as any)
        .eq('id', hour.id);
      
      if (error) {
        toast.error(`Erreur pour ${hour.day_name}`);
        setSaving(false);
        return;
      }
    }
    
    toast.success('Horaires mis à jour!');
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-500" />
          Horaires d'ouverture
        </h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <Card className="p-4 bg-amber-500/10 border-amber-500/30">
        <p className="text-sm text-muted-foreground">
          💡 Configurez les horaires d'ouverture du restaurant. 
          Le format est HH:MM (ex: 11:00, 15:00, 00:00 pour minuit).
        </p>
      </Card>

      <div className="space-y-3">
        {hours.map((hour) => (
          <Card key={hour.id} className={`p-4 ${!hour.is_open ? 'opacity-60 bg-muted/50' : ''}`}>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Day name */}
              <div className="w-28 font-semibold">{hour.day_name}</div>
              
              {/* Open toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={hour.is_open}
                  onCheckedChange={(checked) => handleUpdate(hour.id, 'is_open', checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {hour.is_open ? 'Ouvert' : 'Fermé'}
                </span>
              </div>

              {hour.is_open && (
                <>
                  {/* Morning hours */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Matin:</span>
                    <Input
                      type="time"
                      value={hour.morning_open || ''}
                      onChange={(e) => handleUpdate(hour.id, 'morning_open', e.target.value || null)}
                      className="w-28"
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={hour.morning_close || ''}
                      onChange={(e) => handleUpdate(hour.id, 'morning_close', e.target.value || null)}
                      className="w-28"
                    />
                  </div>

                  {/* Evening hours */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Soir:</span>
                    <Input
                      type="time"
                      value={hour.evening_open || ''}
                      onChange={(e) => handleUpdate(hour.id, 'evening_open', e.target.value || null)}
                      className="w-28"
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={hour.evening_close || ''}
                      onChange={(e) => handleUpdate(hour.id, 'evening_close', e.target.value || null)}
                      className="w-28"
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}