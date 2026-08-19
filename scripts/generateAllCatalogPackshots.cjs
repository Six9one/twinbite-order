const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'public', 'images', 'products');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function processImageToTransparentWebp(inputUrlOrBuffer, outputPath) {
  try {
    let buffer;
    if (typeof inputUrlOrBuffer === 'string') {
      const res = await fetch(inputUrlOrBuffer, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = inputUrlOrBuffer;
    }

    // Convert to PNG to inspect RGBA pixels
    const pngBuffer = await sharp(buffer).ensureAlpha().toFormat('png').toBuffer();
    const png = PNG.sync.read(pngBuffer);

    const w = png.width;
    const h = png.height;

    // Flood fill background removal from edges
    const visited = new Uint8Array(w * h);
    const queue = [];

    function isBackground(r, g, b, a) {
      if (a < 15) return true;
      // White / off-white / light gray check
      return r > 230 && g > 230 && b > 230;
    }

    function addPixel(x, y) {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      const pIdx = idx << 2;
      if (isBackground(png.data[pIdx], png.data[pIdx+1], png.data[pIdx+2], png.data[pIdx+3])) {
        queue.push([x, y]);
        png.data[pIdx + 3] = 0; // make transparent
      }
    }

    for (let x = 0; x < w; x++) {
      addPixel(x, 0);
      addPixel(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      addPixel(0, y);
      addPixel(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const [cx, cy] = queue[head++];
      addPixel(cx + 1, cy);
      addPixel(cx - 1, cy);
      addPixel(cx, cy + 1);
      addPixel(cx, cy - 1);
    }

    // Find foreground bounding box
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) << 2;
        if (png.data[idx + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX < maxX && minY < maxY) {
      const croppedPngBuffer = PNG.sync.write(png);
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      await sharp(croppedPngBuffer)
        .extract({ left: minX, top: minY, width: cropW, height: cropH })
        .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toFile(outputPath);
    } else {
      await sharp(buffer)
        .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toFile(outputPath);
    }

    return true;
  } catch (err) {
    console.error(`Error processing ${outputPath}:`, err.message);
    return false;
  }
}

async function searchOpenFoodFacts(term) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=3`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TwinPizza/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        const img = p.image_front_url || p.image_url || (p.selected_images?.front?.display?.fr);
        if (img) return img;
      }
    }
  } catch (e) {}
  return null;
}

async function run() {
  console.log('--- Starting Batch Packshot Generator for 127 Products ---');
  
  // Read catalog
  const catalogPath = path.join(__dirname, '..', 'src', 'data', 'supplierCatalog.ts');
  const catalogContent = fs.readFileSync(catalogPath, 'utf8');
  const match = catalogContent.match(/export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct\[\] = (\[[\s\S]*?\]);/);
  if (!match) {
    console.error('Could not parse supplier catalog');
    return;
  }

  const products = JSON.parse(match[1]);
  console.log(`Loaded ${products.length} products.`);

  let updatedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const outFilename = `${p.id}.webp`;
    const targetFile = path.join(outDir, outFilename);
    const localWebPath = `/images/products/${outFilename}`;

    // Skip if already processed
    if (fs.existsSync(targetFile) && p.image === localWebPath) {
      continue;
    }

    console.log(`[${i+1}/${products.length}] Processing ${p.id} (${p.reference}) - ${p.name}...`);

    let imageUrl = null;

    // 1. Try search term from product name
    const cleanedSearch = p.name
      .replace(/\b(IQF|COL|KG|PCS|FRAIS|SURGELÉ|PRE DECOUPE|PRE-SALÉES|DENOYAUTEES|AROMATISEE|SLICES)\b/gi, '')
      .replace(/[0-9]+(\s*|\/)(CL|KG|L|PCS|GR|G|MM)/gi, '')
      .replace(/["'*()]/g, '')
      .trim();

    imageUrl = await searchOpenFoodFacts(cleanedSearch);
    if (!imageUrl) {
      imageUrl = await searchOpenFoodFacts(p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1] || ''));
    }

    if (!imageUrl && p.image && p.image.startsWith('http')) {
      imageUrl = p.image;
    }

    if (imageUrl) {
      const ok = await processImageToTransparentWebp(imageUrl, targetFile);
      if (ok) {
        p.image = localWebPath;
        updatedCount++;
      }
    }
  }

  // Write updated catalog back
  const newCatalogContent = catalogContent.replace(
    /export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct\[\] = \[[\s\S]*?\];/,
    `export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct[] = ${JSON.stringify(products, null, 2)};`
  );

  fs.writeFileSync(catalogPath, newCatalogContent, 'utf8');
  console.log(`✓ Finished! Updated ${updatedCount} products with transparent WebP packshots.`);
}

run();
