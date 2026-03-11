import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env directly
const envPath = path.resolve('C:\\Users\\Twin Pizza\\Desktop\\twinbite-order\\.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].replace(/"/g, '').trim();
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].replace(/"/g, '').trim();
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    try {
        console.log('Fetching last order...');
        const { data: latestOrder, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError) {
            console.error('Error fetching order:', fetchError);
            return;
        }

        if (!latestOrder) {
            console.log('No orders found.');
            return;
        }

        console.log(`Found last order: #${latestOrder.order_number} (ID: ${latestOrder.id})`);
        console.log(`Current date: ${latestOrder.created_at}`);

        const targetDate = '2026-03-04T18:45:00+01:00';
        console.log(`Updating date to: ${targetDate}`);

        const { data: updated, error: updateError } = await supabase
            .from('orders')
            .update({ created_at: targetDate })
            .eq('id', latestOrder.id)
            .select();

        if (updateError) {
            console.error('Error updating order:', updateError);
            return;
        }

        console.log('Successfully updated order:');
        console.log(updated[0]);
    } catch (err) {
        console.error('Exception:', err);
    }
}

run();
