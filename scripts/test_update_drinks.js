import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
        console.log('Testing update on drinks...');
        const { data, error } = await supabase
            .from('drinks')
            .update({ name: 'Canette au choix Test', price: 2.0 })
            .eq('id', 'f2a538f4-4a55-496a-bac4-f5b6e64480b6')
            .select();

        if (error) {
            console.error('Update failed:', error.message);
        } else {
            console.log('Update succeeded:', data);
        }
    } catch (e) {
        console.error('Execution failed:', e);
    }
}

run();
