import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAdminSetting, useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import {
  Printer, Save, RotateCcw, Eye, FileText,
  ChefHat, Store, Code, HelpCircle, Copy
} from 'lucide-react';

interface TicketTemplate {
  name: string;
  header: string;
  subheader: string;
  footer: string;
  showLogo: boolean;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showCustomerInfo: boolean;
  showCustomerPhone: boolean;
  showDeliveryAddress: boolean;
  showItemDetails: boolean;
  showItemNotes: boolean;
  showPaymentMethod: boolean;
  showPaymentStatus: boolean;
  showSubtotal: boolean;
  showTva: boolean;
  showDeliveryFee: boolean;
  showTotal: boolean;
  showCustomerNotes: boolean;
  showScheduledTime: boolean;
  customCss: string;
  bodyTemplate: string;
}

interface TicketSettings {
  kitchenTemplate: TicketTemplate;
  counterTemplate: TicketTemplate;
  activeTemplate: 'kitchen' | 'counter';
  autoPrint: boolean;
  paperWidth: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
}

const defaultKitchenTemplate: TicketTemplate = {
  name: 'Ticket Cuisine',
  header: 'TWIN PIZZA - CUISINE',
  subheader: '',
  footer: '',
  showLogo: false,
  showOrderNumber: true,
  showDateTime: true,
  showCustomerInfo: true,
  showCustomerPhone: false,
  showDeliveryAddress: true,
  showItemDetails: true,
  showItemNotes: true,
  showPaymentMethod: false,
  showPaymentStatus: true,
  showSubtotal: false,
  showTva: false,
  showDeliveryFee: false,
  showTotal: false,
  showCustomerNotes: true,
  showScheduledTime: true,
  customCss: '',
  bodyTemplate: `{{#items}}
<b>{{quantity}}x {{name}}</b>
{{#size}}<center>📏 {{size}}</center>{{/size}}
{{#meats}}<center>🥩 {{meats}}</center>{{/meats}}
{{#sauces}}<center>🥫 {{sauces}}</center>{{/sauces}}
{{#garnitures}}<center>🥬 {{garnitures}}</center>{{/garnitures}}
{{#supplements}}<center>➕ {{supplements}}</center>{{/supplements}}
{{#note}}<i>📝 {{note}}</i>{{/note}}
---
{{/items}}`
};

const defaultCounterTemplate: TicketTemplate = {
  name: 'Ticket Client',
  header: 'TWIN PIZZA',
  subheader: 'Grand-Couronne\n60 Rue Georges Clemenceau',
  footer: 'Merci de votre commande!\n🍕 À bientôt! 🍕',
  showLogo: true,
  showOrderNumber: true,
  showDateTime: true,
  showCustomerInfo: true,
  showCustomerPhone: true,
  showDeliveryAddress: true,
  showItemDetails: true,
  showItemNotes: true,
  showPaymentMethod: true,
  showPaymentStatus: true,
  showSubtotal: true,
  showTva: true,
  showDeliveryFee: true,
  showTotal: true,
  showCustomerNotes: true,
  showScheduledTime: true,
  customCss: '',
  bodyTemplate: `{{#items}}
<div class="item">
  <span>{{quantity}}x {{name}}</span>
  <span>{{price}}€</span>
</div>
{{#details}}<div class="details">{{details}}</div>{{/details}}
{{#note}}<div class="note">📝 {{note}}</div>{{/note}}
{{/items}}`
};

const defaultSettings: TicketSettings = {
  kitchenTemplate: defaultKitchenTemplate,
  counterTemplate: defaultCounterTemplate,
  activeTemplate: 'counter',
  autoPrint: false,
  paperWidth: '80mm',
  fontSize: 'medium'
};

const availableVariables = [
  { variable: '{{order_number}}', description: 'Numéro de commande' },
  { variable: '{{order_type}}', description: 'Type (livraison/emporter/surplace)' },
  { variable: '{{customer_name}}', description: 'Nom du client' },
  { variable: '{{customer_phone}}', description: 'Téléphone client' },
  { variable: '{{customer_address}}', description: 'Adresse de livraison' },
  { variable: '{{created_at}}', description: 'Date/heure de commande' },
  { variable: '{{scheduled_for}}', description: 'Heure programmée' },
  { variable: '{{subtotal}}', description: 'Sous-total HT' },
  { variable: '{{tva}}', description: 'TVA (10%)' },
  { variable: '{{delivery_fee}}', description: 'Frais de livraison' },
  { variable: '{{total}}', description: 'Total TTC' },
  { variable: '{{payment_method}}', description: 'Mode de paiement' },
  { variable: '{{payment_status}}', description: 'Statut paiement' },
  { variable: '{{customer_notes}}', description: 'Notes client' },
  { variable: '{{#items}}...{{/items}}', description: 'Boucle sur les articles' },
  { variable: '{{quantity}}', description: 'Quantité article' },
  { variable: '{{name}}', description: 'Nom article' },
  { variable: '{{price}}', description: 'Prix article' },
  { variable: '{{size}}', description: 'Taille (pizza)' },
  { variable: '{{meats}}', description: 'Viandes sélectionnées' },
  { variable: '{{sauces}}', description: 'Sauces sélectionnées' },
  { variable: '{{garnitures}}', description: 'Garnitures' },
  { variable: '{{supplements}}', description: 'Suppléments' },
  { variable: '{{note}}', description: 'Note article' },
];

const escPosCommands = [
  { command: '<b>...</b>', description: 'Texte en gras' },
  { command: '<i>...</i>', description: 'Texte en italique' },
  { command: '<u>...</u>', description: 'Texte souligné' },
  { command: '<center>...</center>', description: 'Texte centré' },
  { command: '<right>...</right>', description: 'Texte aligné à droite' },
  { command: '<large>...</large>', description: 'Grande police' },
  { command: '<small>...</small>', description: 'Petite police' },
  { command: '---', description: 'Ligne de séparation' },
  { command: '===', description: 'Double ligne' },
  { command: '<cut>', description: 'Coupe papier' },
  { command: '<feed>', description: 'Saut de ligne' },
];

export function TicketTemplateManager() {
  const { data: settingsData, isLoading } = useAdminSetting('ticket_templates');
  const updateSetting = useUpdateAdminSetting();

  const [settings, setSettings] = useState<TicketSettings>(defaultSettings);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'kitchen' | 'counter'>('counter');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (settingsData?.setting_value) {
      const saved = settingsData.setting_value as unknown as TicketSettings;
      setSettings({
        ...defaultSettings,
        ...saved,
        kitchenTemplate: { ...defaultKitchenTemplate, ...saved.kitchenTemplate },
        counterTemplate: { ...defaultCounterTemplate, ...saved.counterTemplate }
      });
    }
  }, [settingsData]);

  const currentTemplate = activeTemplateTab === 'kitchen' ? settings.kitchenTemplate : settings.counterTemplate;

  const updateTemplate = (field: keyof TicketTemplate, value: any) => {
    setSettings(prev => ({
      ...prev,
      [activeTemplateTab === 'kitchen' ? 'kitchenTemplate' : 'counterTemplate']: {
        ...currentTemplate,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'ticket_templates',
        value: settings as any
      });
      toast.success('Templates de tickets sauvegardés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleReset = () => {
    if (activeTemplateTab === 'kitchen') {
      setSettings(prev => ({ ...prev, kitchenTemplate: defaultKitchenTemplate }));
    } else {
      setSettings(prev => ({ ...prev, counterTemplate: defaultCounterTemplate }));
    }
    toast.success('Template réinitialisé');
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success('Variable copiée');
  };

  const generatePreviewHtml = () => {
    const template = currentTemplate;
    const sampleOrder = {
      order_number: 'TW-2024-001',
      order_type: 'livraison',
      customer_name: 'Jean Dupont',
      customer_phone: '06 12 34 56 78',
      customer_address: '60 Rue Georges Clemenceau, Grand-Couronne',
      created_at: new Date().toLocaleString('fr-FR'),
      scheduled_for: null,
      subtotal: 28.50,
      tva: 2.85,
      delivery_fee: 2.00,
      total: 33.35,
      payment_method: 'CB',
      payment_status: 'NON PAYÉ',
      customer_notes: 'Sans oignons svp',
      items: [
        { quantity: 1, name: 'Pizza Margherita', price: 12.00, size: 'MEGA', meats: '', sauces: 'Tomate', garnitures: '', supplements: 'Mozzarella +1€', note: '' },
        { quantity: 2, name: 'Soufflé Poulet', price: 8.50, size: '', meats: 'Poulet', sauces: 'Algérienne, Samouraï', garnitures: 'Frites, Oignons', supplements: '', note: 'Bien cuit' }
      ]
    };

    let html = `
      <div style="font-family: monospace; width: ${settings.paperWidth}; padding: 10px; background: white; color: black;">
        ${template.showLogo ? '<div style="text-align: center; margin-bottom: 10px;">🍕</div>' : ''}
        <div style="text-align: center; font-weight: bold; font-size: ${settings.fontSize === 'large' ? '18px' : settings.fontSize === 'small' ? '12px' : '14px'};">${template.header}</div>
        ${template.subheader ? `<div style="text-align: center; font-size: 10px; white-space: pre-line;">${template.subheader}</div>` : ''}
        <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
        ${template.showOrderNumber ? `<div><strong>Commande:</strong> ${sampleOrder.order_number}</div>` : ''}
        ${template.showDateTime ? `<div><strong>Date:</strong> ${sampleOrder.created_at}</div>` : ''}
        <div><strong>Type:</strong> ${sampleOrder.order_type.toUpperCase()}</div>
        ${template.showCustomerInfo ? `<div><strong>Client:</strong> ${sampleOrder.customer_name}</div>` : ''}
        ${template.showCustomerPhone ? `<div><strong>Tél:</strong> ${sampleOrder.customer_phone}</div>` : ''}
        ${template.showDeliveryAddress ? `<div><strong>Adresse:</strong> ${sampleOrder.customer_address}</div>` : ''}
        <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
        ${sampleOrder.items.map(item => `
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>${item.quantity}x ${item.name}</span>
            ${template.showItemDetails ? `<span>${item.price.toFixed(2)}€</span>` : ''}
          </div>
          ${template.showItemDetails && item.size ? `<div style="font-size: 10px; margin-left: 10px;">📏 ${item.size}</div>` : ''}
          ${template.showItemDetails && item.meats ? `<div style="font-size: 10px; margin-left: 10px;">🥩 ${item.meats}</div>` : ''}
          ${template.showItemDetails && item.sauces ? `<div style="font-size: 10px; margin-left: 10px;">🥫 ${item.sauces}</div>` : ''}
          ${template.showItemDetails && item.garnitures ? `<div style="font-size: 10px; margin-left: 10px;">🥬 ${item.garnitures}</div>` : ''}
          ${template.showItemDetails && item.supplements ? `<div style="font-size: 10px; margin-left: 10px;">➕ ${item.supplements}</div>` : ''}
          ${template.showItemNotes && item.note ? `<div style="font-size: 10px; margin-left: 10px; font-style: italic;">📝 ${item.note}</div>` : ''}
        `).join('')}
        <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
        ${template.showSubtotal ? `<div style="display: flex; justify-content: space-between;"><span>Sous-total:</span><span>${sampleOrder.subtotal.toFixed(2)}€</span></div>` : ''}
        ${template.showTva ? `<div style="display: flex; justify-content: space-between;"><span>TVA (10%):</span><span>${sampleOrder.tva.toFixed(2)}€</span></div>` : ''}
        ${template.showDeliveryFee ? `<div style="display: flex; justify-content: space-between;"><span>Livraison:</span><span>${sampleOrder.delivery_fee.toFixed(2)}€</span></div>` : ''}
        ${template.showTotal ? `<div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;"><span>TOTAL:</span><span>${sampleOrder.total.toFixed(2)}€</span></div>` : ''}
        ${template.showPaymentMethod ? `<div><strong>Paiement:</strong> ${sampleOrder.payment_method}</div>` : ''}
        ${template.showPaymentStatus ? `<div style="background: #fee; padding: 4px; text-align: center; font-weight: bold;">${sampleOrder.payment_status}</div>` : ''}
        ${template.showCustomerNotes && sampleOrder.customer_notes ? `<div style="background: #f0f0f0; padding: 5px; margin-top: 8px; font-style: italic;">📝 ${sampleOrder.customer_notes}</div>` : ''}
        <div style="border-top: 2px dashed black; margin: 10px 0;"></div>
        ${template.footer ? `<div style="text-align: center; white-space: pre-line;">${template.footer}</div>` : ''}
      </div>
    `;
    return html;
  };

  if (isLoading) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            Templates de Tickets
          </h2>
          <p className="text-muted-foreground">Personnalisez le contenu et le format des tickets thermiques</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Masquer' : 'Aperçu'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={updateSetting.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Save className="w-4 h-4 mr-2" />
            {updateSetting.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paramètres généraux</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Largeur papier</Label>
            <select
              value={settings.paperWidth}
              onChange={(e) => setSettings(prev => ({ ...prev, paperWidth: e.target.value as '58mm' | '80mm' }))}
              className="w-full h-10 px-3 rounded-md border bg-background"
            >
              <option value="58mm">58mm (étroit)</option>
              <option value="80mm">80mm (standard)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Taille police</Label>
            <select
              value={settings.fontSize}
              onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value as 'small' | 'medium' | 'large' }))}
              className="w-full h-10 px-3 rounded-md border bg-background"
            >
              <option value="small">Petit</option>
              <option value="medium">Moyen</option>
              <option value="large">Grand</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Template par défaut</Label>
            <select
              value={settings.activeTemplate}
              onChange={(e) => setSettings(prev => ({ ...prev, activeTemplate: e.target.value as 'kitchen' | 'counter' }))}
              className="w-full h-10 px-3 rounded-md border bg-background"
            >
              <option value="counter">Client (comptoir)</option>
              <option value="kitchen">Cuisine</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={settings.autoPrint}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPrint: checked }))}
            />
            <Label>Impression auto</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTemplateTab} onValueChange={(v) => setActiveTemplateTab(v as 'kitchen' | 'counter')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="counter" className="gap-2">
                <Store className="w-4 h-4" />
                Ticket Client
              </TabsTrigger>
              <TabsTrigger value="kitchen" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Ticket Cuisine
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTemplateTab} className="space-y-4 mt-4">
              {/* Header/Footer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">En-tête & Pied de page</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titre principal</Label>
                    <Input
                      value={currentTemplate.header}
                      onChange={(e) => updateTemplate('header', e.target.value)}
                      placeholder="TWIN PIZZA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sous-titre (adresse, etc.)</Label>
                    <Textarea
                      value={currentTemplate.subheader}
                      onChange={(e) => updateTemplate('subheader', e.target.value)}
                      placeholder="Grand-Couronne&#10;60 Rue Georges Clemenceau"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pied de page</Label>
                    <Textarea
                      value={currentTemplate.footer}
                      onChange={(e) => updateTemplate('footer', e.target.value)}
                      placeholder="Merci de votre commande!"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Toggle Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Éléments à afficher</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: 'showLogo', label: 'Logo' },
                      { key: 'showOrderNumber', label: 'N° commande' },
                      { key: 'showDateTime', label: 'Date/Heure' },
                      { key: 'showCustomerInfo', label: 'Nom client' },
                      { key: 'showCustomerPhone', label: 'Téléphone' },
                      { key: 'showDeliveryAddress', label: 'Adresse livraison' },
                      { key: 'showItemDetails', label: 'Détails articles' },
                      { key: 'showItemNotes', label: 'Notes articles' },
                      { key: 'showPaymentMethod', label: 'Mode paiement' },
                      { key: 'showPaymentStatus', label: 'Statut paiement' },
                      { key: 'showSubtotal', label: 'Sous-total' },
                      { key: 'showTva', label: 'TVA' },
                      { key: 'showDeliveryFee', label: 'Frais livraison' },
                      { key: 'showTotal', label: 'Total' },
                      { key: 'showCustomerNotes', label: 'Notes client' },
                      { key: 'showScheduledTime', label: 'Heure programmée' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Switch
                          checked={currentTemplate[key as keyof TicketTemplate] as boolean}
                          onCheckedChange={(checked) => updateTemplate(key as keyof TicketTemplate, checked)}
                        />
                        <Label className="text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Body Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Template personnalisé (avancé)
                  </CardTitle>
                  <CardDescription>
                    Utilisez les variables et commandes ESC/POS pour un contrôle total
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={currentTemplate.bodyTemplate}
                    onChange={(e) => updateTemplate('bodyTemplate', e.target.value)}
                    placeholder="{{#items}}&#10;<b>{{quantity}}x {{name}}</b>&#10;{{/items}}"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <div className="space-y-2">
                    <Label>CSS personnalisé</Label>
                    <Textarea
                      value={currentTemplate.customCss}
                      onChange={(e) => updateTemplate('customCss', e.target.value)}
                      placeholder=".item { font-weight: bold; }"
                      rows={3}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Variables & Preview */}
        <div className="space-y-4">
          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Aperçu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="bg-white border rounded-lg overflow-auto max-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                />
              </CardContent>
            </Card>
          )}

          {/* Variables Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Variables disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableVariables.map(({ variable, description }) => (
                <div
                  key={variable}
                  className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                  onClick={() => copyVariable(variable)}
                >
                  <div>
                    <code className="text-xs bg-muted px-1 rounded">{variable}</code>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ESC/POS Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Commandes ESC/POS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {escPosCommands.map(({ command, description }) => (
                <div
                  key={command}
                  className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                  onClick={() => copyVariable(command)}
                >
                  <div>
                    <code className="text-xs bg-muted px-1 rounded">{command}</code>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
