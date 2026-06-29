#!/usr/bin/env node
// Illinois IDFPR — Roofing Contractor Licenses Import
// Usage: node scripts/import-illinois.js
//
// Source: illinois-edp.data.socrata.com Socrata SODA API
// Dataset: "Professional Licensing" (pzzh-kp68)
// Filtered to license_type=ROOFING CONTRACTOR + ACTIVE status only.
// 16,697 active records. No email field.
//
// Fields used: business_name / businessdba / first_name+last_name,
//              description (license type), license_number, city, state, zip

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const IL_API    = 'https://illinois-edp.data.socrata.com/resource/pzzh-kp68.json';
const PAGE_SIZE = 25000;
const UA        = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay     = ms => new Promise(r => setTimeout(r, ms));

// Only import active licenses of contractor-relevant types
const INCLUDE_TYPES  = ['ROOFING CONTRACTOR'];
const ACTIVE_STATUS  = new Set(['ACTIVE', 'PROBATION']);

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
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject).end();
  });
}

async function fetchAllRecords() {
  const rows = [];
  let offset = 0;

  for (const licType of INCLUDE_TYPES) {
    offset = 0;
    for (;;) {
      const url = new URL(IL_API);
      url.searchParams.set('$where', `license_type='${licType}' AND license_status='ACTIVE'`);
      url.searchParams.set('$order', 'license_number');
      url.searchParams.set('$limit', String(PAGE_SIZE));
      url.searchParams.set('$offset', String(offset));
      const page = await fetchJson(url.toString());
      rows.push(...page);
      process.stdout.write(`  [${licType}] Fetched ${rows.length.toLocaleString()} rows...\r`);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      await delay(1500);
    }
  }
  console.log('');
  return rows;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

function sbRequest(method, path_, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(url, { method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function bulkInsert(table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await sbRequest('POST', table, rows.slice(i, i + CHUNK));
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
    if (i + CHUNK < rows.length) await delay(150);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Illinois IDFPR — Active Roofing Contractor Licenses');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching active IL roofing contractor records...');
  const raw = await fetchAllRecords();
  console.log(`  ✓ ${raw.length.toLocaleString()} active records fetched\n`);

  let missingName = 0, missingLic = 0, dupesWithin = 0;
  const seen = new Set();
  const staged = [];
  const byType = {};

  for (const row of raw) {
    // Build business name: prefer business_name, then businessdba, then full name
    const bizName = (
      row.business_name || row.businessdba ||
      [row.first_name, row.middle, row.last_name].filter(Boolean).join(' ')
    ).trim();

    const licNum  = (row.license_number || '').trim();
    const licType = (row.description || row.license_type || '').trim();
    const city    = (row.city || '').trim();
    const state   = (row.state || 'IL').trim();

    if (!bizName) { missingName++; continue; }
    if (!licNum)  { missingLic++;  continue; }

    const key = `${licNum}:IL`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    byType[licType] = (byType[licType] || 0) + 1;

    staged.push({
      source_state:   'IL',
      business_name:  bizName,
      license_type:   licType,
      license_number: licNum,
      city:           city || null,
      state:          state,
      phone:          null,
      email:          null,
      license_status: (row.license_status || '').toLowerCase(),
      raw_data: {
        license_type_code: row.license_type || '',
        zip:               row.zip || '',
        county:            row.county || '',
        businessdba:       row.businessdba || '',
        original_issue:    row.original_issue_date || '',
        expiration_date:   row.expiration_date || '',
        ever_disciplined:  row.ever_disciplined || 'N',
      },
      status: 'pending',
    });
  }

  console.log(`📊 License type breakdown:`);
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) =>
    console.log(`  ${t.padEnd(45)} ${String(c).padStart(7)}`));

  console.log(`\n  Raw fetched:        ${raw.length.toLocaleString()}`);
  console.log(`  Missing name:       ${missingName.toLocaleString()}`);
  console.log(`  Missing lic#:       ${missingLic.toLocaleString()}`);
  console.log(`  Within-IL dupes:    ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);

  const importRun = await sbRequest('POST', 'registry_imports', {
    source_state: 'IL', import_type: 'scrape', status: 'running',
    records_fetched: raw.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run'); process.exit(1); }
  console.log(`\n  Import run ID: ${importId}\n`);

  console.log(`⬆️  Staging ${staged.length.toLocaleString()} records...`);
  await bulkInsert('registry_staging', staged.map(r => ({ ...r, import_id: importId })));

  await sbRequest('PATCH', `registry_imports?id=eq.${importId}`, {
    status: 'complete', completed_at: new Date().toISOString(),
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);
  console.log(`  Import run ID:      ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => { console.error('\n❌ Import failed:', err.message); process.exit(1); });
