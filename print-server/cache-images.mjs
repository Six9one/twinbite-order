/**
 * Twin Pizza — Image Cache Downloader (COMPLET)
 * -----------------------------------------------
 * Télécharge TOUTES les images depuis Supabase :
 *   - Pizzas, produits, sandwichs, soufflets, makloub, tacos, panini
 *   - Viandes, sauces, garnitures, suppléments, crudités
 *   - Boissons, desserts, tex-mex
 *   - Images wizard (soufflet/tacos/makloub...)
 *   - Images catégories, carousel
 *
 * Résultat : http://localhost:3001/cache/<filename>
 * Usage    : node cache-images.mjs
 *         ou double-clic TELECHARGER_IMAGES.bat
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { mkdirSync, existsSync, statSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load env from project root (one level up)
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL  = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY  = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const CACHE_DIR     = path.join(__dirname, 'image-cache');         // print-server/image-cache/
const MANIFEST_PATH = path.join(CACHE_DIR, 'manifest.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ERREUR] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant dans .env');
  process.exit(1);
}

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

function urlToFilename(url) {
  const hash    = crypto.createHash('md5').update(url).digest('hex').slice(0, 16);
  const clean   = url.split('?')[0];
  const ext     = clean.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg','jpeg','png','webp','gif','svg','avif'].includes(ext) ? ext : 'jpg';
  return `${hash}.${safeExt}`;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 25000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const stream = createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function downloadWithRetry(url, destPath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await downloadFile(url, destPath);
      return true;
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
    }
  }
  return false;
}

function isValidUrl(u) {
  return u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'));
}

// ── Collect ALL image URLs from every table ────────────────────────────────

async function collectImageUrls() {
  const urls = new Set();
  let totalFound = 0;

  // Helper to fetch from a simple table
  async function fromTable(table, column = 'image_url') {
    try {
      const { data } = await supabase.from(table).select(column);
      const count = (data || []).filter(r => isValidUrl(r[column])).length;
      if (count > 0) {
        (data || []).forEach(r => isValidUrl(r[column]) && urls.add(r[column]));
        console.log(`  [${table}] → ${count} images`);
        totalFound += count;
      }
    } catch (e) {
      // Table may not exist on this instance
    }
  }

  console.log('\nScan des tables Supabase...\n');

  // ── Produits (pizzas, sandwichs, soufflets, makloub, tacos, panini, etc.) ──
  await fromTable('products', 'image_url');

  // ── Options de personnalisation (viandes, sauces, garnitures...) ──────────
  await fromTable('meat_options',       'image_url');
  await fromTable('sauce_options',      'image_url');
  await fromTable('garniture_options',  'image_url');
  await fromTable('supplement_options', 'image_url');
  await fromTable('crudites_options',   'image_url');

  // ── Sandwichs ──────────────────────────────────────────────────────────────
  await fromTable('sandwich_types',  'image_url');
  await fromTable('sandwich_sauces', 'image_url');

  // ── Boissons & Desserts ────────────────────────────────────────────────────
  await fromTable('drinks',   'image_url');
  await fromTable('desserts', 'image_url');

  // ── Tex-Mex (snacks, frites, croques) ─────────────────────────────────────
  await fromTable('texmex_products', 'image_url');

  // ── Images catégories ──────────────────────────────────────────────────────
  await fromTable('category_images', 'image_url');

  // ── Carousel homepage ──────────────────────────────────────────────────────
  await fromTable('carousel_items', 'image_url');

  // ── Wizard images (soufflet, tacos, makloub, pizza senior/mega...) ─────────
  // Stored in admin_settings as JSON: { image_url: "https://..." }
  try {
    const { data: wizardSettings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'wizard_image_%');

    let wizardCount = 0;
    (wizardSettings || []).forEach(row => {
      const val = row.setting_value;
      const imgUrl = typeof val === 'object' && val !== null ? val.image_url : null;
      if (isValidUrl(imgUrl)) {
        urls.add(imgUrl);
        wizardCount++;
        totalFound++;
      }
    });
    if (wizardCount > 0) console.log(`  [admin_settings/wizard_images] → ${wizardCount} images`);
  } catch {}

  // ── Toutes autres tables admin_settings avec image_url dans JSON ───────────
  try {
    const { data: allSettings } = await supabase
      .from('admin_settings')
      .select('setting_value');

    let settingCount = 0;
    (allSettings || []).forEach(row => {
      const val = row.setting_value;
      if (typeof val === 'object' && val !== null) {
        // Deep scan for any image_url field
        const scan = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (isValidUrl(obj.image_url)) { urls.add(obj.image_url); settingCount++; totalFound++; }
          Object.values(obj).forEach(v => { if (typeof v === 'object') scan(v); });
        };
        scan(val);
      }
    });
    if (settingCount > 0) console.log(`  [admin_settings/other] → ${settingCount} images`);
  } catch {}

  console.log(`\nTotal trouvé : ${totalFound} URLs (${urls.size} uniques)\n`);
  return [...urls];
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n================================================');
  console.log('  Twin Pizza -- Cache Images COMPLET');
  console.log('  Pizzas + Viandes + Sauces + Garnitures');
  console.log('  Suppléments + Crudités + Boissons + Wizards');
  console.log('================================================');

  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
    console.log(`\nManifest existant : ${Object.keys(manifest).length} images déjà en cache`);
  } catch {
    console.log('\nNouveau cache — premier téléchargement');
  }

  const urls = await collectImageUrls();

  let downloaded = 0, skipped = 0, failed = 0;
  const failedUrls = [];

  for (let i = 0; i < urls.length; i++) {
    const url      = urls[i];
    const filename = urlToFilename(url);
    const destPath = path.join(CACHE_DIR, filename);
    const localUrl = `http://localhost:3001/cache/${filename}`;

    const pct = String(Math.round(((i + 1) / urls.length) * 100)).padStart(3);
    process.stdout.write(`[${pct}%] `);

    // Skip if already cached and file has real content
    if (manifest[url] && existsSync(destPath)) {
      try {
        if (statSync(destPath).size > 200) {
          process.stdout.write(`SKIP ${filename}\n`);
          skipped++;
          continue;
        }
      } catch {}
    }

    process.stdout.write(`DL   ${filename} `);
    const ok = await downloadWithRetry(url, destPath);
    if (ok) {
      const size = statSync(destPath).size;
      manifest[url] = localUrl;
      process.stdout.write(`OK (${(size / 1024).toFixed(0)}KB)\n`);
      downloaded++;
    } else {
      process.stdout.write(`ECHEC\n`);
      failedUrls.push(url);
      failed++;
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n================================================');
  console.log(`TOTAL images en cache : ${Object.keys(manifest).length}`);
  console.log(`  Téléchargées        : ${downloaded}`);
  console.log(`  Déjà en cache       : ${skipped}`);
  console.log(`  Échecs              : ${failed}`);
  if (failedUrls.length > 0) {
    console.log('\nURLs en échec :');
    failedUrls.forEach(u => console.log('  ' + u.slice(0, 80)));
  }
  console.log(`\nDossier cache : ${CACHE_DIR}`);
  console.log('\nREDEMARREZ l\'app Twin Pizza — toutes les images seront en LOCAL.\n');
}

main().catch(e => { console.error('Erreur fatale:', e); process.exit(1); });
