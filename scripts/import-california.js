#!/usr/bin/env node
// California CSLB Master License File import — Session 4
// Usage: node scripts/import-california.js
// Walks the CSLB Public Data Portal ASP.NET postback flow to download the
// free Master License File CSV (~243K rows), filters to active
// (PrimaryStatus='CLEAR' AND ExpirationDate >= today) licenses, dedupes
// within CA on LicenseNo, and stages to registry_staging. Does NOT promote.
// Reports counts only.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const CSLB_BASE = 'https://www.cslb.ca.gov';
const PORTAL_URL = `${CSLB_BASE}/onlineservices/dataportal/ContractorList`;
const UA = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTTP helper with cookie jar + manual redirect control ──────────────────────

function request(url, { method = 'GET', body, cookies = '', followRedirects = true } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*',
    };
    if (cookies) headers['Cookie'] = cookies;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(u, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const newCookies = (res.headers['set-cookie'] || [])
          .map(c => c.split(';')[0]);
        if (followRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const mergedCookies = mergeCookies(cookies, newCookies);
          return resolve(request(new URL(res.headers.location, url).toString(), { method: 'GET', cookies: mergedCookies, followRedirects }));
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
          cookies: mergeCookies(cookies, newCookies),
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function mergeCookies(existing, newCookieStrs) {
  const jar = new Map();
  for (const c of (existing ? existing.split('; ').filter(Boolean) : [])) {
    const [name, ...rest] = c.split('=');
    jar.set(name, rest.join('='));
  }
  for (const c of newCookieStrs) {
    const [name, ...rest] = c.split('=');
    jar.set(name, rest.join('='));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractAspState(html) {
  const get = (name) => {
    const m = html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`));
    return m ? m[1] : '';
  };
  return {
    viewState: get('__VIEWSTATE'),
    viewStateGenerator: get('__VIEWSTATEGENERATOR'),
    eventValidation: get('__EVENTVALIDATION'),
  };
}

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

function* iterCsvRows(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (!lines.length) return;
  const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
    yield row;
  }
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
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
    process.stdout.write(`  Staged ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}\r`);
  }
  console.log('');
  return inserted;
}

// ── CSLB postback dance ──────────────────────────────────────────────────────────

async function getCsvDownloadUrl() {
  // Step 1: initial GET
  const res1 = await request(PORTAL_URL);
  if (res1.status !== 200) throw new Error(`Initial GET failed: HTTP ${res1.status}`);
  let cookies = res1.cookies;
  const state1 = extractAspState(res1.body);

  await delay(2000);

  // Step 2: select "License Master" (ddlStatus=M) — autopostback
  const body2 = new URLSearchParams({
    __EVENTTARGET: 'ctl00$MainContent$ddlStatus',
    __EVENTARGUMENT: '',
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __EVENTVALIDATION: state1.eventValidation,
    'ctl00$MainContent$ddlStatus': 'M',
  }).toString();

  const res2 = await request(PORTAL_URL, { method: 'POST', body: body2, cookies });
  if (res2.status !== 200) throw new Error(`ddlStatus postback failed: HTTP ${res2.status}`);
  cookies = res2.cookies;
  const state2 = extractAspState(res2.body);

  if (!/lbMasterCSV/.test(res2.body)) {
    throw new Error('Master License CSV download link not found — CSLB portal layout may have changed.');
  }

  await delay(2000);

  // Step 3: click "download" (lbMasterCSV) — returns a 302 to the file URL
  const body3 = new URLSearchParams({
    __EVENTTARGET: 'ctl00$MainContent$lbMasterCSV',
    __EVENTARGUMENT: '',
    __VIEWSTATE: state2.viewState,
    __VIEWSTATEGENERATOR: state2.viewStateGenerator,
    __EVENTVALIDATION: state2.eventValidation,
    'ctl00$MainContent$ddlStatus': 'M',
  }).toString();

  const res3 = await request(PORTAL_URL, { method: 'POST', body: body3, cookies, followRedirects: false });
  cookies = res3.cookies;
  if (!res3.headers.location) throw new Error(`Expected redirect to download URL, got HTTP ${res3.status}`);

  return { url: new URL(res3.headers.location, CSLB_BASE).toString(), cookies };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  California CSLB — Master License File Import (Session 4)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Fetching CSLB Public Data Portal (ASP.NET postback flow)...');
  const { url: downloadUrl, cookies } = await getCsvDownloadUrl();
  console.log(`  ✓ Download URL: ${downloadUrl}\n`);

  await delay(2000);

  console.log('Downloading Master License File CSV (~75MB)...');
  const fileRes = await request(downloadUrl, { cookies });
  if (fileRes.status !== 200) throw new Error(`CSV download failed: HTTP ${fileRes.status}`);
  console.log(`  ✓ Downloaded ${(fileRes.body.length / 1024 / 1024).toFixed(1)} MB\n`);

  console.log('Parsing and filtering to active licenses (PrimaryStatus=CLEAR, ExpirationDate >= today)...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const licenseMap = new Map();
  let totalRawRows = 0;
  let notClear = 0;
  let expiredOrBadDate = 0;
  let missingFields = 0;
  let dupesWithinCA = 0;
  const byClassification = {};

  for (const row of iterCsvRows(fileRes.body)) {
    totalRawRows++;

    if ((row['primarystatus'] || '').trim().toUpperCase() !== 'CLEAR') { notClear++; continue; }

    const expiration = parseDate(row['expirationdate']);
    if (!expiration || expiration < today) { expiredOrBadDate++; continue; }

    const licenseNumber = (row['licenseno'] || '').trim();
    const businessName = (row['fullbusinessname'] || row['businessname'] || '').trim();
    if (!licenseNumber || !businessName) { missingFields++; continue; }

    const key = `${licenseNumber}:CA`;
    if (licenseMap.has(key)) { dupesWithinCA++; continue; }

    const classification = (row['classifications(s)'] || '').trim();
    const phone = (row['businessphone'] || '').trim();

    licenseMap.set(key, {
      source_state: 'CA',
      business_name: businessName,
      license_type: classification || null,
      license_number: licenseNumber,
      city: row['city']?.trim() || null,
      state: 'CA',
      phone: phone ? cleanPhone(phone) : null,
      email: null,
      license_status: 'active',
      raw_data: {
        county: row['county'] || '',
        zip_code: row['zipcode'] || '',
        mailing_address: row['mailingaddress'] || '',
        business_type: row['businesstype'] || '',
        issue_date: row['issuedate'] || '',
        expiration_date: row['expirationdate'] || '',
        primary_status: row['primarystatus'] || '',
        secondary_status: row['secondarystatus'] || '',
        asbestos_reg: row['asbestosreg'] || '',
      },
      status: 'pending',
    });

    for (const c of classification.split(/[,|]/)) {
      const code = c.trim();
      if (code) byClassification[code] = (byClassification[code] || 0) + 1;
    }
  }

  const staged = [...licenseMap.values()];

  console.log(`\n📊 Top classifications among staged records:`);
  for (const [code, count] of Object.entries(byClassification).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${code.padEnd(8)} ${String(count).padStart(7)}`);
  }

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'CA',
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
  console.log(`  Total raw rows in Master License File: ${totalRawRows.toLocaleString()}`);
  console.log(`  Removed (PrimaryStatus != CLEAR):       ${notClear.toLocaleString()}`);
  console.log(`  Removed (expired or bad date):          ${expiredOrBadDate.toLocaleString()}`);
  console.log(`  Removed (missing name/license#):        ${missingFields.toLocaleString()}`);
  console.log(`  Within-CA duplicate licenses:           ${dupesWithinCA.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                                 ${staged.length.toLocaleString()}`);
  console.log(`  Import run ID:                          ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
