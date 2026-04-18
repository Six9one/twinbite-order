/**
 * Fix opening_hours import (different column names in Supabase vs PocketBase)
 * + Stop print server Supabase dependency
 */
const PB_URL = 'http://127.0.0.1:8090';
const PB_EMAIL = 'twinpizza2025@gmail.com';
const PB_PASSWORD = 'Twinpizza2025@';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

async function main() {
  // Auth
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASSWORD }),
  });
  const token = (await authRes.json()).token;
  console.log('✅ Authenticated');

  // Opening hours data from Supabase CSV
  const hours = [
    { day_of_week: 0, is_open: false, morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 1, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 2, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 3, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 4, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 5, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
    { day_of_week: 6, is_open: true,  morning_open: '11:00', morning_close: '15:00', evening_open: '17:30', evening_close: '00:00' },
  ];

  console.log('\n📥 Inserting opening_hours...');
  for (const h of hours) {
    h.day_name = DAY_NAMES[h.day_of_week];
    const res = await fetch(`${PB_URL}/api/collections/opening_hours/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(h),
    });
    if (res.ok) {
      console.log(`  ✅ ${h.day_name} (${h.is_open ? 'OPEN' : 'CLOSED'})`);
    } else {
      console.log(`  ❌ ${h.day_name}: ${await res.text()}`);
    }
  }

  console.log('\n🎉 Done!');
}

main().catch(e => { console.error('💥', e.message); });
