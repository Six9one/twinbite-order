import { useState } from "react";
import { Package, Calendar, AlertTriangle, Trash2, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface StockItem {
    id: string;
    productName: string;
    dlc: string;
    lotNumber: string;
    origin: string;
    barcode?: string;
    scannedAt: string;
    wasted?: boolean;
    wastedAt?: string;
}

interface ExpiryDashboardProps {
    items: StockItem[];
    onMarkAsWasted: (item: StockItem) => void;
}

export const ExpiryDashboard = ({ items, onMarkAsWasted }: ExpiryDashboardProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [itemToWaste, setItemToWaste] = useState<StockItem | null>(null);

    // Filter and sort items
    const filteredItems = items
        .filter((item) => !item.wasted)
        .filter(
            (item) =>
                item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            // Sort by DLC (closest first)
            const dateA = new Date(a.dlc).getTime();
            const dateB = new Date(b.dlc).getTime();
            return dateA - dateB;
        });

    const getExpiryStatus = (dlc: string): "expired" | "critical" | "warning" | "ok" => {
        const expiryDate = new Date(dlc);
        const now = new Date();
        const diffHours = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours < 0) return "expired";
        if (diffHours < 48) return "critical";
        if (diffHours < 72) return "warning";
        return "ok";
    };

    const handleConfirmWaste = () => {
        if (itemToWaste) {
            onMarkAsWasted(itemToWaste);
            setItemToWaste(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="pl-12 h-14 bg-slate-800 border-slate-600 text-white text-lg"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{filteredItems.length}</p>
                    <p className="text-slate-400 text-sm">Total</p>
                </div>
                <div className="bg-red-900/30 rounded-xl p-4 text-center border border-red-500/30">
                    <p className="text-3xl font-bold text-red-400">
                        {filteredItems.filter((i) => getExpiryStatus(i.dlc) === "critical" || getExpiryStatus(i.dlc) === "expired").length}
                    </p>
                    <p className="text-red-300 text-sm">Urgent</p>
                </div>
                <div className="bg-yellow-900/30 rounded-xl p-4 text-center border border-yellow-500/30">
                    <p className="text-3xl font-bold text-yellow-400">
                        {filteredItems.filter((i) => getExpiryStatus(i.dlc) === "warning").length}
                    </p>
                    <p className="text-yellow-300 text-sm">Attention</p>
                </div>
            </div>

            {/* Items List */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
                    <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Aucun produit en stock</p>
                    <p className="text-slate-500 text-sm mt-2">
                        Scannez des produits dans l'onglet "Stock In"
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredItems.map((item) => {
                        const status = getExpiryStatus(item.dlc);
                        const isCritical = status === "critical" || status === "expired";
                        const isWarning = status === "warning";

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-xl border-2 transition-all ${status === "expired"
                                    ? "bg-red-900/40 border-red-500 animate-pulse"
                                    : isCritical
                                        ? "bg-red-900/30 border-red-500/70 animate-pulse"
                                        : isWarning
                                            ? "bg-yellow-900/20 border-yellow-500/50"
                                            : "bg-slate-800 border-slate-600"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {(isCritical || status === "expired") && (
                                                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                            )}
                                            <h4 className="text-white font-bold text-lg truncate">
                                                {item.productName}
                                            </h4>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span
                                                    className={`font-medium ${status === "expired"
                                                        ? "text-red-400"
                                                        : isCritical
                                                            ? "text-red-300"
                                                            : isWarning
                                                                ? "text-yellow-300"
                                                                : "text-slate-300"
                                                        }`}
                                                >
                                                    DLC: {formatDate(item.dlc)}
                                                    {status === "expired" && " (EXPIRÉ)"}
                                                    {isCritical && status !== "expired" && " (< 48h)"}
                                                </span>
                                            </div>

                                            {item.lotNumber && (
                                                <p className="text-slate-500 text-sm">Lot: {item.lotNumber}</p>
                                            )}
                                            {item.origin && (
                                                <p className="text-slate-500 text-sm">Origine: {item.origin}</p>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 flex-shrink-0"
                                        onClick={() => setItemToWaste(item)}
                                    >
                                        <Trash2 className="h-6 w-6" />
                                    </Button>
                                </div>

                                {/* Scanned time */}
                                <div className="flex items-center gap-1 mt-3 text-slate-500 text-xs">
                                    <Clock className="h-3 w-3" />
                                    <span>Scanné le {formatDateTime(item.scannedAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Waste Confirmation Dialog */}
            <AlertDialog open={!!itemToWaste} onOpenChange={() => setItemToWaste(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="h-6 w-6 text-red-500" />
                            Marquer comme jeté?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            {itemToWaste && (
                                <>
                                    <strong className="text-white">{itemToWaste.productName}</strong>
                                    <br />
                                    Cette action sera enregistrée pour le suivi des pertes alimentaires.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmWaste}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// Helper functions
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
}

function formatDateTime(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

export default ExpiryDashboard;
