
// Script to manually update loyalty points for a client
require('dotenv').config({ path: '../print-server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixClient() {
    const phone = '0761623323';
    const name = 'Client';
    const stampsToAdd = 2; // For 18.00 eur order

    console.log(`Fixing loyalty for ${phone}...`);

    // First, check if client exists
    const { data: existing, error: findError } = await supabase
        .from('loyalty_customers')
        .select('*')
        .eq('phone', phone)
        .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("Error finding client:", findError);
        return;
    }

    let finalPoints = 0;

    if (existing) {
        console.log(`Client found. Current points: ${existing.points}`);
        finalPoints = existing.points + stampsToAdd;

        const { error: updateError } = await supabase
            .from('loyalty_customers')
            .update({
                points: finalPoints,
                updated_at: new Date().toISOString()
            })
            .eq('phone', phone);

        if (updateError) console.error("Update failed:", updateError);
        else console.log(`Updated points to ${finalPoints}`);

    } else {
        console.log("Client not found, creating new record...");
        finalPoints = stampsToAdd;

        const { error: insertError } = await supabase
            .from('loyalty_customers')
            .insert({
                phone: phone,
                name: name,
                points: finalPoints,
                total_orders: 1,
                total_spent: 18.00
            });

        if (insertError) console.error("Insert failed:", insertError);
        else console.log(`Created client with ${finalPoints} points`);
    }
}

fixClient();
