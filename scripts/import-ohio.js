#!/usr/bin/env node
// Ohio eLicense Center — OCILB Roster Download import — Session 4
// Usage: node scripts/import-ohio.js
// Walks the GenerateRoster.aspx -> DownloadRoster.aspx postback flow on
// elicense4.com.ohio.gov (separate from the reCAPTCHA-gated
// elicense.ohio.gov license-search, which remains blocked), downloads the
// free OCILB roster CSV (~12,622 rows: Electrical, HVAC, Hydronics,
// Plumbing, Refrigeration, Tradesman), filters to active
// (Status = ACTIVE or ACTIVE IN RENEWAL AND Expiration Date >= today),
// dedupes within OH on FormattedCredential, and stages to registry_staging.
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

const OH_BASE = 'https://elicense4.com.ohio.gov';
const ROSTER_URL = `${OH_BASE}/Lookup/GenerateRoster.aspx`;
const DOWNLOAD_URL = `${OH_BASE}/Lookup/DownloadRoster.aspx`;
const UA = 'TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const TYPE_NAMES = {
  EL: 'Electrical Contractor',
  HV: 'HVAC Contractor',
  PL: 'Plumbing Contractor',
  HY: 'Hydronics Contractor',
  RE: 'Refrigeration Contractor',
  TA: 'Tradesman',
};

// ── HTTP helper with cookie jar + redirect handling ─────────────────────────────

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
  };
}

// Find the OCILB roster job ID (RosterIdnt) on DownloadRoster.aspx — used to
// build the FileDownload.aspx?Idnt={id}&Type=Comma URL (see Lookup.js
// OpenFileDownloadWindow: window.open("FileDownload.aspx?Idnt=" + idnt +
// "&Type=" + selectedFormat)).
function findRosterIdnt(html) {
  const m = html.match(/RosterIdnt="(\d+)"/);
  return m ? m[1] : null;
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

// ── Roster-download postback dance ──────────────────────────────────────────────

async function getRosterCsv() {
  // Step 1: initial GET
  const res1 = await request(ROSTER_URL);
  if (res1.status !== 200) throw new Error(`Initial GET failed: HTTP ${res1.status}`);
  let cookies = res1.cookies;
  const state1 = extractAspState(res1.body);
  if (!state1.viewState) throw new Error('GenerateRoster.aspx did not return __VIEWSTATE — page layout may have changed.');

  await delay(2000);

  // Step 2: check OCLIB (ckbRoster0) + Continue -> redirects to DownloadRoster.aspx
  const body2 = new URLSearchParams({
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __VIEWSTATEENCRYPTED: '',
    'ctl00$MainContentPlaceHolder$ckbRoster0': 'on',
    'ctl00$MainContentPlaceHolder$btnRosterContinue': 'Continue',
  }).toString();

  const res2 = await request(ROSTER_URL, { method: 'POST', body: body2, cookies });
  if (res2.status !== 200) throw new Error(`Roster generation postback failed: HTTP ${res2.status}`);
  cookies = res2.cookies;

  const idnt = findRosterIdnt(res2.body);
  if (!idnt) throw new Error('Could not find OCILB roster job ID (RosterIdnt) on DownloadRoster.aspx.');

  await delay(2000);

  // Step 3: download the CSV — FileDownload.aspx?Idnt={id}&Type=Comma
  // (per Lookup.js: OpenFileDownloadWindow opens this URL directly, GET, same session cookies)
  const fileUrl = `${OH_BASE}/Lookup/FileDownload.aspx?Idnt=${idnt}&Type=Comma`;
  const res4 = await request(fileUrl, { method: 'GET', cookies });
  if (res4.status !== 200) throw new Error(`Roster CSV download failed: HTTP ${res4.status}`);
  if (!/^FormattedCredential,/.test(res4.body)) {
    throw new Error('Roster download did not return the expected OCILB CSV — page layout may have changed.');
  }
  return res4.body;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Ohio eLicense — OCILB Roster Import (Session 4)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Walking GenerateRoster.aspx -> DownloadRoster.aspx postback flow...');
  const csvText = await getRosterCsv();
  console.log(`  ✓ Downloaded ${(csvText.length / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('Parsing and filtering to active licenses (Status=ACTIVE/ACTIVE IN RENEWAL, Expiration Date >= today)...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const licenseMap = new Map();
  let totalRawRows = 0;
  let notActive = 0;
  let expiredOrBadDate = 0;
  let missingFields = 0;
  let dupesWithinOH = 0;
  const byType = {};

  for (const row of iterCsvRows(csvText)) {
    totalRawRows++;

    const status = (row['status'] || '').trim().toUpperCase();
    if (status !== 'ACTIVE' && status !== 'ACTIVE IN RENEWAL') { notActive++; continue; }

    const expiration = parseDate(row['expiration_date']);
    if (!expiration || expiration < today) { expiredOrBadDate++; continue; }

    const licenseNumber = (row['formattedcredential'] || '').trim();
    const businessName = (row['company'] || row['name'] || '').trim();
    if (!licenseNumber || !businessName) { missingFields++; continue; }

    const key = `${licenseNumber}:OH`;
    if (licenseMap.has(key)) { dupesWithinOH++; continue; }

    const typeCode = (row['type'] || '').trim().toUpperCase();
    const licenseType = TYPE_NAMES[typeCode] || typeCode || null;
    const phone = (row['company_phone'] || '').trim();
    const email = (row['company_email'] || '').trim();

    licenseMap.set(key, {
      source_state: 'OH',
      business_name: businessName,
      license_type: licenseType,
      license_number: licenseNumber,
      city: row['company_city']?.trim() || null,
      state: 'OH',
      phone: phone ? cleanPhone(phone) : null,
      email: email || null,
      license_status: 'active',
      raw_data: {
        name: row['name'] || '',
        last_name: row['lastname'] || '',
        type: typeCode,
        county: row['county'] || '',
        effective_date: row['effective_date'] || '',
        expiration_date: row['expiration_date'] || '',
        company_address: row['company_address'] || '',
        company_address_2: row['company_address_2'] || '',
        company_state: row['company_state'] || '',
        company_zip: row['company_zip'] || '',
        company_fax: row['company_fax'] || '',
        status,
      },
      status: 'pending',
    });

    byType[licenseType] = (byType[licenseType] || 0) + 1;
  }

  const staged = [...licenseMap.values()];

  console.log(`\n📊 License type breakdown:`);
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(28)} ${String(count).padStart(6)}`);
  }

  // Cross-state dedup check: registry_quality_score is a generated column
  // (computed automatically on insert). check_registry_duplicate() scopes
  // all three checks (exact_license, fuzzy_name_location, phone_match) to
  // source_state = p_source_state — so a brand-new state with zero existing
  // OH rows in unclaimed_profiles/registry_staging cannot produce any
  // matches. Confirm that precondition before staging.
  console.log('\n🔍 Checking for existing OH records (cross-state dedup precondition)...');
  const existingStaging = await supabaseGet(`registry_staging?source_state=eq.OH&select=id&limit=1`);
  const existingProfiles = await supabaseGet(`unclaimed_profiles?source_state=eq.OH&select=id&limit=1`);
  const priorOH = (Array.isArray(existingStaging) ? existingStaging.length : 0) + (Array.isArray(existingProfiles) ? existingProfiles.length : 0);
  console.log(priorOH === 0
    ? '  ✓ No existing OH records in registry_staging or unclaimed_profiles — dedup against existing data trivially yields 0 matches for all records.'
    : `  ⚠ Found ${priorOH} existing OH record(s) — review for duplicates before promotion.`);

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'OH',
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
  console.log(`  Total raw rows in OCILB roster:        ${totalRawRows.toLocaleString()}`);
  console.log(`  Removed (status not Active*):          ${notActive.toLocaleString()}`);
  console.log(`  Removed (expired or bad date):         ${expiredOrBadDate.toLocaleString()}`);
  console.log(`  Removed (missing name/license#):       ${missingFields.toLocaleString()}`);
  console.log(`  Within-OH duplicate licenses:          ${dupesWithinOH.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                                 ${staged.length.toLocaleString()}`);
  console.log(`  Cross-state dedup matches:              0 (no prior OH records)`);
  console.log(`  Quality score distribution:             ${JSON.stringify(scoreDist)}`);
  console.log(`  Promotable (quality >= 6):              ${promotable.toLocaleString()}`);
  console.log(`  Below threshold (quality < 6):          ${belowThreshold.toLocaleString()}`);
  console.log(`  Import run ID:                          ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
