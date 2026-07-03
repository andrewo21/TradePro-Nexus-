#!/usr/bin/env node
// One-time personal outreach to business_card contacts
// Usage: node scripts/send-personal-outreach.js
//        node scripts/send-personal-outreach.js --dry-run   (preview only, no sends)
//
// Sends from andrew@tradepronexus.com — NOT the cold outreach domain.
// Updates outreach_status = 'Contacted' + contacted_at after each successful send.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const https  = require('https');
const { URL } = require('url');

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENDGRID_KEY    = process.env.SENDGRID_API_KEY_NEXUS;
const DRY_RUN         = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing Supabase env vars'); process.exit(1); }
if (!SENDGRID_KEY && !DRY_RUN)     { console.error('Missing SENDGRID_API_KEY_NEXUS'); process.exit(1); }

const FROM_EMAIL = 'andrew@tradepronexus.com';
const FROM_NAME  = 'Andrew O\'Neill';
const SUBJECT    = 'I built something for the trades.';
const delay      = ms => new Promise(r => setTimeout(r, ms));

// ── Extract first name ───────────────────────────────────────────────────────
function firstName(name) {
  if (!name || !name.trim()) return 'there';
  // Handle "Frank / Maria" → "Frank"
  const cleaned = name.split('/')[0].trim();
  // Get first word, skip if it looks like an initial ("M.")
  const parts = cleaned.split(/\s+/);
  const first = parts[0];
  if (first.length <= 2 && first.endsWith('.')) return parts[1] || cleaned;
  return first;
}

// ── Build email HTML ─────────────────────────────────────────────────────────
function buildHtml(fname) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:40px 24px;max-width:560px;margin:0 auto;display:block;">

  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">
    Hey ${fname},
  </p>

  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">
    We crossed paths at some point along the way in construction. I wanted to reach out personally.
  </p>

  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1a1a1a;">
    I spent the last few months building <strong>TradePro Nexus</strong>, a free verified marketplace
    for construction trade professionals. 828,487 licensed contractors already in the directory
    across 16 states.
  </p>

  <p style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#1a1a1a;">
    I would love for you to be one of the first to join. Sign up free at
    <a href="https://www.tradepronexus.com" style="color:#f97316;text-decoration:none;font-weight:600;">tradepronexus.com</a>.
  </p>

  <p style="margin:0 0 4px;font-size:15px;color:#1a1a1a;">Andrew O'Neill</p>
  <p style="margin:0 0 4px;font-size:14px;color:#475569;">Founder, TradePro Nexus</p>
  <p style="margin:0 0 4px;font-size:14px;color:#475569;">
    <a href="https://www.tradepronexus.com" style="color:#475569;">tradepronexus.com</a>
  </p>
  <p style="margin:0;font-size:14px;color:#475569;">(561) 247-1381</p>

</td></tr>
</table>
</body>
</html>`;
}

// ── Build plain text ─────────────────────────────────────────────────────────
function buildText(fname) {
  return `Hey ${fname},

We crossed paths at some point along the way in construction. I wanted to reach out personally.

I spent the last few months building TradePro Nexus, a free verified marketplace for construction trade professionals. 828,487 licensed contractors already in the directory across 16 states.

I would love for you to be one of the first to join. Sign up free at tradepronexus.com.

Andrew O'Neill
Founder, TradePro Nexus
tradepronexus.com
(561) 247-1381`;
}

// ── SendGrid send ────────────────────────────────────────────────────────────
async function sendEmail(toEmail, toName, fname) {
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: toEmail, name: toName || undefined }] }],
    from:     { email: FROM_EMAIL, name: FROM_NAME },
    reply_to: { email: FROM_EMAIL, name: FROM_NAME },
    subject:  SUBJECT,
    content: [
      { type: 'text/plain', value: buildText(fname) },
      { type: 'text/html',  value: buildHtml(fname) },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(new URL('https://api.sendgrid.com/v3/mail/send'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
function sbGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    https.request(url, { method: 'GET', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } }); }
    ).on('error', reject).end();
  });
}

function sbPatch(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject); req.write(payload); req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(DRY_RUN ? '  PERSONAL OUTREACH — DRY RUN' : '  PERSONAL OUTREACH — LIVE SEND');
  console.log('═══════════════════════════════════════════════════════\n');

  const contacts = await sbGet(
    "personal_contacts?source=eq.business_card&outreach_status=eq.Not%20Contacted&email=not.is.null&select=id,name,company,email&order=row_number"
  );

  if (!Array.isArray(contacts) || !contacts.length) {
    console.log('  No eligible contacts found.');
    return;
  }

  console.log(`  Eligible contacts:  ${contacts.length}`);
  console.log(`  From:               ${FROM_EMAIL}`);
  console.log(`  Subject:            ${SUBJECT}\n`);

  if (DRY_RUN) {
    console.log('  DRY RUN — first 5 would-be sends:');
    contacts.slice(0, 5).forEach(c => {
      const fname = firstName(c.name);
      console.log(`    → ${c.email} | Hey ${fname}, | (${c.company})`);
    });
    console.log(`\n  Full list: ${contacts.length} contacts would be emailed.\n`);
    return;
  }

  let sent = 0, failed = 0, errors = [];

  for (const contact of contacts) {
    const fname = firstName(contact.name);

    try {
      const result = await sendEmail(contact.email, contact.name || undefined, fname);

      if (result.ok) {
        // Mark contacted immediately
        await sbPatch(`personal_contacts?id=eq.${contact.id}`, {
          outreach_status: 'Contacted',
          contacted_at:    new Date().toISOString(),
        });
        sent++;
        process.stdout.write(`  ✓ ${String(sent).padStart(3)}  ${contact.email.padEnd(45)} Hey ${fname},\n`);
      } else {
        failed++;
        errors.push({ email: contact.email, status: result.status, body: result.body.slice(0, 120) });
        console.log(`  ✗ FAILED ${contact.email} — ${result.status}: ${result.body.slice(0, 80)}`);
      }
    } catch (err) {
      failed++;
      errors.push({ email: contact.email, error: err.message });
      console.log(`  ✗ ERROR  ${contact.email} — ${err.message}`);
    }

    // 3 sends/sec — well within SendGrid limits, avoids bursting
    await delay(333);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SEND COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Sent successfully:  ${sent}`);
  console.log(`  Failed:             ${failed}`);
  if (errors.length) {
    console.log('\n  Failed sends:');
    errors.forEach(e => console.log(`    ${e.email}: ${e.status || ''} ${e.body || e.error || ''}`));
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('\n❌ Script failed:', err.message); process.exit(1); });
