/**
 * logo-escpos.js
 * Converts Twin Pizza logo PNG → ESC/POS GS v 0 raster bitmap
 * Call buildLogoBytes() once at startup (async), cache the result.
 */

import { Jimp } from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Logo lives in src/assets/logo.png (relative to project root)
const LOGO_PATH = join(__dirname, '..', 'src', 'assets', 'logo.png');

// Target print width in pixels — must be multiple of 8
// Star TSP100 printable width ≈ 576px at 203dpi; 160px = ~2cm wide
const TARGET_WIDTH = 160;

/**
 * Returns a Buffer of raw ESC/POS bytes that print the logo centred.
 * Returns null if logo file not found or conversion fails.
 */
export async function buildLogoBytes() {
    try {
        let img = await Jimp.read(LOGO_PATH);

        // Resize keeping aspect ratio, target width
        const aspect = img.height / img.width;
        const targetH = Math.ceil(TARGET_WIDTH * aspect);
        img = img.resize({ w: TARGET_WIDTH, h: targetH });

        // Convert to greyscale + threshold → 1-bit black/white
        img = img.greyscale();

        const width  = img.width;
        const height = img.height;

        // Width in bytes (ceil to multiple of 8)
        const widthBytes = Math.ceil(width / 8);

        // Build pixel rows
        const rasterRows = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let xByte = 0; xByte < widthBytes; xByte++) {
                let byte = 0;
                for (let bit = 0; bit < 8; bit++) {
                    const x = xByte * 8 + bit;
                    if (x < width) {
                        const pixel = img.getPixelColor(x, y);
                        // Extract red channel (greyscale → r=g=b)
                        const r = (pixel >> 24) & 0xFF;
                        const a = pixel & 0xFF;
                        // Dark pixel (r < 128) AND opaque → print dot
                        if (r < 128 && a > 128) {
                            byte |= (0x80 >> bit);
                        }
                    }
                }
                row.push(byte);
            }
            rasterRows.push(row);
        }

        // Build ESC/POS GS v 0 command
        // GS v 0  m  xL xH  yL yH  data...
        // m=0 (normal), xL/xH = widthBytes, yL/yH = height
        const xL = widthBytes & 0xFF;
        const xH = (widthBytes >> 8) & 0xFF;
        const yL = height & 0xFF;
        const yH = (height >> 8) & 0xFF;

        const header = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH];
        const pixelData = rasterRows.flat();

        // Centre: ESC a 1 (centre align) before, ESC a 0 (left) after
        const CENTER_ON  = [0x1B, 0x61, 0x01];
        const CENTER_OFF = [0x1B, 0x61, 0x00];
        const NEWLINE    = [0x0A];

        const allBytes = [
            ...CENTER_ON,
            ...header,
            ...pixelData,
            ...NEWLINE,
            ...CENTER_OFF,
        ];

        return Buffer.from(allBytes);
    } catch (err) {
        console.warn('[LOGO] Could not build logo bytes:', err.message);
        return null;
    }
}
