#!/usr/bin/env node
// Minnesota Department of Labor and Industry — License Export Import
// Usage: node scripts/import-minnesota.js
//
// Source: secure.doli.state.mn.us — Direct public CSVs, updated nightly, free.
// Files downloaded:
//   MNDLILicRegCertExport_Electrical.csv         (~44K active)
//   MNDLILicRegCertExport_Plumbing.csv           (~15K active)
//   MNDLILicRegCertExport_Residential_Contractors.csv (~25K active)
//   MNDLILicRegCertExport_Contractor_Registrations.csv (~14K active)
//
// Fields: Bus_Pers, License_Type, License_Subtype, Name, DBA_Name,
//         City, St, Zip, Phone_No, Email_Address, Lic_Number, Status, Exp_Date
// Email IS included — best MN dataset available.
// Filter: Status = "Issued", dedup on Lic_Number across all files.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const BASE  = 'https://secure.doli.state.mn.us/ccld/data/';
const FILES = [
  { url: BASE + 'MNDLILicRegCertExport_Electrical.csv',              label: 'Electrical' },
  { url: BASE + 'MNDLILicRegCertExport_Plumbing.csv',                label: 'Plumbing' },
  { url: BASE + 'MNDLILicRegCertExport_Residential_Contractors.csv', label: 'Residential Contractors' },
  { url: BASE + 'MNDLILicRegCertExport_Contractor_Registrations.csv', label: 'Contractor Registrations' },
];
const UA    = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = ms => new Promise(r => setTimeout(r, ms));

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim() || null;
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e||'').trim()); }

// Parse CSV with quoted fields
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseRow(lines[i]);
    if (vals.length < headers.length) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim(); });
    results.push(row);
  }
  return results;
}

function parseRow(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += line[i];
  }
  result.push(cur);
  return result;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.request(parsed, { method: 'GET', headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).end();
  });
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
    }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve(d)} }); });
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
    }, (res) => { res.on('data',()=>{}); res.on('end',resolve); });
    req.on('error', reject); req.write(payload); req.end();
  });
}

function sbGet(path_) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    https.request(url, { method: 'GET', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } },
      (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{resolve(d)} }); }
    ).on('error', reject).end();
  });
}

async function bulkInsert(table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await sbPost(table, rows.slice(i, i + CHUNK));
    process.stdout.write(`  Staged ${Math.min(i+CHUNK,rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
    if (i + CHUNK < rows.length) await delay(200);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Minnesota DLI — License Export Import');
  console.log('  Electrical + Plumbing + Residential + Contractor');
  console.log('═══════════════════════════════════════════════════════\n');

  const today = new Date(); today.setHours(0,0,0,0);
  const seen = new Set();
  const staged = [];
  const byType = {};
  let expired = 0, notIssued = 0, missing = 0, dupes = 0;

  for (const { url, label } of FILES) {
    console.log(`Downloading ${label}...`);
    await delay(2000);
    const text = await fetchText(url);
    const rows = parseCSV(text);
    console.log(`  ${rows.length.toLocaleString()} rows parsed`);

    for (const row of rows) {
      if ((row.Status || '').toLowerCase() !== 'issued') { notIssued++; continue; }

      const name    = (row.Name || row.DBA_Name || '').trim();
      const licNum  = (row.Lic_Number || '').trim();
      const city    = (row.City || '').trim();
      const st      = (row.St || '').trim();
      const phone   = (row.Phone_No || '').trim();
      const email   = (row.Email_Address || '').trim();
      const expRaw  = (row.Exp_Date || '').trim();
      const subtype = (row.License_Subtype || '').trim();
      const licType = subtype || label;

      if (!name || !licNum) { missing++; continue; }

      // Check expiration — MM/DD/YYYY format
      if (expRaw) {
        const [m,d,y] = expRaw.split('/').map(Number);
        const exp = new Date(y, m-1, d);
        if (!isNaN(exp.getTime()) && exp < today) { expired++; continue; }
      }

      const key = `${licNum}:MN`;
      if (seen.has(key)) { dupes++; continue; }
      seen.add(key);

      byType[licType] = (byType[licType] || 0) + 1;

      staged.push({
        source_state:   'MN',
        business_name:  name,
        license_type:   licType,
        license_number: licNum,
        city:           city || null,
        state:          st || 'MN',
        phone:          phone ? cleanPhone(phone) : null,
        email:          isValidEmail(email) ? email.toLowerCase() : null,
        license_status: 'active',
        raw_data:       {
          bus_pers: row.Bus_Pers || '',
          dba_name: row.DBA_Name || '',
          zip: row.Zip || '',
          addr: row.Addr1 || '',
          source_file: label,
          exp_date: expRaw,
        },
        status: 'pending',
      });
    }
  }

  console.log('\n📊 License type breakdown (top 15):');
  Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([t,c]) =>
    console.log(`  ${t.padEnd(38)} ${String(c).padStart(7)}`));

  const withEmail = staged.filter(r => r.email).length;
  console.log(`\n  Not issued / terminated:    ${notIssued.toLocaleString()}`);
  console.log(`  Expired:                    ${expired.toLocaleString()}`);
  console.log(`  Missing name/license#:      ${missing.toLocaleString()}`);
  console.log(`  Cross-file dupes removed:   ${dupes.toLocaleString()}`);
  console.log(`  STAGED:                     ${staged.length.toLocaleString()}`);
  console.log(`  Records with email:         ${withEmail.toLocaleString()} (${Math.round(withEmail/staged.length*100)}%)`);

  const importRun = await sbPost('registry_imports', {
    source_state: 'MN', import_type: 'scrape', status: 'running',
    records_fetched: staged.length,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run'); process.exit(1); }
  console.log(`\n  Import run ID: ${importId}\n`);

  console.log(`⬆️  Staging ${staged.length.toLocaleString()} records...`);
  await bulkInsert('registry_staging', staged.map(r => ({ ...r, import_id: importId })));

  await sbPatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete', records_fetched: staged.length, completed_at: new Date().toISOString(),
  });

  const scoreRows = await sbGet(`registry_staging?import_id=eq.${importId}&select=quality_score&limit=1000&offset=0`);
  const dist = {};
  if (Array.isArray(scoreRows)) for (const r of scoreRows) dist[r.quality_score]=(dist[r.quality_score]||0)+1;
  const promotable = Object.entries(dist).filter(([s])=>Number(s)>=6).reduce((a,[,c])=>a+c,0);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  STAGED:                ${staged.length.toLocaleString()}`);
  console.log(`  With email:            ${withEmail.toLocaleString()}`);
  console.log(`  Quality distribution:  ${JSON.stringify(dist)}`);
  console.log(`  Promotable (>= 6):     ${promotable.toLocaleString()}`);
  console.log(`  Import run ID:         ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => { console.error('\n❌ Import failed:', err.message); process.exit(1); });
