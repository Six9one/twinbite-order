import { useState } from "react";
import { Thermometer, ClipboardList, Package, Tag, Sparkles, Home, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemperatureRoundsTab } from "@/components/kitchen/TemperatureRoundsTab";
import { ReceptionTab } from "@/components/kitchen/ReceptionTab";
import { TraceabilityTab } from "@/components/kitchen/TraceabilityTab";
import { CleaningPlanTab } from "@/components/kitchen/CleaningPlanTab";
import { ExcelReportExport } from "@/components/kitchen/ExcelReportExport";

const KitchenDashboard = () => {
    const [activeTab, setActiveTab] = useState("temp-rounds");

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Twin Pizza Kitchen</h1>
                            <p className="text-xs text-slate-400">Plan de Maîtrise Sanitaire</p>
                        </div>
                    </div>
                    <a href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                        <Home className="h-5 w-5 text-slate-400" />
                    </a>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full grid grid-cols-5 bg-slate-900 rounded-none border-b border-slate-800 h-auto p-0">
                    <TabsTrigger value="temp-rounds" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-orange-500 text-slate-400 text-xs flex flex-col gap-1">
                        <Thermometer className="h-5 w-5" /><span>Relevés</span>
                    </TabsTrigger>
                    <TabsTrigger value="reception" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-green-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Package className="h-5 w-5" /><span>Réception</span>
                    </TabsTrigger>
                    <TabsTrigger value="traceability" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Tag className="h-5 w-5" /><span>Étiquettes</span>
                    </TabsTrigger>
                    <TabsTrigger value="cleaning" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-purple-400 text-slate-400 text-xs flex flex-col gap-1">
                        <Sparkles className="h-5 w-5" /><span>Nettoyage</span>
                    </TabsTrigger>
                    <TabsTrigger value="rapport" className="py-3 px-1 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400 text-slate-400 text-xs flex flex-col gap-1">
                        <FileSpreadsheet className="h-5 w-5" /><span>Rapport</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="temp-rounds" className="p-4 mt-0"><TemperatureRoundsTab /></TabsContent>
                <TabsContent value="reception" className="p-4 mt-0"><ReceptionTab /></TabsContent>
                <TabsContent value="traceability" className="p-4 mt-0"><TraceabilityTab /></TabsContent>
                <TabsContent value="cleaning" className="p-4 mt-0"><CleaningPlanTab /></TabsContent>
                <TabsContent value="rapport" className="p-4 mt-0"><ExcelReportExport /></TabsContent>
            </Tabs>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none">
                <p className="text-center text-slate-500 text-xs">💡 Ajoutez cette page à l'écran d'accueil pour une utilisation optimale</p>
            </div>
        </div>
    );
};

export default KitchenDashboard;
