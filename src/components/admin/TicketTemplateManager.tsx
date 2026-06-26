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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Printer, Save, RotateCcw, Eye, FileText,
  ChefHat, Store, Code, HelpCircle, Copy,
  ArrowUp, ArrowDown, Upload, GripVertical, Settings2
} from 'lucide-react';

interface TicketSection {
  id: string;
  name: string;
  enabled: boolean;
  align: 'left' | 'center' | 'right';
  fontSize: 'normal' | 'double_height' | 'double_width' | 'double_size';
  fontType: 'A' | 'B';
  bold: boolean;
  underline: boolean;
  borderBottom: 'none' | 'dashed' | 'solid' | 'double';
}

interface TicketTemplate {
  name: string;
  header: string;
  subheader: string;
  footer: string;
  sections?: TicketSection[];
  logoUrl?: string;
  logoWidth?: number;
  itemBullet?: 'none' | '•' | '-' | '*';
  itemFontSize?: 'normal' | 'double_height' | 'double_width' | 'double_size';
  itemBold?: boolean;
  detailFontSize?: 'normal' | 'double_height' | 'double_width' | 'double_size';
  detailFontType?: 'A' | 'B';
  detailBold?: boolean;
}

interface TicketSettings {
  kitchenTemplate: TicketTemplate;
  counterTemplate: TicketTemplate;
  activeTemplate: 'kitchen' | 'counter';
  autoPrint: boolean;
  paperWidth: '58mm' | '80mm';
  fontSize: 'small' | 'medium' | 'large';
  usbPrinterName?: string;
}

const DEFAULT_SECTIONS: TicketSection[] = [
  { id: 'logo', name: 'Logo / Image', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'none' },
  { id: 'header', name: 'En-tête (Titre)', enabled: true, align: 'center', fontSize: 'double_size', fontType: 'A', bold: true, underline: false, borderBottom: 'none' },
  { id: 'subheader', name: 'Sous-titre (Adresse, Tél)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'order_info', name: 'N° & Type de commande', enabled: true, align: 'center', fontSize: 'double_height', fontType: 'A', bold: true, underline: false, borderBottom: 'dashed' },
  { id: 'scheduled_time', name: 'Heure programmée', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: true, underline: false, borderBottom: 'dashed' },
  { id: 'date_source', name: 'Date & Origine', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'customer_info', name: 'Infos client (Nom, Tel, Adresse)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'items', name: 'Liste des articles', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'totals', name: 'Totaux (TVA, HT, TTC)', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'payment', name: 'Règlement / Paiement', enabled: true, align: 'left', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'qrcode', name: 'Code QR (Avis Google)', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'dashed' },
  { id: 'footer', name: 'Message de pied de page', enabled: true, align: 'center', fontSize: 'normal', fontType: 'A', bold: false, underline: false, borderBottom: 'none' },
];

const defaultKitchenTemplate: TicketTemplate = {
  name: 'Ticket Cuisine',
  header: 'TWIN PIZZA - CUISINE',
  subheader: '',
  footer: '',
  sections: DEFAULT_SECTIONS.map(s => {
    // Kitchen defaults
    if (s.id === 'logo') return { ...s, enabled: false };
    if (s.id === 'subheader') return { ...s, enabled: false };
    if (s.id === 'totals') return { ...s, enabled: false };
    if (s.id === 'payment') return { ...s, enabled: false };
    if (s.id === 'qrcode') return { ...s, enabled: false };
    if (s.id === 'footer') return { ...s, enabled: false };
    return s;
  }),
  logoUrl: '',
  logoWidth: 160,
  itemBullet: '•',
  itemFontSize: 'double_height',
  itemBold: true,
  detailFontSize: 'normal',
  detailFontType: 'A',
  detailBold: false,
};

const defaultCounterTemplate: TicketTemplate = {
  name: 'Ticket Client',
  header: 'TWIN PIZZA',
  subheader: 'Grand-Couronne\n60 Rue Georges Clemenceau',
  footer: 'Merci de votre visite!\n🍕 À bientôt! 🍕',
  sections: [...DEFAULT_SECTIONS],
  logoUrl: '',
  logoWidth: 160,
  itemBullet: '•',
  itemFontSize: 'double_height',
  itemBold: true,
  detailFontSize: 'normal',
  detailFontType: 'B',
  detailBold: false,
};

const defaultSettings: TicketSettings = {
  kitchenTemplate: defaultKitchenTemplate,
  counterTemplate: defaultCounterTemplate,
  activeTemplate: 'counter',
  autoPrint: false,
  paperWidth: '80mm',
  fontSize: 'medium',
  usbPrinterName: ''
};

export function TicketTemplateManager() {
  const { data: settingsData, isLoading } = useAdminSetting('ticket_templates');
  const updateSetting = useUpdateAdminSetting();

  const [settings, setSettings] = useState<TicketSettings>(defaultSettings);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'kitchen' | 'counter'>('counter');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('header');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const currentTemplate = activeTemplateTab === 'kitchen' ? settings.kitchenTemplate : settings.counterTemplate;

  const normalizeTemplate = (t: any, isKitchen: boolean): TicketTemplate => {
    const defaults = isKitchen ? defaultKitchenTemplate : defaultCounterTemplate;
    const normalized = { ...defaults, ...t };

    // Hydrate sections if missing
    if (!normalized.sections) {
      normalized.sections = DEFAULT_SECTIONS.map(s => {
        let enabled = s.enabled;
        if (s.id === 'logo') enabled = t.showLogo !== undefined ? t.showLogo : defaults.sections?.find(x=>x.id==='logo')?.enabled ?? true;
        if (s.id === 'order_info') enabled = t.showOrderNumber !== undefined ? t.showOrderNumber : defaults.sections?.find(x=>x.id==='order_info')?.enabled ?? true;
        if (s.id === 'date_source') enabled = t.showDateTime !== undefined ? t.showDateTime : defaults.sections?.find(x=>x.id==='date_source')?.enabled ?? true;
        if (s.id === 'customer_info') enabled = t.showCustomerInfo !== undefined ? t.showCustomerInfo : defaults.sections?.find(x=>x.id==='customer_info')?.enabled ?? true;
        if (s.id === 'items') enabled = t.showItemDetails !== undefined ? t.showItemDetails : defaults.sections?.find(x=>x.id==='items')?.enabled ?? true;
        if (s.id === 'totals') enabled = t.showTotal !== undefined ? t.showTotal : defaults.sections?.find(x=>x.id==='totals')?.enabled ?? true;
        if (s.id === 'payment') enabled = t.showPaymentMethod !== undefined ? t.showPaymentMethod : defaults.sections?.find(x=>x.id==='payment')?.enabled ?? true;
        if (s.id === 'scheduled_time') enabled = t.showScheduledTime !== undefined ? t.showScheduledTime : defaults.sections?.find(x=>x.id==='scheduled_time')?.enabled ?? true;
        
        let align = s.align;
        let fontSize = s.fontSize;
        let bold = s.bold;
        if (s.id === 'header') { align = 'center'; fontSize = 'double_size'; bold = true; }
        if (s.id === 'order_info') { align = 'center'; fontSize = 'double_height'; bold = true; }
        return { ...s, enabled, align, fontSize, bold };
      });
    }

    // Set other items controls if missing
    if (normalized.itemBullet === undefined) normalized.itemBullet = '•';
    if (normalized.itemFontSize === undefined) normalized.itemFontSize = 'double_height';
    if (normalized.itemBold === undefined) normalized.itemBold = true;
    if (normalized.detailFontSize === undefined) normalized.detailFontSize = 'normal';
    if (normalized.detailFontType === undefined) normalized.detailFontType = 'B';
    if (normalized.detailBold === undefined) normalized.detailBold = false;

    return normalized;
  };

  const fetchPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const res = await fetch('http://localhost:3001/available-printers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.printers)) {
          setAvailablePrinters(data.printers);
        }
      }
    } catch (e) {
      console.warn('Could not fetch available printers:', e);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  useEffect(() => {
    if (settingsData?.setting_value) {
      const saved = settingsData.setting_value as unknown as TicketSettings;
      setSettings({
        ...defaultSettings,
        ...saved,
        kitchenTemplate: normalizeTemplate(saved.kitchenTemplate, true),
        counterTemplate: normalizeTemplate(saved.counterTemplate, false),
      });
    }
  }, [settingsData]);

  const updateTemplate = (field: keyof TicketTemplate, value: any) => {
    setSettings(prev => ({
      ...prev,
      [activeTemplateTab === 'kitchen' ? 'kitchenTemplate' : 'counterTemplate']: {
        ...currentTemplate,
        [field]: value
      }
    }));
  };

  const updateSection = (id: string, updates: Partial<TicketSection>) => {
    const nextSections = currentTemplate.sections?.map(s => {
      if (s.id === id) return { ...s, ...updates };
      return s;
    }) || [];
    updateTemplate('sections', nextSections);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!currentTemplate.sections) return;
    const nextSections = [...currentTemplate.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextSections.length) return;
    
    const temp = nextSections[index];
    nextSections[index] = nextSections[targetIndex];
    nextSections[targetIndex] = temp;
    updateTemplate('sections', nextSections);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !currentTemplate.sections) return;
    const items = Array.from(currentTemplate.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateTemplate('sections', items);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinary');
      const url = await uploadToCloudinary(file);
      if (url) {
        updateTemplate('logoUrl', url);
        toast.success('Logo uploadé avec succès');
      } else {
        toast.error("L'upload a échoué");
      }
    } catch (err: any) {
      toast.error("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'ticket_templates',
        value: settings as any
      });
      toast.success('Configuration des tickets enregistrée');
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleReset = () => {
    if (activeTemplateTab === 'kitchen') {
      setSettings(prev => ({ ...prev, kitchenTemplate: defaultKitchenTemplate }));
    } else {
      setSettings(prev => ({ ...prev, counterTemplate: defaultCounterTemplate }));
    }
    toast.success('Configuration réinitialisée par défaut');
  };

  const [testingPrint, setTestingPrint] = useState(false);

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const res = await fetch('http://localhost:3001/print-test-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: activeTemplateTab,
          template: currentTemplate
        })
      });
      if (res.ok) {
        toast.success(`Impression test (${activeTemplateTab === 'kitchen' ? 'Cuisine' : 'Client'}) envoyée !`);
      } else {
        const errData = await res.json();
        toast.error("Erreur d'impression : " + (errData.error || errData.message || "Échec"));
      }
    } catch (e: any) {
      toast.error("Impossible de communiquer avec le serveur d'impression : " + e.message);
    } finally {
      setTestingPrint(false);
    }
  };

  const selectedSection = currentTemplate.sections?.find(s => s.id === selectedSectionId) || currentTemplate.sections?.[0];

  const getBorderStyles = (border: string) => {
    if (border === 'dashed') return 'border-bottom: 1.5px dashed #000; margin: 8px 0;';
    if (border === 'solid') return 'border-bottom: 1.5px solid #000; margin: 8px 0;';
    if (border === 'double') return 'border-bottom: 3.5px double #000; margin: 8px 0;';
    return '';
  };

  const getTextStyles = (s: TicketSection) => {
    let styles = `text-align: ${s.align};`;
    if (s.bold) styles += ' font-weight: bold;';
    if (s.underline) styles += ' text-decoration: underline;';
    
    // font size mapping
    if (s.fontSize === 'double_height') styles += ' font-size: 20px; transform: scaleY(1.7); transform-origin: top center; display: inline-block; width: 100%;';
    else if (s.fontSize === 'double_width') styles += ' font-size: 20px; transform: scaleX(1.7); transform-origin: top center; display: inline-block; width: 100%;';
    else if (s.fontSize === 'double_size') styles += ' font-size: 22px; font-weight: bold; line-height: 1.2;';
    else if (s.fontType === 'B') styles += ' font-size: 11px;';
    else styles += ' font-size: 13px;';

    return styles;
  };

  const generatePreviewHtml = () => {
    const sections = currentTemplate.sections || [];
    let html = `<div style="font-family: monospace; width: ${settings.paperWidth === '58mm' ? '280px' : '380px'}; padding: 12px 8px; background: #fff; color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; line-height: 1.35; box-sizing: border-box;">`;

    sections.forEach(s => {
      if (!s.enabled) return;

      let sectionContent = '';
      const styles = getTextStyles(s);

      switch (s.id) {
        case 'logo':
          const alignClass = s.align === 'center' ? 'margin: 0 auto;' : s.align === 'right' ? 'margin-left: auto; margin-right: 0;' : 'margin-right: auto; margin-left: 0;';
          sectionContent = currentTemplate.logoUrl 
            ? `<div style="text-align: ${s.align}; padding-bottom: 4px;"><img src="${currentTemplate.logoUrl}" style="max-width: ${currentTemplate.logoWidth}px; width: 100%; height: auto; display: block; ${alignClass}" /></div>`
            : `<div style="text-align: center; font-size: 26px; padding-bottom: 4px;">🍕 [TWIN PIZZA LOGO]</div>`;
          break;
        case 'header':
          sectionContent = `<div style="${styles}">${currentTemplate.header || 'TWIN PIZZA'}</div>`;
          break;
        case 'subheader':
          sectionContent = `<div style="${styles}; white-space: pre-line;">${currentTemplate.subheader || '60 Rue Georges Clemenceau\nGrand-Couronne'}</div>`;
          break;
        case 'order_info':
          sectionContent = `<div style="${styles}; padding: 4px 0;">#042<br/>LIVRAISON</div>`;
          break;
        case 'scheduled_time':
          sectionContent = `<div style="${styles}"><strong>PROGRAMMÉ:</strong> Ven. 26 Juin 20:30</div>`;
          break;
        case 'date_source':
          sectionContent = `<div style="${styles}">Date: 26/06/2026 19:42<br/>Origine: WEB</div>`;
          break;
        case 'customer_info':
          sectionContent = `<div style="${styles}"><strong>Client:</strong> Ahmed Benali<br/><strong>Tel:</strong> 06 12 34 56 78<br/><strong>Adresse:</strong> 12 Rue de Paris, 76530<br/><strong>Note:</strong> Sans oignons svp</div>`;
          break;
        case 'items':
          // Product lines styles
          let pStyles = 'font-weight: bold; display: flex; justify-content: space-between;';
          if (currentTemplate.itemFontSize === 'double_height') pStyles += ' font-size: 18px; transform: scaleY(1.5); transform-origin: top center; margin-bottom: 4px;';
          else if (currentTemplate.itemFontSize === 'double_size') pStyles += ' font-size: 18px;';
          else pStyles += ' font-size: 13px;';
          if (!currentTemplate.itemBold) pStyles = pStyles.replace('font-weight: bold;', '');

          // Detail lines styles
          let dStyles = 'margin-left: 12px;';
          if (currentTemplate.detailFontType === 'B') dStyles += ' font-size: 11px; color: #555;';
          else dStyles += ' font-size: 13px;';
          if (currentTemplate.detailBold) dStyles += ' font-weight: bold;';

          const bullet = currentTemplate.itemBullet && currentTemplate.itemBullet !== 'none' ? `${currentTemplate.itemBullet} ` : '';

          sectionContent = `
            <div style="font-size: 12px; font-weight: bold; display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 6px;">
              <span>QTE  ARTICLE</span>
              <span>TOTAL</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div>
                <div style="${pStyles}">
                  <span>${bullet}1x MARGHERITA</span>
                  <span>12.50€</span>
                </div>
                <div style="${dStyles}">- SENIOR</div>
                <div style="${dStyles}">- + Supplément Fromage</div>
              </div>
              <div>
                <div style="${pStyles}">
                  <span>${bullet}2x COCA-COLA 33CL</span>
                  <span>4.00€</span>
                </div>
                <div style="${dStyles}">- Note: Très frais svp</div>
              </div>
            </div>
          `;
          break;
        case 'totals':
          sectionContent = `
            <div style="${styles}">
              <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Sous-total HT:</span><span>15.00€</span></div>
              <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>TVA 10%:</span><span>1.50€</span></div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 17px; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px;">
                <span>TOTAL:</span><span>16.50€</span>
              </div>
            </div>
          `;
          break;
        case 'payment':
          sectionContent = `<div style="${styles}">Règlement: ESPÈCES (Non payé)</div>`;
          break;
        case 'qrcode':
          sectionContent = `
            <div style="text-align: center; font-size: 11px;">
              <strong>Laissez-nous un avis !</strong>
              <div style="width: 80px; height: 80px; border: 1px solid #000; margin: 6px auto; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; background: #fafafa;">QR CODE</div>
            </div>
          `;
          break;
        case 'footer':
          sectionContent = `<div style="${styles}; white-space: pre-line;">${currentTemplate.footer || 'Merci de votre visite !\nA bientôt !'}</div>`;
          break;
      }

      html += sectionContent;

      if (s.borderBottom !== 'none') {
        html += `<div style="${getBorderStyles(s.borderBottom)}"></div>`;
      }
    });

    html += `</div>`;
    return html;
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Chargement des données...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            Concepteur de Tickets Thermiques
          </h2>
          <p className="text-muted-foreground">Modifiez visuellement l'ordre, les polices, tailles et bordures des reçus</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={updateSetting.isPending} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
            <Save className="w-4 h-4 mr-2" />
            {updateSetting.isPending ? 'Enregistrement...' : 'Sauvegarder la configuration'}
          </Button>
        </div>
      </div>

      {/* General Settings Bar */}
      <Card className="border-border bg-slate-900/50">
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Largeur papier</Label>
            <select
              value={settings.paperWidth}
              onChange={(e) => setSettings(prev => ({ ...prev, paperWidth: e.target.value as '58mm' | '80mm' }))}
              className="w-full h-9 px-3 rounded-md border border-border bg-[#0d1117] text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="58mm">58mm (Format étroit)</option>
              <option value="80mm">80mm (Format standard)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gabarit d'impression</Label>
            <select
              value={settings.activeTemplate}
              onChange={(e) => setSettings(prev => ({ ...prev, activeTemplate: e.target.value as 'kitchen' | 'counter' }))}
              className="w-full h-9 px-3 rounded-md border border-border bg-[#0d1117] text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="counter">Client (comptoir/caisse)</option>
              <option value="kitchen">Cuisine (résumé de préparation)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Port Imprimante (Star USB)</span>
              <button 
                type="button" 
                onClick={fetchPrinters} 
                className="text-[10px] text-amber-500 hover:text-amber-600 underline font-bold"
                disabled={loadingPrinters}
              >
                {loadingPrinters ? '...' : 'Actualiser'}
              </button>
            </Label>
            {availablePrinters.length > 0 ? (
              <select
                value={settings.usbPrinterName || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, usbPrinterName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0d1117] text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-xs"
              >
                <option value="">-- Par défaut (Star TSP100) --</option>
                {availablePrinters.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Ex: Star TSP100 Cutter (TSP143)"
                value={settings.usbPrinterName || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, usbPrinterName: e.target.value }))}
                className="h-9 border-border bg-[#0d1117] text-sm"
              />
            )}
          </div>
          <div className="flex items-center gap-3 h-9">
            <Switch
              id="auto-print-switch"
              checked={settings.autoPrint}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoPrint: checked }))}
            />
            <Label htmlFor="auto-print-switch" className="cursor-pointer text-sm font-medium">Impression automatique</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Section Order (Drag and Drop) */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTemplateTab} onValueChange={(v) => {
            setActiveTemplateTab(v as 'kitchen' | 'counter');
            setSelectedSectionId('header');
          }}>
            <TabsList className="grid grid-cols-2 w-full bg-slate-900 border border-border">
              <TabsTrigger value="counter" className="gap-2">
                <Store className="w-4 h-4" />
                Configuration Reçu Client
              </TabsTrigger>
              <TabsTrigger value="kitchen" className="gap-2">
                <ChefHat className="w-4 h-4" />
                Configuration Reçu Cuisine
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTemplateTab} className="space-y-4 mt-4">
              <Card className="border-border bg-slate-950/40">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">Mise en page du ticket</CardTitle>
                    <CardDescription>Glissez-déposez ou cliquez sur les flèches pour modifier l'ordre d'impression. Cochez pour activer.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={handleTestPrint}
                    disabled={testingPrint}
                    variant="outline"
                    className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-2 shrink-0 font-bold"
                  >
                    <Printer className="w-4 h-4" />
                    {testingPrint ? "Impression..." : `Tester ${activeTemplateTab === 'kitchen' ? 'Cuisine (Ethernet)' : 'Client (Star)'}`}
                  </Button>
                </CardHeader>
                <CardContent className="p-0 pb-4">
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="sections-list">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="divide-y divide-border/40"
                        >
                          {currentTemplate.sections?.map((section, idx) => (
                            <Draggable key={section.id} draggableId={section.id} index={idx}>
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex items-center gap-3 p-3 hover:bg-slate-900/30 transition-colors ${selectedSectionId === section.id ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''}`}
                                >
                                  {/* Drag Handle */}
                                  <div {...dragProvided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab p-1">
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  {/* Enabled Toggle */}
                                  <Switch
                                    checked={section.enabled}
                                    onCheckedChange={(checked) => updateSection(section.id, { enabled: checked })}
                                    className="scale-90"
                                  />

                                  {/* Title & Clickable Configuration */}
                                  <button
                                    onClick={() => setSelectedSectionId(section.id)}
                                    className="flex-1 text-left font-medium text-sm text-foreground hover:text-amber-500 transition-colors"
                                  >
                                    {section.name}
                                    {!section.enabled && <span className="ml-2 text-xs text-muted-foreground italic">(Masqué)</span>}
                                  </button>

                                  {/* Order Sorting Buttons (Mobile fallback) */}
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => moveSection(idx, 'up')}
                                      disabled={idx === 0}
                                      className="w-7 h-7"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => moveSection(idx, 'down')}
                                      disabled={idx === (currentTemplate.sections?.length || 0) - 1}
                                      className="w-7 h-7"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setSelectedSectionId(section.id)}
                                      className={`w-7 h-7 ${selectedSectionId === section.id ? 'text-amber-500' : 'text-muted-foreground'}`}
                                    >
                                      <Settings2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </CardContent>
              </Card>

              {/* Section Settings Block */}
              {selectedSection && (
                <Card className="border-border bg-slate-950/40">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm uppercase tracking-wider text-amber-500 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Réglages Section: {selectedSection.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4">
                    {/* Common text configs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Align */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Alignement</Label>
                        <select
                          value={selectedSection.align}
                          onChange={(e) => updateSection(selectedSection.id, { align: e.target.value as any })}
                          className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="left">Gauche</option>
                          <option value="center">Centré</option>
                          <option value="right">Droite</option>
                        </select>
                      </div>

                      {/* Font size */}
                      {selectedSection.id !== 'logo' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Taille de police</Label>
                          <select
                            value={selectedSection.fontSize}
                            onChange={(e) => updateSection(selectedSection.id, { fontSize: e.target.value as any })}
                            className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="normal">Normal</option>
                            <option value="double_height">Double Hauteur</option>
                            <option value="double_width">Double Largeur</option>
                            <option value="double_size">Double Taille (H x L)</option>
                          </select>
                        </div>
                      )}

                      {/* Font type */}
                      {selectedSection.id !== 'logo' && selectedSection.fontSize === 'normal' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Type de police</Label>
                          <select
                            value={selectedSection.fontType}
                            onChange={(e) => updateSection(selectedSection.id, { fontType: e.target.value as any })}
                            className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="A">Standard (Font A)</option>
                            <option value="B">Plus petite (Font B)</option>
                          </select>
                        </div>
                      )}

                      {/* Borders */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bordure inférieure</Label>
                        <select
                          value={selectedSection.borderBottom}
                          onChange={(e) => updateSection(selectedSection.id, { borderBottom: e.target.value as any })}
                          className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="none">Aucune</option>
                          <option value="dashed">Pointillés (---)</option>
                          <option value="solid">Ligne (___)</option>
                          <option value="double">Double Ligne (===)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                      {selectedSection.id !== 'logo' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="sec-bold-switch"
                              checked={selectedSection.bold}
                              onCheckedChange={(checked) => updateSection(selectedSection.id, { bold: checked })}
                              className="scale-90"
                            />
                            <Label htmlFor="sec-bold-switch" className="text-xs cursor-pointer">Gras (Bold)</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="sec-under-switch"
                              checked={selectedSection.underline}
                              onCheckedChange={(checked) => updateSection(selectedSection.id, { underline: checked })}
                              className="scale-90"
                            />
                            <Label htmlFor="sec-under-switch" className="text-xs cursor-pointer">Souligné (Underline)</Label>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Section Specific fields */}
                    <Separator className="bg-border/30 my-2" />

                    {/* Logo settings */}
                    {selectedSection.id === 'logo' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="logo-uploader" className="text-xs">Sélectionner un fichier (Image)</Label>
                            <Input
                              id="logo-uploader"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="h-8 border-border bg-[#0d1117] text-xs py-1"
                              disabled={uploadingLogo}
                            />
                          </div>
                          {currentTemplate.logoUrl && (
                            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                              <img src={currentTemplate.logoUrl} className="h-10 w-auto rounded border bg-white object-contain p-1" />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateTemplate('logoUrl', '')}
                                className="h-7 px-3 text-xs"
                              >
                                Retirer
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 max-w-xs">
                          <Label className="text-xs flex justify-between">
                            <span>Largeur d'impression du logo (pixels)</span>
                            <span className="text-amber-500 font-bold">{currentTemplate.logoWidth || 160}px</span>
                          </Label>
                          <input
                            type="range"
                            min={80}
                            max={240}
                            step={8}
                            value={currentTemplate.logoWidth || 160}
                            onChange={(e) => updateTemplate('logoWidth', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Header main title */}
                    {selectedSection.id === 'header' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Titre principal</Label>
                        <Input
                          value={currentTemplate.header}
                          onChange={(e) => updateTemplate('header', e.target.value)}
                          placeholder="Ex: TWIN PIZZA"
                          className="h-9 border-border bg-[#0d1117] text-sm"
                        />
                      </div>
                    )}

                    {/* Subheader */}
                    {selectedSection.id === 'subheader' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Texte d'en-tête (ex: adresse, contacts)</Label>
                        <Textarea
                          value={currentTemplate.subheader}
                          onChange={(e) => updateTemplate('subheader', e.target.value)}
                          placeholder="Grand-Couronne&#10;60 Rue Georges Clemenceau"
                          rows={2.5}
                          className="border-border bg-[#0d1117] text-sm"
                        />
                      </div>
                    )}

                    {/* Items styling settings */}
                    {selectedSection.id === 'items' && (
                      <div className="space-y-4">
                        <div className="border border-border/40 rounded-lg p-3 bg-slate-900/20 space-y-4">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Style Ligne Produit Principal (ex: 1x Margherita)</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Puce (Bullet)</Label>
                              <select
                                value={currentTemplate.itemBullet || '•'}
                                onChange={(e) => updateTemplate('itemBullet', e.target.value as any)}
                                className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="•">Puce ronde (•)</option>
                                <option value="-">Tiret (-)</option>
                                <option value="*">Étoile (*)</option>
                                <option value="none">Aucune</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Taille de police</Label>
                              <select
                                value={currentTemplate.itemFontSize || 'double_height'}
                                onChange={(e) => updateTemplate('itemFontSize', e.target.value as any)}
                                className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="normal">Normal</option>
                                <option value="double_height">Double Hauteur</option>
                                <option value="double_size">Double Taille (H x L)</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 h-8 mt-6">
                              <Switch
                                id="item-bold-switch"
                                checked={currentTemplate.itemBold !== false}
                                onCheckedChange={(checked) => updateTemplate('itemBold', checked)}
                                className="scale-90"
                              />
                              <Label htmlFor="item-bold-switch" className="text-xs cursor-pointer">Lignes de produits en gras</Label>
                            </div>
                          </div>
                        </div>

                        <div className="border border-border/40 rounded-lg p-3 bg-slate-900/20 space-y-4">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Style Options & Suppléments (ex: + Champignons)</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Police / Taille</Label>
                              <select
                                value={currentTemplate.detailFontType || 'B'}
                                onChange={(e) => updateTemplate('detailFontType', e.target.value as any)}
                                className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="B">Plus petite (Font B)</option>
                                <option value="A">Standard (Font A)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Formatage</Label>
                              <select
                                value={currentTemplate.detailFontSize || 'normal'}
                                onChange={(e) => updateTemplate('detailFontSize', e.target.value as any)}
                                className="w-full h-8 px-2 rounded border bg-[#0d1117] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="normal">Normal</option>
                                <option value="double_height">Double Hauteur</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 h-8 mt-6">
                              <Switch
                                id="detail-bold-switch"
                                checked={currentTemplate.detailBold || false}
                                onCheckedChange={(checked) => updateTemplate('detailBold', checked)}
                                className="scale-90"
                              />
                              <Label htmlFor="detail-bold-switch" className="text-xs cursor-pointer">Options en gras</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer text */}
                    {selectedSection.id === 'footer' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Texte de pied de page (ex: remerciements, horaires)</Label>
                        <Textarea
                          value={currentTemplate.footer}
                          onChange={(e) => updateTemplate('footer', e.target.value)}
                          placeholder="Merci de votre commande!&#10;🍕 A bientôt !"
                          rows={2.5}
                          className="border-border bg-[#0d1117] text-sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Ticket Live Preview */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="sticky top-6 border-border bg-slate-950/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                Aperçu réel du Reçu
              </CardTitle>
              <CardDescription>Aperçu en temps réel tel qu'il sera imprimé sur la bande thermique</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex justify-center bg-slate-950/30">
              <div 
                className="preview-ticket-container"
                dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
