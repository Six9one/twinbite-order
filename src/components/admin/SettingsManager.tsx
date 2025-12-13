import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useAdminSetting, useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import { Tv, LayoutGrid, LayoutList, Save } from 'lucide-react';

export function SettingsManager() {
  const { data: tvPricesSetting, isLoading: loadingTvPrices } = useAdminSetting('tv_show_prices');
  const { data: pizzaLayoutSetting, isLoading: loadingPizzaLayout } = useAdminSetting('pizza_layout');
  const updateSetting = useUpdateAdminSetting();

  const [showTvPrices, setShowTvPrices] = useState(true);
  const [pizzaLayoutMode, setPizzaLayoutMode] = useState('grid');
  const [pizzaLayoutSize, setPizzaLayoutSize] = useState('medium');

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

  if (loadingTvPrices || loadingPizzaLayout) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Paramètres</h2>

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
            Affichage des Pizzas
          </CardTitle>
          <CardDescription>
            Configurer l'affichage des pizzas pour les clients
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
