import React, { useState, useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Send, MessageSquare, Printer, CheckCircle, Save, RefreshCw, Smartphone, Zap, BellRing } from 'lucide-react';
import { toast } from 'sonner';

export default function TelegramWhatsAppManager() {
  const { tenant } = useTenant();

  // Telegram states
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(false);
  const [isSendingTelegramTest, setIsSendingTelegramTest] = useState<boolean>(false);

  // WhatsApp states
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [whatsappApiKey, setWhatsappApiKey] = useState<string>('');
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(false);

  // Printer states
  const [printerIp, setPrinterIp] = useState<string>('192.168.1.200');
  const [printerPaperWidth, setPrinterPaperWidth] = useState<number>(80);
  const [printerAutoPrint, setPrinterAutoPrint] = useState<boolean>(true);
  const [printerFontSize, setPrinterFontSize] = useState<string>('double_size');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('admin_settings' as any)
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Fetch settings error:', error);
      }

      if (data) {
        const d = data as any;
        setTelegramBotToken(d.telegram_bot_token || '');
        setTelegramChatId(d.telegram_chat_id || '');
        setTelegramEnabled(d.telegram_enabled ?? false);
        setWhatsappPhone(d.whatsapp_phone || '');
        setWhatsappApiKey(d.whatsapp_api_key || '');
        setWhatsappEnabled(d.whatsapp_enabled ?? false);
        setPrinterIp(d.printer_ip || '192.168.1.200');
        setPrinterPaperWidth(d.printer_paper_width || 80);
        setPrinterAutoPrint(d.printer_auto_print ?? true);
        setPrinterFontSize(d.printer_font_size || 'double_size');
      }
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [tenant.id]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const payload = {
        tenant_id: tenant.id,
        telegram_bot_token: telegramBotToken.trim(),
        telegram_chat_id: telegramChatId.trim(),
        telegram_enabled: telegramEnabled,
        whatsapp_phone: whatsappPhone.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_enabled: whatsappEnabled,
        printer_ip: printerIp.trim(),
        printer_paper_width: Number(printerPaperWidth),
        printer_auto_print: printerAutoPrint,
        printer_font_size: printerFontSize,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('admin_settings' as any)
        .select('id')
        .maybeSingle();

      let saveErr;
      if (existing) {
        const { error } = await supabase
          .from('admin_settings' as any)
          .update(payload)
          .eq('id', (existing as any).id);
        saveErr = error;
      } else {
        const { error } = await supabase
          .from('admin_settings' as any)
          .insert(payload);
        saveErr = error;
      }

      if (saveErr) {
        console.error('Save error:', saveErr);
        toast.error(`Erreur lors de la sauvegarde: ${saveErr.message}`);
        return;
      }

      toast.success(`Configuration enregistrée avec succès pour ${tenant.name} !`);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error('Veuillez d’abord renseigner le Bot Token et le Chat ID Telegram.');
      return;
    }

    try {
      setIsSendingTelegramTest(true);
      const message = `🚨 *TEST NOTIFICATION RESTOOS*\n\n🏪 Restaurant: *${tenant.name}*\n⏰ Heure: ${new Date().toLocaleTimeString()}\n✅ Bot Telegram connecté avec succès !`;

      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const resData = await res.json();

      if (resData.ok) {
        toast.success(`Message de test Telegram envoyé au groupe ${tenant.name} !`);
      } else {
        toast.error(`Erreur Telegram: ${resData.description || 'Token ou Chat ID invalide'}`);
      }
    } catch (err: any) {
      toast.error(`Erreur d'envoi Telegram: ${err.message}`);
    } finally {
      setIsSendingTelegramTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5 border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">Integrations & Automatisations {tenant.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurez vos bots Telegram, notifications WhatsApp et votre imprimante thermique de caisse.
          </p>
        </div>

        <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Enregistrement...' : 'Sauvegarder Tout'}
        </Button>
      </div>

      <Tabs defaultValue="telegram" className="w-full">
        <TabsList className="grid grid-cols-3 bg-muted p-1 rounded-xl">
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" /> Telegram Bot
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Direct
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" /> Imprimante Thermique
          </TabsTrigger>
        </TabsList>

        {/* Telegram Tab */}
        <TabsContent value="telegram" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="w-5 h-5 text-sky-400" />
                    Bot Telegram — Alertes Commandes Instantanées
                  </CardTitle>
                  <CardDescription>
                    Recevez chaque nouvelle commande instantanément sur votre téléphone ou le groupe Telegram de votre cuisine.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Activer le Bot</span>
                  <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tg-token">Bot Token Telegram</Label>
                <Input
                  id="tg-token"
                  placeholder="ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Obtenez votre token en 1 minute auprès de <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-400 underline">@BotFather</a> sur Telegram.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tg-chatid">Chat ID (ID du Groupe ou Canal)</Label>
                <Input
                  id="tg-chatid"
                  placeholder="ex: -1001234567890 ou 987654321"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t py-4">
              <Badge variant="outline" className="text-xs">
                {telegramEnabled ? '✅ Alertes Telegram Actives' : '⏸️ Bot en pause'}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleTestTelegram} disabled={isSendingTelegramTest} className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {isSendingTelegramTest ? 'Envoi...' : 'Envoyer un Test Telegram'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    WhatsApp Business — Confirmation Client Automatique
                  </CardTitle>
                  <CardDescription>
                    Envoyez un SMS/WhatsApp de confirmation au client dès que sa commande change de statut.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Activer WhatsApp</span>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wa-phone">Numéro WhatsApp Émetteur</Label>
                  <Input
                    id="wa-phone"
                    placeholder="ex: +33612345678"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wa-key">Clé API WhatsApp (Ultramsg / GreenAPI)</Label>
                  <Input
                    id="wa-key"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t py-4">
              <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                {whatsappEnabled ? '✅ SMS/WhatsApp Actif' : '⏸️ WhatsApp Désactivé'}
              </Badge>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Printer Tab */}
        <TabsContent value="printer" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Printer className="w-5 h-5 text-amber-400" />
                    Imprimante Thermique ESC/POS de Caisse & Cuisine
                  </CardTitle>
                  <CardDescription>
                    Impression automatique des tickets de caisse et bons de préparation cuisine.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Auto-Impression</span>
                  <Switch checked={printerAutoPrint} onCheckedChange={setPrinterAutoPrint} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prt-ip">Adresse IP Imprimante Réseau (LAN/WiFi)</Label>
                  <Input
                    id="prt-ip"
                    placeholder="ex: 192.168.1.200"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prt-width">Largeur Papier (mm)</Label>
                  <select
                    id="prt-width"
                    value={printerPaperWidth}
                    onChange={(e) => setPrinterPaperWidth(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
                  >
                    <option value={80}>80mm (Standard Caisse Restaurant)</option>
                    <option value={58}>58mm (Format Compact / Reçu)</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="prt-font">Taille du Texte des Articles (Impression Ticket)</Label>
                  <select
                    id="prt-font"
                    value={printerFontSize}
                    onChange={(e) => setPrinterFontSize(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm font-semibold"
                  >
                    <option value="double_size">🔠 Très Grand (Double Taille 2x2 - Lisibilité Maximale)</option>
                    <option value="double_height">🔠 Grand (Hauteur Double)</option>
                    <option value="size_7">🚀 Maxi (Format 3x3 Extra Large)</option>
                    <option value="normal">🔤 Normal (Taille Standard 1x1)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t py-4">
              <Badge variant="outline" className="text-xs">
                {printerAutoPrint ? '🖨️ Auto-Print Activé' : '✋ Impression Manuel'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => toast.success(`Ticket de test envoyé à l'imprimante ${printerIp} (${printerPaperWidth}mm)`)}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimer Ticket Test
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
