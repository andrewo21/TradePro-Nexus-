#!/usr/bin/env node
// Virginia DPOR — Contractor & Tradesman Regulant Lists Import — Session 5
// Usage: node scripts/import-virginia.js
//
// DPOR regulant lists: https://www.dpor.virginia.gov/RegulantLists
// Board 27 (Contractors): Class A, B, C licensed contractor companies + individual tradesmen
// Files: 2701-2723__crnt.txt (88,628 raw records confirmed)
//
// Column format (tab-delimited with header row):
//   0: BOARD  1: OCCUPATION  2: CERTIFICATE #  3: INDIVIDUAL NAME
//   4: BUSINESS NAME  5-7: Address  8: CITY  9: STATE
//   10: ZIP  15: EXPIRATION DATE  17: LICENSE RANK  18: LICENSE SPECIALTY
//   19: EMAILADDRESS
//
// License ranks: A=Class A, B=Class B, C=Class C, TRAD=Tradesman,
//               BPDW/CEM/MSTR/JMAN/FSI = specialty/trade licenses
//
// Does NOT promote. Reports quality distribution and staging count only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DPOR_BASE  = 'https://www.dpor.virginia.gov';
const REGULANT   = '/sites/default/files/Records%20and%20Documents/Regulant%20List/';
const UA         = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay      = ms => new Promise(r => setTimeout(r, ms));

// All Board 27 contractor files — confirmed live and containing data
const CONTRACTOR_FILES = [
  { file: '2701__crnt.txt',  type: 'Contractor (Class A)' },
  { file: '2703__crnt.txt',  type: 'Contractor (Class B)' },
  { file: '2705a__crnt.txt', type: 'Contractor (Class C)' },
  { file: '2705b__crnt.txt', type: 'Contractor (Class C - Residential)' },
  { file: '2705c__crnt.txt', type: 'Contractor (Class C - Commercial)' },
  { file: '2707__crnt.txt',  type: 'Contractor (Specialty)' },
  { file: '2709__crnt.txt',  type: 'Contractor (Other)' },
  { file: '2710__crnt.txt',  type: 'Tradesman' },
  { file: '2717__crnt.txt',  type: 'Contractor (Plumbing/Gas)' },
  { file: '2718__crnt.txt',  type: 'Contractor (Mechanical)' },
  { file: '2719__crnt.txt',  type: 'Contractor (HVAC)' },
  { file: '2720__crnt.txt',  type: 'Contractor (Electrical)' },
  { file: '2721__crnt.txt',  type: 'Contractor (Fire)' },
  { file: '2722__crnt.txt',  type: 'Contractor (Landscape/Irrigation)' },
  { file: '2723__crnt.txt',  type: 'Contractor (FSI/Suppression)' },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(parsed, {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': 'text/plain,*/*' },
    }, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 302 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        return resolve(fetchUrl(loc));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function supabasePost(path_, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function supabasePatch(path_, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => { res.on('data', () => {}); res.on('end', () => resolve()); });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function supabaseGet(path_) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    }, (res) => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function supabaseGetAll(path_) {
  const PAGE = 1000; const all = []; let offset = 0;
  for (;;) {
    const sep = path_.includes('?') ? '&' : '?';
    const page = await supabaseGet(`${path_}${sep}limit=${PAGE}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page); if (page.length < PAGE) break; offset += PAGE;
  }
  return all;
}

async function bulkInsert(table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await supabasePost(table, rows.slice(i, i + CHUNK));
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
    if (i + CHUNK < rows.length) await delay(200);
  }
  console.log('');
}

// ── DPOR tab-delimited parser ─────────────────────────────────────────────────
// Column indices (0-based):
//   0: BOARD  1: OCCUPATION  2: CERTIFICATE #  3: INDIVIDUAL NAME
//   4: BUSINESS NAME  5-7: Address  8: CITY  9: STATE  10: ZIP
//   15: EXPIRATION DATE  17: LICENSE RANK  18: LICENSE SPECIALTY  19: EMAIL

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim() || null;
}

function parseDporFile(raw, fallbackType) {
  const lines = raw.split(/\r?\n/);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const records = [];
  let skippedExpired = 0;
  let skippedEmpty = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 5) continue;

    // Skip header row
    if (cols[0].trim() === 'BOARD') continue;

    const licenseNumber = (cols[2] || '').trim();
    const individualName = (cols[3] || '').trim();
    const businessName   = (cols[4] || '').trim();
    const city           = (cols[8] || '').trim();
    const stateAbbr      = (cols[9] || '').trim();
    const zip            = (cols[10] || '').trim();
    const expirationRaw  = (cols[15] || '').trim();
    const rank           = (cols[17] || '').trim();
    const specialty      = (cols[18] || '').trim();
    const email          = (cols[19] || '').trim();

    // Use business name if present, otherwise individual name
    const name = businessName || individualName;
    if (!name || name.length < 2 || !licenseNumber) { skippedEmpty++; continue; }

    // Check expiration
    if (expirationRaw) {
      const exp = new Date(expirationRaw);
      if (!isNaN(exp.getTime()) && exp < today) { skippedExpired++; continue; }
    }

    // Build license type string
    let licenseType = fallbackType;
    if (rank && !rank.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // Map RANK codes to human-readable types
      const rankMap = {
        'A': 'Class A Contractor', 'B': 'Class B Contractor', 'C': 'Class C Contractor',
        'TRAD': 'Licensed Tradesman', 'MSTR': 'Master Tradesman', 'JMAN': 'Journeyman',
        'BPDW': 'Plumbing/Drainage', 'CEM': 'Elevator Mechanic',
        'RBEA': 'Real Estate/Builder', 'FSI': 'Fire Suppression Inspector',
        'CAM': 'Common Area Manager', 'TRN': 'Tradesman in Training',
        'BTL': 'Board for Tradesmen License', 'RETR': 'Retired License',
      };
      licenseType = rankMap[rank] || fallbackType;
      if (specialty) licenseType += ` (${specialty.trim()})`;
    }

    records.push({
      source_state:   'VA',
      business_name:  name,
      license_type:   licenseType,
      license_number: licenseNumber,
      city:           city || null,
      state:          stateAbbr || 'VA',
      phone:          null,
      email:          (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? email : null,
      license_status: 'active',
      raw_data: {
        board: cols[0], occupation: cols[1], rank,
        specialty, zip, address1: cols[5] || '', address2: cols[6] || '',
        source_file: fallbackType,
      },
      status: 'pending',
    });
  }

  return { records, skippedExpired, skippedEmpty };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Virginia DPOR — Board 27 Contractor Import (Session 5)');
  console.log('  Expected: ~88,628 records across 15 files');
  console.log('═══════════════════════════════════════════════════════\n');

  // robots.txt — already confirmed allowed
  console.log('robots.txt: confirmed allowed (checked in probe run)\n');

  // Download and parse all files
  const allRecords = [];
  let totalExpired = 0;
  let totalEmpty = 0;
  const byType = {};

  for (const { file, type } of CONTRACTOR_FILES) {
    const url = `${DPOR_BASE}${REGULANT}${file}`;
    process.stdout.write(`Downloading ${file}... `);
    await delay(2000);

    try {
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        console.log(`HTTP ${res.status} — skipped`);
        continue;
      }
      const { records, skippedExpired, skippedEmpty } = parseDporFile(res.body, type);
      totalExpired += skippedExpired;
      totalEmpty   += skippedEmpty;
      allRecords.push(...records);
      for (const r of records) byType[r.license_type] = (byType[r.license_type] || 0) + 1;
      console.log(`✓ ${records.length.toLocaleString()} active records`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }

  console.log(`\n  Total raw: ${(allRecords.length + totalExpired + totalEmpty).toLocaleString()}`);
  console.log(`  Removed (expired/blank): ${(totalExpired + totalEmpty).toLocaleString()}`);

  // Dedup within VA on CERTIFICATE #
  console.log('\nDeduplicating within VA on license number...');
  const seen = new Set();
  const deduped = [];
  let dupesWithin = 0;
  for (const r of allRecords) {
    const key = r.license_number + ':VA';
    if (seen.has(key)) { dupesWithin++; continue; }
    seen.add(key);
    deduped.push(r);
  }
  console.log(`  Within-VA dupes removed: ${dupesWithin.toLocaleString()}`);
  console.log(`  Clean records to stage:  ${deduped.length.toLocaleString()}`);

  // License type breakdown (top 20)
  console.log('\n📊 Top license types:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([t, c]) => {
    console.log(`  ${t.slice(0,45).padEnd(46)} ${String(c).padStart(7)}`);
  });

  // Check for existing VA records
  const existingVA = await supabaseGet('unclaimed_profiles?source_state=eq.VA&select=id&limit=1');
  const hasExisting = Array.isArray(existingVA) && existingVA.length > 0;
  if (hasExisting) {
    console.log('\n⚠️  Existing VA records found — cross-state dedup will apply');
  } else {
    console.log('\n✓ No existing VA records — dedup yields 0 cross-state matches');
  }

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'VA', import_type: 'scrape', status: 'running',
    records_fetched: allRecords.length + totalExpired + totalEmpty,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run'); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // Stage
  console.log(`⬆️  Staging ${deduped.length.toLocaleString()} records...`);
  const stagingRows = deduped.map(r => ({ ...r, import_id: importId }));
  await bulkInsert('registry_staging', stagingRows);

  await supabasePatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete',
    records_fetched: allRecords.length + totalExpired + totalEmpty,
    completed_at: new Date().toISOString(),
  });

  // Quality score distribution
  const scoreRows = await supabaseGetAll(`registry_staging?import_id=eq.${importId}&select=quality_score`);
  const scoreDist = {};
  for (const r of scoreRows) scoreDist[r.quality_score] = (scoreDist[r.quality_score] || 0) + 1;
  const promotable = Object.entries(scoreDist).filter(([s]) => Number(s) >= 6).reduce((a, [,c]) => a + c, 0);
  const belowThreshold = Object.entries(scoreDist).filter(([s]) => Number(s) < 6).reduce((a, [,c]) => a + c, 0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Raw records from DPOR:     ${(allRecords.length + totalExpired + totalEmpty).toLocaleString()}`);
  console.log(`  Expired / incomplete:      ${(totalExpired + totalEmpty).toLocaleString()}`);
  console.log(`  Within-VA dupes removed:   ${dupesWithin.toLocaleString()}`);
  console.log(`  STAGED:                    ${deduped.length.toLocaleString()}`);
  console.log(`  Cross-state dupes:         ${hasExisting ? 'check registry' : '0 (no prior VA records)'}`);
  console.log(`  Quality distribution:      ${JSON.stringify(scoreDist)}`);
  console.log(`  Promotable (score >= 6):   ${promotable.toLocaleString()}`);
  console.log(`  Below threshold (< 6):     ${belowThreshold.toLocaleString()}`);
  console.log(`  Import run ID:             ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
