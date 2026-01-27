import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
    imageBase64: string; // Base64 encoded image (without data:image prefix)
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

        const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');

        if (!apiKey) {
            console.error('Missing GOOGLE_CLOUD_VISION_API_KEY');
            throw new Error('OCR service not configured');
        }

        // Call Google Cloud Vision API
        const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

        const visionRequest = {
            requests: [{
                image: {
                    content: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                },
                features: [
                    { type: 'TEXT_DETECTION', maxResults: 1 },
                    { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ],
                imageContext: {
                    languageHints: ['fr', 'en']
                }
            }]
        };

        console.log('Calling Google Cloud Vision API...');

        const visionResponse = await fetch(visionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visionRequest)
        });

        const visionData = await visionResponse.json();

        if (visionData.error) {
            console.error('Vision API error:', visionData.error);
            throw new Error(visionData.error.message || 'Vision API error');
        }

        const response = visionData.responses?.[0];
        const rawText = response?.fullTextAnnotation?.text || response?.textAnnotations?.[0]?.description || '';
        const confidence = response?.fullTextAnnotation?.pages?.[0]?.confidence || 0.95;

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
    const fullText = text.toUpperCase();

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
        // French date formats
        /(?:DLC|DDM|À\s*CONSOMMER\s*(?:AVANT|JUSQU['']?AU)?|DATE\s*LIMITE|PÉREMPTION)\s*[:\s]*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
        /(?:DLC|DDM|À\s*CONSOMMER)\s*[:\s]*(\d{1,2}\s+(?:JAN|FÉV|FEV|MAR|AVR|MAI|JUN|JUI|JUL|AOÛ|AOU|SEP|OCT|NOV|DÉC|DEC)[A-Z]*\s*\d{2,4})/i,
        /(?:BEST\s*BEFORE|EXP(?:IRY)?|USE\s*BY)\s*[:\s]*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
        // Standalone dates (DD/MM/YYYY or DD-MM-YYYY)
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
        /([A-Z]{2})\s*[\d\.]+\s*CE/i, // FR 44.123 CE format
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
        /(\d+\s*[xX]\s*\d+(?:[.,]\d+)?\s*(?:KG|G|ML|L|CL)?)/i, // 2x500g format
    ];

    for (const pattern of weightPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.weight = match[1] || match[0];
            break;
        }
    }

    // === PRODUCT NAME ===
    // Look for common meat/food product keywords
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
        /(?:WINGS?[\w\s]*)/i,
        /(?:TENDERS?[\w\s]*)/i,
        /(?:CORDON\s*BLEU[\w\s]*)/i,
        /(?:LARDONS?[\w\s]*)/i,
        /(?:BACON[\w\s]*)/i,
        /(?:MOZZARELLA[\w\s]*)/i,
        /(?:FROMAGE[\w\s]*)/i,
        /(?:CRÈME[\w\s]*)/i,
        /(?:CHAMPIGNONS?[\w\s]*)/i,
        /(?:POIVRONS?[\w\s]*)/i,
        /(?:SAUMON[\w\s]*)/i,
    ];

    for (const pattern of productKeywords) {
        const match = text.match(pattern);
        if (match) {
            result.productName = match[0].trim();
            break;
        }
    }

    // If no product name found, use the longest descriptive line
    if (!result.productName) {
        const ignoredPrefixes = /^(LOT|L:|DLC|DDM|À CONSOMMER|BEST BEFORE|EXP|ORIGINE|MADE IN|POIDS|NET|CODE|REF|SA |SAS |\d)/i;
        const productLines: string[] = [];

        for (const line of lines) {
            if (
                line.length > 4 &&
                line.length < 60 &&
                !line.match(/^\d{1,2}[\/\-\.]\d{1,2}/) &&
                !line.match(ignoredPrefixes) &&
                !line.match(/^\d+\s*(g|kg|ml|l|cl)$/i) &&
                !line.match(/^\d{8,13}$/) &&
                !line.match(/^[A-Z]{2}\s*\d+\.\d+\s*CE$/i)
            ) {
                productLines.push(line);
            }
        }

        // Take most descriptive line
        if (productLines.length > 0) {
            productLines.sort((a, b) => b.length - a.length);
            result.productName = productLines[0];
        }
    }

    // Clean up product name
    result.productName = result.productName
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);

    return result;
}
