import { useState, useRef } from "react";
import { Plus, Camera, X, Thermometer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface Device {
    id: string;
    name: string;
    type: "fridge" | "freezer";
    photo?: string;
    lastTemp?: number;
    lastLoggedAt?: string;
    status?: "ok" | "warning";
}

interface DeviceManagerProps {
    devices: Device[];
    onAddDevice: (device: Device) => void;
    onDeleteDevice: (id: string) => void;
}

export const DeviceManager = ({
    devices,
    onAddDevice,
    onDeleteDevice,
}: DeviceManagerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState<"fridge" | "freezer">("fridge");
    const [photo, setPhoto] = useState<string | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (!name.trim()) return;

        const newDevice: Device = {
            id: `device_${Date.now()}`,
            name: name.trim(),
            type,
            photo,
        };

        onAddDevice(newDevice);
        setName("");
        setType("fridge");
        setPhoto(undefined);
        setIsOpen(false);
    };

    return (
        <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-orange-500" />
                    Appareils ({devices.length})
                </h3>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                            <Plus className="mr-2 h-5 w-5" />
                            Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <Plus className="h-6 w-6 text-orange-500" />
                                Nouvel Appareil
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5 pt-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Nom de l'appareil *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Frigo Principal, Congélateur Viandes"
                                    className="bg-slate-900 border-slate-600 text-white h-14 text-lg"
                                />
                            </div>

                            {/* Type */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Type *</Label>
                                <Select value={type} onValueChange={(v) => setType(v as "fridge" | "freezer")}>
                                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-14 text-lg">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="fridge" className="text-white text-lg">
                                            🧊 Réfrigérateur (max 4°C)
                                        </SelectItem>
                                        <SelectItem value="freezer" className="text-white text-lg">
                                            ❄️ Congélateur (max -18°C)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Photo */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Photo (optionnel)</Label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />
                                {photo ? (
                                    <div className="relative">
                                        <img
                                            src={photo}
                                            alt="Device"
                                            className="w-full h-40 object-cover rounded-lg border border-slate-600"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2"
                                            onClick={() => setPhoto(undefined)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full h-24 border-dashed border-2 border-slate-600 text-slate-400 hover:bg-slate-700"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="mr-2 h-6 w-6" />
                                        Prendre une photo
                                    </Button>
                                )}
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={handleSave}
                                disabled={!name.trim()}
                                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                            >
                                <Save className="mr-2 h-5 w-5" />
                                Enregistrer
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Device List for Management */}
            {devices.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
                    <Thermometer className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Aucun appareil configuré</p>
                    <p className="text-slate-500 text-sm mt-2">
                        Ajoutez un frigo ou congélateur pour commencer
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {devices.map((device) => (
                        <div
                            key={device.id}
                            className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                        >
                            {device.photo ? (
                                <img
                                    src={device.photo}
                                    alt={device.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                                    <Thermometer className="h-8 w-8 text-slate-500" />
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-white font-medium">{device.name}</p>
                                <p className="text-slate-400 text-sm">
                                    {device.type === "fridge" ? "🧊 Frigo (max 4°C)" : "❄️ Congélateur (max -18°C)"}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                onClick={() => onDeleteDevice(device.id)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DeviceManager;
