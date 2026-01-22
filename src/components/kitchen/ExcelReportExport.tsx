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
            const wb = XLSX.utils.book_new();

            // ==============================
            // Sheet 1: RÉSUMÉ
            // ==============================
            const compliantTemps = data.tempLogs.filter(l => l.is_compliant).length;
            const nonCompliantTemps = data.tempLogs.filter(l => !l.is_compliant).length;
            const completedCleaning = data.cleaningTasks.filter(t => t.status === 'completed').length;

            const summaryData = [
                ['RAPPORT HACCP - TWIN PIZZA'],
                [`Période: ${formatDate(startDate)} au ${formatDate(endDate)}`],
                [`Généré le: ${formatDateTime(new Date().toISOString())}`],
                [''],
                ['STATISTIQUES'],
                ['', 'Total', 'OK', 'Non-OK'],
                ['Températures', data.tempLogs.length, compliantTemps, nonCompliantTemps],
                ['Réceptions', data.receptionLogs.length, data.receptionLogs.length, 0],
                ['Étiquettes', data.traceability.length, '', ''],
                ['Nettoyage', data.cleaningTasks.length, completedCleaning, data.cleaningTasks.length - completedCleaning],
                [''],
                ['SHIFTS'],
                ['Date', 'Type', 'Opérateur', 'Statut'],
                ...data.shifts.map(s => [
                    formatDate(s.shift_date),
                    s.shift_type === 'Morning' ? 'Matin' : 'Soir',
                    s.staff_name || 'Staff',
                    s.completed_at ? 'Terminé' : 'En cours'
                ])
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

            // ==============================
            // Sheet 2: TEMPÉRATURES
            // ==============================
            const tempSheetData = [
                ['RELEVÉS DE TEMPÉRATURE'],
                [''],
                ['Date', 'Heure', 'Équipement', '°C', 'OK?', 'Cause', 'Action', 'Opérateur'],
                ...data.tempLogs.map(l => {
                    const dt = new Date(l.logged_at);
                    return [
                        dt.toLocaleDateString('fr-FR'),
                        dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        l.equipment_name,
                        l.value,
                        l.is_compliant ? 'OUI' : 'NON',
                        l.corrective_reason || '',
                        l.corrective_action || '',
                        l.logged_by || 'Staff'
                    ];
                })
            ];
            const wsTemp = XLSX.utils.aoa_to_sheet(tempSheetData);
            wsTemp['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 6 }, { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, wsTemp, 'Températures');

            // ==============================
            // Sheet 3: RÉCEPTIONS
            // ==============================
            const receptionSheetData = [
                ['RÉCEPTION MARCHANDISES'],
                [''],
                ['Date', 'Heure', 'Fournisseur', '°C', 'Notes', 'Opérateur', 'Facture', 'Livraison'],
                ...data.receptionLogs.map(r => {
                    const dt = new Date(r.received_at);
                    return [
                        dt.toLocaleDateString('fr-FR'),
                        dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        r.supplier_name,
                        r.temp_on_receipt || '',
                        r.notes || '',
                        r.received_by || 'Staff',
                        r.invoice_photo_url || '',
                        r.delivery_photo_url || ''
                    ];
                })
            ];
            const wsReception = XLSX.utils.aoa_to_sheet(receptionSheetData);
            wsReception['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 40 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsReception, 'Réceptions');

            // ==============================
            // Sheet 4: TRAÇABILITÉ
            // ==============================
            const traceSheetData = [
                ['TRAÇABILITÉ - ÉTIQUETTES DLC'],
                [''],
                ['Date', 'Heure', 'Produit', 'Lot', 'DLC', 'Durée(h)', 'Opérateur', 'Photo'],
                ...data.traceability.map(t => {
                    const dt = new Date(t.opened_at);
                    const dlc = new Date(t.secondary_dlc);
                    return [
                        dt.toLocaleDateString('fr-FR'),
                        dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                        t.product_name,
                        t.batch_number || '',
                        dlc.toLocaleString('fr-FR'),
                        t.dlc_hours,
                        t.opened_by || 'Staff',
                        t.label_photo_url || ''
                    ];
                })
            ];
            const wsTrace = XLSX.utils.aoa_to_sheet(traceSheetData);
            wsTrace['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsTrace, 'Traçabilité');

            // ==============================
            // Sheet 5: NETTOYAGE
            // ==============================
            const cleaningSheetData = [
                ['PLAN DE NETTOYAGE'],
                [''],
                ['Date', 'Zone', 'Statut', 'Heure', 'Opérateur', 'Photo'],
                ...data.cleaningTasks.map(c => {
                    const completed = c.completed_at ? new Date(c.completed_at) : null;
                    return [
                        formatDate(c.scheduled_date),
                        c.zone_name,
                        c.status === 'completed' ? 'OK' : 'En attente',
                        completed ? completed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
                        c.completed_by || '',
                        c.proof_photo_url || ''
                    ];
                })
            ];
            const wsCleaning = XLSX.utils.aoa_to_sheet(cleaningSheetData);
            wsCleaning['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(wb, wsCleaning, 'Nettoyage');

            // Generate and download
            const fileName = `HACCP_TwinPizza_${startDate}_${endDate}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`📊 ${fileName} téléchargé!`);
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
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    Rapport Excel HACCP
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

                <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 text-sm">
                    <p className="text-green-400 font-medium mb-2">📊 5 feuilles incluses:</p>
                    <div className="grid grid-cols-2 gap-1 text-green-300/80 text-xs">
                        <span>• Résumé + Stats</span>
                        <span>• Températures</span>
                        <span>• Réceptions + Photos</span>
                        <span>• Traçabilité DLC</span>
                        <span>• Plan Nettoyage</span>
                    </div>
                </div>

                <Button onClick={generateExcel} disabled={loading} className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-lg font-bold shadow-lg">
                    {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-6 w-6" />}
                    Télécharger Excel
                </Button>
            </CardContent>
        </Card>
    );
}

export default ExcelReportExport;
