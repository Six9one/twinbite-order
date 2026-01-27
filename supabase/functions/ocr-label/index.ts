import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
    imageBase64: string;
}

interface OCRResult {
    productName: string;
    dlc: string;
    lotNumber: string;
    origin: string;
    weight: string;
    rawText: string;
    confidence: number;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { imageBase64 }: OCRRequest = await req.json();

        if (!imageBase64) {
            throw new Error('Missing imageBase64');
        }

        // Use OCR.space FREE API - 500 requests/day, no billing required!
        const ocrSpaceUrl = 'https://api.ocr.space/parse/image';

        // Clean base64 if it has data URI prefix
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${cleanBase64}`);
        formData.append('language', 'fre'); // French
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2'); // Engine 2 is more accurate
        formData.append('scale', 'true');
        formData.append('isTable', 'false');

        console.log('Calling OCR.space API...');

        const ocrResponse = await fetch(ocrSpaceUrl, {
            method: 'POST',
            headers: {
                'apikey': 'K88888888888957', // Free API key from OCR.space
            },
            body: formData
        });

        const ocrData = await ocrResponse.json();

        if (ocrData.IsErroredOnProcessing) {
            console.error('OCR.space error:', ocrData.ErrorMessage);
            throw new Error(ocrData.ErrorMessage || 'OCR processing failed');
        }

        const rawText = ocrData.ParsedResults?.[0]?.ParsedText || '';
        const confidence = (ocrData.ParsedResults?.[0]?.TextOverlay?.Confidence || 95) / 100;

        console.log('OCR Raw Text:', rawText.substring(0, 500));

        // Parse the extracted text
        const result = parseOCRText(rawText, confidence);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('OCR Error:', errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

function parseOCRText(text: string, confidence: number): OCRResult {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const result: OCRResult = {
        productName: '',
        dlc: '',
        lotNumber: '',
        origin: '',
        weight: '',
        rawText: text,
        confidence: confidence
    };

    // === DATE PATTERNS (DLC/DDM/Best Before) ===
    const datePatterns = [
        /(?:DLC|DDM|À\s*CONSOMMER\s*(?:AVANT|JUSQU['']?AU)?|DATE\s*LIMITE|PÉREMPTION)\s*[:\s]*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
        /(?:DLC|DDM|À\s*CONSOMMER)\s*[:\s]*(\d{1,2}\s+(?:JAN|FÉV|FEV|MAR|AVR|MAI|JUN|JUI|JUL|AOÛ|AOU|SEP|OCT|NOV|DÉC|DEC)[A-Z]*\s*\d{2,4})/i,
        /(?:BEST\s*BEFORE|EXP(?:IRY)?|USE\s*BY)\s*[:\s]*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
        /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b/,
        /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{2})\b/,
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            result.dlc = match[1] || match[0];
            break;
        }
    }

    // === LOT NUMBER ===
    const lotPatterns = [
        /(?:LOT|L|N°\s*LOT|BATCH|LOT\s*N°?)\s*[:\s]*([A-Z0-9\-\.\/]+)/i,
        /\bL\s*[:\s]*([A-Z0-9]{4,})/i,
        /(?:N°|NO)\s*([A-Z0-9]{4,})/i,
    ];

    for (const pattern of lotPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.lotNumber = match[1] || match[0];
            break;
        }
    }

    // === ORIGIN / COUNTRY ===
    const originPatterns = [
        /(?:ORIGINE|ORIGIN|PROVENANCE|FABRIQUÉ\s*EN|MADE\s*IN|PAYS|VIANDE\s*(?:BOVINE|DE\s*PORC|DE\s*POULET|D['']AGNEAU)\s*:?\s*)([A-ZÀ-ÿ\s]+)/i,
        /(FRANCE|ITALIE|ITALY|ESPAGNE|SPAIN|ALLEMAGNE|GERMANY|BELGIQUE|BELGIUM|PAYS-BAS|NETHERLANDS|POLOGNE|POLAND|IRLANDE|IRELAND)/i,
        /([A-Z]{2})\s*[\d\.]+\s*CE/i,
    ];

    for (const pattern of originPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.origin = (match[1] || match[0]).trim();
            break;
        }
    }

    // === WEIGHT ===
    const weightPatterns = [
        /(?:POIDS|NET|CONTENU|PN)\s*[:\s]*(\d+(?:[.,]\d+)?\s*(?:KG|G|ML|L|CL))/i,
        /(\d+(?:[.,]\d+)?\s*(?:KG|G))\s*(?:NET|±)/i,
        /\b(\d+(?:[.,]\d+)?\s*(?:KG|G|ML|L|CL))\b/i,
    ];

    for (const pattern of weightPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.weight = match[1] || match[0];
            break;
        }
    }

    // === PRODUCT NAME ===
    const productKeywords = [
        /(?:VIANDE\s*(?:HACHÉE?|BOVINE|DE\s*BŒUF|DE\s*VEAU|DE\s*PORC|DE\s*POULET|D['']AGNEAU)[\w\s]*)/i,
        /(?:STEAK\s*HACHÉ?[\w\s]*)/i,
        /(?:ESCALOPE[\w\s]*)/i,
        /(?:JAMBON[\w\s]*)/i,
        /(?:SAUCISSE[S]?[\w\s]*)/i,
        /(?:MERGUEZ[\w\s]*)/i,
        /(?:CHORIZO[\w\s]*)/i,
        /(?:KEBAB[\w\s]*)/i,
        /(?:POULET[\w\s]*)/i,
        /(?:DINDE[\w\s]*)/i,
        /(?:NUGGETS?[\w\s]*)/i,
        /(?:MOZZARELLA[\w\s]*)/i,
        /(?:FROMAGE[\w\s]*)/i,
        /(?:SAUMON[\w\s]*)/i,
    ];

    for (const pattern of productKeywords) {
        const match = text.match(pattern);
        if (match) {
            result.productName = match[0].trim();
            break;
        }
    }

    // If no product name found, use first descriptive line
    if (!result.productName) {
        const ignoredPrefixes = /^(LOT|L:|DLC|DDM|À CONSOMMER|BEST BEFORE|EXP|ORIGINE|MADE IN|POIDS|NET|CODE|REF|SA |SAS |\d)/i;

        for (const line of lines) {
            if (
                line.length > 4 &&
                line.length < 60 &&
                !line.match(/^\d{1,2}[\/\-\.]\d{1,2}/) &&
                !line.match(ignoredPrefixes) &&
                !line.match(/^\d+\s*(g|kg|ml|l|cl)$/i) &&
                !line.match(/^\d{8,13}$/)
            ) {
                result.productName = line;
                break;
            }
        }
    }

    result.productName = result.productName.replace(/\s+/g, ' ').trim().substring(0, 100);

    return result;
}
