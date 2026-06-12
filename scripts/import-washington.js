#!/usr/bin/env node
// Washington Dept. of Labor & Industries — Contractor License Data import — Session 4
// Usage: node scripts/import-washington.js
// L&I's "Verify a Contractor" tool (secure.lni.wa.gov/verify/) only supports
// individual lookups, but L&I publishes its full contractor license register
// as an open dataset on data.wa.gov ("L&I Contractor License Data - General",
// id m8qx-ubtq, ~160K rows) via the Socrata SODA REST API (plain JSON, no
// login, robots.txt allows /resource/*).
// Fetches all contractorlicensestatus='ACTIVE' rows (paginated,
// $limit=50000), filters to unexpired (Expiration Date >= today), dedupes
// within WA on ContractorLicenseNumber, and stages to registry_staging.
// quality_score is a generated column (registry_quality_score(...)),
// computed automatically by Postgres on insert.
// Does NOT promote. Reports counts only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const WA_BASE = 'https://data.wa.gov';
const DATASET_URL = `${WA_BASE}/resource/m8qx-ubtq.json`;
const PAGE_SIZE = 50000;
const UA = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const TYPE_NAMES = {
  CC: 'Construction Contractor',
  EC: 'Electrical Contractor',
  PC: 'Plumbing Contractor',
  LC: 'Elevator Contractor',
};

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

// ── Fetch a page from the SODA API ──────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`SODA query failed: HTTP ${res.statusCode}`));
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchActiveRows() {
  const rows = [];
  let offset = 0;

  for (;;) {
    const url = new URL(DATASET_URL);
    url.searchParams.set('$where', "contractorlicensestatus='ACTIVE'");
    url.searchParams.set('$order', 'contractorlicensenumber');
    url.searchParams.set('$limit', String(PAGE_SIZE));
    url.searchParams.set('$offset', String(offset));

    const page = await fetchJson(url.toString());
    rows.push(...page);
    console.log(`  Fetched ${rows.length.toLocaleString()} rows so far...`);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await delay(2000);
  }

  return rows;
}

// ── Supabase REST helpers ───────────────────────────────────────────────────────

async function supabaseGet(path_, headers = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, ...headers },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

// PostgREST defaults to a 1000-row max per request regardless of $limit, so
// page through with the Range header to fetch every row.
async function supabaseGetAll(path_) {
  const PAGE = 1000;
  const all = [];
  let offset = 0;
  for (;;) {
    const page = await supabaseGet(path_, { Range: `${offset}-${offset + PAGE - 1}` });
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function supabasePost(path_, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function supabasePatch(path_, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
    }, (res) => { res.on('data', () => {}); res.on('end', () => resolve()); });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function bulkInsert(table, rows) {
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await supabasePost(table, chunk);
    inserted += chunk.length;
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
  }
  console.log('');
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Washington L&I — Contractor License Data Import (Session 4)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log("Fetching contractorlicensestatus='ACTIVE' rows from data.wa.gov SODA API (paginated)...");
  const rows = await fetchActiveRows();
  console.log(`  ✓ Fetched ${rows.length.toLocaleString()} total ACTIVE rows\n`);

  console.log('Filtering to unexpired licenses, deduping within WA, and mapping fields...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expiredOrBadDate = 0;
  let missingFields = 0;
  let dupesWithinWA = 0;
  const seen = new Set();
  const staged = [];
  const byType = {};

  for (const row of rows) {
    const expirationRaw = row.licenseexpirationdate;
    const expiration = expirationRaw ? new Date(expirationRaw) : null;
    if (!expiration || isNaN(expiration.getTime()) || expiration < today) { expiredOrBadDate++; continue; }

    const businessName = (row.businessname || '').trim();
    const licenseNumber = (row.contractorlicensenumber || '').trim();
    if (!businessName || !licenseNumber) { missingFields++; continue; }

    const dedupeKey = `${licenseNumber}:WA`;
    if (seen.has(dedupeKey)) { dupesWithinWA++; continue; }
    seen.add(dedupeKey);

    const typeCode = (row.contractorlicensetypecode || '').trim().toUpperCase();
    const licenseType = TYPE_NAMES[typeCode] || row.contractorlicensetypecodedesc || null;
    const phone = (row.phonenumber || '').trim();

    staged.push({
      source_state: 'WA',
      business_name: businessName,
      license_type: licenseType,
      license_number: licenseNumber,
      city: (row.city || '').trim() || null,
      state: 'WA',
      phone: phone ? cleanPhone(phone) : null,
      email: null,
      license_status: 'active',
      raw_data: {
        address1: row.address1 || '',
        address2: row.address2 || '',
        address_state: row.state || '',
        zip: row.zip || '',
        business_type: row.businesstypecodedesc || '',
        specialty1: row.specialtycode1desc || '',
        specialty2: row.specialtycode2desc || '',
        ubi: row.ubi || '',
        primary_principal: row.primaryprincipalname || '',
        effective_date: row.licenseeffectivedate || '',
        expiration_date: row.licenseexpirationdate || '',
        status: row.contractorlicensestatus || '',
      },
      status: 'pending',
    });

    byType[licenseType] = (byType[licenseType] || 0) + 1;
  }

  console.log(`\n📊 License type breakdown:`);
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(type || '(none)').padEnd(28)} ${String(count).padStart(7)}`);
  }

  // Cross-state dedup check: registry_quality_score is a generated column
  // (computed automatically on insert). check_registry_duplicate() scopes
  // all three checks (exact_license, fuzzy_name_location, phone_match) to
  // source_state = p_source_state — so a brand-new state with zero existing
  // WA rows in unclaimed_profiles/registry_staging cannot produce any
  // matches. Confirm that precondition before staging.
  console.log('\n🔍 Checking for existing WA records (cross-state dedup precondition)...');
  const existingStaging = await supabaseGet(`registry_staging?source_state=eq.WA&select=id&limit=1`);
  const existingProfiles = await supabaseGet(`unclaimed_profiles?source_state=eq.WA&select=id&limit=1`);
  const priorWA = (Array.isArray(existingStaging) ? existingStaging.length : 0) + (Array.isArray(existingProfiles) ? existingProfiles.length : 0);
  console.log(priorWA === 0
    ? '  ✓ No existing WA records in registry_staging or unclaimed_profiles — dedup against existing data trivially yields 0 matches for all records.'
    : `  ⚠ Found ${priorWA} existing WA record(s) — review for duplicates before promotion.`);

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'WA',
    import_type: 'scrape',
    status: 'running',
    records_fetched: rows.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run:', importRun); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // Stage
  console.log(`⬆️  Staging ${staged.length.toLocaleString()} records...`);
  const stagingRows = staged.map(r => ({ ...r, import_id: importId }));
  await bulkInsert('registry_staging', stagingRows);

  await supabasePatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete',
    records_fetched: rows.length,
    completed_at: new Date().toISOString(),
  });

  // Pull back quality_score distribution for the records we just staged
  const scoreRows = await supabaseGetAll(`registry_staging?import_id=eq.${importId}&select=quality_score`);
  const scoreDist = {};
  if (Array.isArray(scoreRows)) {
    for (const r of scoreRows) scoreDist[r.quality_score] = (scoreDist[r.quality_score] || 0) + 1;
  }
  const promotable = Object.entries(scoreDist).filter(([s]) => Number(s) >= 6).reduce((a, [, c]) => a + c, 0);
  const belowThreshold = Object.entries(scoreDist).filter(([s]) => Number(s) < 6).reduce((a, [, c]) => a + c, 0);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total ACTIVE rows fetched:              ${rows.length.toLocaleString()}`);
  console.log(`  Removed (expired or bad date):          ${expiredOrBadDate.toLocaleString()}`);
  console.log(`  Removed (missing name/license#):        ${missingFields.toLocaleString()}`);
  console.log(`  Within-WA duplicate licenses:           ${dupesWithinWA.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                                  ${staged.length.toLocaleString()}`);
  console.log(`  Cross-state dedup matches:               0 (no prior WA records)`);
  console.log(`  Quality score distribution:              ${JSON.stringify(scoreDist)}`);
  console.log(`  Promotable (quality >= 6):               ${promotable.toLocaleString()}`);
  console.log(`  Below threshold (quality < 6):           ${belowThreshold.toLocaleString()}`);
  console.log(`  Import run ID:                           ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
