#!/usr/bin/env node
/**
 * Vérifie l'intégrité des données fiscales (NF525).
 *   node scripts/nf525-verifier.mjs
 * 1. Demande à la base de recalculer toutes les empreintes (fiscal_verify_all).
 * 2. Revérifie ici, indépendamment : numéros de tickets sans trou, chaînage
 *    prev_hash → hash, grand total perpétuel des tickets et des Z.
 * Code de sortie 0 = tout est intact, 1 = problème trouvé.
 */
const URL = process.env.SUPABASE_URL || 'https://supabase.twinpizza.fr';
const KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkxOTkwODc1LCJleHAiOjE5NDk2NzA4NzV9.LjYBCNmBY0nFEOLsSZqazv0ZV0476pTNO3p-adF4NGY';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(path, init) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchAll(table, order) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest(`${table}?select=*&order=${order}.asc&offset=${from}&limit=1000`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const problems = [];
const cents = (n) => Math.round(Number(n) * 100);

// 1. Contrôle par la base (recalcul des SHA-256)
const dbIssues = await rest('rpc/fiscal_verify_all', { method: 'POST', body: '{}' });
dbIssues.forEach((p) => problems.push(`[base] ${p.source} ${p.ref} : ${p.probleme}`));

// 2. Contrôle indépendant des tickets
const tickets = await fetchAll('fiscal_tickets', 'ticket_number');
let prev = '0'.repeat(64), gt = 0, num = 0;
for (const t of tickets) {
  if (Number(t.ticket_number) !== num + 1) problems.push(`[script] ticket ${t.ticket_number} : numéro manquant avant`);
  if (t.prev_hash !== prev) problems.push(`[script] ticket ${t.ticket_number} : chaînage rompu`);
  gt += cents(t.total_ttc);
  if (cents(t.grand_total_ttc) !== gt) problems.push(`[script] ticket ${t.ticket_number} : grand total incohérent`);
  prev = t.hash; num = Number(t.ticket_number);
}

// 3. Contrôle indépendant des clôtures
const closures = await fetchAll('fiscal_closures', 'id');
prev = '0'.repeat(64);
const gtByType = {};
for (const c of closures) {
  if (c.prev_hash !== prev) problems.push(`[script] Z ${c.closure_type}${c.closure_number} : chaînage rompu`);
  gtByType[c.closure_type] = (gtByType[c.closure_type] || 0) + cents(c.net_ttc);
  if (cents(c.grand_total_ttc) !== gtByType[c.closure_type]) problems.push(`[script] Z ${c.closure_type}${c.closure_number} : grand total incohérent`);
  if (c.closure_type === 'J') {
    const sum = tickets.filter((t) => t.ticket_number >= c.first_ticket && t.ticket_number <= c.last_ticket)
      .reduce((s, t) => s + cents(t.total_ttc), 0);
    if (sum !== cents(c.net_ttc)) problems.push(`[script] Z J${c.closure_number} : total différent des tickets`);
  }
  prev = c.hash;
}

console.log(`${tickets.length} tickets, ${closures.length} clôtures, grand total tickets ${(gt / 100).toFixed(2)} €`);
if (problems.length === 0) {
  console.log('OK : chaîne intacte');
  process.exit(0);
}
console.log(`${problems.length} problème(s) :`);
problems.forEach((p) => console.log(' - ' + p));
process.exit(1);
