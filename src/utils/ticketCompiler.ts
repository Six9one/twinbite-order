/**
 * Ticket Template Compiler Utility
 * 
 * Compiles dynamic ticket templates using custom Mustache-like tags
 * and outputs styled print-ready HTML documents for ESC/POS thermal printers.
 */

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

/**
 * Simple Mustache-like compiler supporting loops, conditionals, and variables
 */
function compileTemplateString(templateStr: string, data: any): string {
  let result = templateStr;

  // 1. Handle sections/loops like {{#items}} ... {{/items}}
  const sectionRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(sectionRegex, (match, key, sectionContent) => {
    const sectionData = data[key];
    if (Array.isArray(sectionData)) {
      return sectionData.map(item => compileTemplateString(sectionContent, item)).join('');
    } else if (sectionData) {
      return compileTemplateString(sectionContent, sectionData);
    }
    return '';
  });

  // 2. Handle conditional blocks for falsy values (optional fallback if needed)
  // E.g. {{^size}}...{{/size}} - only render if size is falsy
  const invertedRegex = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(invertedRegex, (match, key, sectionContent) => {
    const sectionData = data[key];
    if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) {
      return compileTemplateString(sectionContent, {});
    }
    return '';
  });

  // 3. Replace variables like {{name}}
  const variableRegex = /\{\{([\w.]+)\}\}/g;
  result = result.replace(variableRegex, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
  });

  return result;
}

/**
 * Compiles full order ticket HTML using configured template settings
 */
export function compileTicketHtml(order: any, settings: any, templateType?: 'counter' | 'kitchen'): string {
  const activeType = templateType || settings.activeTemplate || 'counter';
  const template = activeType === 'kitchen' ? settings.kitchenTemplate : settings.counterTemplate;
  
  // 1. Normalize items list
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const normalizedItems: NormalizedItem[] = rawItems.map((item: any) => {
    const name = item.name || item.item?.name || 'Produit';
    const price = item.price || item.totalPrice || item.calculatedPrice || 0;
    const customization = item.customization;
    
    // Normalize options
    const meats = Array.isArray(customization?.meats) ? customization.meats.join(', ') : customization?.meats || customization?.meat || '';
    const sauces = Array.isArray(customization?.sauces) ? customization.sauces.join(', ') : customization?.sauces || '';
    const garnitures = Array.isArray(customization?.garnitures) ? customization.garnitures.join(', ') : customization?.garnitures || '';
    
    const supplementsList = [];
    if (customization?.supplements?.length) supplementsList.push(...customization.supplements);
    if (customization?.cheeseSupplements?.length) supplementsList.push(...customization.cheeseSupplements);
    const supplements = supplementsList.join(', ');

    return {
      quantity: item.quantity || 1,
      name,
      price: Number(price).toFixed(2),
      size: customization?.size || item.size || '',
      meats,
      sauces,
      garnitures,
      supplements,
      note: item.note || customization?.note || ''
    };
  });

  // 2. Normalize order details
  const dateStr = new Date(order.created_at || '').toLocaleString('fr-FR');
  const typeLabel = order.order_type === 'livraison' ? '🚗 LIVRAISON' : order.order_type === 'emporter' ? '🛍️ A EMPORTER' : '🍽️ SUR PLACE';
  const paymentLabel = order.payment_method === 'en_ligne' ? '✅ PAYÉ EN LIGNE' : order.payment_method === 'cb' ? '💳 CB - À PAYER' : '💵 ESPÈCES - À PAYER';
  const paymentStatusLabel = order.payment_status === 'paid' ? 'PAYÉ' : 'À PAYER';

  const orderData = {
    order_number: order.order_number || '',
    order_type: typeLabel,
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    customer_address: order.customer_address || '',
    created_at: dateStr,
    scheduled_for: order.scheduled_for || '',
    subtotal: (order.subtotal || 0).toFixed(2),
    tva: (order.tva || 0).toFixed(2),
    delivery_fee: (order.delivery_fee || 0).toFixed(2),
    total: (order.total || 0).toFixed(2),
    payment_method: paymentLabel,
    payment_status: paymentStatusLabel,
    customer_notes: order.customer_notes || '',
    items: normalizedItems
  };

  // 3. Compile the body template using our Mustache-like compiler
  const bodyContentHtml = compileTemplateString(template.bodyTemplate, orderData);

  // 4. Build the final HTML document
  const paperWidth = settings.paperWidth || '80mm';
  const fontSize = settings.fontSize === 'large' ? '16px' : settings.fontSize === 'small' ? '11px' : '13px';

  // Format header/footer lines replacing \n with <br />
  const headerHtml = template.header.replace(/\n/g, '<br />');
  const subheaderHtml = template.subheader ? template.subheader.replace(/\n/g, '<br />') : '';
  const footerHtml = template.footer ? template.footer.replace(/\n/g, '<br />') : '';

  // Render CSS custom rules
  const customCssRules = template.customCss || '';

  // Translate basic tags to styled HTML in ESC/POS parser
  let parsedBody = bodyContentHtml
    .replace(/<center>/g, '<div style="text-align: center;">')
    .replace(/<\/center>/g, '</div>')
    .replace(/<right>/g, '<div style="text-align: right;">')
    .replace(/<\/right>/g, '</div>')
    .replace(/<large>/g, '<span style="font-size: 1.25em;">')
    .replace(/<\/large>/g, '</span>')
    .replace(/<small>/g, '<span style="font-size: 0.85em;">')
    .replace(/<\/small>/g, '</span>')
    .replace(/---/g, '<div style="border-top: 1px dashed black; margin: 4px 0;"></div>')
    .replace(/===/g, '<div style="border-top: 2px dashed black; margin: 6px 0;"></div>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Ticket ${order.order_number}</title>
      <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        @media print { 
          body { width: ${paperWidth}; margin: 0; } 
          .no-print { display: none; }
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${fontSize};
          font-weight: bold;
          color: black !important;
          background: white;
          width: ${paperWidth};
          margin: 0;
          padding: 8px;
          box-sizing: border-box;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .text-center { text-align: center; }
        .flex-between { display: flex; justify-content: space-between; }
        .payment-status-badge {
          border: 1px solid black;
          padding: 4px;
          text-align: center;
          font-weight: bold;
          margin-top: 6px;
        }
        ${customCssRules}
      </style>
    </head>
    <body>
      ${template.showLogo ? '<div class="text-center" style="margin-bottom: 8px; font-size: 24px;">🍕</div>' : ''}
      
      <div class="text-center" style="font-size: 1.15em; font-weight: bold; margin-bottom: 4px;">
        ${headerHtml}
      </div>
      
      ${subheaderHtml ? `<div class="text-center" style="font-size: 0.85em; margin-bottom: 8px;">${subheaderHtml}</div>` : ''}
      
      <div style="border-top: 1px dashed black; margin: 6px 0;"></div>
      
      ${template.showOrderNumber ? `<div><strong>Commande:</strong> ${orderData.order_number}</div>` : ''}
      ${template.showDateTime ? `<div><strong>Date:</strong> ${orderData.created_at}</div>` : ''}
      <div><strong>Type:</strong> ${orderData.order_type}</div>
      
      ${template.showCustomerInfo && orderData.customer_name ? `<div><strong>Client:</strong> ${orderData.customer_name}</div>` : ''}
      ${template.showCustomerPhone && orderData.customer_phone ? `<div><strong>Tél:</strong> ${orderData.customer_phone}</div>` : ''}
      ${template.showDeliveryAddress && orderData.customer_address ? `<div><strong>Adresse:</strong> ${orderData.customer_address}</div>` : ''}
      ${template.showScheduledTime && orderData.scheduled_for ? `<div><strong>Heure Prog:</strong> ${orderData.scheduled_for}</div>` : ''}
      
      <div style="border-top: 1px dashed black; margin: 6px 0;"></div>
      
      <!-- Body template content -->
      <div class="body-template-content">
        ${parsedBody}
      </div>
      
      <!-- Summary / Totals block -->
      ${(template.showSubtotal || template.showTva || template.showDeliveryFee || template.showTotal || template.showPaymentMethod || template.showPaymentStatus || template.showCustomerNotes) ? `
        <div style="border-top: 1px dashed black; margin: 6px 0;"></div>
        
        ${template.showSubtotal ? `<div class="flex-between"><span>Sous-total:</span><span>${orderData.subtotal}€</span></div>` : ''}
        ${template.showTva ? `<div class="flex-between"><span>TVA (10%):</span><span>${orderData.tva}€</span></div>` : ''}
        ${template.showDeliveryFee && order.delivery_fee > 0 ? `<div class="flex-between"><span>Livraison:</span><span>${orderData.delivery_fee}€</span></div>` : ''}
        
        ${template.showTotal ? `
          <div class="flex-between" style="font-size: 1.15em; font-weight: bold; margin-top: 4px;">
            <span>TOTAL:</span>
            <span>${orderData.total}€</span>
          </div>
        ` : ''}
        
        ${template.showPaymentMethod ? `<div style="margin-top: 4px;"><strong>Paiement:</strong> ${orderData.payment_method}</div>` : ''}
        
        ${template.showPaymentStatus ? `
          <div class="payment-status-badge">
            ${orderData.payment_status}
          </div>
        ` : ''}
        
        ${template.showCustomerNotes && orderData.customer_notes ? `
          <div style="background: #f0f0f0; border: 1px solid #ddd; padding: 6px; margin-top: 8px; font-style: italic; font-size: 0.9em;">
            <strong>Note client:</strong> ${orderData.customer_notes}
          </div>
        ` : ''}
      ` : ''}
      
      ${footerHtml ? `
        <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
        <div class="text-center" style="font-size: 0.9em; margin-top: 8px;">
          ${footerHtml}
        </div>
      ` : ''}
    </body>
    </html>
  `;
}
