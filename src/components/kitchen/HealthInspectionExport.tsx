import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Download, RefreshCw } from 'lucide-react';

interface ExportData { tempLogs: any[]; receptionLogs: any[]; traceability: any[]; cleaningTasks: any[]; }

export function HealthInspectionExport() {
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchAllData = async (): Promise<ExportData> => {
        const [tempLogs, receptionLogs, traceability, cleaningTasks] = await Promise.all([
            supabase.from('kitchen_temp_logs' as any).select('*').gte('logged_at', `${startDate}T00:00:00`).lte('logged_at', `${endDate}T23:59:59`).order('logged_at', { ascending: false }),
            supabase.from('kitchen_reception_logs' as any).select('*').gte('received_at', `${startDate}T00:00:00`).lte('received_at', `${endDate}T23:59:59`).order('received_at', { ascending: false }),
            supabase.from('kitchen_traceability' as any).select('*').gte('opened_at', `${startDate}T00:00:00`).lte('opened_at', `${endDate}T23:59:59`).order('opened_at', { ascending: false }),
            supabase.from('kitchen_cleaning_tasks' as any).select('*').gte('scheduled_date', startDate).lte('scheduled_date', endDate).order('scheduled_date', { ascending: false }),
        ]);
        return { tempLogs: tempLogs.data || [], receptionLogs: receptionLogs.data || [], traceability: traceability.data || [], cleaningTasks: cleaningTasks.data || [] };
    };

    const generatePDFContent = (data: ExportData): string => {
        const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formatDateTime = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport HACCP - Twin Pizza</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.4}.header{background:linear-gradient(135deg,#f97316,#dc2626);color:white;padding:20px;margin-bottom:20px;border-radius:8px}.header h1{font-size:24px;margin-bottom:5px}.info-box{background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:20px}.section{margin-bottom:25px}.section-title{background:#f1f5f9;padding:10px 15px;border-radius:6px 6px 0 0;border-bottom:2px solid #e2e8f0;font-size:14px;font-weight:600;color:#334155}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#334155;color:white;padding:8px 6px;text-align:left}td{padding:6px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}.badge-ok{background:#dcfce7;color:#166534}.badge-warning{background:#fee2e2;color:#991b1b}.footer{margin-top:30px;padding-top:15px;border-top:2px solid #e2e8f0;text-align:center;color:#64748b;font-size:10px}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}.stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}.stat-value{font-size:24px;font-weight:700;color:#1e293b}.stat-label{font-size:10px;color:#64748b;margin-top:4px}</style></head><body><div class="header"><h1>🧾 RAPPORT SANITAIRE HACCP</h1><p>Twin Pizza - Grand-Couronne</p><p>Période: ${formatDate(startDate)} au ${formatDate(endDate)}</p></div><div class="info-box"><strong>📋 Document généré le ${formatDateTime(new Date().toISOString())}</strong></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">${data.tempLogs.length}</div><div class="stat-label">Relevés température</div></div><div class="stat-card"><div class="stat-value">${data.receptionLogs.length}</div><div class="stat-label">Réceptions</div></div><div class="stat-card"><div class="stat-value">${data.traceability.length}</div><div class="stat-label">Étiquettes</div></div><div class="stat-card"><div class="stat-value">${data.cleaningTasks.filter((t: any) => t.status === 'completed').length}</div><div class="stat-label">Nettoyages</div></div></div><div class="section"><div class="section-title">🌡️ Relevés Température (${data.tempLogs.length})</div><table><thead><tr><th>Date</th><th>Équipement</th><th>Temp</th><th>Statut</th><th>Action</th></tr></thead><tbody>${data.tempLogs.slice(0, 100).map((l: any) => `<tr><td>${formatDateTime(l.logged_at)}</td><td>${l.equipment_name}</td><td><strong>${l.value}°C</strong></td><td><span class="badge ${l.is_compliant ? 'badge-ok' : 'badge-warning'}">${l.is_compliant ? '✓' : '⚠️'}</span></td><td>${l.corrective_action || '-'}</td></tr>`).join('')}</tbody></table></div><div class="section"><div class="section-title">📦 Réceptions (${data.receptionLogs.length})</div><table><thead><tr><th>Date</th><th>Fournisseur</th><th>Temp</th><th>Statut</th></tr></thead><tbody>${data.receptionLogs.map((l: any) => `<tr><td>${formatDateTime(l.received_at)}</td><td><strong>${l.supplier_name}</strong></td><td>${l.temp_on_receipt ? l.temp_on_receipt + '°C' : '-'}</td><td><span class="badge badge-ok">✓</span></td></tr>`).join('')}</tbody></table></div><div class="section"><div class="section-title">🏷️ Traçabilité (${data.traceability.length})</div><table><thead><tr><th>Date</th><th>Produit</th><th>Lot</th><th>DLC</th></tr></thead><tbody>${data.traceability.map((t: any) => `<tr><td>${formatDateTime(t.opened_at)}</td><td><strong>${t.product_name}</strong></td><td>${t.batch_number || '-'}</td><td>${formatDateTime(t.secondary_dlc)}</td></tr>`).join('')}</tbody></table></div><div class="section"><div class="section-title">✨ Nettoyage (${data.cleaningTasks.length})</div><table><thead><tr><th>Date</th><th>Zone</th><th>Statut</th><th>Heure</th></tr></thead><tbody>${data.cleaningTasks.map((t: any) => `<tr><td>${formatDate(t.scheduled_date)}</td><td><strong>${t.zone_name}</strong></td><td><span class="badge ${t.status === 'completed' ? 'badge-ok' : 'badge-warning'}">${t.status === 'completed' ? '✓' : '⏳'}</span></td><td>${t.completed_at ? formatDateTime(t.completed_at) : '-'}</td></tr>`).join('')}</tbody></table></div><div class="footer"><p><strong>Twin Pizza</strong> - Grand-Couronne</p><p>Document conforme DDPP - Conservation: 5 ans</p></div></body></html>`;
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const data = await fetchAllData();
            const htmlContent = generatePDFContent(data);
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Rapport_HACCP_TwinPizza_${startDate}_${endDate}.html`;
            link.click();
            toast.success('📄 Rapport téléchargé! Imprimez en PDF depuis votre navigateur.');
        } catch { toast.error('Erreur export'); } finally { setLoading(false); }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><FileText className="h-5 w-5 text-amber-500" />Export Inspection Sanitaire</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-slate-300">Date début</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" /></div><div className="space-y-2"><Label className="text-slate-300">Date fin</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" /></div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-300"><p>📋 Ce rapport inclut:</p><ul className="list-disc list-inside mt-2 space-y-1 text-slate-400"><li>Relevés de température</li><li>Réceptions marchandises</li><li>Traçabilité DLC</li><li>Plan de nettoyage</li></ul></div>
                <Button onClick={handleExport} disabled={loading} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white">{loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}Générer le rapport DDPP</Button>
            </CardContent>
        </Card>
    );
}

export default HealthInspectionExport;
