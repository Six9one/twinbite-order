import { useState, useEffect } from "react";
import {
    Package,
    Thermometer,
    ClipboardList,
    Scan,
    ScanText,
    Settings,
    Menu,
    Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Kitchen Components
import { BarcodeScanner } from "@/components/kitchen/BarcodeScanner";
import { LabelOCRScanner } from "@/components/kitchen/LabelOCRScanner";
import { ReviewEditCard } from "@/components/kitchen/ReviewEditCard";
import { DeviceManager, type Device } from "@/components/kitchen/DeviceManager";
import { DeviceCard } from "@/components/kitchen/DeviceCard";
import { TemperatureKeypad } from "@/components/kitchen/TemperatureKeypad";
import { ExpiryDashboard, type StockItem } from "@/components/kitchen/ExpiryDashboard";

// Google Sheets API endpoint - replace with your deployed Apps Script URL
const GOOGLE_SCRIPT_URL = ""; // User will set this

const KitchenDashboard = () => {
    const [activeTab, setActiveTab] = useState("stock-in");
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [showLabelScanner, setShowLabelScanner] = useState(false);
    const [showReviewCard, setShowReviewCard] = useState(false);
    const [showTempKeypad, setShowTempKeypad] = useState(false);
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [pendingData, setPendingData] = useState<{
        productName: string;
        dlc: string;
        lotNumber: string;
        origin: string;
        barcode?: string;
    } | null>(null);

    // State for devices and stock items (persisted to localStorage)
    const [devices, setDevices] = useState<Device[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const savedDevices = localStorage.getItem("kitchen_devices");
        const savedStock = localStorage.getItem("kitchen_stock");
        if (savedDevices) setDevices(JSON.parse(savedDevices));
        if (savedStock) setStockItems(JSON.parse(savedStock));
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem("kitchen_devices", JSON.stringify(devices));
    }, [devices]);

    useEffect(() => {
        localStorage.setItem("kitchen_stock", JSON.stringify(stockItems));
    }, [stockItems]);

    // Send data to Google Sheets
    const sendToGoogleSheets = async (
        action: "traceability" | "templog" | "wasted",
        data: Record<string, unknown>
    ) => {
        if (!GOOGLE_SCRIPT_URL) {
            console.log("Google Script URL not configured. Data:", { action, data });
            return;
        }

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...data }),
            });
        } catch (error) {
            console.error("Error sending to Google Sheets:", error);
        }
    };

    // Handlers for barcode scanner
    const handleBarcodeScan = (barcode: string) => {
        setShowBarcodeScanner(false);
        setPendingData({
            productName: "",
            dlc: "",
            lotNumber: "",
            origin: "",
            barcode,
        });
        setShowReviewCard(true);
        toast.success(`Code-barres scanné: ${barcode}`);
    };

    // Handlers for label OCR
    const handleLabelScan = (result: {
        productName: string;
        dlc: string;
        lotNumber: string;
        origin: string;
    }) => {
        setShowLabelScanner(false);
        setPendingData({ ...result, barcode: undefined });
        setShowReviewCard(true);
        toast.success("Étiquette analysée!");
    };

    // Save traceability data
    const handleSaveTraceability = (data: StockItem) => {
        const newItem: StockItem = {
            ...data,
            id: `stock_${Date.now()}`,
        };
        setStockItems((prev) => [...prev, newItem]);
        setShowReviewCard(false);
        setPendingData(null);

        // Send to Google Sheets
        sendToGoogleSheets("traceability", {
            productName: data.productName,
            dlc: data.dlc,
            lotNumber: data.lotNumber,
            origin: data.origin,
            barcode: data.barcode || "",
            scannedAt: data.scannedAt,
        });

        toast.success("Produit enregistré!");
    };

    // Device handlers
    const handleAddDevice = (device: Device) => {
        setDevices((prev) => [...prev, device]);
        toast.success(`${device.name} ajouté!`);
    };

    const handleDeleteDevice = (id: string) => {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        toast.success("Appareil supprimé");
    };

    // Temperature handlers
    const handleOpenTempKeypad = (device: Device) => {
        setSelectedDevice(device);
        setShowTempKeypad(true);
    };

    const handleSaveTemperature = (temp: number, status: "ok" | "warning") => {
        if (!selectedDevice) return;

        const now = new Date().toISOString();

        // Update device with last temp
        setDevices((prev) =>
            prev.map((d) =>
                d.id === selectedDevice.id
                    ? { ...d, lastTemp: temp, lastLoggedAt: now, status }
                    : d
            )
        );

        // Send to Google Sheets
        sendToGoogleSheets("templog", {
            deviceName: selectedDevice.name,
            deviceType: selectedDevice.type,
            temperature: temp,
            status: status === "ok" ? "OK" : "WARNING",
            timestamp: now,
        });

        setShowTempKeypad(false);
        setSelectedDevice(null);

        if (status === "warning") {
            toast.error("⚠️ Température critique enregistrée!");
        } else {
            toast.success("Température enregistrée ✓");
        }
    };

    // Mark item as wasted
    const handleMarkAsWasted = (item: StockItem) => {
        const wastedAt = new Date().toISOString();

        setStockItems((prev) =>
            prev.map((i) =>
                i.id === item.id ? { ...i, wasted: true, wastedAt } : i
            )
        );

        // Send to Google Sheets
        sendToGoogleSheets("wasted", {
            productName: item.productName,
            dlc: item.dlc,
            lotNumber: item.lotNumber,
            origin: item.origin,
            barcode: item.barcode || "",
            scannedAt: item.scannedAt,
            wastedAt,
        });

        toast.success("Produit marqué comme jeté");
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Cuisine</h1>
                            <p className="text-xs text-slate-400">Twin Pizza HACCP</p>
                        </div>
                    </div>
                    <a href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                        <Home className="h-5 w-5 text-slate-400" />
                    </a>
                </div>
            </header>

            {/* Main Content with Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full grid grid-cols-3 bg-slate-900 rounded-none border-b border-slate-800 h-auto p-0">
                    <TabsTrigger
                        value="stock-in"
                        className="py-4 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-orange-500 text-slate-400"
                    >
                        <Package className="h-5 w-5 mr-2" />
                        Stock In
                    </TabsTrigger>
                    <TabsTrigger
                        value="fridge-logs"
                        className="py-4 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400 text-slate-400"
                    >
                        <Thermometer className="h-5 w-5 mr-2" />
                        Frigos
                    </TabsTrigger>
                    <TabsTrigger
                        value="live-stock"
                        className="py-4 rounded-none data-[state=active]:bg-slate-800 data-[state=active]:text-green-400 text-slate-400"
                    >
                        <ClipboardList className="h-5 w-5 mr-2" />
                        Stock
                    </TabsTrigger>
                </TabsList>

                {/* Stock In Tab */}
                <TabsContent value="stock-in" className="p-4 space-y-4 mt-0">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Traçabilité</h2>
                        <p className="text-slate-400">Scannez les produits entrants</p>
                    </div>

                    <div className="grid gap-4">
                        {/* Barcode Scanner Button */}
                        <Button
                            onClick={() => setShowBarcodeScanner(true)}
                            className="h-28 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl shadow-lg"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Scan className="h-10 w-10" />
                                <span className="text-xl font-bold">Scanner Code-Barres</span>
                            </div>
                        </Button>

                        {/* Label OCR Button */}
                        <Button
                            onClick={() => setShowLabelScanner(true)}
                            className="h-28 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <ScanText className="h-10 w-10" />
                                <span className="text-xl font-bold">Scanner Étiquette (IA)</span>
                            </div>
                        </Button>

                        {/* Manual Entry Button */}
                        <Button
                            onClick={() => {
                                setPendingData({
                                    productName: "",
                                    dlc: "",
                                    lotNumber: "",
                                    origin: "",
                                });
                                setShowReviewCard(true);
                            }}
                            variant="outline"
                            className="h-20 border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 rounded-2xl"
                        >
                            <Menu className="h-6 w-6 mr-3" />
                            <span className="text-lg">Saisie Manuelle</span>
                        </Button>
                    </div>
                </TabsContent>

                {/* Fridge Logs Tab */}
                <TabsContent value="fridge-logs" className="p-4 space-y-4 mt-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Relevés Température</h2>
                            <p className="text-slate-400 text-sm">Tapez sur un appareil pour saisir</p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                            className="border-slate-600 text-slate-400 hover:text-white"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>

                    {showDeviceSettings ? (
                        <DeviceManager
                            devices={devices}
                            onAddDevice={handleAddDevice}
                            onDeleteDevice={handleDeleteDevice}
                        />
                    ) : devices.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
                            <Thermometer className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 text-lg mb-4">Aucun appareil configuré</p>
                            <Button
                                onClick={() => setShowDeviceSettings(true)}
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Configurer les appareils
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {devices.map((device) => (
                                <DeviceCard
                                    key={device.id}
                                    device={device}
                                    onClick={() => handleOpenTempKeypad(device)}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Live Stock Tab */}
                <TabsContent value="live-stock" className="p-4 mt-0">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-white">Stock en Cours</h2>
                        <p className="text-slate-400 text-sm">Trié par date de péremption</p>
                    </div>

                    <ExpiryDashboard items={stockItems} onMarkAsWasted={handleMarkAsWasted} />
                </TabsContent>
            </Tabs>

            {/* Fullscreen Modals */}
            {showBarcodeScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowBarcodeScanner(false)}
                />
            )}

            {showLabelScanner && (
                <LabelOCRScanner
                    onScan={handleLabelScan}
                    onClose={() => setShowLabelScanner(false)}
                />
            )}

            {showReviewCard && pendingData && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto">
                    <div className="w-full max-w-md">
                        <ReviewEditCard
                            data={pendingData}
                            onSave={handleSaveTraceability}
                            onCancel={() => {
                                setShowReviewCard(false);
                                setPendingData(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {showTempKeypad && selectedDevice && (
                <TemperatureKeypad
                    device={selectedDevice}
                    onSave={handleSaveTemperature}
                    onClose={() => {
                        setShowTempKeypad(false);
                        setSelectedDevice(null);
                    }}
                />
            )}

            {/* PWA Install Hint - shown on first load */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none">
                <p className="text-center text-slate-500 text-xs">
                    💡 Ajoutez cette page à l'écran d'accueil pour une utilisation optimale
                </p>
            </div>
        </div>
    );
};

export default KitchenDashboard;
