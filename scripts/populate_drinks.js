import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file from the twinbite-order folder
const envPath = 'C:/Users/Mouuuh/OneDrive/Desktop/Nouveau dossier/twinbite-order/.env';
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

async function run() {
    try {
        console.log('Clearing existing drinks from database...');
        // First delete all rows in drinks table
        const { error: deleteError } = await supabase
            .from('drinks')
            .delete()
            .neq('name', 'CLEAR_ALL_UNCONDITIONAL_DELETE'); // Delete all

        if (deleteError) {
            console.error('Error deleting old drinks:', deleteError.message);
            return;
        }

        const newDrinks = [
            { id: 'ca7e77e0-0000-4000-a000-000000000001', name: 'Canette au choix', price: 2.0, is_active: true, display_order: 1 },
            { id: 'ca7e77e0-0000-4000-a000-000000000002', name: 'Grande Bouteille', price: 3.5, is_active: true, display_order: 2 },
            { id: 'ca7e77e0-0000-4000-a000-000000000003', name: 'Eau Mini (50cl)', price: 1.5, is_active: true, display_order: 3 },
            { id: 'ca7e77e0-0000-4000-a000-000000000004', name: 'Eau Grand (1.5L)', price: 1.5, is_active: true, display_order: 4 },
        ];

        console.log('Inserting unified drinks...');
        const { data, error: insertError } = await supabase
            .from('drinks')
            .insert(newDrinks);

        if (insertError) {
            console.error('Error inserting new drinks:', insertError.message);
            return;
        }

        console.log('Drinks table successfully updated with unified 4-category model!');
    } catch (e) {
        console.error('Execution failed:', e);
    }
}

run();
