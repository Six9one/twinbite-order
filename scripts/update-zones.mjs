import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hsylnrzxeyqxczdalurj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeWxucnp4ZXlxeGN6ZGFsdXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODIzMDksImV4cCI6MjA4MTQ1ODMwOX0.LmDeLvw6vHO7mjHi2qWeWwIEaNDutZ1spsahUGxEAnc';

const supabase = createClient(supabaseUrl, supabaseKey);

const zoneCoordinates = [
    { pattern: 'Grand-Couronne', latitude: 49.3569, longitude: 1.0024, radius: 1000 },
    { pattern: 'Petit-Couronne', latitude: 49.3815, longitude: 1.0265, radius: 800 },
    { pattern: 'Moulineaux', latitude: 49.3419, longitude: 0.9798, radius: 600 },
];

async function updateZones() {
    console.log('Fetching delivery zones...');

    const { data: zones, error: fetchError } = await supabase
        .from('delivery_zones')
        .select('*');

    if (fetchError) {
        console.error('Error fetching zones:', fetchError);
        return;
    }

    console.log(`Found ${zones.length} zones:`, zones.map(z => z.name));

    for (const zone of zones) {
        const match = zoneCoordinates.find(c =>
            zone.name.toLowerCase().includes(c.pattern.toLowerCase())
        );

        if (match) {
            console.log(`Updating ${zone.name} with coordinates...`);

            const { error: updateError } = await supabase
                .from('delivery_zones')
                .update({
                    latitude: match.latitude,
                    longitude: match.longitude,
                    radius: match.radius
                })
                .eq('id', zone.id);

            if (updateError) {
                console.error(`Error updating ${zone.name}:`, updateError);
            } else {
                console.log(`✅ Updated ${zone.name}: lat=${match.latitude}, lng=${match.longitude}, radius=${match.radius}`);
            }
        } else {
            console.log(`⚠️ No coordinates match for: ${zone.name}`);
        }
    }

    console.log('\nDone! Verifying updated zones...');

    const { data: updatedZones } = await supabase
        .from('delivery_zones')
        .select('name, latitude, longitude, radius');

    console.table(updatedZones);
}

updateZones();
