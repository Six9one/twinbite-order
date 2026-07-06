import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file from twinbite-order
const projectDir = '.';
const envPath = path.resolve(projectDir, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
        }
        env[match[1]] = val.trim();
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const tables = [
    { name: 'products', priceField: 'base_price', nameField: 'name' },
    { name: 'product_size_prices', priceField: 'price', nameField: 'size_label' },
    { name: 'sandwich_types', priceField: 'base_price', nameField: 'name' },
    { name: 'meat_options', priceField: 'price', nameField: 'name' },
    { name: 'sauce_options', priceField: 'price', nameField: 'name' },
    { name: 'garniture_options', priceField: 'price', nameField: 'name' },
    { name: 'supplement_options', priceField: 'price', nameField: 'name' },
    { name: 'crudites_options', priceField: 'price', nameField: 'name' },
    { name: 'drinks', priceField: 'price', nameField: 'name' },
    { name: 'desserts', priceField: 'price', nameField: 'name' },
    { name: 'delivery_zones', priceField: 'delivery_fee', nameField: 'name' },
];

async function run() {
    try {
        for (const t of tables) {
            console.log(`\n--- Table: ${t.name} ---`);
            const { data, error } = await supabase
                .from(t.name)
                .select('*');
            
            if (error) {
                console.log(`Error querying ${t.name}:`, error.message);
                continue;
            }

            console.log(`Count: ${data?.length}`);
            if (data && data.length > 0) {
                data.forEach(item => {
                    const price = item[t.priceField];
                    const name = item[t.nameField] || item.name || item.size_label || item.id;
                    let extra = '';
                    if (t.name === 'product_size_prices') {
                        extra = `(product_type: ${item.product_type})`;
                    }
                    console.log(`- [${item.id}] ${name} ${extra}: ${price}€ (active: ${item.is_active !== undefined ? item.is_active : 'N/A'})`);
                });
            } else {
                console.log('No rows');
            }
        }
    } catch (e) {
        console.error('Error executing query:', e);
    }
}

run();
