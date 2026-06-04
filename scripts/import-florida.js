#!/usr/bin/env node
// Florida DBPR registry import — scrub, deduplicate, stage
// Usage: node scripts/import-florida.js
// Does NOT promote. Reports counts only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── CSV parser (handles quoted fields with commas/newlines) ───────────────────

function parseCSV(text) {
  // Strip BOM
  text = text.replace(/^﻿/, '');
  const rows = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        let field = '';
        i++; // skip opening quote
        while (i < len) {
          if (text[i] === '"' && text[i + 1] === '"') {
            field += '"'; i += 2;
          } else if (text[i] === '"') {
            i++; break;
          } else {
            field += text[i++];
          }
        }
        row.push(field);
      } else {
        // Unquoted field
        let field = '';
        while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++];
        }
        row.push(field.trim());
      }
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    // Skip line ending
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

// ── Field extractors ──────────────────────────────────────────────────────────

function extractLicenseNumber(services) {
  if (!services) return null;
  // Extract from first parentheses: "Building (CBC1266799)" -> "CBC1266799"
  const m = services.match(/\(([^)]+)\)/);
  if (!m) return null;
  // Normalize: uppercase, remove spaces
  return m[1].trim().toUpperCase().replace(/\s+/g, '');
}

function extractLicenseType(services) {
  if (!services) return null;
  const m = services.match(/^([^(]+)\(/);
  return m ? m[1].trim() : null;
}

function parseCityStateZip(combined) {
  if (!combined) return { city: null, state: null, zip: null };
  const cleaned = combined.trim();
  // Match: "...CITY FL  32413     "
  // Find the 2-letter state code + 5-digit zip at the end
  const m = cleaned.match(/^(.*?)\s{1,}([A-Z]{2})\s{1,}(\d{5})/);
  if (!m) {
    // Try just extracting state code at end
    const m2 = cleaned.match(/\b([A-Z]{2})\b/);
    return { city: cleaned, state: m2 ? m2[1] : null, zip: null };
  }
  return {
    city: m[1].trim().replace(/\s{2,}/g, ' ') || null,
    state: m[2],
    zip: m[3],
  };
}

function extractPhone(telephone) {
  if (!telephone) return null;
  // Take first 10-digit sequence
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

// ── Supabase REST call ────────────────────────────────────────────────────────

async function supabaseInsert(table, rows, chunkSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    const body = JSON.stringify(chunk);
    await new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            inserted += chunk.length;
            resolve();
          } else {
            reject(new Error(`Supabase ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    process.stdout.write(`  Staged ${Math.min(i + chunkSize, rows.length)}/${rows.length}\r`);
  }
  return inserted;
}

async function supabaseUpdate(table, id, data) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`);
  const body = JSON.stringify(data);
  await new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => res.statusCode < 300 ? resolve() : reject(new Error(`PATCH ${res.statusCode}`)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function supabasePost(path, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const BUILDING_CSV = '/Users/andrew/Desktop/Nexus CSV /export.csv';
  const GC_CSV = '/Users/andrew/Desktop/Nexus CSV /GC.csv';

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Florida DBPR Registry Import — Staging Run');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Parse both files
  console.log('📂 Parsing CSV files...');
  const buildingRaw = parseCSV(fs.readFileSync(BUILDING_CSV, 'utf8'));
  const gcRaw = parseCSV(fs.readFileSync(GC_CSV, 'utf8'));

  const buildingHeader = buildingRaw[0];
  const gcHeader = gcRaw[0];
  const buildingRows = buildingRaw.slice(1);
  const gcRows = gcRaw.slice(1);

  console.log(`  Building CSV: ${buildingRows.length} raw rows`);
  console.log(`  GC CSV:       ${gcRows.length} raw rows`);
  console.log(`  Total raw:    ${buildingRows.length + gcRows.length}\n`);

  // Column indices
  function colIdx(header, name) {
    return header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  }

  // 2. Parse each row into a record
  function parseRow(row, header, sourceFile) {
    const get = (name) => row[colIdx(header, name)] || '';
    const services = get('services');
    const cityStateZip = get('city state');
    const { city, state, zip } = parseCityStateZip(cityStateZip);
    const phone = extractPhone(get('telephone'));
    const email = normalizeEmail(get('email'));
    const licenseNumber = extractLicenseNumber(services);
    const licenseType = extractLicenseType(services);
    const businessName = get('business name').trim();
    const verified = get('license verified').toLowerCase().includes('verified');

    return {
      business_name: businessName || null,
      license_type: licenseType || null,
      license_number: licenseNumber,
      city: city || null,
      state: state || 'FL',
      zip: zip || null,
      phone: phone || null,
      email: email || null,
      active: verified,
      source_file: sourceFile,
    };
  }

  const allParsed = [
    ...buildingRows.map(r => parseRow(r, buildingHeader, 'building')),
    ...gcRows.map(r => parseRow(r, gcHeader, 'gc')),
  ];

  // 3. Scrubbing
  let removedMissingLicense = 0;
  let removedMissingName = 0;
  let removedInactive = 0;

  const scrubbed = allParsed.filter(r => {
    if (!r.license_number || r.license_number.length < 3) { removedMissingLicense++; return false; }
    if (!r.business_name || r.business_name.length < 2) { removedMissingName++; return false; }
    if (!r.active) { removedInactive++; return false; }
    return true;
  });

  console.log('🔧 Scrubbing results:');
  console.log(`  Missing license number: ${removedMissingLicense}`);
  console.log(`  Missing business name:  ${removedMissingName}`);
  console.log(`  Inactive licenses:      ${removedInactive}`);
  console.log(`  After scrubbing:        ${scrubbed.length}\n`);

  // 4. Deduplication — exact license number match within FL
  const seen = new Map(); // license_number -> first record
  let removedDuplicates = 0;

  const deduped = [];
  for (const r of scrubbed) {
    const key = r.license_number.toUpperCase();
    if (seen.has(key)) {
      removedDuplicates++;
    } else {
      seen.set(key, r);
      deduped.push(r);
    }
  }

  console.log('🔄 Deduplication:');
  console.log(`  Cross-file duplicates removed: ${removedDuplicates}`);
  console.log(`  Unique records to stage:       ${deduped.length}\n`);

  // 5. Quality score breakdown
  const scoreDist = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, below6: 0 };
  for (const r of deduped) {
    const score = calcQualityScore(r);
    r._quality = score;
    if (score >= 6 && score <= 10) scoreDist[score] = (scoreDist[score] || 0) + 1;
    else if (score < 6) scoreDist.below6++;
  }

  console.log('📊 Quality score breakdown (1-10):');
  for (const [score, count] of Object.entries(scoreDist)) {
    const bar = '█'.repeat(Math.round(count / deduped.length * 40));
    console.log(`  Score ${score === 'below6' ? '<6' : score.padStart(2)}: ${String(count).padStart(5)}  ${bar}`);
  }
  const wouldPromote = deduped.filter(r => r._quality >= 6).length;
  const wouldStay = deduped.filter(r => r._quality < 6).length;
  console.log(`\n  Would promote (≥6): ${wouldPromote}`);
  console.log(`  Stay in staging (<6): ${wouldStay}\n`);

  // 6. Create import run
  console.log('🗄️  Creating import run record...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'FL',
    import_type: 'csv',
    status: 'running',
    records_fetched: deduped.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run:', importRun); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // 7. Stage records
  console.log(`⬆️  Staging ${deduped.length} records...`);
  const stagingRows = deduped.map(r => ({
    import_id: importId,
    source_state: 'FL',
    business_name: r.business_name,
    license_type: r.license_type,
    license_number: r.license_number,
    city: r.city,
    state: r.state || 'FL',
    phone: r.phone,
    email: r.email,
    license_status: 'active',
    raw_data: { zip: r.zip, source_file: r.source_file },
    status: 'pending',
  }));

  await supabaseInsert('registry_staging', stagingRows);
  console.log('\n');

  // 8. Update import run to complete
  await supabaseUpdate('registry_imports', importId, {
    status: 'complete',
    records_fetched: allParsed.length,
    completed_at: new Date().toISOString(),
  });

  // 9. Final summary
  console.log('═══════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total rows received:      ${allParsed.length}`);
  console.log(`  Removed (missing license): ${removedMissingLicense}`);
  console.log(`  Removed (missing name):   ${removedMissingName}`);
  console.log(`  Removed (inactive):       ${removedInactive}`);
  console.log(`  Removed (duplicates):     ${removedDuplicates}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  STAGED:                   ${deduped.length}`);
  console.log(`  Quality ≥6 (promotable):  ${wouldPromote}`);
  console.log(`  Quality <6 (needs review): ${wouldStay}`);
  console.log(`  Import run ID:            ${importId}`);
  console.log('═══════════════════════════════════════════════\n');
  console.log('✅ Nothing promoted. Review counts above, then run promote when ready.\n');
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
