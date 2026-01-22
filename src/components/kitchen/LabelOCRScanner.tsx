import { useRef, useState } from "react";
import { createWorker, Worker } from "tesseract.js";
import { Camera, XCircle, Loader2, ScanText, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OCRResult {
    productName: string;
    dlc: string; // Expiry date
    lotNumber: string;
    origin: string;
}

interface LabelOCRScannerProps {
    onScan: (result: OCRResult) => void;
    onClose: () => void;
}

export const LabelOCRScanner = ({ onScan, onClose }: LabelOCRScannerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: 1280, height: 720 },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsCameraActive(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(imageData);
        stopCamera();
        processImage(imageData);
    };

    const processImage = async (imageData: string) => {
        setIsProcessing(true);

        let worker: Worker | null = null;
        try {
            worker = await createWorker("fra+eng");
            const { data } = await worker.recognize(imageData);
            const extractedText = data.text;

            // Parse extracted text for relevant information
            const result = parseOCRText(extractedText);

            // Vibrate on success
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }

            onScan(result);
        } catch (err) {
            console.error("OCR error:", err);
            setError("Erreur lors de la lecture. Veuillez réessayer.");
            setCapturedImage(null);
            startCamera();
        } finally {
            if (worker) {
                await worker.terminate();
            }
            setIsProcessing(false);
        }
    };

    const parseOCRText = (text: string): OCRResult => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

        // Default values
        const result: OCRResult = {
            productName: "",
            dlc: "",
            lotNumber: "",
            origin: "",
        };

        // Regex patterns
        const datePatterns = [
            /(?:DLC|DDM|À\s*consommer|Best\s*before|Exp)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
            /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
        ];
        const lotPatterns = [
            /(?:LOT|L|N°\s*LOT|BATCH)[:\s]*([A-Z0-9\-]+)/i,
            /\bL\s*:?\s*([A-Z0-9]{4,})/i,
        ];
        const originPatterns = [
            /(?:Origine|Origin|Provenance|Fabriqué en|Made in)[:\s]*([A-Za-zÀ-ÿ\s]+)/i,
            /(?:FR|DE|IT|ES|BE|NL)\s*[\d\.]+\s*CE/i,
        ];

        // Extract DLC
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                result.dlc = match[1] || match[0];
                break;
            }
        }

        // Extract Lot Number
        for (const pattern of lotPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.lotNumber = match[1] || match[0];
                break;
            }
        }

        // Extract Origin
        for (const pattern of originPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.origin = (match[1] || match[0]).trim();
                break;
            }
        }

        // Product name - first non-date, non-lot line that's reasonably long
        for (const line of lines) {
            if (
                line.length > 3 &&
                !line.match(/\d{1,2}[\/\-\.]\d{1,2}/) &&
                !line.match(/^(LOT|L:|DLC|DDM|À consommer)/i) &&
                !line.match(/^\d+\s*(g|kg|ml|l|cl)$/i)
            ) {
                result.productName = line;
                break;
            }
        }

        return result;
    };

    const retryCapture = () => {
        setCapturedImage(null);
        setError(null);
        startCamera();
    };

    // Start camera on mount
    useState(() => {
        startCamera();
        return () => stopCamera();
    });

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <ScanText className="h-6 w-6 text-orange-500" />
                    <span className="text-xl font-bold text-white">Scanner Étiquette</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    className="text-white hover:bg-slate-800"
                >
                    <XCircle className="h-8 w-8" />
                </Button>
            </div>

            {/* Camera/Processing Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {error ? (
                    <div className="text-center">
                        <Camera className="h-20 w-20 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400 text-lg mb-4">{error}</p>
                        <Button
                            onClick={retryCapture}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
                        >
                            <RotateCcw className="mr-2 h-5 w-5" />
                            Réessayer
                        </Button>
                    </div>
                ) : isProcessing ? (
                    <div className="text-center">
                        <Loader2 className="h-20 w-20 text-orange-500 mx-auto mb-4 animate-spin" />
                        <p className="text-white text-xl mb-2">Analyse en cours...</p>
                        <p className="text-slate-400">Extraction du texte avec l'IA</p>
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="mt-6 max-w-[300px] rounded-lg border-2 border-orange-500/50 opacity-50"
                            />
                        )}
                    </div>
                ) : capturedImage ? (
                    <div className="text-center">
                        <Check className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <p className="text-white text-xl">Photo capturée!</p>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-4 border-orange-500/50">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full"
                                style={{ minHeight: "300px", objectFit: "cover" }}
                            />
                            {/* Overlay guideline */}
                            <div className="absolute inset-4 border-2 border-dashed border-orange-400/50 rounded-lg pointer-events-none" />
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        {isCameraActive && (
                            <Button
                                onClick={capturePhoto}
                                className="mt-6 bg-orange-600 hover:bg-orange-700 text-white px-12 py-6 text-xl rounded-full shadow-lg"
                            >
                                <Camera className="mr-3 h-7 w-7" />
                                Capturer
                            </Button>
                        )}

                        <div className="mt-4 text-center">
                            <p className="text-slate-400">
                                Cadrez l'étiquette du produit dans la zone
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/80">
                <p className="text-center text-slate-500 text-sm">
                    💡 Astuce: Assurez-vous que l'étiquette est bien éclairée
                </p>
            </div>
        </div>
    );
};

export default LabelOCRScanner;
