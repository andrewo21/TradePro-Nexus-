#!/usr/bin/env node
// Promote registry_staging records to unclaimed_profiles for a given state.
// Uses service role key directly — no browser session needed.
// Usage: node scripts/promote-state.js CT
//        node scripts/promote-state.js IL
//        node scripts/promote-state.js --all   (promotes all pending states)

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https = require('https');
const { URL } = require('url');

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing env vars'); process.exit(1); }

const QUALITY_THRESHOLD = 6;
const BATCH_SIZE        = 500;
const delay             = ms => new Promise(r => setTimeout(r, ms));

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

function sbRpc(fn, args) {
  return sbRequest('POST', `rpc/${fn}`, args);
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

async function getPendingCount(stateCode) {
  const path = `registry_staging?select=id&status=eq.pending${stateCode ? `&source_state=eq.${stateCode}` : ''}&limit=1`;
  const { body } = await sbRequest('GET', `registry_staging?select=id&status=eq.pending${stateCode ? `&source_state=eq.${stateCode}` : ''}&limit=1&prefer=count=exact`);
  // Use head request for count
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/registry_staging`);
    url.searchParams.set('select', 'id');
    url.searchParams.set('status', 'eq.pending');
    if (stateCode) url.searchParams.set('source_state', `eq.${stateCode}`);
    const req = https.request(url, {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact',
      },
    }, (res) => {
      const range = res.headers['content-range'] || '';
      const match = range.match(/\/(\d+)/);
      resolve(match ? parseInt(match[1]) : 0);
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchBatch(stateCode) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/registry_staging`);
  url.searchParams.set('select', '*');
  url.searchParams.set('status', 'eq.pending');
  if (stateCode) url.searchParams.set('source_state', `eq.${stateCode}`);
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

async function promoteState(stateCode) {
  const label = stateCode || 'ALL';
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  Promoting ${label} pending records → unclaimed_profiles`);
  console.log(`${'═'.repeat(55)}\n`);

  const total = await getPendingCount(stateCode);
  console.log(`  Pending records: ${total.toLocaleString()}\n`);
  if (!total) { console.log('  Nothing to promote.'); return; }

  let promoted = 0, duplicate = 0, flagged = 0, belowThreshold = 0, errors = 0;
  let batchNum = 0;

  for (;;) {
    const batch = await fetchBatch(stateCode);
    if (!batch.length) break;
    batchNum++;

    for (const record of batch) {
      try {
        if ((record.quality_score ?? 0) < QUALITY_THRESHOLD) {
          await updateStaging(record.id, { status: 'skipped', flagged_for_review: true, review_reason: ['below_quality_threshold'] });
          belowThreshold++;
          continue;
        }

        const { body: dupResult } = await sbRpc('check_registry_duplicate', {
          p_license_number: record.license_number,
          p_source_state:   record.source_state,
          p_business_name:  record.business_name,
          p_city:           record.city,
          p_phone:          record.phone,
        });

        if (Array.isArray(dupResult) && dupResult.length) {
          const dup = dupResult[0];
          if (dup.duplicate_type === 'exact_license') {
            await updateStaging(record.id, { status: 'duplicate', duplicate_type: 'exact_license', duplicate_of: dup.duplicate_id });
            duplicate++;
          } else {
            await updateStaging(record.id, { status: 'flagged', flagged_for_review: true, duplicate_type: dup.duplicate_type, duplicate_of: dup.duplicate_id, review_reason: [dup.duplicate_type] });
            flagged++;
          }
          continue;
        }

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
          is_core_state:  true,
        });

        if (insertStatus === 201 || insertStatus === 200) {
          await updateStaging(record.id, { status: 'promoted' });
          promoted++;
        } else if (insertBody?.code === '23505') {
          await updateStaging(record.id, { status: 'duplicate', duplicate_type: 'exact_license' });
          duplicate++;
        } else {
          await updateStaging(record.id, { status: 'error', error_detail: JSON.stringify(insertBody).slice(0, 200) });
          errors++;
        }

      } catch (err) {
        await updateStaging(record.id, { status: 'error', error_detail: err.message?.slice(0, 200) });
        errors++;
      }
    }

    const done = promoted + duplicate + flagged + belowThreshold + errors;
    process.stdout.write(`  Batch ${batchNum}: ${done.toLocaleString()} processed (${promoted} promoted, ${duplicate} dup, ${flagged} flagged, ${belowThreshold} low-Q, ${errors} err)\r`);
    await delay(100);
  }

  console.log(`\n\n${'═'.repeat(55)}`);
  console.log(`  PROMOTE COMPLETE — ${label}`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  Promoted:       ${promoted.toLocaleString()}`);
  console.log(`  Duplicate:      ${duplicate.toLocaleString()}`);
  console.log(`  Flagged:        ${flagged.toLocaleString()}`);
  console.log(`  Below quality:  ${belowThreshold.toLocaleString()}`);
  console.log(`  Errors:         ${errors.toLocaleString()}`);
  console.log(`${'═'.repeat(55)}\n`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node scripts/promote-state.js <STATE_CODE> | --all'); process.exit(1); }

  if (arg === '--all') {
    await promoteState(null);
  } else {
    await promoteState(arg.toUpperCase());
  }
}

main().catch(err => { console.error('\n❌ Promote failed:', err.message); process.exit(1); });
