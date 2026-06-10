#!/usr/bin/env node
// Texas TDLR registry import — Session 2
// Usage: node scripts/import-texas.js
// Downloads TDLR daily contractor license CSV extracts, filters to active
// licenses, dedupes within Texas on license_number, and stages to
// registry_staging. Does NOT promote. Reports counts only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TDLR_BASE = 'https://www.tdlr.texas.gov';
const TX_LICENSE_FILES = [
  { url: `${TDLR_BASE}/dbproduction2/Lteecele.csv`, licenseType: 'Electrical Contractor' },
  { url: `${TDLR_BASE}/dbproduction2/Ltescele.csv`, licenseType: 'Electrical Sign Contractor' },
  { url: `${TDLR_BASE}/dbproduction2/ltairref.csv`, licenseType: 'Air Conditioning & Refrigeration Contractor' },
];

const UA = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── CSV parser (handles quoted fields with commas) ─────────────────────────────

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    results.push(row);
  }
  return results;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function parseExpirationDate(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseCity(combined) {
  if (!combined) return null;
  const m = combined.trim().match(/^(.*?)\s+[A-Z]{2}\s+\d{5}/);
  if (m) return m[1].trim() || null;
  return combined.trim() || null;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(new URL(res.headers.location, url).toString()));
      }
      if (res.statusCode !== 200) return reject(new Error(`${url} → HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── Supabase REST helpers ───────────────────────────────────────────────────────

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
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  console.log('');
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Texas TDLR — Contractor License Import (Session 2)');
  console.log('═══════════════════════════════════════════════════════\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const licenseMap = new Map();
  let totalRawRows = 0;
  let totalExpired = 0;
  let totalMissingFields = 0;
  let totalDupesWithinTX = 0;
  const byType = {};

  for (const file of TX_LICENSE_FILES) {
    process.stdout.write(`Fetching ${file.licenseType} (${file.url})...\n`);
    let csvText;
    try {
      csvText = await fetchText(file.url);
    } catch (err) {
      console.warn(`  ⚠ Failed to fetch: ${err.message}`);
      await delay(2000);
      continue;
    }

    const rows = parseCSV(csvText);
    totalRawRows += rows.length;

    let added = 0, expired = 0, missing = 0, dupes = 0;

    for (const row of rows) {
      const expiration = parseExpirationDate(row['license_expiration_date']);
      if (!expiration || expiration < today) { expired++; continue; }

      const businessName = (row['business_name'] || row['name'] || '').trim();
      const licenseNumber = (row['license_number'] || '').trim();
      if (!businessName || !licenseNumber) { missing++; continue; }

      const key = `${licenseNumber}:TX`;
      if (licenseMap.has(key)) { dupes++; continue; }

      const city = parseCity(row['business_city,_state_zip']) ?? parseCity(row['mailing_address_city,_state_zip']);
      const phone = (row['business_phone'] || row['phone_number'] || '').trim();
      const subtype = (row['license_subtype'] || '').trim();
      const licenseType = subtype ? `${file.licenseType} (${subtype})` : file.licenseType;

      licenseMap.set(key, {
        source_state: 'TX',
        business_name: businessName,
        license_type: licenseType,
        license_number: licenseNumber,
        city: city || null,
        state: 'TX',
        phone: phone || null,
        email: null,
        license_status: 'active',
        raw_data: {
          county: row['county'] || '',
          license_expiration_date: row['license_expiration_date'] || '',
          license_subtype: subtype,
        },
        status: 'pending',
      });
      added++;
      byType[licenseType] = (byType[licenseType] || 0) + 1;
    }

    totalExpired += expired;
    totalMissingFields += missing;
    totalDupesWithinTX += dupes;

    console.log(`  ✓ ${rows.length.toLocaleString()} rows → ${added.toLocaleString()} active new, ${expired.toLocaleString()} expired, ${dupes.toLocaleString()} dupes, ${missing.toLocaleString()} missing fields`);

    await delay(2000); // rate limit between files
  }

  const staged = [...licenseMap.values()];

  console.log(`\n📊 License type breakdown:`);
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(50)} ${String(count).padStart(6)}`);
  }

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'TX',
    import_type: 'scrape',
    status: 'running',
    records_fetched: totalRawRows,
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
    records_fetched: totalRawRows,
    completed_at: new Date().toISOString(),
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total raw rows across all files:  ${totalRawRows.toLocaleString()}`);
  console.log(`  Removed (expired licenses):       ${totalExpired.toLocaleString()}`);
  console.log(`  Removed (missing name/license#):  ${totalMissingFields.toLocaleString()}`);
  console.log(`  Within-TX duplicate licenses:     ${totalDupesWithinTX.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                           ${staged.length.toLocaleString()}`);
  console.log(`  Import run ID:                    ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
