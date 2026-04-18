/**
 * Import ALL CSV files from pocketbase/export/ into PocketBase
 * Run: node pocketbase/import_csv.js
 */

const fs = require('fs');
const path = require('path');

const PB_URL = 'http://127.0.0.1:8090';
const PB_EMAIL = 'twinpizza2025@gmail.com';
const PB_PASSWORD = 'Twinpizza2025@';
const EXPORT_DIR = path.join(__dirname, 'export');

// Map CSV filenames to PocketBase collection names
function getCollectionName(filename) {
  // e.g. "categories_rows.csv" -> "categories"
  // e.g. "loyalty_rules_rows(1).csv" -> "loyalty_rules"
  return filename
    .replace(/_rows(\(\d+\))?\.csv$/i, '')
    .trim();
}

// Simple CSV parser that handles quoted fields with commas
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[j] || '';
      
      // Convert types
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '' || val === 'null' || val === 'NULL') val = null;
      
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Fields to strip (Supabase system fields that PocketBase handles automatically)
const STRIP_FIELDS = ['id', 'created_at', 'updated_at'];

function cleanRecord(record, collectionName) {
  const clean = {};
  for (const [key, value] of Object.entries(record)) {
    if (STRIP_FIELDS.includes(key)) continue;
    if (value === null || value === undefined) continue;
    
    // Handle JSON fields - try to parse stringified JSON
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        clean[key] = JSON.parse(value);
        continue;
      } catch {}
    }
    
    clean[key] = value;
  }
  return clean;
}

async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  if (!res.ok) throw new Error('Auth failed: ' + await res.text());
  return (await res.json()).token;
}

async function pbInsert(collection, record, token) {
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.substring(0, 200));
  }
  return res.json();
}

async function pbGetCount(collection, token) {
  try {
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records?perPage=1`, {
      headers: { 'Authorization': token },
    });
    if (!res.ok) return -1;
    return (await res.json()).totalItems || 0;
  } catch { return -1; }
}

async function main() {
  console.log('='.repeat(55));
  console.log('  CSV → POCKETBASE IMPORT');
  console.log('='.repeat(55));
  console.log();

  // Auth
  console.log('🔐 Authenticating...');
  const token = await pbAuth();
  console.log('✅ Authenticated!\n');

  // Get all CSV files
  const files = fs.readdirSync(EXPORT_DIR).filter(f => f.endsWith('.csv'));
  console.log(`📂 Found ${files.length} CSV files\n`);

  // Skip duplicates (e.g. loyalty_rules_rows.csv and loyalty_rules_rows(1).csv)
  const seenCollections = new Set();
  const filesToProcess = [];
  
  // Prefer files without (1), (2) etc.
  const sortedFiles = files.sort((a, b) => a.length - b.length);
  for (const file of sortedFiles) {
    const col = getCollectionName(file);
    if (!seenCollections.has(col)) {
      seenCollections.add(col);
      filesToProcess.push({ file, collection: col });
    }
  }

  let totalImported = 0;
  const results = [];

  for (const { file, collection } of filesToProcess) {
    process.stdout.write(`📥 ${collection.padEnd(28)} `);

    // Check if collection exists and already has data
    const existing = await pbGetCount(collection, token);
    if (existing === -1) {
      console.log(`⚠️  Collection not found, skipping`);
      results.push({ collection, status: 'no_collection' });
      continue;
    }
    if (existing > 0) {
      console.log(`⏭️  Already has ${existing} records`);
      results.push({ collection, status: 'skipped', count: existing });
      continue;
    }

    // Read and parse CSV
    const csvText = fs.readFileSync(path.join(EXPORT_DIR, file), 'utf-8');
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      console.log(`📭 Empty`);
      results.push({ collection, status: 'empty' });
      continue;
    }

    // Insert records
    let inserted = 0;
    let errors = 0;
    const errorMsgs = [];

    for (const row of rows) {
      const cleaned = cleanRecord(row, collection);
      try {
        await pbInsert(collection, cleaned, token);
        inserted++;
      } catch (e) {
        errors++;
        if (errorMsgs.length < 2) errorMsgs.push(e.message.substring(0, 100));
      }
    }

    totalImported += inserted;

    if (errors > 0) {
      console.log(`✅ ${inserted}/${rows.length} (${errors} errors)`);
      for (const msg of errorMsgs) {
        console.log(`      ⚠️  ${msg}`);
      }
    } else {
      console.log(`✅ ${inserted} rows`);
    }
    results.push({ collection, status: 'imported', count: inserted, errors });
  }

  // Summary
  console.log('\n' + '='.repeat(55));
  console.log('  IMPORT SUMMARY');
  console.log('='.repeat(55));
  console.log(`  Total records imported: ${totalImported}`);
  console.log();

  for (const r of results) {
    const icon = r.status === 'imported' ? '✅' :
                 r.status === 'skipped' ? '⏭️ ' :
                 r.status === 'empty' ? '📭' :
                 r.status === 'no_collection' ? '⚠️ ' : '❌';
    const detail = r.status === 'imported' ? `${r.count} rows${r.errors ? ` (${r.errors} err)` : ''}` :
                   r.status === 'skipped' ? `${r.count} existing` :
                   r.status === 'empty' ? 'no data' :
                   r.status === 'no_collection' ? 'collection missing' : '?';
    console.log(`  ${icon} ${r.collection.padEnd(28)} ${detail}`);
  }

  console.log('\n🎉 All done! Check http://127.0.0.1:8090/_/');
}

main().catch(e => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
