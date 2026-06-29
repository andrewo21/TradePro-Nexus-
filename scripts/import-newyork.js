#!/usr/bin/env node
// New York — Contractor Registry Import (two sources)
// Usage: node scripts/import-newyork.js
//
// Source 1: NY State DOL — Contractor Registry Certificates (i4jv-zkey)
//   13,872 active records — businesses registered for public works
//   Fields: certificate_number, business_name, dba_name, address, city,
//           state, zip_code, phone, issued_date, expiration_date, status
//
// Source 2: NYC DCA — Home Improvement Contractors (w7w3-xahh)
//   12,892 active HIC licenses in the 5 boroughs
//   Fields: license_nbr, business_name, dba_trade_name, license_type,
//           license_status, contact_phone, address_city, address_state,
//           address_zip, business_category

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const NY_DOL_API = 'https://data.ny.gov/resource/i4jv-zkey.json';
const NYC_DCA_API = 'https://data.cityofnewyork.us/resource/w7w3-xahh.json';
const PAGE_SIZE = 25000;
const UA        = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay     = ms => new Promise(r => setTimeout(r, ms));

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return String(raw).trim() || null;
}

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

async function fetchAllPages(baseUrl, extraParams = {}) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = new URL(baseUrl);
    url.searchParams.set('$order', ':id');
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
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
  console.log('  New York — Contractor Registry Import (2 sources)');
  console.log('═══════════════════════════════════════════════════════\n');

  const staged = [];
  const seen = new Set();
  let missingName = 0, missingLic = 0, dupesWithin = 0, inactive = 0;

  // ── Source 1: NY State DOL Contractor Registry ─────────────────────────────
  console.log('1/2  Fetching NYS DOL Contractor Registry (i4jv-zkey)...');
  const dolRaw = await fetchAllPages(NY_DOL_API, { '$where': "status='Active'" });
  console.log(`  ✓ ${dolRaw.length.toLocaleString()} active DOL records\n`);

  for (const row of dolRaw) {
    const bizName = (row.business_name || row.dba_name || '').trim();
    const licNum  = (row.certificate_number || '').trim();
    if (!bizName) { missingName++; continue; }
    if (!licNum)  { missingLic++;  continue; }

    const key = `${licNum}:NY`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    staged.push({
      source_state:   'NY',
      business_name:  bizName,
      license_type:   'Contractor Registry Certificate',
      license_number: licNum,
      city:           (row.city || '').trim() || null,
      state:          (row.state || 'NY').trim(),
      phone:          row.phone ? cleanPhone(row.phone) : null,
      email:          null,
      license_status: 'active',
      raw_data: {
        dba_name:      row.dba_name || '',
        address:       row.address || '',
        zip:           row.zip_code || '',
        issued_date:   row.issued_date || '',
        exp_date:      row.expiration_date || '',
        business_type: row.business_type || '',
        mwbe:          row.business_is_mwbe_owned || '',
      },
      status: 'pending',
    });
  }

  // ── Source 2: NYC DCA Home Improvement Contractors ─────────────────────────
  console.log('2/2  Fetching NYC DCA Home Improvement Contractors (w7w3-xahh)...');
  const nycRaw = await fetchAllPages(NYC_DCA_API, {
    '$where': "license_status='Active' AND business_category='Home Improvement Contractor'",
  });
  console.log(`  ✓ ${nycRaw.length.toLocaleString()} active NYC HIC records\n`);

  for (const row of nycRaw) {
    const bizName = (row.business_name || row.dba_trade_name || '').trim();
    const licNum  = (row.license_nbr || '').trim();
    if (!bizName) { missingName++; continue; }
    if (!licNum)  { missingLic++;  continue; }

    const key = `NYC-HIC-${licNum}:NY`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    const city = (row.address_city || 'New York').trim();
    const borough = row.address_borough ? `, ${row.address_borough}` : '';

    staged.push({
      source_state:   'NY',
      business_name:  bizName,
      license_type:   'Home Improvement Contractor',
      license_number: licNum,
      city:           city || 'New York',
      state:          row.address_state || 'NY',
      phone:          row.contact_phone ? cleanPhone(row.contact_phone) : null,
      email:          null,
      license_status: 'active',
      raw_data: {
        dba_name:       row.dba_trade_name || '',
        zip:            row.address_zip || '',
        borough:        row.address_borough || '',
        license_type:   row.license_type || '',
        created:        row.license_creation_date || '',
        expires:        row.lic_expir_dd || '',
      },
      status: 'pending',
    });
  }

  console.log(`  Raw DOL:            ${dolRaw.length.toLocaleString()}`);
  console.log(`  Raw NYC DCA:        ${nycRaw.length.toLocaleString()}`);
  console.log(`  Missing name:       ${missingName.toLocaleString()}`);
  console.log(`  Missing lic#:       ${missingLic.toLocaleString()}`);
  console.log(`  Within-NY dupes:    ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);

  const importRun = await sbRequest('POST', 'registry_imports', {
    source_state: 'NY', import_type: 'scrape', status: 'running',
    records_fetched: dolRaw.length + nycRaw.length,
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
