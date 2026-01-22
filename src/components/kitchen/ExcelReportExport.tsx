import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Download, RefreshCw, Calendar, Printer } from 'lucide-react';

interface ExportData {
    tempLogs: any[];
    receptionLogs: any[];
    traceability: any[];
    cleaningTasks: any[];
    shifts: any[];
}

export function ExcelReportExport() {
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const fetchAllData = async (): Promise<ExportData> => {
        const [tempLogs, receptionLogs, traceability, cleaningTasks, shifts] = await Promise.all([
            supabase.from('kitchen_temp_logs' as any).select('*')
                .gte('logged_at', `${startDate}T00:00:00`).lte('logged_at', `${endDate}T23:59:59`)
                .order('logged_at', { ascending: false }),
            supabase.from('kitchen_reception_logs' as any).select('*')
                .gte('received_at', `${startDate}T00:00:00`).lte('received_at', `${endDate}T23:59:59`)
                .order('received_at', { ascending: false }),
            supabase.from('kitchen_traceability' as any).select('*')
                .gte('opened_at', `${startDate}T00:00:00`).lte('opened_at', `${endDate}T23:59:59`)
                .order('opened_at', { ascending: false }),
            supabase.from('kitchen_cleaning_tasks' as any).select('*')
                .gte('scheduled_date', startDate).lte('scheduled_date', endDate)
                .order('scheduled_date', { ascending: false }),
            supabase.from('kitchen_shifts' as any).select('*')
                .gte('shift_date', startDate).lte('shift_date', endDate)
                .order('shift_date', { ascending: false }),
        ]);

        return {
            tempLogs: tempLogs.data || [],
            receptionLogs: receptionLogs.data || [],
            traceability: traceability.data || [],
            cleaningTasks: cleaningTasks.data || [],
            shifts: shifts.data || [],
        };
    };

    const generatePDF = async () => {
        setLoading(true);

        try {
            const data = await fetchAllData();
            const compliantTemps = data.tempLogs.filter(l => l.is_compliant).length;
            const nonCompliantTemps = data.tempLogs.filter(l => !l.is_compliant).length;
            const completedCleaning = data.cleaningTasks.filter(t => t.status === 'completed').length;

            const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport HACCP - Twin Pizza</title>
  <style>
    @page { size: A4; margin: 20mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    body { background: #fff; color: #1a1a1a; font-size: 11px; line-height: 1.5; padding: 20px; }
    
    .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
    .header h1 { font-size: 26px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 13px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 10px; padding: 18px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-value { font-size: 32px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card.ok { border-left: 4px solid #22c55e; }
    .stat-card.warning { border-left: 4px solid #ef4444; }
    
    .section { margin-bottom: 30px; }
    .section-title { background: #1e293b; color: white; padding: 12px 18px; border-radius: 8px 8px 0 0; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .section-content { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 15px; background: #fafafa; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #334155; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    
    .photo-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 2px solid #e2e8f0; }
    .photo-container { display: flex; gap: 8px; }
    
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px; }
    .footer strong { color: #1e293b; }
    
    .print-btn { position: fixed; bottom: 20px; right: 20px; background: #f97316; color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(249,115,22,0.4); }
    .print-btn:hover { background: #ea580c; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <div class="header">
    <h1>🍕 RAPPORT HACCP - TWIN PIZZA</h1>
    <p>Période: ${formatDate(startDate)} au ${formatDate(endDate)}</p>
    <p>Généré le: ${formatDateTime(new Date().toISOString())}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card ok">
      <div class="stat-value">${data.tempLogs.length}</div>
      <div class="stat-label">Relevés Temp.</div>
    </div>
    <div class="stat-card ${nonCompliantTemps > 0 ? 'warning' : 'ok'}">
      <div class="stat-value">${compliantTemps} / ${nonCompliantTemps}</div>
      <div class="stat-label">OK / Non-OK</div>
    </div>
    <div class="stat-card ok">
      <div class="stat-value">${data.receptionLogs.length}</div>
      <div class="stat-label">Réceptions</div>
    </div>
    <div class="stat-card ok">
      <div class="stat-value">${completedCleaning}/${data.cleaningTasks.length}</div>
      <div class="stat-label">Nettoyage</div>
    </div>
  </div>

  <!-- TEMPÉRATURES -->
  <div class="section">
    <div class="section-title">🌡️ RELEVÉS DE TEMPÉRATURE</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>Date</th><th>Heure</th><th>Équipement</th><th>°C</th><th>Statut</th><th>Action Corrective</th><th>Opérateur</th></tr>
        </thead>
        <tbody>
          ${data.tempLogs.slice(0, 50).map(l => `
            <tr>
              <td>${new Date(l.logged_at).toLocaleDateString('fr-FR')}</td>
              <td>${new Date(l.logged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${l.equipment_name}</strong></td>
              <td><strong>${l.value}°C</strong></td>
              <td><span class="badge ${l.is_compliant ? 'badge-ok' : 'badge-warning'}">${l.is_compliant ? '✓ OK' : '⚠️ NON'}</span></td>
              <td>${l.corrective_action || '-'}</td>
              <td>${l.logged_by || 'Staff'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${data.tempLogs.length > 50 ? `<p style="padding: 10px; color: #64748b; text-align: center;">... et ${data.tempLogs.length - 50} autres relevés</p>` : ''}
    </div>
  </div>

  <div class="page-break"></div>

  <!-- RÉCEPTIONS -->
  <div class="section">
    <div class="section-title">📦 RÉCEPTION MARCHANDISES</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>Date</th><th>Heure</th><th>Fournisseur</th><th>Temp.</th><th>Photos</th><th>Opérateur</th></tr>
        </thead>
        <tbody>
          ${data.receptionLogs.map(r => `
            <tr>
              <td>${new Date(r.received_at).toLocaleDateString('fr-FR')}</td>
              <td>${new Date(r.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${r.supplier_name}</strong></td>
              <td>${r.temp_on_receipt ? r.temp_on_receipt + '°C' : '-'}</td>
              <td>
                <div class="photo-container">
                  ${r.invoice_photo_url ? `<img src="${r.invoice_photo_url}" class="photo-thumb" alt="Facture" />` : ''}
                  ${r.delivery_photo_url ? `<img src="${r.delivery_photo_url}" class="photo-thumb" alt="Livraison" />` : ''}
                </div>
              </td>
              <td>${r.received_by || 'Staff'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- TRAÇABILITÉ -->
  <div class="section">
    <div class="section-title">🏷️ TRAÇABILITÉ / ÉTIQUETTES DLC</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>Date</th><th>Heure</th><th>Produit</th><th>N° Lot</th><th>DLC Secondaire</th><th>Photo</th><th>Opérateur</th></tr>
        </thead>
        <tbody>
          ${data.traceability.map(t => `
            <tr>
              <td>${new Date(t.opened_at).toLocaleDateString('fr-FR')}</td>
              <td>${new Date(t.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${t.product_name}</strong></td>
              <td>${t.batch_number || '-'}</td>
              <td><span class="badge badge-info">${formatDateTime(t.secondary_dlc)}</span></td>
              <td>${t.label_photo_url ? `<img src="${t.label_photo_url}" class="photo-thumb" alt="Étiquette" />` : '-'}</td>
              <td>${t.opened_by || 'Staff'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- NETTOYAGE -->
  <div class="section">
    <div class="section-title">✨ PLAN DE NETTOYAGE</div>
    <div class="section-content">
      <table>
        <thead>
          <tr><th>Date</th><th>Zone</th><th>Statut</th><th>Heure Validation</th><th>Photo Preuve</th><th>Opérateur</th></tr>
        </thead>
        <tbody>
          ${data.cleaningTasks.map(c => `
            <tr>
              <td>${formatDate(c.scheduled_date)}</td>
              <td><strong>${c.zone_name}</strong></td>
              <td><span class="badge ${c.status === 'completed' ? 'badge-ok' : 'badge-warning'}">${c.status === 'completed' ? '✓ Terminé' : '⏳ En attente'}</span></td>
              <td>${c.completed_at ? new Date(c.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>${c.proof_photo_url ? `<img src="${c.proof_photo_url}" class="photo-thumb" alt="Preuve" />` : '-'}</td>
              <td>${c.completed_by || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <p><strong>🍕 Twin Pizza</strong> - Grand-Couronne</p>
    <p>Document conforme aux exigences DDPP • Conservation recommandée: 5 ans</p>
    <p>Généré automatiquement par le système HACCP Twin Pizza</p>
  </div>
</body>
</html>
      `;

            // Open in new window for printing
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                toast.success('📄 Rapport ouvert! Cliquez sur Imprimer pour sauvegarder en PDF');
            } else {
                // Fallback: download as HTML
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `Rapport_HACCP_TwinPizza_${startDate}_${endDate}.html`;
                link.click();
                toast.success('📄 Rapport téléchargé! Ouvrez-le et imprimez en PDF');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Erreur export');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Rapport HACCP
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Début
                        </Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Fin
                        </Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
                    </div>
                </div>

                <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 text-sm">
                    <p className="text-orange-400 font-medium mb-2">📄 Rapport PDF complet:</p>
                    <div className="grid grid-cols-2 gap-1 text-orange-300/80 text-xs">
                        <span>✓ Photos intégrées</span>
                        <span>✓ Statistiques</span>
                        <span>✓ Températures</span>
                        <span>✓ Réceptions</span>
                        <span>✓ Traçabilité DLC</span>
                        <span>✓ Plan Nettoyage</span>
                    </div>
                </div>

                <Button onClick={generatePDF} disabled={loading} className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-lg font-bold shadow-lg">
                    {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-6 w-6" />}
                    Générer le Rapport PDF
                </Button>

                <p className="text-center text-slate-500 text-xs">
                    Le rapport s'ouvre dans une nouvelle fenêtre • Cliquez sur "Imprimer" → "Enregistrer en PDF"
                </p>
            </CardContent>
        </Card>
    );
}

export default ExcelReportExport;
