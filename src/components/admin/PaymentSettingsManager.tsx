import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAdminSetting, useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import { CreditCard, Save, Shield, AlertTriangle, CheckCircle2, Eye, EyeOff, RefreshCw } from 'lucide-react';

export function PaymentSettingsManager() {
  const { data: paymentSetting, isLoading, refetch } = useAdminSetting('payment_settings');
  const updateSetting = useUpdateAdminSetting();

  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(true);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [stripeVerified, setStripeVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (paymentSetting) {
      const value = paymentSetting.setting_value as { 
        online_payments_enabled?: boolean;
        stripe_configured?: boolean;
      };
      setOnlinePaymentsEnabled(value?.online_payments_enabled ?? true);
      setStripeVerified(value?.stripe_configured ?? null);
    }
  }, [paymentSetting]);

  const handleToggleOnlinePayments = async () => {
    const newValue = !onlinePaymentsEnabled;
    setOnlinePaymentsEnabled(newValue);
    
    try {
      await updateSetting.mutateAsync({
        key: 'payment_settings',
        value: { 
          online_payments_enabled: newValue,
          stripe_configured: stripeVerified,
        },
      });
      toast.success(newValue ? 'Paiements en ligne activés' : 'Paiements en ligne désactivés');
    } catch (error) {
      setOnlinePaymentsEnabled(!newValue);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleVerifyStripe = async () => {
    if (!stripeSecretKey.trim()) {
      toast.error('Veuillez entrer une clé secrète Stripe');
      return;
    }

    if (!stripeSecretKey.startsWith('sk_')) {
      toast.error('La clé secrète Stripe doit commencer par sk_');
      return;
    }

    setIsVerifying(true);
    
    // For security, we just validate the format here
    // The actual key update would need to go through Supabase secrets
    setTimeout(async () => {
      try {
        // Mark as configured (actual key must be updated via Supabase secrets)
        await updateSetting.mutateAsync({
          key: 'payment_settings',
          value: { 
            online_payments_enabled: onlinePaymentsEnabled,
            stripe_configured: true,
            stripe_key_last_updated: new Date().toISOString(),
          },
        });
        
        setStripeVerified(true);
        toast.success('Format de clé Stripe validé. Mettez à jour STRIPE_SECRET_KEY dans les secrets Supabase.');
        setStripeSecretKey('');
      } catch (error) {
        toast.error('Erreur lors de la vérification');
      } finally {
        setIsVerifying(false);
      }
    }, 1000);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Paramètres de Paiement</h2>

      {/* Online Payments Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Paiements en Ligne
          </CardTitle>
          <CardDescription>
            Activer ou désactiver les paiements en ligne (Stripe) sur le site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="online-payments" className="text-base font-medium">
                Paiements en ligne
              </Label>
              <p className="text-sm text-muted-foreground">
                {onlinePaymentsEnabled 
                  ? 'Les clients peuvent payer par carte en ligne'
                  : 'Option "Paiement en ligne" masquée au checkout'
                }
              </p>
            </div>
            <Switch
              id="online-payments"
              checked={onlinePaymentsEnabled}
              onCheckedChange={handleToggleOnlinePayments}
            />
          </div>

          {!onlinePaymentsEnabled && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Les paiements en ligne sont désactivés. Seuls les paiements en espèces et par CB à la réception seront disponibles.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Configuration Stripe
          </CardTitle>
          <CardDescription>
            Gérer votre compte Stripe et les clés API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut:</span>
            {stripeVerified ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Configuré
              </Badge>
            ) : (
              <Badge variant="secondary">
                Non vérifié
              </Badge>
            )}
          </div>

          <Separator />

          {/* API Key Input */}
          <div className="space-y-3">
            <Label htmlFor="stripe-key">Clé Secrète Stripe (sk_...)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="stripe-key"
                  type={showSecretKey ? 'text' : 'password'}
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_live_... ou sk_test_..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleVerifyStripe} 
                disabled={isVerifying || !stripeSecretKey.trim()}
                className="gap-2"
              >
                {isVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Vérifier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Pour des raisons de sécurité, la clé n'est pas stockée ici. 
              Après vérification, mettez à jour le secret <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> dans 
              les paramètres de votre projet.
            </p>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Comment changer de compte Stripe:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Obtenez votre clé secrète depuis le Dashboard Stripe</li>
              <li>Vérifiez le format ci-dessus</li>
              <li>Mettez à jour <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> dans les secrets</li>
              <li>Mettez à jour <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> si vous utilisez les webhooks</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Future Payment Providers */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Autres Fournisseurs de Paiement
            <Badge variant="outline">Bientôt</Badge>
          </CardTitle>
          <CardDescription>
            Support pour PayPal, Apple Pay, Google Pay et d'autres fournisseurs à venir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette fonctionnalité sera disponible dans une prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
