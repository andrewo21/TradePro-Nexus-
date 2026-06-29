#!/usr/bin/env node
// New Jersey Division of Consumer Affairs — HIC Bulk Roster Import
// Usage: node scripts/import-newjersey.js /path/to/Data.txt
//
// Source: NJ DCA bulk roster export (pipe-delimited)
// Fields: full_name|first_name|middle_name|last_name|name_suffix|
//         profession_name|license_type_name|license_no|issue_date|
//         expiration_date|addr_line_1|addr_line_2|addr_city|addr_state|
//         addr_zipcode|addr_county|addr_email|license_status_name
//
// Imports only license_status_name = Active records.
// Maps: full_name→business_name, license_no→license_number,
//       license_type_name→license_type, addr_city→city,
//       addr_state→state, addr_email→email

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const readline = require('readline');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const filePath = process.argv[2] || path.join(require('os').homedir(), 'Desktop/Data.txt');
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function isValidEmail(e) {
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return null;
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
  console.log('  New Jersey DCA — Home Improvement Contractor Import');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  Source file: ${filePath}\n`);

  // ── Parse the pipe-delimited file ──────────────────────────────────────────
  const staged = [];
  const seen   = new Set();
  let lineNum = 0, skippedInactive = 0, missingName = 0, missingLic = 0, dupesWithin = 0;
  let withEmail = 0;

  await new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      lineNum++;
      if (lineNum === 1) return; // skip header

      const cols = line.split('|');
      // Trim every field
      const [
        fullName, firstName, middleName, lastName, nameSuffix,
        professionName, licenseTypeName, licenseNo,
        issueDate, expirationDate,
        addrLine1, addrLine2, addrCity, addrState, addrZip, addrCounty,
        addrEmail, licenseStatusName,
      ] = cols.map(c => (c || '').trim());

      // Active only
      if (licenseStatusName !== 'Active') { skippedInactive++; return; }

      // Business name: prefer full_name, fall back to first+last
      const bizName = fullName || [firstName, middleName, lastName].filter(Boolean).join(' ');
      if (!bizName) { missingName++; return; }

      const licNum = licenseNo;
      if (!licNum) { missingLic++; return; }

      const key = `${licNum}:NJ`;
      if (seen.has(key)) { dupesWithin++; return; }
      seen.add(key);

      const email = addrEmail && isValidEmail(addrEmail) ? addrEmail.toLowerCase().trim() : null;
      if (email) withEmail++;

      staged.push({
        source_state:   'NJ',
        business_name:  bizName,
        license_type:   licenseTypeName || professionName || 'Home Improvement Contractor',
        license_number: licNum,
        city:           addrCity || null,
        state:          addrState || 'NJ',
        phone:          null,
        email,
        license_status: 'active',
        raw_data: {
          first_name:      firstName || '',
          last_name:        lastName || '',
          profession:       professionName || '',
          zip:              addrZip || '',
          county:           addrCounty || '',
          addr_line_1:      addrLine1 || '',
          addr_line_2:      addrLine2 || '',
          issue_date:       issueDate || '',
          expiration_date:  expirationDate || '',
        },
        status: 'pending',
      });

      if (lineNum % 10000 === 0) process.stdout.write(`  Parsed ${lineNum.toLocaleString()} lines...\r`);
    });

    rl.on('close', resolve);
    rl.on('error', reject);
  });

  console.log(`\n  Lines read:         ${lineNum.toLocaleString()}`);
  console.log(`  Skipped inactive:   ${skippedInactive.toLocaleString()}`);
  console.log(`  Missing name:       ${missingName.toLocaleString()}`);
  console.log(`  Missing lic#:       ${missingLic.toLocaleString()}`);
  console.log(`  Within-NJ dupes:    ${dupesWithin.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);
  console.log(`  With email:         ${withEmail.toLocaleString()} (${((withEmail/staged.length)*100).toFixed(1)}%)`);
  console.log(`  Without email:      ${(staged.length - withEmail).toLocaleString()}`);
  console.log('');

  // ── Create import run ───────────────────────────────────────────────────────
  const importRun = await sbRequest('POST', 'registry_imports', {
    source_state: 'NJ', import_type: 'csv', status: 'running',
    records_fetched: staged.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run'); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // ── Stage records ───────────────────────────────────────────────────────────
  console.log(`⬆️  Staging ${staged.length.toLocaleString()} records...`);
  await bulkInsert('registry_staging', staged.map(r => ({ ...r, import_id: importId })));

  await sbRequest('PATCH', `registry_imports?id=eq.${importId}`, {
    status: 'complete', completed_at: new Date().toISOString(),
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — ready to promote');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  STAGED:             ${staged.length.toLocaleString()}`);
  console.log(`  With email:         ${withEmail.toLocaleString()} (${((withEmail/staged.length)*100).toFixed(1)}%)`);
  console.log(`  Import run ID:      ${importId}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n  Run this to promote:');
  console.log(`  node scripts/promote-state.js NJ\n`);
}

main().catch(err => { console.error('\n❌ Import failed:', err.message); process.exit(1); });
