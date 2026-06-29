#!/usr/bin/env node
// Connecticut Trade Licenses Import (ELC, HTG, PLM, NHC)
// Usage: node scripts/import-connecticut-trades.js
//
// Source: data.ct.gov Socrata — State Licenses and Credentials (ngch-56tr)
// Filters to ACTIVE records for:
//   ELC — Electrical contractors & journeypersons
//   HTG — Heating, Piping & Cooling contractors & journeypersons
//   PLM — Plumbing & Piping contractors & journeypersons
//   NHC — New Home Construction contractors
//
// Complements import-connecticut.js (HIC). No email field in dataset.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const CT_API    = 'https://data.ct.gov/resource/ngch-56tr.json';
const PAGE_SIZE = 50000;
const UA        = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay     = ms => new Promise(r => setTimeout(r, ms));

// Trade license types to include
const INCLUDE_TYPES = ['ELC', 'HTG', 'PLM', 'NHC'];

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
  const typeFilter = INCLUDE_TYPES.map(t => `credentialtype='${t}'`).join(' OR ');
  for (;;) {
    const url = new URL(CT_API);
    url.searchParams.set('$where', `(${typeFilter}) AND status='ACTIVE'`);
    url.searchParams.set('$order', 'credentialnumber');
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
  console.log('  Connecticut Trade Licenses (ELC, HTG, PLM, NHC)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching active CT ELC/HTG/PLM/NHC records from data.ct.gov...');
  const raw = await fetchAllRecords();
  console.log(`  ✓ ${raw.length.toLocaleString()} active records fetched\n`);

  let missingName = 0, missingLic = 0, dupesWithin = 0;
  const seen = new Set();
  const staged = [];
  const byType = {};

  for (const row of raw) {
    const name    = (row.name || '').trim();
    const licNum  = (row.credentialnumber || '').trim();
    const licType = (row.credential || row.credentialtype || '').trim();
    const city    = (row.city || '').trim();
    const state   = (row.state || 'CT').trim();

    if (!name)   { missingName++; continue; }
    if (!licNum) { missingLic++;  continue; }

    // Dedupe by full credential code (type + number + subcategory)
    const key = `${row.fullcredentialcode || licNum}:CT-TRADE`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    byType[licType] = (byType[licType] || 0) + 1;

    staged.push({
      source_state:   'CT',
      business_name:  name,
      license_type:   licType,
      license_number: row.fullcredentialcode || licNum,
      city:           city || null,
      state:          state,
      phone:          null,
      email:          null,
      license_status: 'active',
      raw_data: {
        credentialtype:    row.credentialtype || '',
        credentialsubcat:  row.credentialsubcategory || '',
        type:              row.type || '',
        zip:               row.zip || '',
        issuedate:         row.issuedate || '',
        expirationdate:    row.expirationdate || '',
        statusreason:      row.statusreason || '',
      },
      status: 'pending',
    });
  }

  console.log('📊 License type breakdown:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) =>
    console.log(`  ${t.padEnd(50)} ${String(c).padStart(7)}`));

  console.log(`\n  Raw fetched:        ${raw.length.toLocaleString()}`);
  console.log(`  Missing name:       ${missingName.toLocaleString()}`);
  console.log(`  Missing lic#:       ${missingLic.toLocaleString()}`);
  console.log(`  Within-CT dupes:    ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);

  const importRun = await sbRequest('POST', 'registry_imports', {
    source_state: 'CT', import_type: 'scrape', status: 'running',
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
