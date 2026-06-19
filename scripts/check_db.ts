import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
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
        console.log('Querying opening hours...');
        const { data, error } = await supabase
            .from('opening_hours' as any)
            .select('*')
            .order('day_of_week');

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Opening Hours:');
            data.forEach((row: any) => {
                console.log(`Day ${row.day_of_week}: ${row.is_open ? 'Open' : 'CLOSED'}`);
            });
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
