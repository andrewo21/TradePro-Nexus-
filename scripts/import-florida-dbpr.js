#!/usr/bin/env node
// Florida DBPR — Construction Industry (Board 06) + Electrical Contractors
// (Board 08) bulk public-records CSV import — Session 5
// Usage: node scripts/import-florida-dbpr.js
//
// Replaces the earlier CBC/CGC-only lead-gen CSV approach (import-florida.js,
// 5,924 records staged from Desktop CSV exports) with DBPR's official weekly
// "Public Records" bulk extracts, covering EVERY Construction Industry and
// Electrical Contractor occupation code (CGC, CBC, CAC, CCC, CFC, CRC, CPC,
// SCC, CUC, CMC, CSC, PCC, CVC, registered variants, QB, FRO, EC, ER, ES, EF,
// EG, EY, EZ, EH, EI, ET).
//
// Sources (robots.txt allows /sto/file_download/extracts/):
//   https://www2.myfloridalicense.com/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv
//   https://www2.myfloridalicense.com/sto/file_download/extracts/lic08el.csv
//
// "Active" = Primary Status 'C' (current/clear) AND Secondary Status 'A'
// (active). Excludes CRS1/CRS2/CRS3 (CE course records, not licenses).
//
// Dedup:
//   1. Within-fetch: dedupe on license_number (Alternate Lic#, e.g. "CGC1234567")
//   2. Cross-record: skip any record whose license_number already exists in
//      registry_staging OR unclaimed_profiles for source_state='FL' (the
//      existing 5,924 staged + 4,950 already-promoted FL records)
//
// quality_score is a generated column (registry_quality_score(...)),
// computed automatically by Postgres on insert.
// Does NOT promote. Stages only. Reports counts.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const FL_BASE = 'https://www2.myfloridalicense.com';
const EXTRACTS = [
  { url: `${FL_BASE}/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv`, name: 'construction (Board 06)' },
  { url: `${FL_BASE}/sto/file_download/extracts/lic08el.csv`, name: 'electrical (Board 08)' },
];

const UA = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Occupation Code -> full license type name, per DBPR "Understanding DBPR Codes"
const OCCUPATION_NAMES = {
  CGC: 'Certified General Contractor',
  CBC: 'Certified Building Contractor',
  CAC: 'Certified Air Conditioning Contractor',
  CCC: 'Certified Roofing Contractor',
  CFC: 'Certified Plumbing Contractor',
  CRC: 'Certified Residential Contractor',
  CPC: 'Certified Pool/Spa Contractor',
  SCC: 'Certified Specialty Contractor',
  CUC: 'Certified Utility & Excavation Contractor',
  CMC: 'Certified Mechanical Contractor',
  CSC: 'Certified Sheet Metal Contractor',
  PCC: 'Certified Pollutant Storage Contractor',
  CVC: 'Certified Solar Contractor',
  RR: 'Registered Residential Contractor',
  RF: 'Registered Plumbing Contractor',
  RC: 'Registered Roofing Contractor',
  RP: 'Registered Pool/Spa Contractor',
  RB: 'Registered Building Contractor',
  RG: 'Registered General Contractor',
  RX: 'Registered Specialty Contractor',
  RM: 'Registered Mechanical Contractor',
  RU: 'Registered Underground Utility Excavator',
  RQ: 'Registered Precision Tank Tester',
  RS: 'Registered Sheet Metal Contractor',
  RA: 'Registered Air Conditioning Contractor',
  QB: 'Construction Business',
  FRO: 'Financially Responsible Officer',
  EC: 'Electrical Contractor',
  ER: 'Registered Electrical Contractor',
  ES: 'Certified Specialty Contractor (Electrical)',
  EF: 'Certified Alarm System Contractor I',
  EG: 'Certified Alarm System Contractor II',
  EY: 'Registered Alarm System Contractor I',
  EZ: 'Registered Alarm System Contractor II',
  EH: 'Registered Alarm System Contractor (EH)',
  EI: 'Registered Alarm System Contractor (EI)',
  ET: 'Electrical Contractor (ET)',
};

const EXCLUDED_CODES = new Set(['CRS1', 'CRS2', 'CRS3']);

// ── Fetch a CSV (follows redirects) ─────────────────────────────────────────────

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const req = https.request(new URL(url), {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': 'text/csv,*/*' },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(fetchText(new URL(res.headers.location, url).toString(), redirects + 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── CSV parsing (no header row, simple quoted-field lines) ──────────────────────

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseRows(text, sourceFile, stats) {
  const records = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    stats.totalRows++;
    const cols = parseCsvLine(line);
    if (cols.length < 21) { stats.malformed++; continue; }

    const occCode = cols[1].trim();
    const primaryStatus = cols[13].trim();
    const secondaryStatus = cols[14].trim();

    if (primaryStatus !== 'C' || secondaryStatus !== 'A') { stats.notActive++; continue; }
    if (EXCLUDED_CODES.has(occCode)) { stats.excludedCode++; continue; }

    const individualName = cols[2].trim();
    const dbaName = cols[3].trim();
    const businessName = dbaName || individualName;
    if (!businessName) { stats.noName++; continue; }

    const licenseNumRaw = cols[12].trim();
    const altLicNum = (cols[20] || '').trim();
    const licenseNumber = altLicNum || `${occCode}${licenseNumRaw}`;
    if (!licenseNumber) { stats.noLicense++; continue; }

    records.push({
      source_state: 'FL',
      business_name: businessName,
      license_type: OCCUPATION_NAMES[occCode] || occCode,
      license_number: licenseNumber,
      city: cols[8].trim() || null,
      state: 'FL',
      phone: null,
      email: null,
      license_status: 'active',
      raw_data: {
        board: cols[0] || '',
        occupation_code: occCode,
        individual_name: individualName,
        dba_name: dbaName,
        address1: cols[5] || '',
        address2: cols[6] || '',
        zip: cols[10] || '',
        county_code: cols[11] || '',
        primary_status: primaryStatus,
        secondary_status: secondaryStatus,
        original_license_date: cols[15] || '',
        effective_date: cols[16] || '',
        expiration_date: cols[17] || '',
        source_file: sourceFile,
      },
      status: 'pending',
    });
  }
  return records;
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
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`POST ${path_} -> HTTP ${res.statusCode}: ${data}`));
        }
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
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
  console.log('  Florida DBPR — Public Records Bulk Import (Session 5)');
  console.log('═══════════════════════════════════════════════════════\n');

  const stats = { totalRows: 0, malformed: 0, notActive: 0, excludedCode: 0, noName: 0, noLicense: 0 };
  const fetched = [];

  for (const extract of EXTRACTS) {
    console.log(`Fetching ${extract.name} extract...`);
    const text = await fetchText(extract.url);
    console.log(`  ✓ Downloaded ${(text.length / 1e6).toFixed(1)} MB`);
    const records = parseRows(text, extract.name, stats);
    console.log(`  ✓ ${records.length.toLocaleString()} active records (Primary=C, Secondary=A)\n`);
    fetched.push(...records);
    await delay(2000);
  }

  console.log(`Total active records across both extracts: ${fetched.length.toLocaleString()}\n`);

  // Within-fetch dedup on license_number
  console.log('Deduplicating within new fetch on license_number...');
  const seen = new Set();
  let withinFetchDupes = 0;
  const deduped = [];
  for (const r of fetched) {
    if (seen.has(r.license_number)) { withinFetchDupes++; continue; }
    seen.add(r.license_number);
    deduped.push(r);
  }
  console.log(`  ${withinFetchDupes.toLocaleString()} within-fetch duplicates removed\n`);

  // License type breakdown
  const byType = {};
  for (const r of deduped) byType[r.license_type] = (byType[r.license_type] || 0) + 1;
  console.log('📊 License type breakdown:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(45)} ${String(count).padStart(7)}`);
  }

  // Cross-record dedup against existing FL records (registry_staging + unclaimed_profiles)
  console.log('\n🔍 Loading existing FL license numbers (registry_staging + unclaimed_profiles)...');
  const existingStaging = await supabaseGetAll('registry_staging?source_state=eq.FL&select=license_number');
  const existingProfiles = await supabaseGetAll('unclaimed_profiles?source_state=eq.FL&select=license_number');
  const existingLicenseNumbers = new Set();
  for (const r of existingStaging) if (r.license_number) existingLicenseNumbers.add(r.license_number);
  for (const r of existingProfiles) if (r.license_number) existingLicenseNumbers.add(r.license_number);
  console.log(`  ${existingStaging.length.toLocaleString()} existing FL records in registry_staging`);
  console.log(`  ${existingProfiles.length.toLocaleString()} existing FL records in unclaimed_profiles`);
  console.log(`  ${existingLicenseNumbers.size.toLocaleString()} unique existing FL license numbers\n`);

  let crossDupes = 0;
  const newRecords = [];
  for (const r of deduped) {
    if (existingLicenseNumbers.has(r.license_number)) { crossDupes++; continue; }
    newRecords.push(r);
  }
  console.log(`  ${crossDupes.toLocaleString()} records already exist in FL registry — excluded\n`);

  // Create import run
  console.log('🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'FL',
    import_type: 'scrape',
    status: 'running',
    records_fetched: fetched.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run:', importRun); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // Stage
  console.log(`⬆️  Staging ${newRecords.length.toLocaleString()} new records...`);
  const stagingRows = newRecords.map(r => ({ ...r, import_id: importId }));
  await bulkInsert('registry_staging', stagingRows);

  await supabasePatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete',
    records_fetched: fetched.length,
    records_duplicate: withinFetchDupes + crossDupes,
    completed_at: new Date().toISOString(),
  });

  // Quality score distribution
  const scoreRows = await supabaseGetAll(`registry_staging?import_id=eq.${importId}&select=quality_score`);
  const scoreDist = {};
  for (const r of scoreRows) scoreDist[r.quality_score] = (scoreDist[r.quality_score] || 0) + 1;
  const promotable = Object.entries(scoreDist).filter(([s]) => Number(s) >= 6).reduce((a, [, c]) => a + c, 0);
  const belowThreshold = Object.entries(scoreDist).filter(([s]) => Number(s) < 6).reduce((a, [, c]) => a + c, 0);

  // Existing FL total (registry_staging only, pre-this-import)
  const newTotal = existingStaging.length + newRecords.length;

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total raw rows (both extracts):         ${stats.totalRows.toLocaleString()}`);
  console.log(`  Removed (not active C/A):               ${stats.notActive.toLocaleString()}`);
  console.log(`  Removed (CE course codes):              ${stats.excludedCode.toLocaleString()}`);
  console.log(`  Removed (no name/license/malformed):    ${(stats.malformed + stats.noName + stats.noLicense).toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  Active records fetched:                 ${fetched.length.toLocaleString()}`);
  console.log(`  Within-fetch duplicates:                ${withinFetchDupes.toLocaleString()}`);
  console.log(`  Already in FL registry (cross-dedup):   ${crossDupes.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED (new):                           ${newRecords.length.toLocaleString()}`);
  console.log(`  Quality score distribution:             ${JSON.stringify(scoreDist)}`);
  console.log(`  Promotable (quality >= 6):              ${promotable.toLocaleString()}`);
  console.log(`  Below threshold (quality < 6):          ${belowThreshold.toLocaleString()}`);
  console.log(`  Import run ID:                          ${importId}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  Previous FL total (registry_staging):   ${existingStaging.length.toLocaleString()}`);
  console.log(`  NEW FL TOTAL (registry_staging):        ${newTotal.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
