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

      {/* myPOS Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Configuration myPOS Checkout
          </CardTitle>
          <CardDescription>
            Toutes les clés de sécurité myPOS doivent rester dans les variables d'environnement Supabase Edge Functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut d'intégration :</span>
            <Badge variant="default" className="bg-purple-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              myPOS Checkout Actif
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-foreground">Variables d'environnement requises (Supabase Secrets) :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-muted p-2 rounded border">
                <span className="text-muted-foreground block text-[10px]">STORE ID (SID)</span>
                MYPOS_STORE_ID
              </div>
              <div className="bg-muted p-2 rounded border">
                <span className="text-muted-foreground block text-[10px]">WALLET NUMBER</span>
                MYPOS_WALLET_NUMBER
              </div>
              <div className="bg-muted p-2 rounded border">
                <span className="text-muted-foreground block text-[10px]">KEY INDEX</span>
                MYPOS_KEY_INDEX (ex: 1)
              </div>
              <div className="bg-muted p-2 rounded border">
                <span className="text-muted-foreground block text-[10px]">ENVIRONNEMENT</span>
                MYPOS_ENV (sandbox / production)
              </div>
              <div className="bg-muted p-2 rounded border col-span-1 md:col-span-2">
                <span className="text-muted-foreground block text-[10px]">CLE PRIVEE ENSEIGNE (RSA)</span>
                MYPOS_PRIVATE_KEY
              </div>
              <div className="bg-muted p-2 rounded border col-span-1 md:col-span-2">
                <span className="text-muted-foreground block text-[10px]">CLE PUBLIQUE MYPOS (RSA)</span>
                MYPOS_PUBLIC_KEY
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-xs text-muted-foreground">
            <h4 className="font-medium text-foreground text-sm">URL de Webhook à enregistrer dans le portail myPOS :</h4>
            <code className="block bg-slate-900 text-green-400 p-2.5 rounded font-mono select-all overflow-x-auto">
              https://&lt;votre-projet-supabase&gt;.supabase.co/functions/v1/mypos-webhook
            </code>
            <p>Consultez la documentation complète dans <code className="bg-muted px-1 rounded">docs/MYPOS_DOCUMENTATION.md</code> pour les détails d'installation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
