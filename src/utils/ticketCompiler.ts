/**
 * Ticket Template Compiler Utility
 *
 * Compiles dynamic ticket templates using the sections-based layout engine
 * and outputs styled print-ready HTML documents for ESC/POS thermal printers.
 *
 * Supports: sections[], qrCodeUrl/Label/Size, logo, header/footer, items, totals.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (mirrors TicketTemplateManager interfaces)
// ─────────────────────────────────────────────────────────────────────────────

type FontSize = 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'xxlarge';
type BorderStyle = 'none' | 'dashed' | 'solid' | 'double';

const FONT_SIZE_PX: Record<FontSize, number> = {
  tiny: 9, small: 11, normal: 13, large: 17, xlarge: 21, xxlarge: 26,
};

function migrateFontSize(old: any): FontSize {
  const map: Record<string, FontSize> = {
    double_height: 'xlarge', double_width: 'large', double_size: 'xxlarge',
    normal: 'normal', tiny: 'tiny', small: 'small',
    large: 'large', xlarge: 'xlarge', xxlarge: 'xxlarge',
  };
  return map[old] || 'normal';
}

function getQrImageUrl(url: string, size: number): string {
  if (!url) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&qzone=1`;
}

interface NormalizedItem {
  quantity: number;
  name: string;
  price: string;
  size: string;
  meats: string;
  sauces: string;
  garnitures: string;
  supplements: string;
  note: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HTML BUILDER (used for each section in print output)
// ─────────────────────────────────────────────────────────────────────────────

function buildSectionHtml(section: any, template: any, orderData: any): string {
  if (!section.enabled) return '';

  const fsPx = FONT_SIZE_PX[migrateFontSize(section.fontSize)] || 13;
  const bold = section.bold ? 'font-weight: bold;' : 'font-weight: normal;';
  const italic = section.italic ? 'font-style: italic;' : '';
  const underline = section.underline ? 'text-decoration: underline;' : '';
  const textTransform = section.textTransform && section.textTransform !== 'none' ? `text-transform: ${section.textTransform};` : '';
  const letterSpacing = section.letterSpacing === 'wide' ? 'letter-spacing: 0.08em;' : section.letterSpacing === 'wider' ? 'letter-spacing: 0.15em;' : '';
  const paddingTop = `padding-top: ${section.paddingTop || 0}px;`;
  const paddingBottom = `padding-bottom: ${section.paddingBottom || 0}px;`;
  const align = `text-align: ${section.align || 'left'};`;

  const sectionStyle = `${align} font-size: ${fsPx}px; line-height: 1.4; ${bold} ${italic} ${underline} ${textTransform} ${letterSpacing} ${paddingTop} ${paddingBottom}`;

  function borderHtml(borderStyle: BorderStyle): string {
    if (borderStyle === 'dashed') return '<div style="border-top: 1.5px dashed #000; margin: 0;"></div>';
    if (borderStyle === 'solid')  return '<div style="border-top: 1.5px solid #000; margin: 0;"></div>';
    if (borderStyle === 'double') return '<div style="border-top: 3px double #000; margin: 0;"></div>';
    return '';
  }

  let content = '';

  switch (section.id) {
    case 'logo': {
      const alignStyle = section.align === 'center' ? 'margin: 0 auto;' : section.align === 'right' ? 'margin-left: auto; margin-right: 0;' : '';
      content = template.logoUrl
        ? `<div style="${sectionStyle}"><img src="${template.logoUrl}" style="max-width: ${template.logoWidth || 160}px; width: 100%; height: auto; display: block; ${alignStyle}" /></div>`
        : '';
      break;
    }
    case 'header':
      content = template.header
        ? `<div style="${sectionStyle}; white-space: pre-line;">${(template.header as string).replace(/\n/g, '<br>')}</div>`
        : '';
      break;
    case 'subheader':
      content = template.subheader
        ? `<div style="${sectionStyle}; white-space: pre-line;">${(template.subheader as string).replace(/\n/g, '<br>')}</div>`
        : '';
      break;
    case 'order_info': {
      const typeLabel = orderData.order_type_raw === 'livraison' ? '🚗 LIVRAISON' :
                        orderData.order_type_raw === 'emporter' ? '🛍️ À EMPORTER' : '🍽️ SUR PLACE';
      content = `<div style="${sectionStyle}"><div>#${orderData.order_number}</div><div>${typeLabel}</div></div>`;
      break;
    }
    case 'scheduled_time':
      content = orderData.scheduled_for
        ? `<div style="${sectionStyle}"><strong>PROGRAMMÉ:</strong> ${orderData.scheduled_for}</div>`
        : '';
      break;
    case 'date_source':
      content = `<div style="${sectionStyle}">Date: ${orderData.created_at}<br/>Origine: ${orderData.source || 'WEB'}</div>`;
      break;
    case 'customer_info': {
      const parts: string[] = [];
      if (orderData.customer_name) parts.push(`<strong>Client:</strong> ${orderData.customer_name}`);
      if (orderData.customer_phone) parts.push(`<strong>Tél:</strong> ${orderData.customer_phone}`);
      if (orderData.customer_address) parts.push(`<strong>Adresse:</strong> ${orderData.customer_address}`);
      if (orderData.customer_notes) parts.push(`<strong>Note:</strong> ${orderData.customer_notes}`);
      content = parts.length ? `<div style="${sectionStyle}">${parts.join('<br/>')}</div>` : '';
      break;
    }
    case 'items': {
      const itemFsPx = FONT_SIZE_PX[migrateFontSize(template.itemFontSize)] || 21;
      const detailFsPx = FONT_SIZE_PX[migrateFontSize(template.detailFontSize)] || 11;
      const itemBold = template.itemBold !== false ? 'font-weight: bold;' : '';
      const detailBold = template.detailBold ? 'font-weight: bold;' : '';
      const bullet = template.itemBullet && template.itemBullet !== 'none' ? template.itemBullet + ' ' : '';

      const itemRows = (orderData.items as NormalizedItem[]).map(item => {
        const lines: string[] = [];
        const detailStyle = `margin-left: 12px; font-size: ${detailFsPx}px; ${detailBold} color: #444;`;
        lines.push(`<div style="display: flex; justify-content: space-between; font-size: ${itemFsPx}px; line-height: 1.35; ${itemBold}"><span>${bullet}${item.quantity}x ${item.name.toUpperCase()}</span><span>${item.price}€</span></div>`);
        if (item.size) lines.push(`<div style="${detailStyle}">- Taille: ${item.size}</div>`);
        if (item.meats) lines.push(`<div style="${detailStyle}">- ${item.meats}</div>`);
        if (item.sauces) lines.push(`<div style="${detailStyle}">- ${item.sauces}</div>`);
        if (item.garnitures) lines.push(`<div style="${detailStyle}">- ${item.garnitures}</div>`);
        if (item.supplements) lines.push(`<div style="${detailStyle}">- + ${item.supplements}</div>`);
        if (item.note) lines.push(`<div style="${detailStyle}; font-style: italic;">📝 ${item.note}</div>`);
        return `<div style="margin-bottom: 4px;">${lines.join('')}</div>`;
      }).join('');

      content = `<div style="${sectionStyle}">
        <div style="font-size: 11px; font-weight: bold; display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;"><span>QTE  ARTICLE</span><span>TOTAL</span></div>
        ${itemRows}
      </div>`;
      break;
    }
    case 'totals': {
      const rows: string[] = [];
      if (orderData.subtotal) rows.push(`<div style="display: flex; justify-content: space-between; font-size: 11px;"><span>Sous-total HT:</span><span>${orderData.subtotal}€</span></div>`);
      if (orderData.tva) rows.push(`<div style="display: flex; justify-content: space-between; font-size: 11px;"><span>TVA 10%:</span><span>${orderData.tva}€</span></div>`);
      if (parseFloat(orderData.delivery_fee) > 0) rows.push(`<div style="display: flex; justify-content: space-between; font-size: 11px;"><span>Livraison:</span><span>${orderData.delivery_fee}€</span></div>`);
      rows.push(`<div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; border-top: 1px solid #000; margin-top: 3px; padding-top: 2px;"><span>TOTAL:</span><span>${orderData.total}€</span></div>`);
      content = `<div style="${sectionStyle}">${rows.join('')}</div>`;
      break;
    }
    case 'payment': {
      const payLabel = orderData.payment_method_raw === 'en_ligne' ? '✅ PAYÉ EN LIGNE' :
                       orderData.payment_method_raw === 'cb' ? '💳 CB' : '💵 ESPÈCES';
      content = `<div style="${sectionStyle}">Règlement: ${payLabel}</div>`;
      break;
    }
    case 'qrcode': {
      const qrUrl = section.qrCodeUrl || '';
      const qrSize = section.qrCodeSize || 100;
      const qrLabel = section.qrCodeLabel || 'Laissez-nous un avis !';
      if (!qrUrl) { content = ''; break; }
      const qrSrc = getQrImageUrl(qrUrl, qrSize);
      content = `<div style="${sectionStyle}">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">${qrLabel}</div>
        <img src="${qrSrc}" width="${qrSize}" height="${qrSize}" style="display: block; margin: 0 auto;" />
      </div>`;
      break;
    }
    case 'footer':
      content = template.footer
        ? `<div style="${sectionStyle}; white-space: pre-line;">${(template.footer as string).replace(/\n/g, '<br>')}</div>`
        : '';
      break;
    default:
      content = '';
  }

  if (!content) return '';

  const topBorder = borderHtml(section.borderTop || 'none');
  const bottomBorder = borderHtml(section.borderBottom || 'none');

  return `${topBorder}${content}${bottomBorder}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compiles full order ticket HTML using configured template settings (sections-based)
 */
export function compileTicketHtml(order: any, settings: any, templateType?: 'counter' | 'kitchen'): string {
  const activeType = templateType || settings.activeTemplate || 'counter';
  const template = activeType === 'kitchen' ? settings.kitchenTemplate : settings.counterTemplate;
  const paperWidth = settings.paperWidth || '80mm';

  // 1. Normalize items
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const normalizedItems: NormalizedItem[] = rawItems.map((item: any) => {
    const name = item.name || item.item?.name || 'Produit';
    const price = item.price || item.totalPrice || item.calculatedPrice || 0;
    const customization = item.customization || {};

    const meats = Array.isArray(customization.meats)
      ? customization.meats.join(', ')
      : customization.meats || customization.meat || '';
    const sauces = Array.isArray(customization.sauces)
      ? customization.sauces.join(', ')
      : customization.sauces || '';
    const garnitures = Array.isArray(customization.garnitures)
      ? customization.garnitures.join(', ')
      : customization.garnitures || '';

    const supplementsList: string[] = [];
    if (customization.supplements?.length) supplementsList.push(...customization.supplements);
    if (customization.cheeseSupplements?.length) supplementsList.push(...customization.cheeseSupplements);

    return {
      quantity: item.quantity || 1,
      name,
      price: Number(price).toFixed(2),
      size: customization.size || item.size || '',
      meats, sauces, garnitures,
      supplements: supplementsList.join(', '),
      note: item.note || customization.note || ''
    };
  });

  // 2. Order data context
  const dateStr = new Date(order.created_at || '').toLocaleString('fr-FR');
  const orderData = {
    order_number: order.order_number || '',
    order_type_raw: order.order_type,
    payment_method_raw: order.payment_method,
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    customer_address: order.customer_address || '',
    customer_notes: order.customer_notes || '',
    created_at: dateStr,
    scheduled_for: order.scheduled_for || '',
    subtotal: (order.subtotal || 0).toFixed(2),
    tva: (order.tva || 0).toFixed(2),
    delivery_fee: (order.delivery_fee || 0).toFixed(2),
    total: (order.total || 0).toFixed(2),
    source: order.source || order.order_source || 'WEB',
    items: normalizedItems,
  };

  // 3. Build sections HTML
  const sections: any[] = template.sections || [];
  const sectionsHtml = sections.map((s: any) => buildSectionHtml(s, template, orderData)).join('');

  // 4. Wrap in full HTML document
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ticket #${orderData.order_number}</title>
  <style>
    @page { size: ${paperWidth} auto; margin: 0; }
    @media print {
      body { width: ${paperWidth}; margin: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #000 !important;
      background: #fff;
      width: ${paperWidth};
      margin: 0;
      padding: 6px 8px;
      box-sizing: border-box;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  ${sectionsHtml}
</body>
</html>`;
}
