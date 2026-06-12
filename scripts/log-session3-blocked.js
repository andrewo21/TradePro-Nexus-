#!/usr/bin/env node
// Session 3 — log blocked-state import runs for NY, PA, OH, IL.
// All four states were probed (see lib/scraper/{newyork,pennsylvania,ohio,illinois}.ts)
// and found to be CAPTCHA-gated or to have decommissioned search backends.
// This script records a `registry_imports` row per state with
// status='blocked', robots_blocked=true, records_fetched=0 — mirroring how
// GA/TN were logged in Session 2. Does NOT touch registry_staging.

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

const RUNS = [
  {
    source_state: 'NY',
    error_message:
      "appext20.dos.ny.gov/lcns_public search backend returned 404 Not Found " +
      "(\"page unavailable\" — system decommissioned) — the legacy ASP search " +
      "endpoints (bus_name_search_cursor_new, lic_name_search_cursor_new, " +
      "lcns_query.id_search_cursor) no longer work, even though the search form " +
      "pages (chk_load, bus_name_search_frm, etc.) still render. Use CSV upload " +
      "fallback for New York.",
  },
  {
    source_state: 'PA',
    error_message:
      "www.pals.pa.gov is an Angular SPA (bpoaApp) that loads reCAPTCHA v3 " +
      "(explicit render) on initial page load and gates license-verification " +
      "search behind it. No server-rendered result table or bulk export is " +
      "available, and we will not attempt to bypass reCAPTCHA. Use CSV upload " +
      "fallback for Pennsylvania.",
  },
  {
    source_state: 'OH',
    error_message:
      "elicense.ohio.gov/OH_VerifyLicense (Salesforce Experience Cloud / JSF) " +
      "embeds a Google reCAPTCHA (grecaptcha.render('verifyLandingCaptcha', ...)) " +
      "that gates the license search form. No server-side search is possible " +
      "without solving it, and no bulk data export is offered. Use CSV upload " +
      "fallback for Ohio.",
  },
  {
    source_state: 'IL',
    error_message:
      "online-dfpr.micropact.com/Lookup/LicenseLookup.aspx requires solving a " +
      "FormShield CAPTCHA (image + audio challenge) before the search form can " +
      "be submitted. idfpr.illinois.gov itself only publishes a monthly Active " +
      "License Report as PDF, not CSV/structured data. We will not bypass the " +
      "CAPTCHA. Use CSV upload fallback for Illinois.",
  },
];

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Session 3 — Logging blocked import runs (NY, PA, OH, IL)');
  console.log('═══════════════════════════════════════════════════════\n');

  for (const run of RUNS) {
    const importRun = await supabasePost('registry_imports', {
      source_state: run.source_state,
      import_type: 'scrape',
      status: 'blocked',
      robots_blocked: true,
      records_fetched: 0,
      error_message: run.error_message,
      completed_at: new Date().toISOString(),
    });
    const importId = Array.isArray(importRun) ? importRun[0]?.id : importRun?.id;
    if (!importId) {
      console.error(`  ✗ ${run.source_state}: failed to log import run:`, importRun);
      continue;
    }
    console.log(`  ✓ ${run.source_state}: blocked, import run ${importId}`);
  }

  console.log('\nDone. 0 records staged for NY, PA, OH, IL.');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
