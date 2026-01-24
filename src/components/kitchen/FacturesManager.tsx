import { useState, useRef } from "react";
import { Camera, FileText, Trash2, Calendar, Package, Clock, X, Check, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Facture {
    id: string;
    date: string;
    supplierName: string;
    merchandisePhoto?: string;
    invoicePhoto?: string;
    notes?: string;
    createdAt: string;
}

interface FacturesManagerProps {
    factures: Facture[];
    onAddFacture: (facture: Facture) => void;
    onDeleteFacture: (id: string) => void;
}

export const FacturesManager = ({
    factures,
    onAddFacture,
    onDeleteFacture,
}: FacturesManagerProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [supplierName, setSupplierName] = useState("");
    const [notes, setNotes] = useState("");
    const [merchandisePhoto, setMerchandisePhoto] = useState<string | undefined>();
    const [invoicePhoto, setInvoicePhoto] = useState<string | undefined>();

    const merchandiseInputRef = useRef<HTMLInputElement>(null);
    const invoiceInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoCapture = (
        e: React.ChangeEvent<HTMLInputElement>,
        setPhoto: (photo: string | undefined) => void
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!supplierName.trim() && !merchandisePhoto && !invoicePhoto) return;

        const newFacture: Facture = {
            id: `facture_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            supplierName: supplierName.trim(),
            merchandisePhoto,
            invoicePhoto,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
        };

        onAddFacture(newFacture);
        resetForm();
    };

    const resetForm = () => {
        setSupplierName("");
        setNotes("");
        setMerchandisePhoto(undefined);
        setInvoicePhoto(undefined);
        setIsAdding(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    Factures ({factures.length})
                </h3>
                {!isAdding && (
                    <Button
                        onClick={() => setIsAdding(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Camera className="mr-2 h-5 w-5" />
                        Nouvelle
                    </Button>
                )}
            </div>

            {/* Add New Facture Form */}
            {isAdding && (
                <Card className="bg-slate-800 border-green-500/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-green-500" />
                            Nouvelle Réception
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Supplier Name */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Fournisseur</Label>
                            <Input
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                placeholder="Ex: Metro, Transgourmet..."
                                className="bg-slate-900 border-slate-600 text-white h-12"
                            />
                        </div>

                        {/* Photo Inputs */}
                        <input
                            ref={merchandiseInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoCapture(e, setMerchandisePhoto)}
                            className="hidden"
                        />
                        <input
                            ref={invoiceInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoCapture(e, setInvoicePhoto)}
                            className="hidden"
                        />

                        {/* Merchandise Photo */}
                        <div className="space-y-2">
                            <Label className="text-slate-300 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Photo Marchandise
                            </Label>
                            {merchandisePhoto ? (
                                <div className="relative">
                                    <img
                                        src={merchandisePhoto}
                                        alt="Marchandise"
                                        className="w-full h-32 object-cover rounded-lg border border-slate-600"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8"
                                        onClick={() => setMerchandisePhoto(undefined)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full h-20 border-dashed border-2 border-slate-600 text-slate-400"
                                    onClick={() => merchandiseInputRef.current?.click()}
                                >
                                    <Camera className="mr-2 h-6 w-6" />
                                    Prendre photo marchandise
                                </Button>
                            )}
                        </div>

                        {/* Invoice Photo */}
                        <div className="space-y-2">
                            <Label className="text-slate-300 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Photo Facture/Bon de Livraison
                            </Label>
                            {invoicePhoto ? (
                                <div className="relative">
                                    <img
                                        src={invoicePhoto}
                                        alt="Facture"
                                        className="w-full h-32 object-cover rounded-lg border border-slate-600"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8"
                                        onClick={() => setInvoicePhoto(undefined)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full h-20 border-dashed border-2 border-slate-600 text-slate-400"
                                    onClick={() => invoiceInputRef.current?.click()}
                                >
                                    <Camera className="mr-2 h-6 w-6" />
                                    Prendre photo facture
                                </Button>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Notes (optionnel)</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes additionnelles..."
                                className="bg-slate-900 border-slate-600 text-white h-12"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={resetForm}
                                className="flex-1 h-12 border-slate-600 text-slate-300"
                            >
                                <X className="mr-2 h-5 w-5" />
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                            >
                                <Check className="mr-2 h-5 w-5" />
                                Enregistrer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Factures List */}
            {factures.length === 0 && !isAdding ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
                    <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Aucune facture</p>
                    <p className="text-slate-500 text-sm mt-2">
                        Prenez des photos des marchandises et factures à la réception
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {factures
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((facture) => (
                            <Card key={facture.id} className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Photos Thumbnails */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            {facture.merchandisePhoto && (
                                                <img
                                                    src={facture.merchandisePhoto}
                                                    alt="Marchandise"
                                                    className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                                                />
                                            )}
                                            {facture.invoicePhoto && (
                                                <img
                                                    src={facture.invoicePhoto}
                                                    alt="Facture"
                                                    className="w-16 h-16 object-cover rounded-lg border border-green-600/50"
                                                />
                                            )}
                                            {!facture.merchandisePhoto && !facture.invoicePhoto && (
                                                <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                                                    <Image className="h-8 w-8 text-slate-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium truncate">
                                                {facture.supplierName || "Réception"}
                                            </h4>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(facture.date)}</span>
                                            </div>
                                            {facture.notes && (
                                                <p className="text-slate-500 text-sm mt-1 truncate">
                                                    {facture.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Delete */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 flex-shrink-0"
                                            onClick={() => onDeleteFacture(facture.id)}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}
        </div>
    );
};

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

export default FacturesManager;
