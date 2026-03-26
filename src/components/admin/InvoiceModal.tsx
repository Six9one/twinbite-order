import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Printer, FileText, Calendar } from 'lucide-react';
import type { Order } from '@/hooks/useSupabaseData';

// Twin Pizza company info
const COMPANY = {
  name: 'Twin Pizza',
  legalForm: 'Entreprise individuelle',
  address: '60 Rue Georges Clemenceau',
  city: '76530 Grand-Couronne',
  country: 'France',
  phone: '02 32 11 26 13',
  email: 'contact@twinpizza.fr',
  siret: '942 617 358 00018',
  tvaNumber: 'FR28942617358',
  tvaRate: 10, // 10% TVA for restaurant
};

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const invoiceNumber = `FA-${order.order_number}`;

  // Calculate HT and TVA
  const totalTTC = order.total;
  const deliveryFee = order.delivery_fee || 0;
  const totalHTProducts = order.subtotal / (1 + COMPANY.tvaRate / 100);
  const tvaProducts = order.subtotal - totalHTProducts;
  const totalHT = totalHTProducts + deliveryFee;
  const totalTVA = tvaProducts;

  const orderTypeLabels: Record<string, string> = {
    livraison: 'Livraison',
    emporter: 'À emporter',
    surplace: 'Sur place',
  };

  const paymentLabels: Record<string, string> = {
    en_ligne: 'Carte bancaire (en ligne)',
    cb: 'Carte bancaire',
    especes: 'Espèces',
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const printInvoice = () => {
    const items = Array.isArray(order.items) ? order.items : [];

    const itemsRows = items
      .map((cartItem: any) => {
        const productName =
          cartItem.item?.name || cartItem.name || 'Produit';
        const qty = cartItem.quantity || 1;
        const unitPrice =
          cartItem.calculatedPrice || cartItem.item?.price || cartItem.price || 0;
        const totalPrice = cartItem.totalPrice || unitPrice * qty;
        const unitHT = unitPrice / (1 + COMPANY.tvaRate / 100);

        // Build customization details
        const customization = cartItem.customization;
        let details: string[] = [];
        if (customization?.size) details.push(customization.size.toUpperCase());
        if (customization?.meats?.length)
          details.push(customization.meats.join(', '));
        if (customization?.meat) details.push(customization.meat);
        if (customization?.sauces?.length)
          details.push(customization.sauces.join(', '));
        if (customization?.garnitures?.length)
          details.push(customization.garnitures.join(', '));
        if (customization?.supplements?.length)
          details.push(customization.supplements.join(', '));
        if (
          customization?.menuOption &&
          customization.menuOption !== 'none'
        )
          details.push(customization.menuOption);

        return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
              <strong>${escapeHtml(productName)}</strong>
              ${details.length > 0 ? `<br><span style="font-size: 11px; color: #6b7280;">${escapeHtml(details.join(' | '))}</span>` : ''}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${unitHT.toFixed(2)} €</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${totalPrice.toFixed(2)} €</td>
          </tr>
        `;
      })
      .join('');

    const invoiceHTML = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Facture ${invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1f2937;
            font-size: 13px;
            line-height: 1.5;
            background: white;
          }
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 30px 40px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #f59e0b;
          }
          .company-info h1 {
            font-size: 28px;
            font-weight: 800;
            color: #f59e0b;
            margin-bottom: 4px;
          }
          .company-info p {
            color: #6b7280;
            font-size: 12px;
            line-height: 1.6;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-meta h2 {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .invoice-meta .invoice-number {
            font-size: 16px;
            font-weight: 600;
            color: #f59e0b;
            margin-bottom: 4px;
          }
          .invoice-meta p {
            font-size: 12px;
            color: #6b7280;
          }
          .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 40px;
          }
          .party-box {
            flex: 1;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px 20px;
          }
          .party-box h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #9ca3af;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .party-box p {
            font-size: 13px;
            line-height: 1.6;
          }
          .party-box .name {
            font-weight: 700;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          thead th {
            background: #1f2937;
            color: white;
            padding: 10px 8px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          thead th:first-child { border-radius: 6px 0 0 0; text-align: left; }
          thead th:last-child { border-radius: 0 6px 0 0; }
          tbody tr:hover { background: #f9fafb; }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-table {
            width: 280px;
          }
          .totals-table tr td {
            padding: 6px 0;
            font-size: 13px;
          }
          .totals-table tr td:first-child {
            color: #6b7280;
          }
          .totals-table tr td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .totals-table .total-row td {
            padding-top: 10px;
            border-top: 2px solid #1f2937;
            font-size: 18px;
            font-weight: 800;
            color: #1f2937;
          }
          .legal-info {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
            line-height: 1.8;
          }
          .payment-info {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .payment-info strong { color: #166534; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>🍕 TWIN PIZZA</h1>
              <p>
                ${COMPANY.address}<br>
                ${COMPANY.city}, ${COMPANY.country}<br>
                Tél: ${COMPANY.phone}<br>
                Email: ${COMPANY.email}
              </p>
            </div>
            <div class="invoice-meta">
              <h2>FACTURE</h2>
              <div class="invoice-number">${invoiceNumber}</div>
              <p>Date: <strong>${formatDate(invoiceDate)}</strong></p>
              <p>Commande: ${escapeHtml(order.order_number)}</p>
              <p>Type: ${orderTypeLabels[order.order_type] || order.order_type}</p>
            </div>
          </div>

          <div class="parties">
            <div class="party-box">
              <h3>Émetteur</h3>
              <p class="name">${COMPANY.name}</p>
              <p>${COMPANY.legalForm}</p>
              <p>${COMPANY.address}</p>
              <p>${COMPANY.city}</p>
              <p style="margin-top: 6px;">
                <strong>SIRET:</strong> ${COMPANY.siret}<br>
                <strong>N° TVA:</strong> ${COMPANY.tvaNumber}
              </p>
            </div>
            <div class="party-box">
              <h3>Client</h3>
              <p class="name">${escapeHtml(order.customer_name)}</p>
              <p>Tél: ${escapeHtml(order.customer_phone || '-')}</p>
              ${order.customer_address ? `<p>${escapeHtml(order.customer_address)}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Désignation</th>
                <th style="text-align: center;">Qté</th>
                <th style="text-align: right;">P.U. HT</th>
                <th style="text-align: right;">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              ${deliveryFee > 0 ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Frais de livraison</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">1</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${deliveryFee.toFixed(2)} €</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${deliveryFee.toFixed(2)} €</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Total HT</td>
                <td>${totalHT.toFixed(2)} €</td>
              </tr>
              <tr>
                <td>TVA (${COMPANY.tvaRate}%)</td>
                <td>${totalTVA.toFixed(2)} €</td>
              </tr>
              <tr class="total-row">
                <td>Total TTC</td>
                <td>${totalTTC.toFixed(2)} €</td>
              </tr>
            </table>
          </div>

          <div class="payment-info">
            <strong>Mode de paiement:</strong> ${paymentLabels[order.payment_method] || order.payment_method}
            ${order.payment_method === 'en_ligne' ? ' — <strong>PAYÉ ✓</strong>' : ''}
          </div>

          <div class="legal-info">
            <p><strong>${COMPANY.name}</strong> — ${COMPANY.legalForm}</p>
            <p>SIRET: ${COMPANY.siret} — N° TVA Intracommunautaire: ${COMPANY.tvaNumber}</p>
            <p>${COMPANY.address}, ${COMPANY.city}, ${COMPANY.country} — Tél: ${COMPANY.phone}</p>
            <p style="margin-top: 8px;">TVA applicable sur les produits de restauration: ${COMPANY.tvaRate}%</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  const printInvoiceThermal = () => {
    const url = `http://localhost:3001/print-invoice/${encodeURIComponent(order.order_number)}?date=${encodeURIComponent(invoiceDate)}`;
    window.open(url, '_blank', 'width=400,height=300');
    toast.success('🖨️ Envoi de la facture à l\'imprimante...');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-xl">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Facture / Justificatif</h2>
              <p className="text-xs text-muted-foreground">
                Commande {order.order_number} — {order.customer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Date control */}
          <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Date de la facture
            </label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-auto bg-white dark:bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Vous pouvez modifier la date affichée sur la facture
            </p>
          </div>

          {/* Invoice preview card */}
          <div className="border rounded-xl p-5 space-y-4 bg-white dark:bg-muted/30">
            {/* Company info */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-amber-500">
                  🍕 TWIN PIZZA
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {COMPANY.address}
                  <br />
                  {COMPANY.city}
                  <br />
                  Tél: {COMPANY.phone}
                </p>
              </div>
              <div className="text-right">
                <Badge className="bg-amber-500 text-black font-bold text-sm px-3 py-1">
                  FACTURE
                </Badge>
                <p className="text-sm font-bold mt-2">{invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(invoiceDate)}
                </p>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Legal numbers */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/50 rounded-lg p-2.5">
                <span className="text-muted-foreground">SIRET:</span>
                <br />
                <span className="font-bold">{COMPANY.siret}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5">
                <span className="text-muted-foreground">N° TVA:</span>
                <br />
                <span className="font-bold">{COMPANY.tvaNumber}</span>
              </div>
            </div>

            {/* Client */}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-semibold mb-1">
                CLIENT
              </p>
              <p className="font-bold text-sm">{order.customer_name}</p>
              <p className="text-xs text-muted-foreground">
                {order.customer_phone}
              </p>
              {order.customer_address && (
                <p className="text-xs text-muted-foreground">
                  {order.customer_address}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                ARTICLES
              </p>
              {Array.isArray(order.items) &&
                order.items.map((cartItem: any, idx: number) => {
                  const productName =
                    cartItem.item?.name || cartItem.name || 'Produit';
                  const qty = cartItem.quantity || 1;
                  const price =
                    cartItem.totalPrice ||
                    cartItem.calculatedPrice ||
                    cartItem.item?.price ||
                    cartItem.price ||
                    0;

                  return (
                    <div
                      key={idx}
                      className="flex justify-between text-sm py-1.5 border-b border-dashed border-border/50 last:border-0"
                    >
                      <span>
                        {qty}x {productName}
                      </span>
                      <span className="font-semibold">
                        {Number(price).toFixed(2)} €
                      </span>
                    </div>
                  );
                })}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm py-1.5 border-b border-dashed border-border/50">
                  <span>Frais de livraison</span>
                  <span className="font-semibold">
                    {deliveryFee.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  TVA ({COMPANY.tvaRate}%)
                </span>
                <span>{totalTVA.toFixed(2)} €</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total TTC</span>
                <span className="text-amber-600">
                  {totalTTC.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Payment info */}
            <div className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <span className="text-green-700 dark:text-green-400 font-medium">
                Paiement:{' '}
                {paymentLabels[order.payment_method] || order.payment_method}
              </span>
              {order.payment_method === 'en_ligne' && (
                <Badge className="bg-green-500 text-white text-[10px]">
                  PAYÉ ✓
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={printInvoice}
              className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-600 hover:to-orange-600"
            >
              <Printer className="w-4 h-4" />
              Imprimer Facture (A4)
            </Button>
            <Button
              variant="outline"
              onClick={printInvoiceThermal}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Ticket Thermique
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// HTML escape function
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}
