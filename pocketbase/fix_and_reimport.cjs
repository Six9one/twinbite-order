/**
 * Fix PocketBase collections (add missing fields) + Re-import all data
 * PocketBase v0.23+ uses "fields" not "schema"
 */

const fs = require('fs');
const path = require('path');

const PB_URL = 'http://127.0.0.1:8090';
const PB_EMAIL = 'twinpizza2025@gmail.com';
const PB_PASSWORD = 'Twinpizza2025@';
const EXPORT_DIR = path.join(__dirname, 'export');

// ========== AUTH ==========
async function pbAuth() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  if (!res.ok) throw new Error('Auth failed: ' + await res.text());
  return (await res.json()).token;
}

// ========== HELPERS ==========
function textField(name, opts = {}) {
  return { name, type: 'text', hidden: false, required: !!opts.required, ...(opts.max ? { max: opts.max } : {}) };
}
function numberField(name, opts = {}) {
  return { name, type: 'number', hidden: false, required: !!opts.required, min: opts.min, max: opts.max };
}
function boolField(name) {
  return { name, type: 'bool', hidden: false };
}
function dateField(name) {
  return { name, type: 'date', hidden: false };
}
function jsonField(name, opts = {}) {
  return { name, type: 'json', hidden: false, required: !!opts.required };
}
function selectField(name, values, opts = {}) {
  return { name, type: 'select', hidden: false, required: !!opts.required, values, maxSelect: 1 };
}

// ========== COLLECTION DEFINITIONS ==========
const COLLECTIONS = {
  categories: {
    fields: [
      textField('name', { required: true }),
      textField('slug', { required: true }),
      numberField('display_order'),
      boolField('is_active'),
    ],
    listRule: '', viewRule: '',
    createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  products: {
    fields: [
      textField('name', { required: true }),
      textField('description'),
      numberField('base_price', { required: true }),
      textField('pizza_base'),
      textField('category_id'),
      textField('image_url'),
      numberField('display_order'),
      boolField('is_active'),
      textField('pizza_base_special'),
      boolField('is_top_picked'),
      textField('image_fit'),
      numberField('image_zoom'),
    ],
    listRule: '', viewRule: '',
    createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  delivery_zones: {
    fields: [
      textField('name', { required: true }),
      numberField('min_order'),
      numberField('delivery_fee'),
      textField('estimated_time'),
      boolField('is_active'),
      textField('color'),
      numberField('latitude'),
      numberField('longitude'),
      numberField('radius'),
      textField('zone_type'),
    ],
    listRule: '', viewRule: '',
    createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  orders: {
    fields: [
      textField('order_number', { required: true }),
      selectField('order_type', ['emporter', 'livraison', 'surplace'], { required: true }),
      selectField('status', ['pending', 'preparing', 'ready', 'completed', 'cancelled'], { required: true }),
      textField('customer_name', { required: true }),
      textField('customer_phone', { required: true }),
      textField('customer_address'),
      textField('customer_notes'),
      textField('delivery_zone_id'),
      jsonField('items', { required: true }),
      numberField('subtotal', { required: true }),
      numberField('tva', { required: true }),
      numberField('delivery_fee'),
      numberField('total', { required: true }),
      selectField('payment_method', ['cb', 'especes', 'en_ligne'], { required: true }),
      boolField('is_scheduled'),
      dateField('scheduled_for'),
    ],
    listRule: '', viewRule: '',
    createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  meat_options: {
    fields: [ textField('name', { required: true }), numberField('price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  sauce_options: {
    fields: [ textField('name', { required: true }), numberField('price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  garniture_options: {
    fields: [ textField('name', { required: true }), numberField('price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  supplement_options: {
    fields: [ textField('name', { required: true }), numberField('price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  crudites_options: {
    fields: [ textField('name', { required: true }), numberField('price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  drinks: {
    fields: [ textField('name', { required: true }), numberField('price', { required: true }), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  desserts: {
    fields: [ textField('name', { required: true }), numberField('price', { required: true }), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  sandwich_types: {
    fields: [ textField('name', { required: true }), textField('description'), numberField('base_price'), textField('image_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  product_size_prices: {
    fields: [ textField('product_type', { required: true }), textField('size_id', { required: true }), textField('size_label', { required: true }), numberField('max_meats'), numberField('price'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  promotions: {
    fields: [ textField('title', { required: true }), textField('description'), textField('promo_type'), numberField('discount_percent'), numberField('buy_quantity'), numberField('get_quantity'), textField('free_item_name'), numberField('cart_min_amount'), dateField('start_date'), dateField('end_date'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  admin_settings: {
    fields: [ textField('setting_key', { required: true }), jsonField('setting_value') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  site_settings: {
    fields: [ textField('key', { required: true }), textField('value') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  opening_hours: {
    fields: [ numberField('day_of_week', { required: true }), textField('day_name', { required: true }), boolField('is_open'), textField('morning_open'), textField('morning_close'), textField('evening_open'), textField('evening_close') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  carousel_images: {
    fields: [ textField('title'), textField('description'), textField('image_url'), textField('link_url'), numberField('display_order'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  category_images: {
    fields: [ textField('category_slug', { required: true }), textField('image_url'), textField('emoji_fallback'), textField('display_name'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  product_analytics: {
    fields: [ textField('product_id'), textField('product_name', { required: true }), textField('category_slug'), textField('action_type', { required: true }), textField('session_id'), textField('device_type') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  loyalty_customers: {
    fields: [ textField('phone', { required: true }), textField('name'), numberField('points'), numberField('stamps'), numberField('total_stamps'), numberField('free_items_available'), numberField('pizza_credits_available'), numberField('total_spent'), numberField('total_orders'), boolField('first_order_done'), dateField('last_order_at') ],
    listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
  },
  loyalty_transactions: {
    fields: [ textField('customer_id'), selectField('type', ['earn', 'redeem']), numberField('points'), textField('description'), textField('order_id') ],
    listRule: '', viewRule: '', createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  loyalty_rewards: {
    fields: [ textField('name', { required: true }), textField('description'), numberField('points_cost', { required: true }), selectField('type', ['free_item', 'discount', 'percentage']), numberField('value'), boolField('is_active') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  loyalty_points: {
    fields: [ textField('customer_phone', { required: true }), textField('customer_name'), numberField('total_points'), numberField('total_purchases'), numberField('soufflet_count'), numberField('pizza_count'), numberField('texmex_count'), numberField('free_items_redeemed'), jsonField('pending_rewards'), dateField('last_order_at') ],
    listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
  },
  loyalty_rules: {
    fields: [ textField('rule_name'), textField('product_type'), numberField('points_required'), textField('reward_type'), numberField('reward_value'), boolField('is_active'), textField('description') ],
    listRule: '', viewRule: '', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  spin_wheel_entries: {
    fields: [ textField('client_name'), textField('prize'), textField('prize_code'), textField('device_fingerprint'), dateField('expires_at'), boolField('reviewed') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  inventory_categories: {
    fields: [ textField('name', { required: true }), textField('slug', { required: true }), textField('color'), textField('icon'), numberField('display_order'), boolField('is_active') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  inventory_items: {
    fields: [ textField('category_id'), textField('name', { required: true }), textField('unit'), numberField('current_stock'), numberField('min_stock'), numberField('max_stock'), numberField('last_price'), textField('supplier_name'), boolField('is_active'), numberField('display_order'), textField('notes') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  supplier_orders: {
    fields: [ jsonField('items'), textField('supplier_name'), textField('supplier_phone'), numberField('total_items'), textField('sent_via'), selectField('status', ['draft', 'sent', 'received']), dateField('sent_at'), textField('created_by'), textField('notes') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  system_status: {
    fields: [ textField('server_name', { required: true }), boolField('is_online'), dateField('last_heartbeat') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
  },
  push_subscriptions: {
    fields: [ textField('endpoint', { required: true }), jsonField('keys'), textField('user_agent'), textField('device_name'), boolField('is_active'), dateField('last_used_at') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
  },
  haccp_print_queue: {
    fields: [ textField('product_name'), textField('category_name'), textField('category_color'), textField('action_date'), textField('dlc_date'), textField('storage_temp'), textField('operator'), numberField('dlc_hours'), textField('action_label'), textField('notes'), selectField('status', ['pending', 'printing', 'printed', 'error']) ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  print_jobs: {
    fields: [ textField('order_id'), textField('status'), numberField('attempts'), textField('error') ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
  user_roles: {
    fields: [ textField('user_id', { required: true }), selectField('role', ['admin', 'staff'], { required: true }) ],
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""', createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
  },
};

// ========== CSV PARSER ==========
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (!vals.length) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let v = vals[j] || '';
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (v === '' || v === 'null' || v === 'NULL') v = null;
      row[headers[j]] = v;
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

function getCollectionName(filename) {
  return filename.replace(/_rows(\(\d+\))?\.csv$/i, '').trim();
}

const STRIP_FIELDS = ['id', 'created_at', 'updated_at'];

function cleanRecord(record) {
  const clean = {};
  for (const [k, v] of Object.entries(record)) {
    if (STRIP_FIELDS.includes(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { clean[k] = JSON.parse(v); continue; } catch {}
    }
    clean[k] = v;
  }
  return clean;
}

// ========== MAIN ==========
async function main() {
  console.log('='.repeat(55));
  console.log('  FIX COLLECTIONS + RE-IMPORT ALL DATA');
  console.log('='.repeat(55));
  console.log();

  const token = await pbAuth();
  console.log('✅ Authenticated!\n');

  // STEP 1: Delete all existing collections (except system ones)
  console.log('🗑️  Deleting old collections...');
  for (const name of Object.keys(COLLECTIONS)) {
    try {
      // Get collection ID
      const res = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const col = await res.json();
        // Delete all records first
        try {
          const recsRes = await fetch(`${PB_URL}/api/collections/${name}/records?perPage=500`, {
            headers: { Authorization: token },
          });
          if (recsRes.ok) {
            const recs = await recsRes.json();
            for (const rec of recs.items || []) {
              await fetch(`${PB_URL}/api/collections/${name}/records/${rec.id}`, {
                method: 'DELETE', headers: { Authorization: token },
              });
            }
            // Handle pagination for large collections
            if (recs.totalPages > 1) {
              for (let p = 2; p <= recs.totalPages; p++) {
                const pgRes = await fetch(`${PB_URL}/api/collections/${name}/records?perPage=500&page=${p}`, {
                  headers: { Authorization: token },
                });
                if (pgRes.ok) {
                  const pgRecs = await pgRes.json();
                  for (const rec of pgRecs.items || []) {
                    await fetch(`${PB_URL}/api/collections/${name}/records/${rec.id}`, {
                      method: 'DELETE', headers: { Authorization: token },
                    });
                  }
                }
              }
            }
          }
        } catch {}
        
        // Delete collection
        const delRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
          method: 'DELETE', headers: { Authorization: token },
        });
        if (delRes.ok) console.log(`  ✅ Deleted ${name}`);
        else console.log(`  ⚠️  Could not delete ${name}: ${await delRes.text()}`);
      }
    } catch {}
  }

  // STEP 2: Re-create collections with proper fields
  console.log('\n📦 Creating collections with proper fields...');
  for (const [name, def] of Object.entries(COLLECTIONS)) {
    try {
      const body = {
        name,
        type: 'base',
        fields: def.fields,
        listRule: def.listRule,
        viewRule: def.viewRule,
        createRule: def.createRule,
        updateRule: def.updateRule,
        deleteRule: def.deleteRule,
      };

      const res = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log(`  ✅ ${name}`);
      } else {
        const err = await res.text();
        console.log(`  ❌ ${name}: ${err.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
    }
  }

  // STEP 3: Import CSV data
  console.log('\n📥 Importing CSV data...');
  const files = fs.readdirSync(EXPORT_DIR).filter(f => f.endsWith('.csv'));
  const seenCollections = new Set();
  const sortedFiles = files.sort((a, b) => a.length - b.length);
  const filesToProcess = [];
  for (const file of sortedFiles) {
    const col = getCollectionName(file);
    if (!seenCollections.has(col)) {
      seenCollections.add(col);
      filesToProcess.push({ file, collection: col });
    }
  }

  let totalImported = 0;
  for (const { file, collection } of filesToProcess) {
    process.stdout.write(`  📥 ${collection.padEnd(28)} `);

    // Check if collection exists
    const checkRes = await fetch(`${PB_URL}/api/collections/${collection}/records?perPage=1`, {
      headers: { Authorization: token },
    });
    if (!checkRes.ok) {
      console.log(`⚠️  Collection not found`);
      continue;
    }

    const csvText = fs.readFileSync(path.join(EXPORT_DIR, file), 'utf-8');
    const rows = parseCSV(csvText);
    if (!rows.length) { console.log('📭 Empty'); continue; }

    let inserted = 0, errors = 0;
    for (const row of rows) {
      const cleaned = cleanRecord(row);
      try {
        const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(cleaned),
        });
        if (res.ok) inserted++;
        else {
          errors++;
          if (errors <= 1) {
            const errText = await res.text();
            console.log(`\n    ⚠️  ${errText.substring(0, 120)}`);
          }
        }
      } catch (e) {
        errors++;
      }
    }

    totalImported += inserted;
    console.log(`✅ ${inserted}/${rows.length}${errors ? ` (${errors} err)` : ''}`);
  }

  console.log(`\n🎉 Done! Total imported: ${totalImported}`);
  console.log('👉 Check: http://127.0.0.1:8090/_/');
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
