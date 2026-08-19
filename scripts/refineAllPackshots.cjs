const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'public', 'images', 'products');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processImageToTransparentWebp(inputUrlOrBuffer, outputPath) {
  try {
    let buffer;
    if (typeof inputUrlOrBuffer === 'string') {
      const res = await fetch(inputUrlOrBuffer, {
        headers: { 'User-Agent': 'TwinPizzaBot/1.0 (https://twinpizza.fr; contact@twinpizza.fr)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = inputUrlOrBuffer;
    }

    const pngBuffer = await sharp(buffer).ensureAlpha().toFormat('png').toBuffer();
    const png = PNG.sync.read(pngBuffer);
    const w = png.width;
    const h = png.height;

    const visited = new Uint8Array(w * h);
    const queue = [];

    function isBackground(r, g, b, a) {
      if (a < 15) return true;
      return r > 230 && g > 230 && b > 230;
    }

    function addPixel(x, y) {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      const pIdx = idx << 2;
      if (isBackground(png.data[pIdx], png.data[pIdx + 1], png.data[pIdx + 2], png.data[pIdx + 3])) {
        queue.push([x, y]);
        png.data[pIdx + 3] = 0;
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
    await sleep(200);
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=3`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TwinPizzaBot/1.0 (https://twinpizza.fr; contact@twinpizza.fr)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        const img = p.image_front_url || p.image_url || p.selected_images?.front?.display?.fr;
        if (img && img.startsWith('http')) return img;
      }
    }
  } catch (e) {}
  return null;
}

function getOptimizedSearchQuery(name) {
  const s = name.toUpperCase();

  // Specific high-frequency grocery / restaurant items
  if (s.includes('HARISSA')) return 'harissa cap bon';
  if (s.includes('MUTTI')) return 'mutti sauce pizza';
  if (s.includes('HOCHLAND')) return 'hochland burger slices';
  if (s.includes('BOURSIN')) return 'boursin';
  if (s.includes('REBLOCHON')) return 'reblochon';
  if (s.includes('RACLETTE')) return 'fromage raclette';
  if (s.includes('CHEVRE') || s.includes('CHÈVRE')) return 'chevre buche sainte maure';
  if (s.includes('PARMESAN') || s.includes('GRANA PADANO')) return 'grana padano rape';
  if (s.includes('BLEU')) return 'bleu d auvergne';
  if (s.includes('VAHINE') || s.includes('VAHINÉ') || s.includes('CARAMEL')) return 'vahine coulis caramel';
  if (s.includes('DAIM') && s.includes('TARTE')) return 'almondy daim';
  if (s.includes('DAIM')) return 'daim chocolat';
  if (s.includes('TIRAMISU') && s.includes('OREO')) return 'oreo biscuit';
  if (s.includes('TIRAMISU') && s.includes('SPECULOOS')) return 'lotus speculoos';
  if (s.includes('TIRAMISU')) return 'tiramisu';
  if (s.includes('CRISTALINE') && s.includes('50')) return 'cristaline 50cl';
  if (s.includes('CRISTALINE')) return 'cristaline 1.5l';
  if (s.includes('COCA') && s.includes('ZERO')) return 'coca cola zero 33cl';
  if (s.includes('COCA') && s.includes('CHERRY')) return 'coca cola cherry 33cl';
  if (s.includes('COCA')) return 'coca cola 33cl';
  if (s.includes('FANTA') && s.includes('CITRON')) return 'fanta citron';
  if (s.includes('FANTA')) return 'fanta orange 33cl';
  if (s.includes('ORANGINA')) return 'orangina 1.5l';
  if (s.includes('7UP') && s.includes('CHERRY')) return '7up cherry 33cl';
  if (s.includes('7UP')) return '7up 33cl';
  if (s.includes('OASIS') && s.includes('TROPICAL')) return 'oasis tropical 33cl';
  if (s.includes('OASIS') && (s.includes('POMME') || s.includes('CASSIS'))) return 'oasis pomme cassis framboise';
  if (s.includes('OASIS')) return 'oasis 33cl';
  if (s.includes('SCHWEPPES')) return 'schweppes agrum 33cl';
  if (s.includes('ICE TEA') || s.includes('LIPTON')) return 'lipton ice tea peche 33cl';
  if (s.includes('PERRIER')) return 'perrier 33cl';
  if (s.includes('TROPICO')) return 'tropico l original';
  if (s.includes('HAWAI')) return 'hawai boisson';
  if (s.includes('PEPSI')) return 'pepsi 33cl';
  if (s.includes('CAPRI SUN') || s.includes('CAPRI-SUN')) return 'capri sun multivitamin';
  if (s.includes('CORDON BLEU')) return 'cordon bleu halal';
  if (s.includes('TENDERS')) return 'tenders poulet';
  if (s.includes('NUGGETS')) return 'nuggets poulet halal';
  if (s.includes('WINGS')) return 'chicken wings';
  if (s.includes('MERGUEZ') && s.includes('CHARCUTIER')) return 'le charcutier merguez';
  if (s.includes('MERGUEZ')) return 'merguez halal';
  if (s.includes('LARDON')) return 'lardons volaille halal';
  if (s.includes('CHORIZO')) return 'chorizo volaille halal';
  if (s.includes('BACON')) return 'bacon dinde halal';
  if (s.includes('KEBAB')) return 'viande kebab';
  if (s.includes('STEAK') || s.includes('VIANDE')) return 'steak hache pur boeuf';
  if (s.includes('POULET') || s.includes('FILET')) return 'filet de poulet';
  if (s.includes('DINDE')) return 'escalope dinde';
  if (s.includes('FRITE') && s.includes('6/6')) return 'frites allumettes surgelees';
  if (s.includes('FRITE')) return 'frites surgelees';
  if (s.includes('GALETTE') && s.includes('PDT')) return 'galette de pomme de terre';
  if (s.includes('MOZZARELLA STICK') || s.includes('MOZZA STICK')) return 'mozzarella sticks';
  if (s.includes('JALAPENO') || s.includes('JALAPEÑO')) return 'jalapeno cheese';
  if (s.includes('SAUCE') && s.includes('ALGERIENNE')) return 'sauce algerienne nawhals';
  if (s.includes('SAUCE') && s.includes('BIGGY')) return 'sauce biggy burger';
  if (s.includes('SAUCE') && s.includes('BARBECUE')) return 'sauce barbecue';
  if (s.includes('SAUCE') && s.includes('FROMAGERE')) return 'sauce fromagere';
  if (s.includes('SAUCE') && s.includes('CHEDDAR')) return 'sauce cheddar';
  if (s.includes('SAUCE') && s.includes('ANDALOUSE')) return 'sauce andalouse';
  if (s.includes('SAUCE') && s.includes('MAYO')) return 'sauce mayonnaise';
  if (s.includes('SAUCE') && s.includes('KETCHUP')) return 'ketchup';
  if (s.includes('PANINI')) return 'pain panini';
  if (s.includes('TORTILLA') || s.includes('WRAP')) return 'tortillas wraps';
  if (s.includes('PAIN KEBAB')) return 'pain kebab pita';
  if (s.includes('HUILE') && s.includes('TOURNESOL')) return 'huile tournesol';
  if (s.includes('LEVURE')) return 'levure boulangere';
  if (s.includes('SEMOULE')) return 'semoule extra fine';
  if (s.includes('THON')) return 'thon entier huile tournesol';
  if (s.includes('OLIVE')) return 'olives noires denoyautees';
  if (s.includes('CREME') && s.includes('LIQUIDE')) return 'creme liquide president';
  if (s.includes('CREME') || s.includes('CRÈME')) return 'creme fraiche epaisse';
  if (s.includes('OEUF') || s.includes('ŒUF')) return 'oeufs plein air';
  if (s.includes('SEL')) return 'sel fin table';
  if (s.includes('MIEL')) return 'miel fleurs';

  return name
    .replace(/\b(IQF|COL|KG|PCS|FRAIS|SURGELÉ|PRE DECOUPE|PRE-SALÉES|DENOYAUTEES|AROMATISEE|SLICES)\b/gi, '')
    .replace(/[0-9]+(\s*|\/)(CL|KG|L|PCS|GR|G|MM)/gi, '')
    .replace(/["'*()]/g, '')
    .trim();
}

async function run() {
  console.log('--- Refining packshots for all products ---');
  const catalogPath = path.join(__dirname, '..', 'src', 'data', 'supplierCatalog.ts');
  const catalogContent = fs.readFileSync(catalogPath, 'utf8');
  const match = catalogContent.match(/export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct\[\] = (\[[\s\S]*?\]);/);
  const products = JSON.parse(match[1]);

  let updated = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const targetFile = path.join(outDir, `${p.id}.webp`);
    const query = getOptimizedSearchQuery(p.name);

    console.log(`[${i + 1}/${products.length}] ${p.id} (${p.name}) -> Search: "${query}"`);
    const imgUrl = await searchOpenFoodFacts(query);

    if (imgUrl) {
      const ok = await processImageToTransparentWebp(imgUrl, targetFile);
      if (ok) {
        p.image = `/images/products/${p.id}.webp`;
        updated++;
        console.log(`  ✓ Updated ${p.id} with transparent packshot`);
      }
    }
  }

  const newCatalogContent = catalogContent.replace(
    /export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct\[\] = \[[\s\S]*?\];/,
    `export const DEFAULT_SUPPLIER_PRODUCTS: SupplierProduct[] = ${JSON.stringify(products, null, 2)};`
  );
  fs.writeFileSync(catalogPath, newCatalogContent, 'utf8');
  console.log(`\n🎉 All ${updated} products refined with authentic transparent packshots!`);
}

run();
