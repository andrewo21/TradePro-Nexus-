#!/usr/bin/env node
// Chicago Business License — Home Repair Contractors Import
// Usage: node scripts/import-chicago.js
//
// Source: data.cityofchicago.org — Business Licenses (r5kz-chrr)
// Filters to license_description='Home Repair' AND license_status='AAC' (Active)
// 3,468 active records. No email field.
//
// Fields: legal_name, doing_business_as_name, license_number,
//         address, city, state, zip_code

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const CHI_API   = 'https://data.cityofchicago.org/resource/r5kz-chrr.json';
const PAGE_SIZE = 10000;
const UA        = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay     = ms => new Promise(r => setTimeout(r, ms));

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

async function fetchAllRecords() {
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = new URL(CHI_API);
    url.searchParams.set('$where', "license_description='Home Repair' AND license_status='AAC'");
    url.searchParams.set('$order', 'license_number');
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));
    const page = await fetchJson(url.toString());
    rows.push(...page);
    process.stdout.write(`  Fetched ${rows.length.toLocaleString()} rows...\r`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await delay(1500);
  }
  console.log('');
  return rows;
}

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

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Chicago — Active Home Repair Contractor Licenses');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching active Chicago Home Repair contractor records...');
  const raw = await fetchAllRecords();
  console.log(`  ✓ ${raw.length.toLocaleString()} active records fetched\n`);

  let missingName = 0, missingLic = 0, dupesWithin = 0, expired = 0;
  const seen = new Set();
  const staged = [];
  const today = new Date();

  for (const row of raw) {
    const bizName = (row.doing_business_as_name || row.legal_name || '').trim();
    const licNum  = (row.license_number || row.license_id || '').trim();

    if (!bizName) { missingName++; continue; }
    if (!licNum)  { missingLic++;  continue; }

    // Skip expired licenses (belt-and-suspenders beyond the status filter)
    if (row.expiration_date) {
      const exp = new Date(row.expiration_date);
      if (!isNaN(exp.getTime()) && exp < today) { expired++; continue; }
    }

    const key = `CHI-${licNum}:IL`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    staged.push({
      source_state:   'IL',
      business_name:  bizName,
      license_type:   'Home Repair Contractor',
      license_number: `CHI-${licNum}`,
      city:           (row.city || 'Chicago').trim(),
      state:          (row.state || 'IL').trim(),
      phone:          null,
      email:          null,
      license_status: 'active',
      raw_data: {
        legal_name:     row.legal_name || '',
        dba:            row.doing_business_as_name || '',
        address:        row.address || '',
        zip:            row.zip_code || '',
        license_code:   row.license_code || '',
        issued:         row.date_issued || '',
        expires:        row.expiration_date || '',
        account_number: row.account_number || '',
      },
      status: 'pending',
    });
  }

  console.log(`  Raw fetched:        ${raw.length.toLocaleString()}`);
  console.log(`  Missing name:       ${missingName.toLocaleString()}`);
  console.log(`  Missing lic#:       ${missingLic.toLocaleString()}`);
  console.log(`  Expired:            ${expired.toLocaleString()}`);
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
}

main().catch(err => { console.error('\n❌ Import failed:', err.message); process.exit(1); });
