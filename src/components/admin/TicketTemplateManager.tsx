import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAdminSetting, useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Printer, Save, RotateCcw, Eye, FileText,
  ChefHat, Store, Upload, GripVertical,
  ChevronDown, ChevronUp, QrCode, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Type, Hash,
  Trash2, RefreshCw, Layers, Link, Palette, Move,
  Minus, Bold, Italic, Underline
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE TAILWIND CLASSES — explicit light text so Windows browsers render
// dark-background selects & inputs correctly without CSS variable issues.
// ─────────────────────────────────────────────────────────────────────────────
const SEL  = "w-full h-8 px-2 rounded-md border border-white/10 bg-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500";
const SEL_LG = "w-full h-9 px-3 rounded-md border border-white/10 bg-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500";
const INP  = "border border-white/10 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-amber-500 focus:border-amber-500";
const DS   = { colorScheme: 'dark' } as React.CSSProperties; // forces browser native dark scheme on <select>

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Align        = 'left' | 'center' | 'right';
type FontSize     = 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'xxlarge';
type FontType     = 'A' | 'B';
type BorderStyle  = 'none' | 'dashed' | 'solid' | 'double';
type TextTransform = 'none' | 'uppercase' | 'lowercase';
type LetterSpacing = 'normal' | 'wide' | 'wider';

interface TicketSection {
  id: string;
  name: string;
  enabled: boolean;
  align: Align;
  fontSize: FontSize;
  fontType: FontType;
  bold: boolean;
  underline: boolean;
  italic: boolean;
  borderBottom: BorderStyle;
  borderTop: BorderStyle;
  paddingTop: number;
  paddingBottom: number;
  textTransform: TextTransform;
  letterSpacing: LetterSpacing;
  qrCodeUrl?: string;
  qrCodeLabel?: string;
  qrCodeSize?: number;
}

interface TicketTemplate {
  name: string;
  header: string;
  subheader: string;
  footer: string;
  sections?: TicketSection[];
  logoUrl?: string;
  logoWidth?: number;
  itemBullet?: 'none' | '•' | '-' | '*' | '▸' | '→';
  itemFontSize?: FontSize;
  itemBold?: boolean;
  detailFontSize?: FontSize;
  detailFontType?: FontType;
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

// ─────────────────────────────────────────────────────────────────────────────
// FONT SIZE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const FONT_SIZE_MAP: Record<FontSize, { px: number; lh: number }> = {
  tiny:    { px: 9,  lh: 1.3 },
  small:   { px: 11, lh: 1.3 },
  normal:  { px: 13, lh: 1.4 },
  large:   { px: 17, lh: 1.4 },
  xlarge:  { px: 21, lh: 1.3 },
  xxlarge: { px: 26, lh: 1.2 },
};

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  tiny:    'Minuscule (9px)',
  small:   'Petite (11px)',
  normal:  'Normale (13px)',
  large:   'Grande (17px)',
  xlarge:  'Très grande (21px)',
  xxlarge: 'Géante (26px)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
function mkSec(id: string, name: string, o: Partial<TicketSection> = {}): TicketSection {
  return {
    id, name, enabled: true, align: 'left', fontSize: 'normal', fontType: 'A',
    bold: false, underline: false, italic: false, borderBottom: 'none', borderTop: 'none',
    paddingTop: 0, paddingBottom: 0, textTransform: 'none', letterSpacing: 'normal', ...o,
  };
}

const DEFAULT_SECTIONS: TicketSection[] = [
  mkSec('logo',           'Logo / Image',                      { align: 'center', paddingBottom: 4 }),
  mkSec('header',         'En-tête (Titre)',                   { align: 'center', fontSize: 'xxlarge', bold: true, paddingBottom: 2 }),
  mkSec('subheader',      'Sous-titre (Adresse, Tél)',         { align: 'center', fontSize: 'small', borderBottom: 'dashed', paddingBottom: 4 }),
  mkSec('order_info',     'N° & Type de commande',             { align: 'center', fontSize: 'xlarge', bold: true, borderBottom: 'dashed', paddingTop: 4, paddingBottom: 4 }),
  mkSec('scheduled_time', 'Heure programmée',                  { bold: true, borderBottom: 'dashed', paddingBottom: 3 }),
  mkSec('date_source',    'Date & Origine',                    { borderBottom: 'dashed', paddingBottom: 3 }),
  mkSec('customer_info',  'Infos client (Nom, Tel, Adresse)',  { borderBottom: 'dashed', paddingBottom: 4 }),
  mkSec('items',          'Liste des articles',                { borderBottom: 'dashed', paddingBottom: 4 }),
  mkSec('totals',         'Totaux (TVA, HT, TTC)',             { borderBottom: 'dashed', paddingBottom: 4 }),
  mkSec('payment',        'Règlement / Paiement',              { borderBottom: 'dashed', paddingBottom: 3 }),
  mkSec('qrcode',         'Code QR (Avis Google)',             {
    align: 'center', borderBottom: 'dashed', paddingTop: 6, paddingBottom: 6,
    qrCodeUrl: '', qrCodeLabel: 'Laissez-nous un avis !', qrCodeSize: 100,
  }),
  mkSec('footer',         'Message de pied de page',           { align: 'center', paddingTop: 4 }),
];

const defaultKitchenTemplate: TicketTemplate = {
  name: 'Ticket Cuisine', header: 'TWIN PIZZA - CUISINE', subheader: '', footer: '',
  logoUrl: '', logoWidth: 160, itemBullet: '•', itemFontSize: 'xlarge', itemBold: true,
  detailFontSize: 'normal', detailFontType: 'A', detailBold: false,
  sections: DEFAULT_SECTIONS.map(s =>
    ['logo','subheader','totals','payment','qrcode','footer'].includes(s.id) ? { ...s, enabled: false } : s
  ),
};

const defaultCounterTemplate: TicketTemplate = {
  name: 'Ticket Client', header: 'TWIN PIZZA',
  subheader: 'Grand-Couronne\n60 Rue Georges Clemenceau',
  footer: 'Merci de votre visite!\n🍕 À bientôt! 🍕',
  logoUrl: '', logoWidth: 160, itemBullet: '•', itemFontSize: 'xlarge', itemBold: true,
  detailFontSize: 'small', detailFontType: 'B', detailBold: false,
  sections: [...DEFAULT_SECTIONS],
};

const defaultSettings: TicketSettings = {
  kitchenTemplate: defaultKitchenTemplate,
  counterTemplate: defaultCounterTemplate,
  activeTemplate: 'counter', autoPrint: false, paperWidth: '80mm', fontSize: 'medium', usbPrinterName: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getQrUrl(url: string, size: number) {
  if (!url.trim()) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&qzone=1`;
}

function getSectionCss(s: TicketSection): string {
  const { px, lh } = FONT_SIZE_MAP[s.fontSize] || FONT_SIZE_MAP.normal;
  return [
    `text-align:${s.align}`,
    `font-size:${px}px`,
    `line-height:${lh}`,
    `padding-top:${s.paddingTop||0}px`,
    `padding-bottom:${s.paddingBottom||0}px`,
    s.bold      ? 'font-weight:bold'          : 'font-weight:normal',
    s.italic    ? 'font-style:italic'         : '',
    s.underline ? 'text-decoration:underline' : '',
    s.textTransform !== 'none' ? `text-transform:${s.textTransform}` : '',
    s.letterSpacing === 'wide'  ? 'letter-spacing:0.08em' : '',
    s.letterSpacing === 'wider' ? 'letter-spacing:0.15em' : '',
  ].filter(Boolean).join(';');
}

function borderDiv(style: BorderStyle, pos: 'top'|'bottom'): string {
  const rules: Record<string, string> = {
    dashed: `border-${pos}:1.5px dashed #000`,
    solid:  `border-${pos}:1.5px solid #000`,
    double: `border-${pos}:3px double #000`,
  };
  return rules[style] ? `<div style="${rules[style]};margin:0"></div>` : '';
}

function migrateFontSize(v: any): FontSize {
  return ({ double_height:'xlarge', double_width:'large', double_size:'xxlarge' } as any)[v] || v || 'normal';
}

function normalizeSections(sections: any[]): TicketSection[] {
  return sections.map(s => {
    const def = DEFAULT_SECTIONS.find(d => d.id === s.id) ?? DEFAULT_SECTIONS[0];
    return {
      ...def, ...s,
      paddingTop:     s.paddingTop    ?? def.paddingTop,
      paddingBottom:  s.paddingBottom ?? def.paddingBottom,
      borderTop:      s.borderTop     ?? 'none',
      italic:         s.italic        ?? false,
      textTransform:  s.textTransform ?? 'none',
      letterSpacing:  s.letterSpacing ?? 'normal',
      qrCodeUrl:      s.qrCodeUrl     ?? (s.id === 'qrcode' ? '' : undefined),
      qrCodeLabel:    s.qrCodeLabel   ?? (s.id === 'qrcode' ? 'Laissez-nous un avis !' : undefined),
      qrCodeSize:     s.qrCodeSize    ?? (s.id === 'qrcode' ? 100 : undefined),
      fontSize:       migrateFontSize(s.fontSize),
    } as TicketSection;
  });
}

function normalizeTemplate(t: any, isKitchen: boolean): TicketTemplate {
  const def = isKitchen ? defaultKitchenTemplate : defaultCounterTemplate;
  const n = { ...def, ...t };
  n.sections = (Array.isArray(t?.sections) && t.sections.length > 0)
    ? normalizeSections(t.sections)
    : def.sections;
  if (n.itemFontSize)  n.itemFontSize  = migrateFontSize(n.itemFontSize);
  if (n.detailFontSize) n.detailFontSize = migrateFontSize(n.detailFontSize);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW HTML
// ─────────────────────────────────────────────────────────────────────────────
function buildPreviewHtml(tmpl: TicketTemplate, paperWidth: '58mm'|'80mm'): string {
  const w = paperWidth === '58mm' ? 260 : 360;
  const sections = tmpl.sections || DEFAULT_SECTIONS;
  const rows: string[] = [];

  sections.forEach(s => {
    if (!s.enabled) return;
    const css = getSectionCss(s);
    let html = '';

    switch (s.id) {
      case 'logo': {
        const aln = s.align === 'center' ? 'margin:0 auto' : s.align === 'right' ? 'margin-left:auto;margin-right:0' : '';
        html = tmpl.logoUrl
          ? `<div style="${css}"><img src="${tmpl.logoUrl}" style="max-width:${tmpl.logoWidth||160}px;width:100%;height:auto;display:block;${aln}"/></div>`
          : `<div style="${css};font-size:24px">🍕 <span style="font-size:11px;color:#888">[LOGO]</span></div>`;
        break;
      }
      case 'header':
        html = `<div style="${css};white-space:pre-line">${tmpl.header || 'TWIN PIZZA'}</div>`;
        break;
      case 'subheader':
        html = `<div style="${css};white-space:pre-line">${tmpl.subheader || '60 Rue de la Paix'}</div>`;
        break;
      case 'order_info':
        html = `<div style="${css}"><div>#042</div><div>🚗 LIVRAISON</div></div>`;
        break;
      case 'scheduled_time':
        html = `<div style="${css}"><strong>PROGRAMMÉ:</strong> Ven. 28 Juin 20:30</div>`;
        break;
      case 'date_source':
        html = `<div style="${css}">Date: 28/06/2026 19:42<br/>Origine: WEB</div>`;
        break;
      case 'customer_info':
        html = `<div style="${css}"><strong>Client:</strong> Ahmed Benali<br/><strong>Tél:</strong> 06 12 34 56 78<br/><strong>Adresse:</strong> 12 Rue de Paris, 76530<br/><strong>Note:</strong> Sans oignons svp</div>`;
        break;
      case 'items': {
        const { px: ip, lh: il } = FONT_SIZE_MAP[tmpl.itemFontSize || 'xlarge'];
        const { px: dp } = FONT_SIZE_MAP[tmpl.detailFontSize || 'small'];
        const ib = tmpl.itemBold !== false ? 'font-weight:bold;' : '';
        const db = tmpl.detailBold ? 'font-weight:bold;' : '';
        const bu = tmpl.itemBullet && tmpl.itemBullet !== 'none' ? tmpl.itemBullet + ' ' : '';
        html = `<div style="${css}">
          <div style="font-size:11px;font-weight:bold;display:flex;justify-content:space-between;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:4px"><span>QTE  ARTICLE</span><span>TOTAL</span></div>
          <div style="margin-bottom:3px">
            <div style="font-size:${ip}px;line-height:${il};${ib}display:flex;justify-content:space-between"><span>${bu}1x MARGHERITA</span><span>12.50€</span></div>
            <div style="font-size:${dp}px;${db}margin-left:12px;color:#555">- SENIOR</div>
            <div style="font-size:${dp}px;${db}margin-left:12px;color:#555">- + Supplément Fromage</div>
          </div>
          <div>
            <div style="font-size:${ip}px;line-height:${il};${ib}display:flex;justify-content:space-between"><span>${bu}2x COCA-COLA 33CL</span><span>4.00€</span></div>
            <div style="font-size:${dp}px;${db}margin-left:12px;color:#555">- Note: Très frais svp</div>
          </div>
        </div>`;
        break;
      }
      case 'totals':
        html = `<div style="${css}">
          <div style="display:flex;justify-content:space-between;font-size:11px"><span>Sous-total HT:</span><span>15.00€</span></div>
          <div style="display:flex;justify-content:space-between;font-size:11px"><span>TVA 10%:</span><span>1.50€</span></div>
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;border-top:1px solid #000;margin-top:3px;padding-top:2px"><span>TOTAL:</span><span>16.50€</span></div>
        </div>`;
        break;
      case 'payment':
        html = `<div style="${css}">Règlement: ESPÈCES</div>`;
        break;
      case 'qrcode': {
        const qUrl = s.qrCodeUrl || '';
        const qSize = s.qrCodeSize || 100;
        const qLabel = s.qrCodeLabel || 'Laissez-nous un avis !';
        const qSrc = getQrUrl(qUrl, qSize);
        html = `<div style="${css}">
          <div style="font-size:11px;font-weight:bold;margin-bottom:4px">${qLabel}</div>
          ${qSrc
            ? `<img src="${qSrc}" width="${qSize}" height="${qSize}" style="display:block;margin:0 auto;image-rendering:pixelated"/>`
            : `<div style="width:${qSize}px;height:${qSize}px;border:1.5px dashed #bbb;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;text-align:center;background:#f5f5f5">QR<br/>CODE</div>`
          }
        </div>`;
        break;
      }
      case 'footer':
        html = `<div style="${css};white-space:pre-line">${tmpl.footer || 'Merci de votre visite !'}</div>`;
        break;
    }

    if (!html) return;
    rows.push(borderDiv(s.borderTop, 'top'));
    rows.push(html);
    rows.push(borderDiv(s.borderBottom, 'bottom'));
  });

  return `<div style="font-family:'Courier New',monospace;width:${w}px;padding:10px 8px;background:#fff;color:#000;box-shadow:0 4px 20px rgba(0,0,0,.25);border-radius:8px;box-sizing:border-box;overflow:hidden">${rows.join('')}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGO UPLOADER
// ─────────────────────────────────────────────────────────────────────────────
function LogoUploader({ logoUrl, onChange }: { logoUrl?: string; onChange: (u: string) => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinary');
      const u = await uploadToCloudinary(f);
      if (u) { onChange(u); toast.success('Logo uploadé ✓'); }
      else toast.error("Upload échoué");
    } catch (err: any) { toast.error("Erreur : " + err.message); }
    finally { setBusy(false); }
  };
  return (
    <label className={`flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-slate-800 text-xs text-white cursor-pointer hover:border-amber-500/50 transition-all ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="text-slate-300 truncate">{busy ? 'Upload...' : logoUrl ? 'Changer le logo' : 'Choisir une image...'}</span>
      <input type="file" accept="image/*" onChange={handle} className="hidden" disabled={busy} />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION ROW (inline accordion)
// ─────────────────────────────────────────────────────────────────────────────
interface SRProps {
  s: TicketSection;
  tmpl: TicketTemplate;
  expanded: boolean;
  dragHandleProps: any;
  onExpand: () => void;
  onToggle: (v: boolean) => void;
  onSec: (u: Partial<TicketSection>) => void;
  onTmpl: (k: keyof TicketTemplate, v: any) => void;
}

function SectionRow({ s, tmpl, expanded, dragHandleProps, onExpand, onToggle, onSec, onTmpl }: SRProps) {
  const secIcon: Record<string, React.ReactNode> = {
    logo: <ImageIcon className="w-3.5 h-3.5" />, header: <Type className="w-3.5 h-3.5" />,
    order_info: <Hash className="w-3.5 h-3.5" />, qrcode: <QrCode className="w-3.5 h-3.5" />,
    footer: <AlignLeft className="w-3.5 h-3.5" />, items: <Layers className="w-3.5 h-3.5" />,
  };
  const icon = secIcon[s.id] || <Minus className="w-3.5 h-3.5" />;

  return (
    <div className={`border-b border-slate-700/40 last:border-b-0 transition-all ${s.enabled ? '' : 'opacity-55'}`}>
      {/* ── ROW HEADER ── */}
      <div className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-800/60 transition-colors select-none ${expanded ? 'bg-amber-500/8 border-l-2 border-l-amber-500' : ''}`}>
        <div {...dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </div>
        <div onClick={e => { e.stopPropagation(); onToggle(!s.enabled); }}>
          <Switch checked={s.enabled} className="scale-[0.78] pointer-events-none" />
        </div>
        <button onClick={onExpand} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className={`shrink-0 ${expanded ? 'text-amber-400' : 'text-slate-400'}`}>{icon}</span>
          <span className={`text-sm font-medium truncate ${expanded ? 'text-amber-300' : 'text-slate-200'}`}>{s.name}</span>
          {!s.enabled && <span className="text-[10px] text-slate-500 italic shrink-0">(masqué)</span>}
        </button>
        {/* Quick info badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">{s.fontSize}</span>
          {s.bold && <span className="text-[10px] font-extrabold text-amber-500/70">B</span>}
          {s.italic && <span className="text-[10px] italic text-amber-500/70">I</span>}
        </div>
        <button onClick={onExpand} className={`p-1 rounded hover:bg-slate-700 transition-colors shrink-0 ${expanded ? 'text-amber-400' : 'text-slate-500'}`}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* ── INLINE SETTINGS PANEL ── */}
      {expanded && (
        <div className="px-4 pt-4 pb-5 bg-slate-900 border-t border-amber-500/15 space-y-5">

          {/* ── ALIGNMENT ── */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Alignement du texte</Label>
            <div className="flex gap-1.5">
              {(['left','center','right'] as Align[]).map(a => (
                <button key={a} onClick={() => onSec({ align: a })}
                  className={`flex-1 h-8 flex items-center justify-center rounded-md border text-xs transition-all font-medium ${s.align === a ? 'bg-amber-500 border-amber-400 text-black' : 'border-slate-600 hover:border-slate-400 text-slate-400 bg-slate-800 hover:bg-slate-700'}`}>
                  {a === 'left' ? <AlignLeft className="w-4 h-4"/> : a === 'center' ? <AlignCenter className="w-4 h-4"/> : <AlignRight className="w-4 h-4"/>}
                </button>
              ))}
            </div>
          </div>

          {/* ── STYLE GRID ── */}
          {s.id !== 'logo' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Taille police</Label>
                <select value={s.fontSize} onChange={e => onSec({ fontSize: e.target.value as FontSize })} className={SEL} style={DS}>
                  {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map(f => (
                    <option key={f} value={f}>{FONT_SIZE_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Casse du texte</Label>
                <select value={s.textTransform} onChange={e => onSec({ textTransform: e.target.value as TextTransform })} className={SEL} style={DS}>
                  <option value="none">Normale</option>
                  <option value="uppercase">MAJUSCULES</option>
                  <option value="lowercase">minuscules</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Espacement lettres</Label>
                <select value={s.letterSpacing} onChange={e => onSec({ letterSpacing: e.target.value as LetterSpacing })} className={SEL} style={DS}>
                  <option value="normal">Normal</option>
                  <option value="wide">Élargi</option>
                  <option value="wider">Très élargi</option>
                </select>
              </div>
            </div>
          )}

          {/* ── BOLD / ITALIC / UNDERLINE ── */}
          {s.id !== 'logo' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Style</Label>
              <div className="flex gap-2">
                {[
                  { key:'bold',      label:'Gras',      icon:<Bold className="w-3.5 h-3.5"/> },
                  { key:'italic',    label:'Italique',  icon:<Italic className="w-3.5 h-3.5"/> },
                  { key:'underline', label:'Souligné',  icon:<Underline className="w-3.5 h-3.5"/> },
                ].map(({ key, label, icon }) => (
                  <button key={key}
                    onClick={() => onSec({ [key]: !(s as any)[key] })}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-all ${(s as any)[key] ? 'bg-amber-500 border-amber-400 text-black' : 'border-slate-600 text-slate-400 bg-slate-800 hover:bg-slate-700'}`}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── BORDERS ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Séparateur haut</Label>
              <select value={s.borderTop} onChange={e => onSec({ borderTop: e.target.value as BorderStyle })} className={SEL} style={DS}>
                <option value="none">Aucun</option>
                <option value="dashed">─ ─ ─  Pointillés</option>
                <option value="solid">──── Ligne pleine</option>
                <option value="double">════ Double</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Séparateur bas</Label>
              <select value={s.borderBottom} onChange={e => onSec({ borderBottom: e.target.value as BorderStyle })} className={SEL} style={DS}>
                <option value="none">Aucun</option>
                <option value="dashed">─ ─ ─  Pointillés</option>
                <option value="solid">──── Ligne pleine</option>
                <option value="double">════ Double</option>
              </select>
            </div>
          </div>

          {/* ── PADDING ── */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'paddingTop', label: 'Espace haut', val: s.paddingTop },
              { key: 'paddingBottom', label: 'Espace bas', val: s.paddingBottom },
            ].map(({ key, label, val }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>{label}</span>
                  <span className="text-amber-400 font-bold">{val}px</span>
                </Label>
                <input type="range" min={0} max={30} step={1} value={val}
                  onChange={e => onSec({ [key]: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
              </div>
            ))}
          </div>

          {/* ── SECTION-SPECIFIC ── */}

          {/* LOGO */}
          {s.id === 'logo' && (
            <div className="space-y-3 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Réglages Logo</p>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1">
                  <LogoUploader logoUrl={tmpl.logoUrl} onChange={u => onTmpl('logoUrl', u)} />
                </div>
                {tmpl.logoUrl && (
                  <div className="flex items-center gap-2">
                    <img src={tmpl.logoUrl} className="h-12 w-auto rounded border border-white/10 bg-white object-contain p-1" alt="logo" />
                    <button onClick={() => onTmpl('logoUrl', '')} className="p-1.5 rounded-md bg-red-900/40 hover:bg-red-800/50 text-red-400 border border-red-800/40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>Largeur du logo</span>
                  <span className="text-amber-400 font-bold">{tmpl.logoWidth || 160}px</span>
                </Label>
                <input type="range" min={60} max={280} step={8}
                  value={tmpl.logoWidth || 160}
                  onChange={e => onTmpl('logoWidth', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
              </div>
            </div>
          )}

          {/* HEADER */}
          {s.id === 'header' && (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Texte principal</p>
              <Input value={tmpl.header} onChange={e => onTmpl('header', e.target.value)}
                placeholder="Ex: TWIN PIZZA" className={`h-9 ${INP}`} />
            </div>
          )}

          {/* SUBHEADER */}
          {s.id === 'subheader' && (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Texte du sous-titre</p>
              <Textarea value={tmpl.subheader} onChange={e => onTmpl('subheader', e.target.value)}
                placeholder={"Grand-Couronne\n60 Rue Georges Clemenceau"} rows={3}
                className={`resize-none text-sm ${INP}`} />
              <p className="text-[10px] text-slate-500">Appuyez sur Entrée pour aller à la ligne</p>
            </div>
          )}

          {/* ITEMS */}
          {s.id === 'items' && (
            <div className="space-y-3 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Style des articles commandés</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product line */}
                <div className="space-y-3 p-3 rounded-lg border border-slate-700/60 bg-slate-800/40">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Ligne produit (ex: 1x Margherita)</p>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Puce</Label>
                    <select value={tmpl.itemBullet || '•'} onChange={e => onTmpl('itemBullet', e.target.value)} className={SEL} style={DS}>
                      <option value="•">• Puce</option>
                      <option value="-">- Tiret</option>
                      <option value="*">* Étoile</option>
                      <option value="▸">▸ Triangle</option>
                      <option value="→">→ Flèche</option>
                      <option value="none">Aucune</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Taille</Label>
                    <select value={tmpl.itemFontSize || 'xlarge'} onChange={e => onTmpl('itemFontSize', e.target.value as FontSize)} className={SEL} style={DS}>
                      {(['small','normal','large','xlarge','xxlarge'] as FontSize[]).map(f => (
                        <option key={f} value={f}>{FONT_SIZE_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={tmpl.itemBold !== false} onCheckedChange={v => onTmpl('itemBold', v)} className="scale-[0.8]" />
                    <span className="text-xs text-slate-300">Gras</span>
                  </label>
                </div>
                {/* Detail line */}
                <div className="space-y-3 p-3 rounded-lg border border-slate-700/60 bg-slate-800/40">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Options & Suppléments</p>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Taille</Label>
                    <select value={tmpl.detailFontSize || 'small'} onChange={e => onTmpl('detailFontSize', e.target.value as FontSize)} className={SEL} style={DS}>
                      {(['tiny','small','normal','large'] as FontSize[]).map(f => (
                        <option key={f} value={f}>{FONT_SIZE_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Police</Label>
                    <select value={tmpl.detailFontType || 'B'} onChange={e => onTmpl('detailFontType', e.target.value as FontType)} className={SEL} style={DS}>
                      <option value="A">Standard (Font A)</option>
                      <option value="B">Condensée (Font B)</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={tmpl.detailBold || false} onCheckedChange={v => onTmpl('detailBold', v)} className="scale-[0.8]" />
                    <span className="text-xs text-slate-300">Gras</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* QR CODE ── THE BIG ONE ── */}
          {s.id === 'qrcode' && (
            <div className="space-y-4 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Réglages Code QR
              </p>

              {/* URL input */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-amber-400" />
                  URL à encoder (lien Google Avis / Google Maps)
                </Label>
                <Input
                  value={s.qrCodeUrl || ''}
                  onChange={e => onSec({ qrCodeUrl: e.target.value })}
                  placeholder="https://maps.google.com/maps?cid=..."
                  className={`h-9 font-mono text-sm ${INP}`}
                />
                {s.qrCodeUrl ? (
                  <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-green-900/25 border border-green-700/30">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <span className="text-[10px] text-green-300">QR code actif — visible dans l'aperçu à droite</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-slate-800/60 border border-slate-700/40">
                    <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-400">Entrez une URL pour voir le QR code en aperçu</span>
                  </div>
                )}
              </div>

              {/* Label text */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Texte affiché au-dessus du QR code</Label>
                <Input
                  value={s.qrCodeLabel || ''}
                  onChange={e => onSec({ qrCodeLabel: e.target.value })}
                  placeholder="Laissez-nous un avis !"
                  className={`h-9 text-sm ${INP}`}
                />
              </div>

              {/* Size slider */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>Taille du QR code</span>
                  <span className="text-amber-400 font-bold normal-case">{s.qrCodeSize || 100}px × {s.qrCodeSize || 100}px</span>
                </Label>
                <input type="range" min={60} max={200} step={10}
                  value={s.qrCodeSize || 100}
                  onChange={e => onSec({ qrCodeSize: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>60px (petit)</span><span>200px (grand)</span>
                </div>
              </div>

              {/* Live QR preview inside settings */}
              {s.qrCodeUrl && (
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white border border-slate-300">
                  <img
                    src={getQrUrl(s.qrCodeUrl, s.qrCodeSize || 100)}
                    width={s.qrCodeSize || 100}
                    height={s.qrCodeSize || 100}
                    alt="QR Code preview"
                    className="block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <p className="text-[10px] text-slate-500 text-center">{s.qrCodeLabel || 'Laissez-nous un avis !'}</p>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed">
                💡 Le QR code est généré via <code className="text-amber-400 bg-slate-800 px-1 rounded">api.qrserver.com</code>. Internet requis lors de l'impression.
              </p>
            </div>
          )}

          {/* FOOTER */}
          {s.id === 'footer' && (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest">Message de pied de page</p>
              <Textarea value={tmpl.footer} onChange={e => onTmpl('footer', e.target.value)}
                placeholder={"Merci de votre commande!\n🍕 À bientôt !"} rows={3}
                className={`resize-none text-sm ${INP}`} />
              <p className="text-[10px] text-slate-500">Appuyez sur Entrée pour aller à la ligne. Les emojis 🍕 sont supportés.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function TicketTemplateManager() {
  const { data: settingsData, isLoading } = useAdminSetting('ticket_templates');
  const updateSetting = useUpdateAdminSetting();

  const [settings, setSettings] = useState<TicketSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'kitchen'|'counter'>('counter');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printers, setPrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

  const tmpl = activeTab === 'kitchen' ? settings.kitchenTemplate : settings.counterTemplate;
  const tmplKey = activeTab === 'kitchen' ? 'kitchenTemplate' : 'counterTemplate';

  // Load saved
  useEffect(() => {
    if (!settingsData?.setting_value) return;
    const saved = settingsData.setting_value as unknown as TicketSettings;
    setSettings({
      ...defaultSettings, ...saved,
      kitchenTemplate: normalizeTemplate(saved.kitchenTemplate, true),
      counterTemplate: normalizeTemplate(saved.counterTemplate, false),
    });
  }, [settingsData]);

  // Printers
  const fetchPrinters = useCallback(async () => {
    setLoadingPrinters(true);
    try {
      const r = await fetch('http://localhost:3001/available-printers');
      if (r.ok) { const d = await r.json(); if (d.printers) setPrinters(d.printers); }
    } catch { /* no print server */ }
    finally { setLoadingPrinters(false); }
  }, []);
  useEffect(() => { fetchPrinters(); }, [fetchPrinters]);

  // Mutations
  const updateTmpl = useCallback((k: keyof TicketTemplate, v: any) => {
    setSettings(prev => ({ ...prev, [tmplKey]: { ...prev[tmplKey], [k]: v } }));
  }, [tmplKey]);

  const updateSec = useCallback((id: string, u: Partial<TicketSection>) => {
    setSettings(prev => ({
      ...prev,
      [tmplKey]: {
        ...prev[tmplKey],
        sections: (prev[tmplKey].sections || []).map(s => s.id === id ? { ...s, ...u } : s),
      }
    }));
  }, [tmplKey]);

  const handleDragEnd = useCallback((r: any) => {
    if (!r.destination) return;
    setSettings(prev => {
      const items = [...(prev[tmplKey].sections || [])];
      const [moved] = items.splice(r.source.index, 1);
      items.splice(r.destination.index, 0, moved);
      return { ...prev, [tmplKey]: { ...prev[tmplKey], sections: items } };
    });
  }, [tmplKey]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleTabChange = (tab: 'kitchen'|'counter') => {
    setActiveTab(tab);
    setExpanded(new Set());
  };

  // Save / Reset
  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'ticket_templates', value: settings as any });
      toast.success('Configuration enregistrée ✓');
    } catch { toast.error("Erreur lors de l'enregistrement"); }
  };

  const handleReset = () => {
    setSettings(prev => ({ ...prev, [tmplKey]: activeTab === 'kitchen' ? defaultKitchenTemplate : defaultCounterTemplate }));
    setExpanded(new Set());
    toast.success('Réinitialisé aux valeurs par défaut');
  };

  const handleTestPrint = async (pt: 'counter'|'kitchen'|'both') => {
    setTestingPrint(true);
    try {
      const r = await fetch('http://localhost:3001/print-test-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerType: pt, layoutMode: 'customizable', template: tmpl }),
      });
      if (r.ok) toast.success(`Test envoyé → ${pt === 'both' ? 'les deux' : pt === 'kitchen' ? 'Cuisine' : 'Star USB'}`);
      else { const e = await r.json().catch(() => ({})); toast.error("Erreur: " + (e.error || 'Échec')); }
    } catch (e: any) { toast.error("Serveur inaccessible : " + e.message); }
    finally { setTestingPrint(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center p-12 text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Chargement...
    </div>
  );

  const previewHtml = buildPreviewHtml(tmpl, settings.paperWidth);

  return (
    <div className="space-y-5 text-slate-100">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
            <FileText className="w-6 h-6 text-amber-500" />
            Concepteur de Tickets Thermiques
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Personnalisez chaque section — glissez-déposez, cliquez ▼ pour éditer, aperçu en direct
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleReset} className="gap-2 h-9 border-slate-600 text-slate-200 hover:bg-slate-800">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={updateSetting.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2 h-9">
            <Save className="w-4 h-4" />
            {updateSetting.isPending ? 'Enregistrement...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* ── GLOBAL SETTINGS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Largeur papier</Label>
          <select value={settings.paperWidth}
            onChange={e => setSettings(p => ({ ...p, paperWidth: e.target.value as '58mm'|'80mm' }))}
            className={SEL_LG} style={DS}>
            <option value="58mm">58mm (Format étroit)</option>
            <option value="80mm">80mm (Format standard)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Gabarit actif (impression)</Label>
          <select value={settings.activeTemplate}
            onChange={e => setSettings(p => ({ ...p, activeTemplate: e.target.value as 'kitchen'|'counter' }))}
            className={SEL_LG} style={DS}>
            <option value="counter">Client (comptoir / caisse)</option>
            <option value="kitchen">Cuisine (préparation)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400 flex items-center justify-between">
            <span>Imprimante USB (Star)</span>
            <button onClick={fetchPrinters} disabled={loadingPrinters} className="text-amber-500 hover:text-amber-400">
              <RefreshCw className={`w-3 h-3 ${loadingPrinters ? 'animate-spin' : ''}`} />
            </button>
          </Label>
          {printers.length > 0 ? (
            <select value={settings.usbPrinterName || ''} onChange={e => setSettings(p => ({ ...p, usbPrinterName: e.target.value }))} className={SEL_LG} style={DS}>
              <option value="">-- Par défaut --</option>
              {printers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <Input placeholder="Ex: Star TSP100 Cutter" value={settings.usbPrinterName || ''}
              onChange={e => setSettings(p => ({ ...p, usbPrinterName: e.target.value }))}
              className={`h-9 ${INP}`} />
          )}
        </div>
        <div className="flex items-center gap-3 min-h-[36px]">
          <Switch id="auto-print" checked={settings.autoPrint}
            onCheckedChange={v => setSettings(p => ({ ...p, autoPrint: v }))} />
          <Label htmlFor="auto-print" className="cursor-pointer text-sm text-slate-200">Impression automatique</Label>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

        {/* LEFT: Editor */}
        <div className="space-y-4 min-w-0">

          {/* Template Tab Switcher */}
          <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-700/60 rounded-xl">
            {([['counter','Reçu Client',<Store className="w-4 h-4"/>],['kitchen','Ticket Cuisine',<ChefHat className="w-4 h-4"/>]] as const).map(([tab, label, icon]) => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Section List */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
              <div>
                <p className="text-sm font-semibold text-slate-200">Sections du ticket</p>
                <p className="text-[11px] text-slate-500">Glissez ⠿ pour réorganiser · Cliquez ▼ pour configurer · Toggle pour activer</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setExpanded(new Set((tmpl.sections || []).map(s => s.id)))}
                  className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                  Tout ouvrir
                </button>
                <button onClick={() => setExpanded(new Set())}
                  className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                  Tout fermer
                </button>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={`sections-${activeTab}`}>
                {(prov) => (
                  <div {...prov.droppableProps} ref={prov.innerRef}>
                    {(tmpl.sections || []).map((s, idx) => (
                      <Draggable key={`${activeTab}-${s.id}`} draggableId={`${activeTab}-${s.id}`} index={idx}>
                        {(dp) => (
                          <div ref={dp.innerRef} {...dp.draggableProps}>
                            <SectionRow
                              s={s} tmpl={tmpl}
                              expanded={expanded.has(s.id)}
                              dragHandleProps={dp.dragHandleProps}
                              onExpand={() => toggleExpand(s.id)}
                              onToggle={v => updateSec(s.id, { enabled: v })}
                              onSec={u => updateSec(s.id, u)}
                              onTmpl={updateTmpl}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Test Print */}
          <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-slate-700/40 bg-slate-900/40">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Test impression :
            </span>
            {([['counter','Star (USB)'],['kitchen','Cuisine (Ethernet)'],['both','Les deux']] as const).map(([pt, lbl]) => (
              <Button key={pt} onClick={() => handleTestPrint(pt)} disabled={testingPrint} variant="outline"
                className={`text-xs h-8 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 ${pt === 'both' ? 'bg-amber-500/5' : ''}`}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />{lbl}
              </Button>
            ))}
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="xl:sticky xl:top-6 xl:self-start space-y-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Aperçu en direct</p>
                <p className="text-[11px] text-slate-500">{settings.paperWidth} · {activeTab === 'counter' ? 'Ticket Client' : 'Ticket Cuisine'}</p>
              </div>
            </div>
            <div className="p-4 bg-[#111827] overflow-x-auto flex justify-center min-h-[200px]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center px-4">
            L'aperçu simule l'impression thermique. Les proportions exactes dépendent de l'imprimante.
          </p>
        </div>

      </div>
    </div>
  );
}
