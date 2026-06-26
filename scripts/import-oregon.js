#!/usr/bin/env node
// Oregon Construction Contractors Board — CCB Active Licenses Import
// Usage: node scripts/import-oregon.js
//
// Source: data.oregon.gov Socrata SODA API — "CCB Active Licenses" (g77e-6bhs)
// Free, no login, updated daily. Covers all active OR contractor licenses.
// robots.txt: data.oregon.gov allows /resource/* — Crawl-delay respected.
//
// License types imported: RGC (Residential GC), RSC (Residential Specialty),
// CGC1/CGC2 (Commercial GC), CSC1/CSC2 (Commercial Specialty), RLC
// Excludes: Home Inspectors, Locksmiths, Lead Paint, Home Energy, Developers
//
// Fields: full_name (business), endorsement_text (license type),
// license_number, city, state, zip_code, phone_number, lic_exp_date
// No email field in dataset.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const OR_API      = 'https://data.oregon.gov/resource/g77e-6bhs.json';
const PAGE_SIZE   = 50000;
const UA          = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay       = ms => new Promise(r => setTimeout(r, ms));

// License types to include — contractor businesses only
const INCLUDE_TYPES = new Set(['RGC','RSC','CGC1','CGC2','CSC1','CSC2','RLC','RD_exempt']);

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim() || null;
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

async function fetchAllRecords() {
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = new URL(OR_API);
    url.searchParams.set('$order', 'license_number');
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));
    const page = await fetchJson(url.toString());
    rows.push(...page);
    process.stdout.write(`  Fetched ${rows.length.toLocaleString()} rows...\r`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await delay(2000);
  }
  console.log('');
  return rows;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

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
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
    if (i + CHUNK < rows.length) await delay(200);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Oregon CCB — Active Contractor Licenses (Socrata)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching all active CCB license records from data.oregon.gov...');
  const raw = await fetchAllRecords();
  console.log(`  ✓ ${raw.length.toLocaleString()} total records fetched\n`);

  const today = new Date(); today.setHours(0,0,0,0);
  let expiredOrBlank = 0, missingName = 0, excluded = 0, dupesWithin = 0;
  const seen = new Set();
  const staged = [];
  const byType = {};

  for (const row of raw) {
    const licType   = (row.license_type || '').trim().toUpperCase();
    const endorsement = (row.endorsement_text || '').trim();
    const name      = (row.full_name || '').trim();
    const licNum    = (row.license_number || '').trim();
    const city      = (row.city || '').trim();
    const phone     = (row.phone_number || '').trim();
    const expRaw    = (row.lic_exp_date || '').trim(); // "11/15/2027"

    // Skip non-contractor types
    if (!INCLUDE_TYPES.has(licType) && !licType.startsWith('CGC') && !licType.startsWith('CSC')
        && licType !== 'RGC' && licType !== 'RSC' && licType !== 'RLC') {
      excluded++;
      continue;
    }

    // Check expiration
    if (expRaw) {
      const [m, d, y] = expRaw.split('/').map(Number);
      const exp = new Date(y, m-1, d);
      if (!isNaN(exp.getTime()) && exp < today) { expiredOrBlank++; continue; }
    }

    if (!name || !licNum) { missingName++; continue; }

    const key = `${licNum}:OR`;
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);

    byType[endorsement] = (byType[endorsement] || 0) + 1;

    staged.push({
      source_state:   'OR',
      business_name:  name,
      license_type:   endorsement || licType,
      license_number: licNum,
      city:           city || null,
      state:          row.state || 'OR',
      phone:          phone ? cleanPhone(phone) : null,
      email:          null,
      license_status: 'active',
      raw_data:       {
        license_type_code: licType,
        zip: row.zip_code || '',
        address: row.address || '',
        county: row.county_name || '',
        rmi_name: row.rmi_name || '',
        bond_company: row.bond_company || '',
        exp_date: expRaw,
      },
      status: 'pending',
    });
  }

  console.log(`📊 License type breakdown (top 10):`);
  Object.entries(byType).sort((a,b) => b[1]-a[1]).slice(0,10).forEach(([t,c]) =>
    console.log(`  ${t.padEnd(40)} ${String(c).padStart(7)}`));

  console.log(`\n  Raw fetched:           ${raw.length.toLocaleString()}`);
  console.log(`  Excluded (non-contr):  ${excluded.toLocaleString()}`);
  console.log(`  Expired / blank:       ${expiredOrBlank.toLocaleString()}`);
  console.log(`  Missing name/lic#:     ${missingName.toLocaleString()}`);
  console.log(`  Within-OR dupes:       ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:                ${staged.length.toLocaleString()}`);

  // Create import run
  const importRun = await sbPost('registry_imports', {
    source_state: 'OR', import_type: 'scrape', status: 'running',
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

  // Quality distribution
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
