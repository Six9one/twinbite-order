import { useState, useEffect } from "react";
import { Thermometer, ClipboardList, Package, Tag, Sparkles, Home, FileSpreadsheet, Bell, History, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemperatureRoundsTab } from "@/components/kitchen/TemperatureRoundsTab";
import { ReceptionTab } from "@/components/kitchen/ReceptionTab";
import { TraceabilityTab } from "@/components/kitchen/TraceabilityTab";
import { CleaningPlanTab } from "@/components/kitchen/CleaningPlanTab";
import { ExcelReportExport } from "@/components/kitchen/ExcelReportExport";
import { NotificationSettings } from "@/components/kitchen/NotificationSettings";
import { HistoryArchive } from "@/components/kitchen/HistoryArchive";
import { WasteDisposalTab } from "@/components/kitchen/WasteDisposalTab";
import { initializeNotifications, getNotificationPermission, checkExpiringMeat } from "@/lib/kitchenNotifications";
import { supabase } from "@/integrations/supabase/client";

const KitchenDashboard = () => {
    const [activeTab, setActiveTab] = useState("temp-rounds");

    useEffect(() => {
        if (getNotificationPermission() === 'granted') {
            initializeNotifications();
            checkExpiringMeat(supabase);
            const interval = setInterval(() => checkExpiringMeat(supabase), 60 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Twin Pizza HACCP</h1>
                            <p className="text-xs text-slate-400">Suivi sanitaire cuisine</p>
                        </div>
                    </div>
                    <a href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                        <Home className="h-5 w-5 text-slate-400" />
                    </a>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full grid grid-cols-4 bg-slate-900 rounded-none border-b border-slate-800 h-auto p-0">
                    <TabsTrigger value="temp-rounds" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-orange-500 text-slate-400 text-xs flex flex-col gap-1">
                        <Thermometer className="h-4 w-4" /><span>Relevés</span>
                    </TabsTrigger>
                    <TabsTrigger value="reception" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-green-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Package className="h-4 w-4" /><span>Réception</span>
                    </TabsTrigger>
                    <TabsTrigger value="traceability" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Tag className="h-4 w-4" /><span>Étiquettes</span>
                    </TabsTrigger>
                    <TabsTrigger value="cleaning" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-purple-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Sparkles className="h-4 w-4" /><span>Nettoyage</span>
                    </TabsTrigger>
                </TabsList>

                {/* Second row of tabs */}
                <TabsList className="w-full grid grid-cols-4 bg-slate-900/50 rounded-none border-b border-slate-800 h-auto p-0">
                    <TabsTrigger value="waste" className="py-2 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-red-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Trash2 className="h-4 w-4" /><span>Déchets</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="py-2 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 text-slate-400 text-xs flex flex-col gap-1">
                        <History className="h-4 w-4" /><span>Historique</span>
                    </TabsTrigger>
                    <TabsTrigger value="rapport" className="py-2 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 text-xs flex flex-col gap-1">
                        <FileSpreadsheet className="h-4 w-4" /><span>Rapport</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="py-2 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Bell className="h-4 w-4" /><span>Alertes</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="temp-rounds" className="p-4 mt-0"><TemperatureRoundsTab /></TabsContent>
                <TabsContent value="reception" className="p-4 mt-0"><ReceptionTab /></TabsContent>
                <TabsContent value="traceability" className="p-4 mt-0"><TraceabilityTab /></TabsContent>
                <TabsContent value="cleaning" className="p-4 mt-0"><CleaningPlanTab /></TabsContent>
                <TabsContent value="waste" className="p-4 mt-0"><WasteDisposalTab /></TabsContent>
                <TabsContent value="history" className="p-4 mt-0"><HistoryArchive /></TabsContent>
                <TabsContent value="rapport" className="p-4 mt-0"><ExcelReportExport /></TabsContent>
                <TabsContent value="notifications" className="p-4 mt-0"><NotificationSettings /></TabsContent>
            </Tabs>
        </div>
    );
};

export default KitchenDashboard;
