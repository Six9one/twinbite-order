import { useState } from "react";
import { Check, X, Edit3, Save, Package, Calendar, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TraceabilityData {
    productName: string;
    dlc: string;
    lotNumber: string;
    origin: string;
    barcode?: string;
    scannedAt: string;
}

interface ReviewEditCardProps {
    data: {
        productName: string;
        dlc: string;
        lotNumber: string;
        origin: string;
        barcode?: string;
    };
    onSave: (data: TraceabilityData) => void;
    onCancel: () => void;
}

export const ReviewEditCard = ({ data, onSave, onCancel }: ReviewEditCardProps) => {
    const [formData, setFormData] = useState({
        productName: data.productName || "",
        dlc: data.dlc || "",
        lotNumber: data.lotNumber || "",
        origin: data.origin || "",
        barcode: data.barcode || "",
    });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.productName.trim()) {
            // Vibrate for error
            if (navigator.vibrate) {
                navigator.vibrate([50, 50, 50]);
            }
            return;
        }

        onSave({
            ...formData,
            scannedAt: new Date().toISOString(),
        });
    };

    const isValid = formData.productName.trim().length > 0;

    return (
        <Card className="bg-slate-800 border-orange-500/30 shadow-xl">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white">
                    <Edit3 className="h-6 w-6 text-orange-500" />
                    Vérifier & Corriger
                </CardTitle>
                <p className="text-slate-400 text-sm">
                    Vérifiez les informations extraites et corrigez si nécessaire
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Product Name */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-300">
                        <Package className="h-4 w-4 text-orange-400" />
                        Nom du Produit *
                    </Label>
                    <Input
                        value={formData.productName}
                        onChange={(e) => handleChange("productName", e.target.value)}
                        placeholder="Ex: Mozzarella Fior di Latte"
                        className="bg-slate-900 border-slate-600 text-white text-lg h-14 focus:border-orange-500"
                    />
                </div>

                {/* DLC / Expiry Date */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-300">
                        <Calendar className="h-4 w-4 text-orange-400" />
                        DLC (Date Limite)
                    </Label>
                    <Input
                        type="date"
                        value={formData.dlc}
                        onChange={(e) => handleChange("dlc", e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white text-lg h-14 focus:border-orange-500"
                    />
                </div>

                {/* Lot Number */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-300">
                        <Hash className="h-4 w-4 text-orange-400" />
                        Numéro de Lot
                    </Label>
                    <Input
                        value={formData.lotNumber}
                        onChange={(e) => handleChange("lotNumber", e.target.value)}
                        placeholder="Ex: L2024123"
                        className="bg-slate-900 border-slate-600 text-white text-lg h-14 focus:border-orange-500"
                    />
                </div>

                {/* Origin */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-300">
                        <MapPin className="h-4 w-4 text-orange-400" />
                        Origine / Fournisseur
                    </Label>
                    <Input
                        value={formData.origin}
                        onChange={(e) => handleChange("origin", e.target.value)}
                        placeholder="Ex: Italie / Metro"
                        className="bg-slate-900 border-slate-600 text-white text-lg h-14 focus:border-orange-500"
                    />
                </div>

                {/* Barcode (read-only if from scanner) */}
                {formData.barcode && (
                    <div className="space-y-2">
                        <Label className="text-slate-300">Code-Barres</Label>
                        <Input
                            value={formData.barcode}
                            readOnly
                            className="bg-slate-900/50 border-slate-700 text-slate-400 text-lg h-14"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="flex-1 h-16 text-lg border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        <X className="mr-2 h-6 w-6" />
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!isValid}
                        className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                        <Check className="mr-2 h-6 w-6" />
                        Enregistrer
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ReviewEditCard;
