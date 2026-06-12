#!/usr/bin/env node
// Nevada State Contractors Board (NVSCB) — Contractor Listing import — Session 4
// Usage: node scripts/import-nevada.js
// Walks the ListingSearch.aspx ASP.NET postback flow (County=All,
// Classification=All), downloads the single-page ListingResults.aspx
// (~19K rows, ~52MB), filters to active (status starts with "Active" AND
// Expires >= today), and stages to registry_staging. Does NOT promote.
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

const NV_BASE = 'https://app.nvcontractorsboard.com';
const SEARCH_URL = `${NV_BASE}/Clients/nvscb/Public/ContractorListing/ListingSearch.aspx`;
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
          const nextUrl = resolveRedirect(res.headers.location, url);
          return resolve(request(nextUrl, { method: 'GET', cookies: mergedCookies, followRedirects }));
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

// The site's postback redirects to "//Clients/..." which `new URL()` would
// misparse as protocol-relative (host="Clients"). Collapse leading slashes
// to a single "/" so it resolves as an absolute path on the same host.
function resolveRedirect(location, base) {
  const normalized = location.replace(/^\/+/, '/');
  return new URL(normalized, base).toString();
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

// ── Field helpers ─────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&nbsp;?/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseDate(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseCityStateZip(raw) {
  if (!raw) return {};
  const m = raw.trim().match(/^(.*)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!m) return { city: raw.trim() || undefined };
  return { city: m[1].trim(), state: m[2], zip: m[3] };
}

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

// ── Parse the ListingResults.aspx DataGrid via per-field regex scans ──────────

function extractFieldMap(html, fieldId) {
  const map = new Map();
  const re = new RegExp(`id="[^"]*_${fieldId}_(\\d+)">([\\s\\S]*?)</span>`, 'g');
  let m;
  while ((m = re.exec(html)) !== null) {
    map.set(m[1], decodeEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')));
  }
  return map;
}

function extractClassificationsMap(html) {
  const map = new Map();
  const re = /id="[^"]*_lbClassifications_(\d+)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const items = m[2]
      .split(/<br\s*\/?>/i)
      .map(s => decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')))
      .filter(Boolean);
    map.set(m[1], items.join('; '));
  }
  return map;
}

function extractLicenseMap(html) {
  const map = new Map();
  const re = /id="[^"]*_lnkLicense_(\d+)"[^>]*>([^<]*)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    map.set(m[1], decodeEntities(m[2]));
  }
  return map;
}

function parseResultsHtml(html) {
  console.log('  Extracting fields from results page...');
  const businessName = extractFieldMap(html, 'lbBusinessName');
  const compoundStreet = extractFieldMap(html, 'lbCompoundStreet');
  const cityStateZip = extractFieldMap(html, 'lbCityStateZip');
  const phone = extractFieldMap(html, 'lbPhone');
  const limitation = extractFieldMap(html, 'lbLimitation');
  const expires = extractFieldMap(html, 'lbExpires');
  const monetaryLimit = extractFieldMap(html, 'lbLimit');
  const status = extractFieldMap(html, 'lbStatus');
  const classifications = extractClassificationsMap(html);
  const licenseNumber = extractLicenseMap(html);

  console.log(`  Found ${businessName.size} rows.`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const records = [];
  let notActive = 0;
  let expiredOrBadDate = 0;
  let missingFields = 0;
  const byClassification = {};

  for (const [i, name] of businessName) {
    const stat = status.get(i) || '';
    if (!/^active/i.test(stat)) { notActive++; continue; }

    const exp = parseDate(expires.get(i));
    if (!exp || exp < today) { expiredOrBadDate++; continue; }

    const licNo = licenseNumber.get(i) || '';
    if (!name.trim() || !licNo.trim()) { missingFields++; continue; }

    const csz = parseCityStateZip(cityStateZip.get(i));
    const ph = phone.get(i) || '';
    const cls = classifications.get(i) || '';

    records.push({
      source_state: 'NV',
      business_name: name.trim(),
      license_type: cls || null,
      license_number: licNo.trim(),
      city: csz.city || null,
      state: 'NV',
      phone: ph ? cleanPhone(ph) : null,
      email: null,
      license_status: 'active',
      raw_data: {
        street: compoundStreet.get(i) || '',
        zip_code: csz.zip || '',
        expires: expires.get(i) || '',
        monetary_limit: monetaryLimit.get(i) || '',
        limitation: limitation.get(i) || '',
        status: stat,
      },
      status: 'pending',
    });

    for (const c of cls.split(';')) {
      const code = c.trim().split(/\s+/)[0];
      if (code) byClassification[code] = (byClassification[code] || 0) + 1;
    }
  }

  return { records, totalRows: businessName.size, notActive, expiredOrBadDate, missingFields, byClassification };
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

// ── NVSCB postback dance ──────────────────────────────────────────────────────

async function getResultsUrl() {
  // Step 1: initial GET
  const res1 = await request(SEARCH_URL);
  if (res1.status !== 200) throw new Error(`Initial GET failed: HTTP ${res1.status}`);
  let cookies = res1.cookies;
  const state1 = extractAspState(res1.body);
  if (!state1.viewState) throw new Error('ListingSearch.aspx did not return __VIEWSTATE — page layout may have changed.');

  await delay(2000);

  // Step 2: County=All (0), Classification=All (0), click Search
  const body = new URLSearchParams({
    __EVENTTARGET: 'ctl00$ContentPlaceHolder1$btnSearch',
    __EVENTARGUMENT: '',
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __EVENTVALIDATION: state1.eventValidation,
    'ctl00$ContentPlaceHolder1$County': '0',
    'ctl00$ContentPlaceHolder1$App': '0',
  }).toString();

  const res2 = await request(SEARCH_URL, { method: 'POST', body, cookies, followRedirects: false });
  cookies = res2.cookies;
  if (!res2.headers.location) throw new Error(`Expected redirect to results page, got HTTP ${res2.status}`);

  return { url: resolveRedirect(res2.headers.location, SEARCH_URL), cookies };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Nevada NVSCB — Contractor Listing Import (Session 4)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Submitting NVSCB contractor search (County=All, Classification=All)...');
  const { url: resultsUrl, cookies } = await getResultsUrl();
  console.log(`  ✓ Results URL: ${resultsUrl}\n`);

  await delay(2000);

  console.log('Downloading results page (single page, ~19K rows)...');
  const res = await request(resultsUrl, { cookies });
  if (res.status !== 200) throw new Error(`Results page fetch failed: HTTP ${res.status}`);
  console.log(`  ✓ Downloaded ${(res.body.length / 1024 / 1024).toFixed(1)} MB\n`);

  const { records, totalRows, notActive, expiredOrBadDate, missingFields, byClassification } = parseResultsHtml(res.body);

  console.log(`\n📊 Top classifications among staged records:`);
  for (const [code, count] of Object.entries(byClassification).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${code.padEnd(8)} ${String(count).padStart(7)}`);
  }

  // Create import run
  console.log('\n🗄️  Creating import run...');
  const importRun = await supabasePost('registry_imports', {
    source_state: 'NV',
    import_type: 'scrape',
    status: 'running',
    records_fetched: totalRows,
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) { console.error('Failed to create import run:', importRun); process.exit(1); }
  console.log(`  Import run ID: ${importId}\n`);

  // Stage
  console.log(`⬆️  Staging ${records.length.toLocaleString()} records...`);
  const stagingRows = records.map(r => ({ ...r, import_id: importId }));
  await bulkInsert('registry_staging', stagingRows);

  await supabasePatch(`registry_imports?id=eq.${importId}`, {
    status: 'complete',
    records_fetched: totalRows,
    completed_at: new Date().toISOString(),
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAGING COMPLETE — Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total rows in results page:            ${totalRows.toLocaleString()}`);
  console.log(`  Removed (status not Active*):          ${notActive.toLocaleString()}`);
  console.log(`  Removed (expired or bad date):         ${expiredOrBadDate.toLocaleString()}`);
  console.log(`  Removed (missing name/license#):       ${missingFields.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  STAGED:                                 ${records.length.toLocaleString()}`);
  console.log(`  Import run ID:                          ${importId}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`IMPORT_ID=${importId}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
