#!/usr/bin/env node
// Session 4 — log blocked import run for Arizona.
// roc.az.gov sits behind a Cloudflare WAF challenge (403 + cf-mitigated:
// challenge on every request, including robots.txt) — same pattern as
// Georgia (Session 2). Its license-search backend
// (azroc.my.site.com/AZRoc/s/contractor-search) is a Salesforce Experience
// Cloud Lightning SPA whose CSP whitelists Google reCAPTCHA, so no
// server-rendered search or bulk export is reachable either.
// See lib/scraper/arizona.ts. Does NOT touch registry_staging.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
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

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Session 4 — Logging blocked import run (AZ)');
  console.log('═══════════════════════════════════════════════════════\n');

  const importRun = await supabasePost('registry_imports', {
    source_state: 'AZ',
    import_type: 'scrape',
    status: 'blocked',
    robots_blocked: true,
    records_fetched: 0,
    error_message:
      "roc.az.gov returned HTTP 403 with cf-mitigated: challenge on every " +
      "request, including robots.txt — entire domain sits behind a " +
      "Cloudflare WAF/JS challenge (same pattern as Georgia, Session 2). " +
      "Its license-search backend (azroc.my.site.com/AZRoc/s/contractor-search) " +
      "is a Salesforce Experience Cloud Lightning SPA whose CSP whitelists " +
      "Google reCAPTCHA — no server-rendered search or bulk export is reachable. " +
      "Use CSV upload fallback for Arizona.",
    completed_at: new Date().toISOString(),
  });
  const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
  if (!importId) {
    console.error('  ✗ AZ: failed to log import run:', importRun);
    process.exit(1);
  }
  console.log(`  ✓ AZ: blocked, import run ${importId}`);
  console.log('\nDone. 0 records staged for AZ.');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
