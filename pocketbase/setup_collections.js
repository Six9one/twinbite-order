/**
 * PocketBase Collection Setup Script
 * Run: node setup_collections.js <admin_email> <admin_password>
 * 
 * This creates all collections needed for the TwinPizza app.
 */

const PB_URL = 'http://127.0.0.1:8090';

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = token;
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${PB_URL}${path}`, opts);
  const text = await res.text();
  
  if (!res.ok) {
    // If collection already exists, skip it
    if (text.includes('already exists') || text.includes('unique constraint')) {
      return { skipped: true };
    }
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  
  return text ? JSON.parse(text) : {};
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.log('Usage: node setup_collections.js <admin_email> <admin_password>');
    console.log('Example: node setup_collections.js admin@twinpizza.fr MyPassword123');
    process.exit(1);
  }

  // 1. Auth as superuser
  console.log('🔐 Authenticating as superuser...');
  let token;
  try {
    const auth = await api('/api/admins/auth-with-password', 'POST', { identity: email, password });
    token = auth.token;
  } catch (e) {
    // Try the newer PocketBase v0.23+ endpoint
    try {
      const auth = await api('/api/collections/_superusers/auth-with-password', 'POST', { identity: email, password });
      token = auth.token;
    } catch (e2) {
      console.error('❌ Could not authenticate. Make sure you created a superuser first.');
      console.error('   Go to: http://127.0.0.1:8090/_/');
      console.error('   Error:', e2.message);
      process.exit(1);
    }
  }
  console.log('✅ Authenticated!');

  // 2. Define all collections
  const collections = [
    {
      name: 'categories',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'products',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'base_price', type: 'number', required: true },
        { name: 'pizza_base', type: 'text' },
        { name: 'category_id', type: 'text' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'delivery_zones',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'min_order', type: 'number' },
        { name: 'delivery_fee', type: 'number' },
        { name: 'estimated_time', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'color', type: 'text' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'radius', type: 'number' },
        { name: 'zone_type', type: 'text' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'orders',
      type: 'base',
      schema: [
        { name: 'order_number', type: 'text', required: true },
        { name: 'order_type', type: 'select', required: true, options: { values: ['emporter', 'livraison', 'surplace'] } },
        { name: 'status', type: 'select', required: true, options: { values: ['pending', 'preparing', 'ready', 'completed', 'cancelled'] } },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'customer_phone', type: 'text', required: true },
        { name: 'customer_address', type: 'text' },
        { name: 'customer_notes', type: 'text' },
        { name: 'delivery_zone_id', type: 'text' },
        { name: 'items', type: 'json', required: true },
        { name: 'subtotal', type: 'number', required: true },
        { name: 'tva', type: 'number', required: true },
        { name: 'delivery_fee', type: 'number' },
        { name: 'total', type: 'number', required: true },
        { name: 'payment_method', type: 'select', required: true, options: { values: ['cb', 'especes', 'en_ligne'] } },
        { name: 'is_scheduled', type: 'bool' },
        { name: 'scheduled_for', type: 'date' },
      ],
      listRule: '', viewRule: '',
      createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'meat_options',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'sauce_options',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'garniture_options',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'supplement_options',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'crudites_options',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'drinks',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'desserts',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'sandwich_types',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'base_price', type: 'number' },
        { name: 'image_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'product_size_prices',
      type: 'base',
      schema: [
        { name: 'product_type', type: 'text', required: true },
        { name: 'size_id', type: 'text', required: true },
        { name: 'size_label', type: 'text', required: true },
        { name: 'max_meats', type: 'number' },
        { name: 'price', type: 'number' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'promotions',
      type: 'base',
      schema: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'promo_type', type: 'text' },
        { name: 'discount_percent', type: 'number' },
        { name: 'buy_quantity', type: 'number' },
        { name: 'get_quantity', type: 'number' },
        { name: 'free_item_name', type: 'text' },
        { name: 'cart_min_amount', type: 'number' },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'admin_settings',
      type: 'base',
      schema: [
        { name: 'setting_key', type: 'text', required: true },
        { name: 'setting_value', type: 'json' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'site_settings',
      type: 'base',
      schema: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'opening_hours',
      type: 'base',
      schema: [
        { name: 'day_of_week', type: 'number', required: true },
        { name: 'day_name', type: 'text', required: true },
        { name: 'is_open', type: 'bool' },
        { name: 'morning_open', type: 'text' },
        { name: 'morning_close', type: 'text' },
        { name: 'evening_open', type: 'text' },
        { name: 'evening_close', type: 'text' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'carousel_images',
      type: 'base',
      schema: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'image_url', type: 'text' },
        { name: 'link_url', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'category_images',
      type: 'base',
      schema: [
        { name: 'category_slug', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'emoji_fallback', type: 'text' },
        { name: 'display_name', type: 'text' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'product_analytics',
      type: 'base',
      schema: [
        { name: 'product_id', type: 'text' },
        { name: 'product_name', type: 'text', required: true },
        { name: 'category_slug', type: 'text' },
        { name: 'action_type', type: 'text', required: true },
        { name: 'session_id', type: 'text' },
        { name: 'device_type', type: 'text' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'loyalty_customers',
      type: 'base',
      schema: [
        { name: 'phone', type: 'text', required: true },
        { name: 'name', type: 'text' },
        { name: 'points', type: 'number' },
        { name: 'stamps', type: 'number' },
        { name: 'total_stamps', type: 'number' },
        { name: 'free_items_available', type: 'number' },
        { name: 'pizza_credits_available', type: 'number' },
        { name: 'total_spent', type: 'number' },
        { name: 'total_orders', type: 'number' },
        { name: 'first_order_done', type: 'bool' },
        { name: 'last_order_at', type: 'date' },
      ],
      listRule: '', viewRule: '',
      createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'loyalty_transactions',
      type: 'base',
      schema: [
        { name: 'customer_id', type: 'text' },
        { name: 'type', type: 'select', options: { values: ['earn', 'redeem'] } },
        { name: 'points', type: 'number' },
        { name: 'description', type: 'text' },
        { name: 'order_id', type: 'text' },
      ],
      listRule: '', viewRule: '',
      createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'loyalty_rewards',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'points_cost', type: 'number', required: true },
        { name: 'type', type: 'select', options: { values: ['free_item', 'discount', 'percentage'] } },
        { name: 'value', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'loyalty_points',
      type: 'base',
      schema: [
        { name: 'customer_phone', type: 'text', required: true },
        { name: 'customer_name', type: 'text' },
        { name: 'total_points', type: 'number' },
        { name: 'total_purchases', type: 'number' },
        { name: 'soufflet_count', type: 'number' },
        { name: 'pizza_count', type: 'number' },
        { name: 'texmex_count', type: 'number' },
        { name: 'free_items_redeemed', type: 'number' },
        { name: 'pending_rewards', type: 'json' },
        { name: 'last_order_at', type: 'date' },
      ],
      listRule: '', viewRule: '',
      createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'loyalty_rules',
      type: 'base',
      schema: [
        { name: 'rule_name', type: 'text' },
        { name: 'product_type', type: 'text' },
        { name: 'points_required', type: 'number' },
        { name: 'reward_type', type: 'text' },
        { name: 'reward_value', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'description', type: 'text' },
      ],
      listRule: '', viewRule: '',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'spin_wheel_entries',
      type: 'base',
      schema: [
        { name: 'client_name', type: 'text' },
        { name: 'prize', type: 'text' },
        { name: 'prize_code', type: 'text' },
        { name: 'device_fingerprint', type: 'text' },
        { name: 'expires_at', type: 'date' },
        { name: 'reviewed', type: 'bool' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'inventory_categories',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'inventory_items',
      type: 'base',
      schema: [
        { name: 'category_id', type: 'text' },
        { name: 'name', type: 'text', required: true },
        { name: 'unit', type: 'text' },
        { name: 'current_stock', type: 'number' },
        { name: 'min_stock', type: 'number' },
        { name: 'max_stock', type: 'number' },
        { name: 'last_price', type: 'number' },
        { name: 'supplier_name', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'display_order', type: 'number' },
        { name: 'notes', type: 'text' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'supplier_orders',
      type: 'base',
      schema: [
        { name: 'items', type: 'json' },
        { name: 'supplier_name', type: 'text' },
        { name: 'supplier_phone', type: 'text' },
        { name: 'total_items', type: 'number' },
        { name: 'sent_via', type: 'text' },
        { name: 'status', type: 'select', options: { values: ['draft', 'sent', 'received'] } },
        { name: 'sent_at', type: 'date' },
        { name: 'created_by', type: 'text' },
        { name: 'notes', type: 'text' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'system_status',
      type: 'base',
      schema: [
        { name: 'server_name', type: 'text', required: true },
        { name: 'is_online', type: 'bool' },
        { name: 'last_heartbeat', type: 'date' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'push_subscriptions',
      type: 'base',
      schema: [
        { name: 'endpoint', type: 'text', required: true },
        { name: 'keys', type: 'json' },
        { name: 'user_agent', type: 'text' },
        { name: 'device_name', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'last_used_at', type: 'date' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '', updateRule: '', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'haccp_print_queue',
      type: 'base',
      schema: [
        { name: 'product_name', type: 'text' },
        { name: 'category_name', type: 'text' },
        { name: 'category_color', type: 'text' },
        { name: 'action_date', type: 'text' },
        { name: 'dlc_date', type: 'text' },
        { name: 'storage_temp', type: 'text' },
        { name: 'operator', type: 'text' },
        { name: 'dlc_hours', type: 'number' },
        { name: 'action_label', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'status', type: 'select', options: { values: ['pending', 'printing', 'printed', 'error'] } },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'print_jobs',
      type: 'base',
      schema: [
        { name: 'order_id', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'attempts', type: 'number' },
        { name: 'error', type: 'text' },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'user_roles',
      type: 'base',
      schema: [
        { name: 'user_id', type: 'text', required: true },
        { name: 'role', type: 'select', required: true, options: { values: ['admin', 'staff'] } },
      ],
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
    },
  ];

  // 3. Create each collection
  console.log(`\n📦 Creating ${collections.length} collections...\n`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const col of collections) {
    try {
      const result = await api('/api/collections', 'POST', col, token);
      if (result.skipped) {
        console.log(`  ⏭️  ${col.name} (already exists)`);
        skipped++;
      } else {
        console.log(`  ✅ ${col.name}`);
        created++;
      }
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('unique')) {
        console.log(`  ⏭️  ${col.name} (already exists)`);
        skipped++;
      } else {
        console.log(`  ❌ ${col.name}: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\n🎉 Done! Created: ${created} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log('\n👉 Next: Open http://127.0.0.1:8090/_/ to see your collections');
}

main().catch(console.error);
