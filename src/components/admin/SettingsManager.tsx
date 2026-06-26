import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useAdminSetting, useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import { Tv, LayoutGrid, LayoutList, Save, Gift, Clock, Smartphone, Sparkles } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Lundi' },
  { value: 'Tuesday', label: 'Mardi' },
  { value: 'Wednesday', label: 'Mercredi' },
  { value: 'Thursday', label: 'Jeudi' },
  { value: 'Friday', label: 'Vendredi' },
  { value: 'Saturday', label: 'Samedi' },
  { value: 'Sunday', label: 'Dimanche' },
];

export function SettingsManager() {
  const { data: tvPricesSetting, isLoading: loadingTvPrices } = useAdminSetting('tv_show_prices');
  const { data: pizzaLayoutSetting, isLoading: loadingPizzaLayout } = useAdminSetting('pizza_layout');
  const { data: promoSettingsSetting, isLoading: loadingPromoSettings } = useAdminSetting('promo_page_settings');
  const { data: pizzaOrderingModeSetting, isLoading: loadingPizzaOrderingMode } = useAdminSetting('pizza_ordering_mode');
  const updateSetting = useUpdateAdminSetting();

  const [showTvPrices, setShowTvPrices] = useState(true);
  const [pizzaLayoutMode, setPizzaLayoutMode] = useState('grid');
  const [pizzaLayoutSize, setPizzaLayoutSize] = useState('medium');

  // Promo page states
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoScheduleType, setPromoScheduleType] = useState<'manual' | 'scheduled'>('manual');
  const [promoScheduledDays, setPromoScheduledDays] = useState<string[]>(['Friday', 'Saturday', 'Sunday']);
  const [promoStartTime, setPromoStartTime] = useState('18:00');
  const [promoEndTime, setPromoEndTime] = useState('23:59');

  // Pizza ordering mode states
  const [pizzaOrderingMode, setPizzaOrderingMode] = useState<'classic' | 'streamlined'>('classic');

  useEffect(() => {
    if (tvPricesSetting) {
      const value = tvPricesSetting.setting_value as { enabled?: boolean };
      setShowTvPrices(value?.enabled ?? true);
    }
  }, [tvPricesSetting]);

  useEffect(() => {
    if (pizzaLayoutSetting) {
      const value = pizzaLayoutSetting.setting_value as { mode?: string; size?: string };
      setPizzaLayoutMode(value?.mode ?? 'grid');
      setPizzaLayoutSize(value?.size ?? 'medium');
    }
  }, [pizzaLayoutSetting]);

  useEffect(() => {
    if (promoSettingsSetting) {
      const value = promoSettingsSetting.setting_value as {
        enabled?: boolean;
        schedule_type?: 'manual' | 'scheduled';
        scheduled_days?: string[];
        scheduled_start_time?: string;
        scheduled_end_time?: string;
      };
      setPromoEnabled(value?.enabled ?? false);
      setPromoScheduleType(value?.schedule_type ?? 'manual');
      setPromoScheduledDays(value?.scheduled_days ?? ['Friday', 'Saturday', 'Sunday']);
      setPromoStartTime(value?.scheduled_start_time ?? '18:00');
      setPromoEndTime(value?.scheduled_end_time ?? '23:59');
    }
  }, [promoSettingsSetting]);

  useEffect(() => {
    if (pizzaOrderingModeSetting) {
      const value = pizzaOrderingModeSetting.setting_value as { mode?: 'classic' | 'streamlined' };
      setPizzaOrderingMode(value?.mode ?? 'classic');
    }
  }, [pizzaOrderingModeSetting]);

  const handleSaveTvPrices = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'tv_show_prices',
        value: { enabled: showTvPrices },
      });
      toast.success('Paramètres TV mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleSavePizzaLayout = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'pizza_layout',
        value: { mode: pizzaLayoutMode, size: pizzaLayoutSize },
      });
      toast.success('Paramètres pizza mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleSavePromoSettings = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'promo_page_settings',
        value: {
          enabled: promoEnabled,
          schedule_type: promoScheduleType,
          scheduled_days: promoScheduledDays,
          scheduled_start_time: promoStartTime,
          scheduled_end_time: promoEndTime,
        },
      });
      toast.success('Paramètres de la page promo mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleSavePizzaOrderingMode = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'pizza_ordering_mode',
        value: { mode: pizzaOrderingMode },
      });
      toast.success('Mode de commande pizza mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const togglePromoScheduledDay = (day: string) => {
    setPromoScheduledDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loadingTvPrices || loadingPizzaLayout || loadingPromoSettings || loadingPizzaOrderingMode) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Paramètres</h2>

      {/* Pizza Ordering Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            Mode de Commande des Pizzas (Site Normal)
          </CardTitle>
          <CardDescription>
            Choisir le type d'interface pour la sélection et commande des pizzas par les clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={pizzaOrderingMode} 
            onValueChange={(val: 'classic' | 'streamlined') => setPizzaOrderingMode(val)}
            className="flex flex-col gap-3"
          >
            <div className="flex items-start space-x-3 p-3 border rounded-xl hover:bg-muted/40 cursor-pointer transition-colors">
              <RadioGroupItem value="classic" id="mode-classic" className="mt-1" />
              <Label htmlFor="mode-classic" className="flex flex-col gap-1 cursor-pointer font-normal flex-1">
                <span className="font-semibold flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Mode Classique (Wizard Multi-étapes)
                </span>
                <span className="text-sm text-muted-foreground">
                  Sélection du format (Senior/Mega) → Sélection base (Tomate/Crème) → Liste des pizzas → Personnalisation → Popups d'upsell.
                </span>
              </Label>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-xl hover:bg-muted/40 cursor-pointer transition-colors">
              <RadioGroupItem value="streamlined" id="mode-streamlined" className="mt-1" />
              <Label htmlFor="mode-streamlined" className="flex flex-col gap-1 cursor-pointer font-normal flex-1">
                <span className="font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Mode Simplifié (Écran Unique - Phone Friendly)
                </span>
                <span className="text-sm text-muted-foreground">
                  Sélection de la taille et de la base en haut de la page, ajout direct en un clic (`+`/`-`), personnalisation facultative et notes directement au niveau de la carte. Idéal pour éliminer la frustration sur mobile.
                </span>
              </Label>
            </div>
          </RadioGroup>

          <Button onClick={handleSavePizzaOrderingMode} className="gap-2">
            <Save className="w-4 h-4" />
            Sauvegarder le mode de commande
          </Button>
        </CardContent>
      </Card>

      {/* Promo Weekend Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Gestion de l'Offre Promo Week-end
          </CardTitle>
          <CardDescription>
            Contrôler l'activation et la planification de la page promotionnelle (/promo-weekend et /promo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
            <div className="space-y-0.5">
              <Label htmlFor="promo-enabled" className="text-base font-semibold">
                Activer l'offre Promo
              </Label>
              <p className="text-sm text-muted-foreground">
                Si désactivé, les clients verront une page indiquant que l'offre est indisponible.
              </p>
            </div>
            <Switch
              id="promo-enabled"
              checked={promoEnabled}
              onCheckedChange={setPromoEnabled}
            />
          </div>

          {promoEnabled && (
            <>
              {/* Schedule Type */}
              <div className="space-y-3">
                <Label className="text-base">Mode de fonctionnement</Label>
                <RadioGroup 
                  value={promoScheduleType} 
                  onValueChange={(val: 'manual' | 'scheduled') => setPromoScheduleType(val)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="promo-manual" />
                    <Label htmlFor="promo-manual" className="cursor-pointer">
                      <strong>Manuel :</strong> Toujours active tant que le bouton ci-dessus est activé
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="promo-scheduled" />
                    <Label htmlFor="promo-scheduled" className="cursor-pointer">
                      <strong>Planifié :</strong> Activer automatiquement selon un calendrier hebdomadaire
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Schedule Configuration */}
              {promoScheduleType === 'scheduled' && (
                <div className="space-y-4 border p-4 rounded-xl bg-muted/20 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Jours d'activation de la promo
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={promoScheduledDays.includes(day.value)}
                            onCheckedChange={() => togglePromoScheduledDay(day.value)}
                          />
                          <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm font-medium">
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-time" className="text-xs">Heure de début</Label>
                      <Input
                        type="time"
                        id="start-time"
                        value={promoStartTime}
                        onChange={(e) => setPromoStartTime(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end-time" className="text-xs">Heure de fin</Label>
                      <Input
                        type="time"
                        id="end-time"
                        value={promoEndTime}
                        onChange={(e) => setPromoEndTime(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <Button onClick={handleSavePromoSettings} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
            <Save className="w-4 h-4" />
            Sauvegarder les paramètres promo
          </Button>
        </CardContent>
      </Card>

      {/* TV Dashboard Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Affichage TV Dashboard
          </CardTitle>
          <CardDescription>
            Configurer l'affichage des informations sur le TV Dashboard cuisine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-prices">Afficher les prix</Label>
              <p className="text-sm text-muted-foreground">
                Affiche les prix de chaque produit sur le TV Dashboard
              </p>
            </div>
            <Switch
              id="show-prices"
              checked={showTvPrices}
              onCheckedChange={setShowTvPrices}
            />
          </div>
          <Button onClick={handleSaveTvPrices} className="gap-2">
            <Save className="w-4 h-4" />
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* Pizza Layout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Affichage des Pizzas (Wizard Classique)
          </CardTitle>
          <CardDescription>
            Configurer l'affichage de la grille classique des pizzas pour les clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Layout Mode */}
          <div className="space-y-3">
            <Label>Mode d'affichage</Label>
            <RadioGroup value={pizzaLayoutMode} onValueChange={setPizzaLayoutMode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grid" id="grid" />
                <Label htmlFor="grid" className="flex items-center gap-2 cursor-pointer">
                  <LayoutGrid className="w-4 h-4" />
                  Grille
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="list" id="list" />
                <Label htmlFor="list" className="flex items-center gap-2 cursor-pointer">
                  <LayoutList className="w-4 h-4" />
                  Liste
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Card Size */}
          <div className="space-y-3">
            <Label>Taille des cartes</Label>
            <RadioGroup value={pizzaLayoutSize} onValueChange={setPizzaLayoutSize}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small" className="cursor-pointer">Petit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer">Moyen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large" className="cursor-pointer">Grand</Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSavePizzaLayout} className="gap-2">
            <Save className="w-4 h-4" />
            Sauvegarder
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

