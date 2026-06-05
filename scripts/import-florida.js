#!/usr/bin/env node
// Florida DBPR registry import — multi-file combined pass
// Usage: node scripts/import-florida.js
// Processes all CSVs in both desktop folders, deduplicates on license_number.
// Does NOT promote. Reports counts only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POOLER_URL = process.env.SUPABASE_DB_POOLER_URL;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// All CSVs to process — comprehensive file leads, older files fill in any gaps
const CSV_FILES = [
  '/Users/andrew/Desktop/Nexus CSV /export-2.csv',      // PRIMARY: comprehensive 6,267-row export
  '/Users/andrew/Desktop/Nexus CSV /export.csv',         // older building CBC
  '/Users/andrew/Desktop/Nexus CSV /GC.csv',             // older general CGC
  '/Users/andrew/Desktop/Nexus CSV /HVAC.csv',           // CAC
  '/Users/andrew/Desktop/Nexus CSV /Electrical .csv',    // EC
  '/Users/andrew/Desktop/Nexus CSV /Flooring .csv',      // EC (dupes, auto-skipped)
  '/Users/andrew/Desktop/Nexus CSV /Mechanical .csv',    // CMC
  '/Users/andrew/Desktop/Nexus CSV /Alarm.csv',          // EF/EG
  '/Users/andrew/Desktop/Nexus CSV /Demo.csv',
  '/Users/andrew/Desktop/Nexus CSV /Gas.csv',
  '/Users/andrew/Desktop/Nexus CSV /Glazing.csv',
  '/Users/andrew/Desktop/Nexus CSV /Gypsum.csv',
  '/Users/andrew/Desktop/Nexus CSV /INdustrial.csv',
  '/Users/andrew/Desktop/Nexus CSV /Irrigation .csv',
  '/Users/andrew/Desktop/Nexus CSV /Carpentry.csv',
  '/Users/andrew/Desktop/Nexus CSV /Drywall.csv',
  '/Users/andrew/Desktop/Nexus CSV /Doors and Windows.csv',
];

let pgPool = null;
if (POOLER_URL) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: POOLER_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    console.log('  ✓ Using connection pooler (transaction mode)\n');
  } catch (e) {
    console.warn('  ⚠ pg not available, using REST API:', e.message);
  }
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  text = text.replace(/^﻿/, ''); // strip BOM
  const rows = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        let field = '';
        i++;
        while (i < len) {
          if (text[i] === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
          else if (text[i] === '"') { i++; break; }
          else { field += text[i++]; }
        }
        row.push(field);
      } else {
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++];
        }
        row.push(field.trim());
      }
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

// ── License extraction ────────────────────────────────────────────────────────

function extractLicenses(services) {
  if (!services) return [];
  const licenses = [];
  const regex = /([A-Za-z][A-Za-z0-9 &\/]*?)\s*\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(services)) !== null) {
    const licenseType = m[1].trim();
    const licenseNumber = m[2].trim().toUpperCase().replace(/\s+/g, '');
    if (licenseNumber.length >= 3 && /[A-Z]/.test(licenseNumber)) {
      licenses.push({ licenseType, licenseNumber });
    }
  }
  return licenses;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function parseCityStateZip(combined) {
  if (!combined) return { city: null, state: null, zip: null };
  const m = combined.trim().match(/^(.*?)\s{1,}([A-Z]{2})\s{1,}(\d{5})/);
  if (!m) return { city: combined.trim(), state: null, zip: null };
  return { city: m[1].trim().replace(/\s{2,}/g, ' ') || null, state: m[2], zip: m[3] };
}

function extractPhone(telephone) {
  if (!telephone) return null;
  const m = telephone.match(/\d{10}/);
  return m ? m[0] : null;
}

function normalizeEmail(email) {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function calcQualityScore(rec) {
  let score = 0;
  if (rec.business_name && rec.business_name.length > 2) score += 2;
  if (rec.license_number && rec.license_number.length >= 3) score += 2;
  if (rec.phone && rec.phone.replace(/\D/g, '').length >= 10) score += 2;
  if (rec.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) score += 2;
  if (rec.city) score += 1;
  if (rec.license_type) score += 1;
  return Math.max(1, Math.min(10, score));
}

// ── Process one CSV file ──────────────────────────────────────────────────────

function processFile(filePath, licenseMap) {
  const name = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    return { name, skippedMissing: true, rows: 0, verified: 0, noLicense: 0, notVerified: 0, noName: 0, added: 0, dupes: 0 };
  }

  const raw = parseCSV(fs.readFileSync(filePath, 'utf8'));
  if (raw.length < 2) {
    return { name, rows: 0, verified: 0, noLicense: 0, notVerified: 0, noName: 0, added: 0, dupes: 0 };
  }

  const header = raw[0];
  const rows = raw.slice(1);

  const col = (kw) => header.findIndex(h => h.toLowerCase().includes(kw.toLowerCase()));
  const IDX = {
    name:     col('business name'),
    cityZip:  col('city state'),
    phone:    col('telephone'),
    email:    col('email'),
    services: col('services'),
    verified: col('license verified'),
    addr1:    col('address line 1'),
  };

  let notVerified = 0, noName = 0, noLicense = 0, added = 0, dupes = 0;

  for (const row of rows) {
    const verifiedField = (row[IDX.verified] ?? '').trim();
    const businessName  = (row[IDX.name] ?? '').trim();
    const services      = (row[IDX.services] ?? '').trim();

    if (!verifiedField.toLowerCase().includes('verified')) { notVerified++; continue; }
    if (!businessName || businessName.length < 2) { noName++; continue; }

    const licenses = extractLicenses(services);
    if (licenses.length === 0) { noLicense++; continue; }

    const phone = extractPhone(row[IDX.phone] ?? '');
    const email = normalizeEmail(row[IDX.email] ?? '');
    const { city, state, zip } = parseCityStateZip(row[IDX.cityZip] ?? '');

    for (const { licenseType, licenseNumber } of licenses) {
      const key = `${licenseNumber}:FL`;
      if (licenseMap.has(key)) { dupes++; continue; }

      licenseMap.set(key, {
        business_name:  businessName,
        license_type:   licenseType,
        license_number: licenseNumber,
        city:           city || null,
        state:          state || 'FL',
        zip:            zip || null,
        phone:          phone || null,
        email:          email || null,
        license_status: 'active',
        raw_data: {
          full_services: services,
          address1: (row[IDX.addr1] ?? '').trim() || null,
          source_file: name,
        },
        status: 'pending',
      });
      added++;
    }
  }

  return { name, rows: rows.length, notVerified, noName, noLicense, added, dupes };
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function bulkInsertViaPooler(table, rows) {
  const client = await pgPool.connect();
  const CHUNK = 1000;
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const cols = Object.keys(chunk[0]);
      let paramIdx = 1;
      const valueSets = chunk.map(() => `(${cols.map(() => `$${paramIdx++}`).join(', ')})`).join(', ');
      const values = chunk.flatMap(row => cols.map(c => row[c] ?? null));
      const colList = cols.map(c => `"${c}"`).join(', ');
      await client.query(
        `INSERT INTO ${table} (${colList}) VALUES ${valueSets} ON CONFLICT DO NOTHING`,
        values
      );
      inserted += chunk.length;
      process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return inserted;
}

async function bulkInsertViaREST(table, rows) {
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) { inserted += chunk.length; resolve(); }
          else reject(new Error(`REST ${res.statusCode}: ${data}`));
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(chunk));
      req.end();
    });
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  return inserted;
}

async function supabaseInsert(table, rows) {
  return pgPool ? bulkInsertViaPooler(table, rows) : bulkInsertViaREST(table, rows);
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Florida DBPR — Combined Multi-File Import');
  console.log('═══════════════════════════════════════════════════════\n');

  const licenseMap = new Map();
  const fileResults = [];

  console.log('📂 Processing files:\n');
  for (const filePath of CSV_FILES) {
    const result = processFile(filePath, licenseMap);
    fileResults.push(result);
    if (result.skippedMissing) {
      console.log(`  ⚠  ${result.name.padEnd(35)} [file not found]`);
    } else if (result.added === 0 && result.rows > 0) {
      console.log(`  ○  ${result.name.padEnd(35)} ${String(result.rows).padStart(5)} rows → 0 licensed records (unlicensed trade)`);
    } else {
      console.log(`  ✓  ${result.name.padEnd(35)} ${String(result.rows).padStart(5)} rows → ${result.added} new, ${result.dupes} dupes`);
    }
  }

  const deduped = [...licenseMap.values()];

  // Quality score
  const byScore = {};
  for (const r of deduped) {
    const s = calcQualityScore(r);
    r._quality = s;
    byScore[s] = (byScore[s] || 0) + 1;
  }

  // License type breakdown
  const byType = {};
  for (const r of deduped) {
    const t = r.license_type || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  }

  console.log(`\n📊 License type breakdown (top 20):`);
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes.slice(0, 20)) {
    console.log(`  ${type.padEnd(40)} ${String(count).padStart(5)}`);
  }
  if (sortedTypes.length > 20) console.log(`  ... and ${sortedTypes.length - 20} more types`);

  console.log('\n📊 Quality scores:');
  for (let s = 10; s >= 1; s--) {
    if (byScore[s]) {
      const bar = '█'.repeat(Math.min(40, Math.round((byScore[s] / deduped.length) * 40)));
      console.log(`  Score ${s}: ${String(byScore[s]).padStart(6)}  ${bar}`);
    }
  }
  const promotable = deduped.filter(r => r._quality >= 6).length;
  console.log(`\n  Promotable (quality ≥ 6): ${promotable.toLocaleString()}`);
  console.log(`  Needs review (quality <6): ${(deduped.length - promotable).toLocaleString()}\n`);

  // Create import run
  console.log('🗄️  Creating import run...');
  const totalRawRows = fileResults.reduce((s, r) => s + (r.rows || 0), 0);
  const importRun = await supabasePost('registry_imports', {
    source_state: 'FL',
    import_type:  'csv',
    status:       'running',
    records_fetched: deduped.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run:', importRun); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // Stage
  console.log(`⬆️  Staging ${deduped.length.toLocaleString()} records...`);
  const stagingRows = deduped.map(r => ({
    import_id:      importId,
    source_state:   'FL',
    business_name:  r.business_name,
    license_type:   r.license_type,
    license_number: r.license_number,
    city:           r.city,
    state:          r.state,
    phone:          r.phone,
    email:          r.email,
    license_status: 'active',
    raw_data:       r.raw_data,
    status:         'pending',
  }));

  await supabaseInsert('registry_staging', stagingRows);
  console.log('\n');

  // Finalize
  await supabasePatch(`registry_imports?id=eq.${importId}`, {
    status:          'complete',
    records_fetched: totalRawRows,
    completed_at:    new Date().toISOString(),
  });

  // Summary
  const totalNotVerified = fileResults.reduce((s, r) => s + (r.notVerified || 0), 0);
  const totalNoLicense   = fileResults.reduce((s, r) => s + (r.noLicense || 0), 0);
  const totalDupes       = fileResults.reduce((s, r) => s + (r.dupes || 0), 0);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total raw rows across all files:  ${totalRawRows.toLocaleString()}`);
  console.log(`  Removed (not verified):           ${totalNotVerified.toLocaleString()}`);
  console.log(`  Removed (no license number):      ${totalNoLicense.toLocaleString()}`);
  console.log(`  Cross-file duplicate licenses:    ${totalDupes.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                           ${deduped.length.toLocaleString()}`);
  console.log(`  Promotable (quality ≥ 6):         ${promotable.toLocaleString()}`);
  console.log(`  Import run ID:                    ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ Nothing promoted. Review at /admin/registry before promoting.\n');

  if (pgPool) await pgPool.end();
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
