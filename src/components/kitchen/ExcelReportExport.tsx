import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileSpreadsheet, Download, RefreshCw, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

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

    const generateExcel = async () => {
        setLoading(true);

        try {
            const data = await fetchAllData();

            // Create workbook
            const wb = XLSX.utils.book_new();

            // ==============================
            // Sheet 1: RÉSUMÉ (Summary)
            // ==============================
            const summaryData = [
                ['🍕 RAPPORT HACCP - TWIN PIZZA'],
                [''],
                ['Période:', `${formatDate(startDate)} au ${formatDate(endDate)}`],
                ['Généré le:', formatDateTime(new Date().toISOString())],
                [''],
                ['📊 STATISTIQUES'],
                [''],
                ['Catégorie', 'Total', 'Conformes', 'Non-conformes'],
                ['Relevés température', data.tempLogs.length,
                    data.tempLogs.filter(l => l.is_compliant).length,
                    data.tempLogs.filter(l => !l.is_compliant).length],
                ['Réceptions marchandises', data.receptionLogs.length, data.receptionLogs.length, 0],
                ['Étiquettes traçabilité', data.traceability.length, '-', '-'],
                ['Tâches nettoyage', data.cleaningTasks.length,
                    data.cleaningTasks.filter(t => t.status === 'completed').length,
                    data.cleaningTasks.filter(t => t.status !== 'completed').length],
                [''],
                ['📅 SHIFTS/RELEVÉS'],
                ['Date', 'Type', 'Opérateur', 'Début', 'Fin', 'Statut'],
                ...data.shifts.map(s => [
                    formatDate(s.shift_date),
                    s.shift_type === 'Morning' ? '☀️ Matin' : '🌙 Soir',
                    s.staff_name || 'Staff',
                    formatDateTime(s.started_at),
                    s.completed_at ? formatDateTime(s.completed_at) : '-',
                    s.completed_at ? '✅ Terminé' : '⏳ En cours'
                ])
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Résumé');

            // ==============================
            // Sheet 2: TEMPÉRATURES
            // ==============================
            const tempData = [
                ['🌡️ RELEVÉS DE TEMPÉRATURE'],
                [''],
                ['Date/Heure', 'Équipement', 'Type', 'Température (°C)', 'Conforme', 'Cause', 'Action Corrective', 'Opérateur'],
                ...data.tempLogs.map(l => [
                    formatDateTime(l.logged_at),
                    l.equipment_name,
                    l.equipment_type === 'fridge' ? '🧊 Frigo' : '❄️ Congélateur',
                    l.value,
                    l.is_compliant ? '✅ Oui' : '❌ Non',
                    l.corrective_reason || '-',
                    l.corrective_action || '-',
                    l.logged_by || 'Staff'
                ])
            ];
            const wsTemp = XLSX.utils.aoa_to_sheet(tempData);
            wsTemp['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsTemp, '🌡️ Températures');

            // ==============================
            // Sheet 3: RÉCEPTIONS
            // ==============================
            const receptionData = [
                ['📦 RÉCEPTION MARCHANDISES'],
                [''],
                ['Date/Heure', 'Fournisseur', 'Temp. Réception (°C)', 'Statut', 'Notes', 'Opérateur', 'Photo Facture', 'Photo Livraison'],
                ...data.receptionLogs.map(r => [
                    formatDateTime(r.received_at),
                    r.supplier_name,
                    r.temp_on_receipt || '-',
                    r.status === 'received' ? '✅ Reçu' : r.status,
                    r.notes || '-',
                    r.received_by || 'Staff',
                    r.invoice_photo_url ? '📷 Oui' : '-',
                    r.delivery_photo_url ? '📷 Oui' : '-'
                ])
            ];
            const wsReception = XLSX.utils.aoa_to_sheet(receptionData);
            wsReception['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsReception, '📦 Réceptions');

            // ==============================
            // Sheet 4: TRAÇABILITÉ
            // ==============================
            const traceData = [
                ['🏷️ TRAÇABILITÉ / ÉTIQUETTES DLC'],
                [''],
                ['Date Ouverture', 'Heure', 'Produit', 'N° Lot', 'DLC Secondaire', 'Durée (h)', 'Opérateur', 'Jeté?'],
                ...data.traceability.map(t => [
                    formatDate(t.opened_at),
                    new Date(t.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    t.product_name,
                    t.batch_number || '-',
                    formatDateTime(t.secondary_dlc),
                    t.dlc_hours,
                    t.opened_by || 'Staff',
                    t.is_disposed ? '🗑️ Oui' : '-'
                ])
            ];
            const wsTrace = XLSX.utils.aoa_to_sheet(traceData);
            wsTrace['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, wsTrace, '🏷️ Traçabilité');

            // ==============================
            // Sheet 5: NETTOYAGE
            // ==============================
            const cleaningData = [
                ['✨ PLAN DE NETTOYAGE (PND)'],
                [''],
                ['Date', 'Zone', 'Statut', 'Heure Validation', 'Opérateur', 'Photo Preuve'],
                ...data.cleaningTasks.map(c => [
                    formatDate(c.scheduled_date),
                    c.zone_name,
                    c.status === 'completed' ? '✅ Terminé' : '⏳ En attente',
                    c.completed_at ? formatDateTime(c.completed_at) : '-',
                    c.completed_by || '-',
                    c.proof_photo_url ? '📷 Oui' : '-'
                ])
            ];
            const wsCleaning = XLSX.utils.aoa_to_sheet(cleaningData);
            wsCleaning['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsCleaning, '✨ Nettoyage');

            // Generate and download
            const fileName = `Rapport_HACCP_TwinPizza_${startDate}_${endDate}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success(`📊 Rapport Excel téléchargé: ${fileName}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Erreur lors de l\'export');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    Rapport Excel HACCP
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Date début
                        </Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Date fin
                        </Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white"
                        />
                    </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-slate-300">
                    <p className="font-medium mb-2">📊 Ce rapport Excel contient:</p>
                    <ul className="space-y-1 text-slate-400">
                        <li>📊 <strong>Résumé</strong> - Statistiques + shifts/relevés</li>
                        <li>🌡️ <strong>Températures</strong> - Tous les relevés avec actions correctives</li>
                        <li>📦 <strong>Réceptions</strong> - Livraisons avec photos</li>
                        <li>🏷️ <strong>Traçabilité</strong> - Étiquettes DLC</li>
                        <li>✨ <strong>Nettoyage</strong> - Plan de nettoyage validé</li>
                    </ul>
                </div>

                <Button
                    onClick={generateExcel}
                    disabled={loading}
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg"
                >
                    {loading ? (
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-5 w-5" />
                    )}
                    Télécharger le rapport Excel
                </Button>
            </CardContent>
        </Card>
    );
}

export default ExcelReportExport;
