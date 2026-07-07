/**
 * Twin Pizza — Image Cache Downloader
 * ------------------------------------
 * Downloads ALL product images from Supabase to print-server/image-cache/
 * The print server then serves them at http://localhost:3001/cache/<filename>
 * The POS app resolves all image URLs to local first, remote as fallback.
 *
 * Usage: node scripts/cache-images.mjs
 * Or just double-click:  TELECHARGER_IMAGES.bat
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

// Load env from root .env
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL  = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY  = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const CACHE_DIR     = path.join(__dirname, '..', 'print-server', 'image-cache');
const MANIFEST_PATH = path.join(CACHE_DIR, 'manifest.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('MANQUE VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY dans .env');
  process.exit(1);
}

if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Dossier cache cree:', CACHE_DIR);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

function urlToFilename(url) {
  const hash    = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  const ext     = url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg','jpeg','png','webp','gif','svg'].includes(ext) ? ext : 'jpg';
  return `${hash}.${safeExt}`;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 20000 }, (res) => {
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
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return false;
}

// ── Collect all image URLs from Supabase ───────────────────────────────────

async function collectImageUrls() {
  const urls = new Set();

  const tables = ['products', 'drinks', 'texmex_products', 'wizard_images', 'category_images'];
  for (const table of tables) {
    try {
      const { data } = await supabase.from(table).select('image_url');
      (data || []).forEach(r => r.image_url && urls.add(r.image_url));
    } catch {}
  }

  return [...urls].filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n================================================');
  console.log('  Twin Pizza -- Telechargement Images Locales');
  console.log('================================================\n');

  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
    console.log(`Manifest existant: ${Object.keys(manifest).length} images en cache\n`);
  } catch {
    console.log('Nouveau cache - telechargement de toutes les images\n');
  }

  console.log('Scan Supabase pour les URLs images...');
  const urls = await collectImageUrls();
  console.log(`Trouve: ${urls.length} images uniques\n`);

  let downloaded = 0, skipped = 0, failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url      = urls[i];
    const filename = urlToFilename(url);
    const destPath = path.join(CACHE_DIR, filename);
    const localUrl = `http://localhost:3001/cache/${filename}`;

    process.stdout.write(`[${i + 1}/${urls.length}] `);

    if (manifest[url] && existsSync(destPath) && statSync(destPath).size > 100) {
      process.stdout.write(`SKIP  ${filename}\n`);
      skipped++;
      continue;
    }

    process.stdout.write(`DL    ${filename} ... `);
    const ok = await downloadWithRetry(url, destPath);
    if (ok) {
      manifest[url] = localUrl;
      process.stdout.write('OK\n');
      downloaded++;
    } else {
      process.stdout.write('ECHEC\n');
      failed++;
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n================================================');
  console.log(`OK Telecharges : ${downloaded}`);
  console.log(`-- Deja en cache: ${skipped}`);
  console.log(`XX Echecs      : ${failed}`);
  console.log(`TOTAL en cache : ${Object.keys(manifest).length} images`);
  console.log(`Dossier        : ${CACHE_DIR}`);
  console.log('\nREDEMARREZ l application Twin Pizza pour utiliser les images locales.\n');
}

main().catch(e => { console.error('Erreur fatale:', e); process.exit(1); });
