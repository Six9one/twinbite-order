/**
 * Migrate ALL data from Supabase → PocketBase
 * Run: node pocketbase/migrate_data.js
 */

const SUPABASE_URL = 'https://hsylnrzxeyqxczdalurj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc';
const PB_URL = 'http://127.0.0.1:8090';
const PB_EMAIL = 'twinpizza2025@gmail.com';
const PB_PASSWORD = 'Twinpizza2025@';

// All tables to migrate (in order to respect dependencies)
const TABLES = [
  'categories',
  'products',
  'delivery_zones',
  'orders',
  'meat_options',
  'sauce_options',
  'garniture_options',
  'supplement_options',
  'crudites_options',
  'drinks',
  'desserts',
  'sandwich_types',
  'product_size_prices',
  'promotions',
  'admin_settings',
  'site_settings',
  'opening_hours',
  'carousel_images',
  'category_images',
  'product_analytics',
  'loyalty_customers',
  'loyalty_transactions',
  'loyalty_rewards',
  'loyalty_points',
  'loyalty_rules',
  'spin_wheel_entries',
  'inventory_categories',
  'inventory_items',
  'supplier_orders',
  'system_status',
  'push_subscriptions',
  'haccp_print_queue',
  'print_jobs',
  'user_roles',
];

// Fields to strip before inserting into PocketBase
const STRIP_FIELDS = ['id', 'created_at', 'updated_at'];

async function fetchSupabase(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    // Table might not exist in Supabase
    if (res.status === 404 || text.includes('does not exist') || text.includes('relation')) {
      return [];
    }
    throw new Error(`Supabase ${table}: ${res.status} ${text}`);
  }
  
  return res.json();
}

async function pbAuth() {
  // Try superuser auth
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  
  if (!res.ok) {
    throw new Error('PocketBase auth failed: ' + await res.text());
  }
  
  const data = await res.json();
  return data.token;
}

async function pbInsert(table, record, token) {
  // Clean the record - remove Supabase system fields
  const clean = {};
  for (const [key, value] of Object.entries(record)) {
    if (STRIP_FIELDS.includes(key)) continue;
    if (value === null || value === undefined) continue;
    clean[key] = value;
  }
  
  const res = await fetch(`${PB_URL}/api/collections/${table}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify(clean),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PB insert ${table}: ${text}`);
  }
  
  return res.json();
}

async function pbGetCount(table, token) {
  const res = await fetch(`${PB_URL}/api/collections/${table}/records?perPage=1`, {
    headers: { 'Authorization': token },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.totalItems || 0;
}

async function main() {
  console.log('='.repeat(50));
  console.log('  SUPABASE → POCKETBASE DATA MIGRATION');
  console.log('='.repeat(50));
  console.log();

  // 1. Auth to PocketBase
  console.log('🔐 Authenticating to PocketBase...');
  const token = await pbAuth();
  console.log('✅ PocketBase authenticated!\n');

  // 2. Migrate each table
  let totalRecords = 0;
  let totalTables = 0;
  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`📥 ${table.padEnd(25)} `);
    
    try {
      // Check if PocketBase already has data
      const existingCount = await pbGetCount(table, token);
      if (existingCount > 0) {
        console.log(`⏭️  Already has ${existingCount} records, skipping`);
        results.push({ table, status: 'skipped', count: existingCount });
        continue;
      }

      // Fetch from Supabase
      const rows = await fetchSupabase(table);
      
      if (rows.length === 0) {
        console.log(`📭 Empty (0 rows)`);
        results.push({ table, status: 'empty', count: 0 });
        continue;
      }

      // Insert into PocketBase
      let inserted = 0;
      let errors = 0;
      for (const row of rows) {
        try {
          await pbInsert(table, row, token);
          inserted++;
        } catch (e) {
          errors++;
          if (errors <= 2) {
            console.log(`\n  ⚠️  Error on row: ${e.message.substring(0, 100)}`);
          }
        }
      }

      totalRecords += inserted;
      totalTables++;
      
      if (errors > 0) {
        console.log(`✅ ${inserted}/${rows.length} rows (${errors} errors)`);
      } else {
        console.log(`✅ ${inserted} rows`);
      }
      results.push({ table, status: 'migrated', count: inserted, errors });
      
    } catch (e) {
      console.log(`❌ Error: ${e.message.substring(0, 80)}`);
      results.push({ table, status: 'error', error: e.message });
    }
  }

  // 3. Summary
  console.log('\n' + '='.repeat(50));
  console.log('  MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Tables migrated: ${totalTables}`);
  console.log(`  Total records:   ${totalRecords}`);
  console.log();
  
  for (const r of results) {
    const icon = r.status === 'migrated' ? '✅' : r.status === 'skipped' ? '⏭️ ' : r.status === 'empty' ? '📭' : '❌';
    const detail = r.status === 'migrated' ? `${r.count} rows${r.errors ? ` (${r.errors} errors)` : ''}` 
                 : r.status === 'skipped' ? `${r.count} existing`
                 : r.status === 'empty' ? 'no data'
                 : r.error?.substring(0, 50);
    console.log(`  ${icon} ${r.table.padEnd(25)} ${detail}`);
  }
  
  console.log('\n🎉 Migration complete!');
  console.log('👉 Check your data at: http://127.0.0.1:8090/_/');
}

main().catch(e => {
  console.error('\n💥 Fatal error:', e.message);
  process.exit(1);
});
