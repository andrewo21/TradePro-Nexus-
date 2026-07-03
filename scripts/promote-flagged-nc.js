#!/usr/bin/env node
// Promotes NC registry_staging rows that were flagged during the initial promote run,
// after review confirmed the flags were false-positive duplicate matches (phone shared
// between an individual license and a related business entity, or fuzzy name matches
// against unrelated businesses). Two exact-name matches are excluded as genuine
// possible duplicates and left flagged for manual review.
// Usage: node scripts/promote-flagged-nc.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing env vars'); process.exit(1); }

const BATCH_SIZE = 500;
const delay      = ms => new Promise(r => setTimeout(r, ms));

// Held back for manual review — exact business-name matches against an existing record.
const EXCLUDED_IDS = new Set([
  'bc95d8ce-a68b-4331-8621-bdecac97ad1f', // Simpson Land Development LLC
  'c125a4bd-0433-4403-a7b4-93694c4e878e', // Charles Louis Moody, Jr.
]);

function sbRequest(method, path_, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path_}`);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };
    if (method === 'POST') headers['Prefer'] = 'return=representation';
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(url, { method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return String(raw).trim() || null;
}

function isValidEmail(e) {
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

async function fetchFlaggedBatch() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/registry_staging`);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'eq.flagged');
  url.searchParams.set('source_state', 'eq.NC');
  url.searchParams.set('order', 'id');
  url.searchParams.set('limit', String(BATCH_SIZE));

  return new Promise((resolve, reject) => {
    https.request(url, { method: 'GET', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } }); }
    ).on('error', reject).end();
  });
}

async function updateStaging(id, fields) {
  await sbRequest('PATCH', `registry_staging?id=eq.${id}`, fields);
}

async function main() {
  console.log('\nPromoting cleared NC flagged records (excluding 2 held for manual review)\n');

  let promoted = 0, skipped = 0, errors = 0;
  let batchNum = 0;

  for (;;) {
    const batch = (await fetchFlaggedBatch()).filter(r => !EXCLUDED_IDS.has(r.id));
    if (!batch.length) break;
    batchNum++;

    for (const record of batch) {
      try {
        const phone = record.phone ? cleanPhone(record.phone) : null;
        const email = record.email && isValidEmail(record.email) ? record.email.toLowerCase().trim() : null;

        const { status: insertStatus, body: insertBody } = await sbRequest('POST', 'unclaimed_profiles', {
          business_name:  record.business_name,
          license_type:   record.license_type,
          license_number: record.license_number,
          city:           record.city,
          state:          record.state || record.source_state,
          phone,
          email,
          source:         'state_registry',
          source_state:   record.source_state,
          quality_score:  record.quality_score,
          license_status: record.license_status,
          visible:        true,
        });

        if (insertStatus === 201 || insertStatus === 200) {
          await updateStaging(record.id, { status: 'promoted' });
          promoted++;
        } else if (insertBody?.code === '23505') {
          await updateStaging(record.id, { status: 'duplicate', duplicate_type: 'exact_license' });
          skipped++;
        } else {
          await updateStaging(record.id, { status: 'error', error_detail: JSON.stringify(insertBody).slice(0, 200) });
          errors++;
        }
      } catch (err) {
        await updateStaging(record.id, { status: 'error', error_detail: err.message?.slice(0, 200) });
        errors++;
      }
    }

    const done = promoted + skipped + errors;
    process.stdout.write(`  Batch ${batchNum}: ${done.toLocaleString()} processed (${promoted} promoted, ${skipped} skipped, ${errors} err)\r`);
    await delay(100);
  }

  console.log(`\n\nDone. Promoted: ${promoted.toLocaleString()}, Skipped: ${skipped}, Errors: ${errors}\n`);
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1); });
