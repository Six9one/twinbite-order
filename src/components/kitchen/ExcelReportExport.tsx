import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, RefreshCw, Calendar, Printer } from 'lucide-react';

interface ExportData {
  tempLogs: any[];
  receptionLogs: any[];
  traceability: any[];
  cleaningTasks: any[];
  shifts: any[];
  wasteLog: any[];
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
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // Get shift type based on hour
  const getShiftType = (dateStr: string) => {
    const hour = new Date(dateStr).getHours();
    return hour < 16 ? 'Matin' : 'Soir';
  };

  const fetchAllData = async (): Promise<ExportData> => {
    const [tempLogs, receptionLogs, traceability, cleaningTasks, shifts, wasteLog] = await Promise.all([
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
      supabase.from('kitchen_waste_log' as any).select('*')
        .gte('disposed_at', `${startDate}T00:00:00`).lte('disposed_at', `${endDate}T23:59:59`)
        .order('disposed_at', { ascending: false }),
    ]);

    return {
      tempLogs: tempLogs.data || [],
      receptionLogs: receptionLogs.data || [],
      traceability: traceability.data || [],
      cleaningTasks: cleaningTasks.data || [],
      shifts: shifts.data || [],
      wasteLog: wasteLog.data || [],
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
    @page { size: A4; margin: 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
    body { background: #fff; color: #1a1a1a; font-size: 9px; line-height: 1.3; padding: 10px; }
    
    .header { background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 15px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 18px; }
    .header-info { text-align: right; font-size: 10px; opacity: 0.9; }
    
    .stats { display: flex; gap: 8px; margin-bottom: 12px; }
    .stat { flex: 1; background: #f8fafc; border-radius: 6px; padding: 10px; text-align: center; border-left: 3px solid #22c55e; }
    .stat.warn { border-left-color: #ef4444; }
    .stat-val { font-size: 20px; font-weight: 700; color: #1e293b; }
    .stat-lbl { font-size: 8px; color: #64748b; text-transform: uppercase; }
    
    .section { margin-bottom: 12px; }
    .sec-title { background: #1e293b; color: white; padding: 8px 12px; font-size: 11px; font-weight: 600; border-radius: 5px 5px 0 0; }
    .sec-content { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 5px 5px; }
    
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #475569; color: white; padding: 6px 4px; text-align: left; font-weight: 600; }
    td { padding: 5px 4px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    
    .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 7px; font-weight: 700; }
    .b-ok { background: #dcfce7; color: #166534; }
    .b-no { background: #fee2e2; color: #991b1b; }
    .b-am { background: #fef3c7; color: #92400e; }
    .b-pm { background: #ddd6fe; color: #5b21b6; }
    .b-info { background: #dbeafe; color: #1e40af; }
    
    .photo { width: 35px; height: 35px; object-fit: cover; border-radius: 4px; border: 1px solid #d1d5db; }
    .photos { display: flex; gap: 4px; }
    
    .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 8px; }
    
    .print-btn { position: fixed; bottom: 15px; right: 15px; background: #f97316; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 3px 10px rgba(249,115,22,0.3); }
    
    .compact-row { display: flex; gap: 4px; align-items: center; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ PDF</button>

  <div class="header">
    <h1>🍕 RAPPORT HACCP</h1>
    <div class="header-info">
      <div>${formatDate(startDate)} → ${formatDate(endDate)}</div>
      <div>Généré: ${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${data.tempLogs.length}</div><div class="stat-lbl">Relevés</div></div>
    <div class="stat ${nonCompliantTemps > 0 ? 'warn' : ''}"><div class="stat-val">${compliantTemps}/${nonCompliantTemps}</div><div class="stat-lbl">OK/NON</div></div>
    <div class="stat"><div class="stat-val">${data.receptionLogs.length}</div><div class="stat-lbl">Réceptions</div></div>
    <div class="stat"><div class="stat-val">${data.traceability.length}</div><div class="stat-lbl">Étiquettes</div></div>
    <div class="stat"><div class="stat-val">${completedCleaning}/${data.cleaningTasks.length}</div><div class="stat-lbl">Nettoyage</div></div>
    <div class="stat warn"><div class="stat-val">${data.wasteLog.length}</div><div class="stat-lbl">Déchets</div></div>
  </div>

  <!-- TEMPÉRATURES -->
  <div class="section">
    <div class="sec-title">🌡️ TEMPÉRATURES (${data.tempLogs.length})</div>
    <div class="sec-content">
      <table>
        <thead><tr><th>Date</th><th>Shift</th><th>Équipement</th><th>°C</th><th>Statut</th><th>Action</th></tr></thead>
        <tbody>
          ${data.tempLogs.map(l => {
        const dt = new Date(l.logged_at);
        const shift = getShiftType(l.logged_at);
        return `
            <tr>
              <td>${dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><span class="badge ${shift === 'Matin' ? 'b-am' : 'b-pm'}">${shift === 'Matin' ? '☀️ Matin' : '🌙 Soir'}</span></td>
              <td><strong>${l.equipment_name}</strong></td>
              <td><strong>${l.value}°C</strong></td>
              <td><span class="badge ${l.is_compliant ? 'b-ok' : 'b-no'}">${l.is_compliant ? '✓' : '⚠️'}</span></td>
              <td>${l.corrective_action || '-'}</td>
            </tr>`;
      }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- RÉCEPTIONS -->
  ${data.receptionLogs.length > 0 ? `
  <div class="section">
    <div class="sec-title">📦 RÉCEPTIONS (${data.receptionLogs.length})</div>
    <div class="sec-content">
      <table>
        <thead><tr><th>Date</th><th>Fournisseur</th><th>°C</th><th>Photos</th></tr></thead>
        <tbody>
          ${data.receptionLogs.map(r => `
            <tr>
              <td>${new Date(r.received_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${new Date(r.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${r.supplier_name}</strong></td>
              <td>${r.temp_on_receipt || '-'}</td>
              <td class="photos">
                ${r.invoice_photo_url ? `<img src="${r.invoice_photo_url}" class="photo"/>` : ''}
                ${r.delivery_photo_url ? `<img src="${r.delivery_photo_url}" class="photo"/>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- TRAÇABILITÉ -->
  ${data.traceability.length > 0 ? `
  <div class="section">
    <div class="sec-title">🏷️ TRAÇABILITÉ (${data.traceability.length})</div>
    <div class="sec-content">
      <table>
        <thead><tr><th>Date</th><th>Produit</th><th>Lot</th><th>DLC</th><th>Photo</th></tr></thead>
        <tbody>
          ${data.traceability.map(t => `
            <tr>
              <td>${new Date(t.opened_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${new Date(t.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${t.product_name}</strong></td>
              <td>${t.batch_number || '-'}</td>
              <td><span class="badge b-info">${formatDateTime(t.secondary_dlc)}</span></td>
              <td>${t.label_photo_url ? `<img src="${t.label_photo_url}" class="photo"/>` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- NETTOYAGE -->
  ${data.cleaningTasks.length > 0 ? `
  <div class="section">
    <div class="sec-title">✨ NETTOYAGE (${completedCleaning}/${data.cleaningTasks.length})</div>
    <div class="sec-content">
      <table>
        <thead><tr><th>Date</th><th>Zone</th><th>Statut</th><th>Heure</th><th>Photo</th></tr></thead>
        <tbody>
          ${data.cleaningTasks.map(c => `
            <tr>
              <td>${formatDate(c.scheduled_date)}</td>
              <td><strong>${c.zone_name}</strong></td>
              <td><span class="badge ${c.status === 'completed' ? 'b-ok' : 'b-no'}">${c.status === 'completed' ? '✓' : '⏳'}</span></td>
              <td>${c.completed_at ? new Date(c.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>${c.proof_photo_url ? `<img src="${c.proof_photo_url}" class="photo"/>` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- DÉCHETS -->
  ${data.wasteLog.length > 0 ? `
  <div class="section">
    <div class="sec-title">🗑️ MISE AU REBUT (${data.wasteLog.length})</div>
    <div class="sec-content">
      <table>
        <thead><tr><th>Date</th><th>Produit</th><th>Motif</th><th>Par</th><th>Photo</th></tr></thead>
        <tbody>
          ${data.wasteLog.map((w: any) => `
            <tr>
              <td>${new Date(w.disposed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${new Date(w.disposed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${w.product_name}</strong></td>
              <td>${w.reason || '-'}</td>
              <td>${w.disposed_by || '-'}</td>
              <td>${w.photo_url ? `<img src="${w.photo_url}" class="photo"/>` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    🍕 Twin Pizza • Document HACCP • Conservation 5 ans
  </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        toast.success('📄 Rapport ouvert!');
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Rapport_HACCP_${startDate}_${endDate}.html`;
        link.click();
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
            <Label className="text-slate-300 flex items-center gap-2"><Calendar className="h-4 w-4" /> Début</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2"><Calendar className="h-4 w-4" /> Fin</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
          </div>
        </div>

        <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-3 text-sm">
          <p className="text-orange-400 font-medium mb-1">📄 Rapport compact:</p>
          <div className="flex flex-wrap gap-2 text-orange-300/80 text-xs">
            <span>☀️🌙 Matin/Soir</span>
            <span>📷 Photos</span>
            <span>📊 Stats</span>
            <span>✓ Compact</span>
          </div>
        </div>

        <Button onClick={generatePDF} disabled={loading} className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-lg font-bold">
          {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-6 w-6" />}
          Générer PDF
        </Button>
      </CardContent>
    </Card>
  );
}

export default ExcelReportExport;
