#!/usr/bin/env node
// Colorado DORA — Professional and Occupational Licenses (Contractor Types)
// Usage: node scripts/import-colorado.js
//
// Source: data.colorado.gov Socrata SODA API (7s5z-vewr)
// All professional licenses in CO — filtered to contractor-relevant types only:
//   JW  — Journeyman Wireman        (~12K)
//   ME  — Master Electrician        (~7K)
//   EC  — Electrical Contractor     (~5K)
//   MP  — Master Plumber            (~5K)
//   JP  — Journeyman Plumber
//   PC  — Plumbing Contractor
//
// Note: Dataset has individual names (firstname/lastname), not business names.
// We use full name as business_name. No phone or email in dataset.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const CO_API    = 'https://data.colorado.gov/resource/7s5z-vewr.json';
const PAGE_SIZE = 50000;
const UA        = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay     = ms => new Promise(r => setTimeout(r, ms));

// Contractor-relevant license type codes in DORA dataset
const CONTRACTOR_TYPES = new Set(['JW','ME','EC','MP','JP','PC','EW','ME2','EP','MA']);
const TYPE_NAMES = {
  JW:  'Journeyman Wireman',
  ME:  'Master Electrician',
  EC:  'Electrical Contractor',
  EW:  'Electrical Wireman',
  EP:  'Electrician Provisional',
  MP:  'Master Plumber',
  JP:  'Journeyman Plumber',
  PC:  'Plumbing Contractor',
  ME2: 'Master Electrician II',
  MA:  'Mechanical Apprentice',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.request(parsed, {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject).end();
  });
}

async function fetchContractorRecords() {
  const rows = [];
  const typeList = [...CONTRACTOR_TYPES].map(t => `licensetype='${t}'`).join(' OR ');

  let offset = 0;
  for (;;) {
    const url = new URL(CO_API);
    url.searchParams.set('$where', `(${typeList}) AND licensestatusdescription='Active'`);
    url.searchParams.set('$order', 'licensenumber');
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));
    const page = await fetchJson(url.toString());
    rows.push(...page);
    process.stdout.write(`  Fetched ${rows.length.toLocaleString()} contractor records...\r`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await delay(2000);
  }
  console.log('');
  return rows;
}

// ── Supabase helpers (same as other import scripts) ──────────────────────────

function sbPost(path_, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject); req.write(payload); req.end();
  });
}

function sbPatch(path_, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject); req.write(payload); req.end();
  });
}

function sbGet(path_) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    https.request(url, { method: 'GET', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); }
    ).on('error', reject).end();
  });
}

async function bulkInsert(table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await sbPost(table, rows.slice(i, i + CHUNK));
    process.stdout.write(`  Staged ${Math.min(i+CHUNK,rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
    if (i + CHUNK < rows.length) await delay(200);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Colorado DORA — Contractor License Types (Socrata)');
  console.log('  Types: JW, ME, EC, MP, JP, PC + related');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching active contractor-type records from data.colorado.gov...');
  const raw = await fetchContractorRecords();
  console.log(`  ✓ ${raw.length.toLocaleString()} contractor records fetched\n`);

  const today = new Date(); today.setHours(0,0,0,0);
  let expiredOrBlank = 0, missingName = 0, dupesWithin = 0;
  const seen = new Set();
  const staged = [];
  const byType = {};

  for (const row of raw) {
    const licType = (row.licensetype || '').trim().toUpperCase();
    const firstName = (row.firstname || '').trim();
    const lastName  = (row.lastname  || '').trim();
    const fullName  = [firstName, lastName].filter(Boolean).join(' ').toUpperCase();
    const licNum    = (row.licensenumber || '').trim();
    const city      = (row.city || '').trim();
    const expRaw    = (row.licenseexpirationdate || '').trim();

    if (!fullName || !licNum) { missingName++; continue; }

    if (expRaw) {
      const exp = new Date(expRaw);
      if (!isNaN(exp.getTime()) && exp < today) { expiredOrBlank++; continue; }
    }

    const key = `${licNum}:CO`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    const licTypeName = TYPE_NAMES[licType] || licType;
    byType[licTypeName] = (byType[licTypeName] || 0) + 1;

    staged.push({
      source_state:   'CO',
      business_name:  fullName,
      license_type:   licTypeName,
      license_number: licNum,
      city:           city || null,
      state:          row.state || 'CO',
      phone:          null,
      email:          null,
      license_status: 'active',
      raw_data:       {
        license_type_code: licType,
        zip: row.mailzipcode || '',
        first_issued: row.licensefirstissuedate || '',
        last_renewed: row.licenselastreneweddate || '',
        exp_date: expRaw,
        middlename: row.middlename || '',
      },
      status: 'pending',
    });
  }

  console.log('📊 License type breakdown:');
  Object.entries(byType).sort((a,b)=>b[1]-a[1]).forEach(([t,c]) =>
    console.log(`  ${t.padEnd(30)} ${String(c).padStart(7)}`));

  console.log(`\n  Raw fetched:           ${raw.length.toLocaleString()}`);
  console.log(`  Expired / blank:       ${expiredOrBlank.toLocaleString()}`);
  console.log(`  Missing name/lic#:     ${missingName.toLocaleString()}`);
  console.log(`  Within-CO dupes:       ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:                ${staged.length.toLocaleString()}`);

  const importRun = await sbPost('registry_imports', {
    source_state: 'CO', import_type: 'scrape', status: 'running',
    records_fetched: raw.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run'); process.exit(1); }
  console.log(`\n  Import run ID: ${importId}\n`);

  console.log(`⬆️  Staging ${staged.length.toLocaleString()} records...`);
  await bulkInsert('registry_staging', staged.map(r => ({ ...r, import_id: importId })));

  await sbPatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete', records_fetched: raw.length, completed_at: new Date().toISOString(),
  });

  const scoreRows = await sbGet(`registry_staging?import_id=eq.${importId}&select=quality_score&limit=1000&offset=0`);
  const dist = {};
  if (Array.isArray(scoreRows)) for (const r of scoreRows) dist[r.quality_score] = (dist[r.quality_score]||0)+1;
  const promotable = Object.entries(dist).filter(([s])=>Number(s)>=6).reduce((a,[,c])=>a+c,0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  STAGED:                ${staged.length.toLocaleString()}`);
  console.log(`  Quality distribution:  ${JSON.stringify(dist)}`);
  console.log(`  Promotable (>= 6):     ${promotable.toLocaleString()}`);
  console.log(`  Import run ID:         ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => { console.error('\n❌ Import failed:', err.message); process.exit(1); });
