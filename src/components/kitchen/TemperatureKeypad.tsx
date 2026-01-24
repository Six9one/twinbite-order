import { useState } from "react";
import { X, Check, AlertTriangle, Thermometer, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Device } from "./DeviceManager";

interface TemperatureKeypadProps {
    device: Device;
    onSave: (temp: number, status: "ok" | "warning") => void;
    onClose: () => void;
}

export const TemperatureKeypad = ({ device, onSave, onClose }: TemperatureKeypadProps) => {
    const [display, setDisplay] = useState("");
    const [isNegative, setIsNegative] = useState(device.type === "freezer");
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState("");

    const appendDigit = (digit: string) => {
        if (display.length >= 4) return; // Max: -99.9

        // Handle decimal point
        if (digit === "." && display.includes(".")) return;
        if (digit === "." && display === "") {
            setDisplay("0.");
            return;
        }

        setDisplay(display + digit);
    };

    const clearDisplay = () => {
        setDisplay("");
        setShowWarning(false);
    };

    const deleteLastDigit = () => {
        setDisplay(display.slice(0, -1));
        setShowWarning(false);
    };

    const toggleSign = () => {
        setIsNegative(!isNegative);
    };

    const handleSave = () => {
        if (!display) return;

        let temp = parseFloat(display);
        if (isNegative) temp = -temp;

        // Check temperature limits
        const isFridge = device.type === "fridge";
        const maxTemp = isFridge ? 4 : -18;
        const isWarning = isFridge ? temp > maxTemp : temp > maxTemp;

        if (isWarning) {
            // Show critical warning
            setShowWarning(true);
            setWarningMessage(
                isFridge
                    ? "⚠️ CRITIQUE: Température trop élevée!\nDéplacez les aliments immédiatement!"
                    : "⚠️ CRITIQUE: Congélateur trop chaud!\nVérifiez immédiatement!"
            );

            // Vibrate for warning
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
        }

        // Save regardless (user may want to log the warning)
        onSave(temp, isWarning ? "warning" : "ok");
    };

    const currentTemp = display ? (isNegative ? `-${display}` : display) : "--";

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <Thermometer className="h-6 w-6 text-orange-500" />
                    <span className="text-xl font-bold text-white truncate">{device.name}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-slate-800"
                >
                    <X className="h-8 w-8" />
                </Button>
            </div>

            {/* Warning Banner */}
            {showWarning && (
                <div className="mx-4 mt-4 p-4 bg-red-600 rounded-xl animate-pulse">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-8 w-8 text-white flex-shrink-0" />
                        <p className="text-white font-bold text-lg whitespace-pre-line">
                            {warningMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Temperature Display */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="text-center mb-8">
                    <div className="text-7xl font-bold text-white mb-2">
                        {currentTemp}
                        <span className="text-4xl text-slate-400">°C</span>
                    </div>
                    <p className="text-slate-400">
                        {device.type === "fridge" ? "🧊 Réfrigérateur (max 4°C)" : "❄️ Congélateur (max -18°C)"}
                    </p>
                </div>

                {/* Keypad */}
                <div className="w-full max-w-sm">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                            <Button
                                key={digit}
                                onClick={() => appendDigit(digit)}
                                className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                {digit}
                            </Button>
                        ))}
                        <Button
                            onClick={toggleSign}
                            className={`h-20 text-3xl font-bold ${isNegative ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-700 hover:bg-slate-600"
                                } text-white`}
                        >
                            +/-
                        </Button>
                        <Button
                            onClick={() => appendDigit("0")}
                            className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white"
                        >
                            0
                        </Button>
                        <Button
                            onClick={() => appendDigit(".")}
                            className="h-20 text-3xl font-bold bg-slate-700 hover:bg-slate-600 text-white"
                        >
                            .
                        </Button>
                    </div>

                    {/* Action Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            onClick={clearDisplay}
                            className="h-16 text-lg bg-slate-600 hover:bg-slate-500 text-white"
                        >
                            C
                        </Button>
                        <Button
                            onClick={deleteLastDigit}
                            className="h-16 bg-slate-600 hover:bg-slate-500 text-white"
                        >
                            <Delete className="h-6 w-6" />
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!display}
                            className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        >
                            <Check className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/80">
                <p className="text-center text-slate-500 text-sm">
                    💡 Appuyez sur +/- pour basculer entre positif et négatif
                </p>
            </div>
        </div>
    );
};

export default TemperatureKeypad;
