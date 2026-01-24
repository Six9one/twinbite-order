import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, XCircle, Scan, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
    onScan: (result: string) => void;
    onClose: () => void;
}

export const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const startScanner = async () => {
        if (!containerRef.current) return;

        try {
            setError(null);
            const scanner = new Html5Qrcode("barcode-scanner-container", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.QR_CODE,
                ],
                verbose: false,
            });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 150 },
                    aspectRatio: 1.5,
                },
                (decodedText) => {
                    // Vibrate on successful scan
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                    stopScanner();
                    onScan(decodedText);
                },
                () => {
                    // QR code not detected - ignore
                }
            );
            setIsScanning(true);
        } catch (err: unknown) {
            console.error("Scanner error:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);

            // Check for specific error types
            if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
                setError("⚠️ Permission refusée.\n\nAllez dans les paramètres de votre navigateur → Autorisations → Caméra → Autoriser pour ce site.");
            } else if (errorMessage.includes("NotFoundError")) {
                setError("📷 Aucune caméra détectée.\n\nVérifiez que votre appareil a une caméra.");
            } else if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
                setError("🔒 HTTPS requis.\n\nLa caméra ne fonctionne que sur les sites sécurisés (HTTPS).");
            } else {
                setError("Impossible d'accéder à la caméra.\n\nVérifiez les permissions dans les paramètres de votre navigateur.");
            }
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    useEffect(() => {
        startScanner();
        return () => {
            stopScanner();
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <Scan className="h-6 w-6 text-orange-500" />
                    <span className="text-xl font-bold text-white">Scanner Code-Barres</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        stopScanner();
                        onClose();
                    }}
                    className="text-white hover:bg-slate-800"
                >
                    <XCircle className="h-8 w-8" />
                </Button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {error ? (
                    <div className="text-center max-w-sm">
                        <Camera className="h-20 w-20 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400 text-lg mb-6 whitespace-pre-line">{error}</p>
                        <Button
                            onClick={startScanner}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
                        >
                            <RotateCcw className="mr-2 h-5 w-5" />
                            Réessayer
                        </Button>
                    </div>
                ) : (
                    <>
                        <div
                            id="barcode-scanner-container"
                            ref={containerRef}
                            className="w-full max-w-md rounded-2xl overflow-hidden border-4 border-orange-500/50"
                            style={{ minHeight: "300px" }}
                        />
                        <div className="mt-6 text-center">
                            <p className="text-slate-400 text-lg">
                                Placez le code-barres dans le cadre
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2 text-orange-400">
                                <div className="animate-pulse h-2 w-2 bg-orange-500 rounded-full" />
                                <span>Scan automatique actif</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer with tip */}
            <div className="p-4 bg-slate-900/80">
                <p className="text-center text-slate-500 text-sm">
                    💡 Astuce: Tenez le téléphone à ~15cm du produit
                </p>
            </div>
        </div>
    );
};

export default BarcodeScanner;
