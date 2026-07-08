import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Outreach batch sender ─────────────────────────────────────────────────────
// Triggered hourly by pg_cron (job "send-outreach-batch"). Sends a CAN-SPAM
// compliant "claim your free listing" email to unclaimed_profiles that:
//   - have not been contacted yet (no outreach_log row)
//   - are outreach_eligible, visible, unclaimed, and have an email on file
//
// SAFETY: the FIRST thing this function does is check admin_settings.outreach_enabled.
// If it is not exactly "true", the function no-ops and sends nothing.
//
// ── Fully automatic state queue ──────────────────────────────────────────────
// admin_settings.outreach_queue_json is an ordered list of phases, e.g.
//   [{"state":"NC","mode":"new"},{"state":"NJ","mode":"new"},
//    {"state":"FL","mode":"resend"},
//    {"state":"VA","mode":"new","requires_flag":"outreach_va_bounce_confirmed"}]
// admin_settings.outreach_queue_index tracks which phase is currently active.
// When a phase's candidate pool hits zero, the index auto-advances to the next
// phase in the SAME run (no manual outreach_state_filter flipping needed).
// A phase with requires_flag only proceeds once that admin_settings key is
// exactly "true" -- e.g. VA stays paused until a human confirms the SendGrid
// bounce rate directly and flips outreach_va_bounce_confirmed themselves.
// mode "resend" targets FL records that already got Email 1 (via
// get_fl_resend_batch), announcing the fixed one-tap claim flow -- distinct
// from mode "new", which can only ever select records with zero outreach_log
// history (via get_next_outreach_batch). OH is hard-excluded inside
// get_next_outreach_batch itself and can never appear in any phase.

const SITE_URL          = "https://www.tradepronexus.com";
const SENDGRID_API_KEY  = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "outreach@mail.tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";

type QueuePhase = { state: string; mode: "new" | "resend"; requires_flag?: string };

function buildEmailHtml(opts: {
  sourceState: string;
  claimUrl: string;
  unsubscribeUrl: string;
  removeUrl: string;
  physicalAddress: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:560px;">
  <tr><td style="padding-bottom:24px;">
    <span style="font-size:18px;font-weight:700;color:#0f172a;">TradePro</span><span style="font-size:18px;font-weight:700;color:#f97316;">Nexus</span>
  </td></tr>
  <tr><td style="padding-bottom:20px;color:#1e293b;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">My name is Andrew O&rsquo;Neill. I spent 30 years in commercial construction before building TradePro Nexus &mdash; a free directory for licensed trade professionals.</p>
    <p style="margin:0 0 16px;">Your license is already listed in our directory because it&rsquo;s public record. I wanted to make sure you knew it was there and give you the chance to add your photo, crew size, certifications, and availability so GCs searching your area can find you.</p>
    <p style="margin:0 0 24px;">It takes about 2 minutes and it&rsquo;s completely free. No credit card, no subscription, no catch.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#f97316;border-radius:10px;">
        <a href="${opts.claimUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">View your free listing &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;color:#1e293b;font-size:15px;">Andrew O&rsquo;Neill</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">Founder, TradePro Nexus</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">30-Year Construction Veteran</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">tradepronexus.com</p>
    <p style="margin:0;color:#64748b;font-size:13px;">(561) 247-1381</p>
  </td></tr>
  <tr><td style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
    <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">TradePro Technologies LLC &middot; ${opts.physicalAddress}</p>
    <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">This email is a commercial advertisement. Your listing was sourced from public ${opts.sourceState} state licensing records.</p>
    <p style="margin:0;color:#94a3b8;font-size:11px;">
      <a href="${opts.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${opts.removeUrl}" style="color:#94a3b8;text-decoration:underline;">Remove My Listing</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// FL re-send: they may have seen an outreach email from us before -- this one
// leads with what changed (claiming used to be broken, now it's one tap).
function buildResendEmailHtml(opts: {
  sourceState: string;
  claimUrl: string;
  unsubscribeUrl: string;
  removeUrl: string;
  physicalAddress: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:560px;">
  <tr><td style="padding-bottom:24px;">
    <span style="font-size:18px;font-weight:700;color:#0f172a;">TradePro</span><span style="font-size:18px;font-weight:700;color:#f97316;">Nexus</span>
  </td></tr>
  <tr><td style="padding-bottom:20px;color:#1e293b;font-size:15px;line-height:1.7;">
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">You may have gotten an email from me a while back about your listing on TradePro Nexus. If claiming it gave you trouble, that was a real bug on our end, not you.</p>
    <p style="margin:0 0 16px;"><strong>It's fixed now.</strong> Claiming your listing is one tap &mdash; no forms, no typing your email, nothing to fill out. Just confirm it's you.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#f97316;border-radius:10px;">
        <a href="${opts.claimUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">Claim my free listing &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;color:#1e293b;font-size:15px;">Andrew O&rsquo;Neill</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">Founder, TradePro Nexus</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">30-Year Construction Veteran</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">tradepronexus.com</p>
    <p style="margin:0;color:#64748b;font-size:13px;">(561) 247-1381</p>
  </td></tr>
  <tr><td style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
    <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">TradePro Technologies LLC &middot; ${opts.physicalAddress}</p>
    <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">This email is a commercial advertisement. Your listing was sourced from public ${opts.sourceState} state licensing records.</p>
    <p style="margin:0;color:#94a3b8;font-size:11px;">
      <a href="${opts.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${opts.removeUrl}" style="color:#94a3b8;text-decoration:underline;">Remove My Listing</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendViaSendGrid(toEmail: string, subject: string, html: string): Promise<{ ok: boolean; messageId: string | null; error: string | null }> {
  if (!SENDGRID_API_KEY) {
    return { ok: false, messageId: null, error: "SENDGRID_API_KEY_NEXUS not configured" };
  }
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, messageId: null, error: `SendGrid ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true, messageId: res.headers.get("x-message-id"), error: null };
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Cap is read from admin_settings.outreach_daily_cap so it can be changed
// without a redeployment (pg_cron updates it on schedule).
function getRampInfo(startDateStr: string | undefined, todayUtc: string, capFromSettings: number): { dailyCap: number; rampDay: number } {
  if (!startDateStr) return { dailyCap: capFromSettings, rampDay: 1 };
  const daysElapsed = Math.round(
    (new Date(todayUtc).getTime() - new Date(startDateStr).getTime()) / 86400000
  );
  return { dailyCap: capFromSettings, rampDay: daysElapsed + 1 };
}

// Walks the queue starting at startIndex, advancing past any phase whose
// candidate pool is empty, and stopping (without advancing) at a phase whose
// requires_flag isn't set to "true" yet.
async function resolveBatch(
  supabase: any,
  queue: QueuePhase[],
  startIndex: number,
  batchSize: number,
  settingsMap: Record<string, string>
): Promise<{ batch: any[]; phase: QueuePhase | null; index: number; gated: boolean; queueComplete: boolean }> {
  let index = startIndex;
  while (index < queue.length) {
    const phase = queue[index];
    if (phase.requires_flag && settingsMap[phase.requires_flag] !== "true") {
      return { batch: [], phase, index, gated: true, queueComplete: false };
    }
    const { data } = phase.mode === "resend"
      ? await supabase.rpc("get_fl_resend_batch", { p_batch_size: batchSize })
      : await supabase.rpc("get_next_outreach_batch", { p_batch_size: batchSize, p_state: phase.state });
    const batch = data ?? [];
    if (batch.length > 0) {
      return { batch, phase, index, gated: false, queueComplete: false };
    }
    index++; // phase exhausted -- try the next one immediately
  }
  return { batch: [], phase: null, index, gated: false, queueComplete: true };
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Optional body: { force_test: true, limit: 10 } lets the admin UI fire a preview
  // batch without touching the outreach_enabled master switch. Test sends are NOT
  // written to outreach_log so the same profiles remain eligible for real outreach.
  const body = await req.json().catch(() => ({}));
  const forceTest  = body.force_test === true;
  const forceLimit = forceTest ? Math.min(Number(body.limit ?? 10), 10) : null;

  // ── Master switch check — FIRST, before anything else ──────────────────────
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", [
      "outreach_enabled",
      "outreach_test_mode",
      "outreach_test_email",
      "outreach_batch_size",
      "outreach_physical_address",
      "outreach_start_date",
      "daily_emails_sent",
      "daily_emails_date",
      "outreach_daily_cap",
      "outreach_queue_json",
      "outreach_queue_index",
      "outreach_va_bounce_confirmed",
    ]);

  const sm: Record<string, string> = {};
  for (const row of settings ?? []) sm[row.key] = row.value;

  // force_test bypasses the master switch — admin-initiated preview only
  if (!forceTest && sm["outreach_enabled"] !== "true") {
    return new Response(JSON.stringify({ skipped: "disabled" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // force_test always sends to the test address regardless of outreach_test_mode setting
  const testMode  = forceTest ? true : sm["outreach_test_mode"] === "true";
  const testEmail = sm["outreach_test_email"] || "";
  let batchSize   = forceLimit ?? Math.max(1, Math.min(500, parseInt(sm["outreach_batch_size"] ?? "50") || 50));
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  // ── Daily volume cap — skipped for force_test preview runs ─────────────────
  const todayUtc = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
  let dailyCap = 0;
  let dailySent = 0;
  let rampDay = 1;

  if (!forceTest) {
    // Reset counter when the calendar date has rolled over
    dailySent = parseInt(sm["daily_emails_sent"] ?? "0") || 0;
    if (sm["daily_emails_date"] !== todayUtc) dailySent = 0;

    const capFromSettings = Math.max(1, parseInt(sm["outreach_daily_cap"] ?? "1000") || 1000);
    ({ dailyCap, rampDay } = getRampInfo(sm["outreach_start_date"], todayUtc, capFromSettings));

    const remaining = dailyCap - dailySent;
    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ skipped: "daily_cap_reached", dailyCap, dailySent, rampDay }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Never send more than what's left in today's budget
    batchSize = Math.min(batchSize, remaining);
  }

  // ── Walk the automatic state queue ──────────────────────────────────────────
  let queue: QueuePhase[] = [];
  try { queue = JSON.parse(sm["outreach_queue_json"] || "[]"); } catch { queue = []; }
  const startIndex = parseInt(sm["outreach_queue_index"] ?? "0") || 0;

  const resolved = await resolveBatch(supabase, queue, startIndex, batchSize, sm);

  if (resolved.gated) {
    return new Response(
      JSON.stringify({ skipped: "waiting_on_gate", phase: resolved.phase, requiresFlag: resolved.phase?.requires_flag }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  if (resolved.queueComplete) {
    return new Response(JSON.stringify({ skipped: "queue_complete" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const batch = resolved.batch;
  const phase = resolved.phase!;

  // Persist auto-advancement (real runs only -- force_test previews the
  // current phase without moving the queue forward)
  if (!forceTest && resolved.index !== startIndex) {
    await supabase.from("admin_settings").upsert(
      [{ key: "outreach_queue_index", value: String(resolved.index) }],
      { onConflict: "key" }
    );
  }

  let sent = 0;
  let failed = 0;

  for (const profile of batch) {
    // Generate claim/remove tokens if missing
    const updates: Record<string, string> = {};
    let claimToken = profile.claim_token as string | null;
    let removeToken = profile.remove_token as string | null;
    if (!claimToken) { claimToken = crypto.randomUUID(); updates.claim_token = claimToken; }
    if (!removeToken) { removeToken = crypto.randomUUID(); updates.remove_token = removeToken; }
    if (Object.keys(updates).length) {
      await supabase.from("unclaimed_profiles").update(updates).eq("id", profile.id);
    }

    const claimUrl = `${SITE_URL}/build?claim=${claimToken}&business=${encodeURIComponent(profile.business_name)}`;
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${removeToken}&action=unsubscribe`;
    const removeUrl = `${SITE_URL}/unsubscribe?token=${removeToken}&action=remove`;

    const isResend = phase.mode === "resend";
    const html = isResend
      ? buildResendEmailHtml({ sourceState: profile.source_state, claimUrl, unsubscribeUrl, removeUrl, physicalAddress })
      : buildEmailHtml({ sourceState: profile.source_state, claimUrl, unsubscribeUrl, removeUrl, physicalAddress });

    const subject = isResend
      ? "We fixed it. Claiming your listing now takes one tap"
      : "Your contractor listing on TradePro Nexus";

    const toEmail = testMode ? testEmail : profile.email;

    const result = toEmail
      ? await sendViaSendGrid(toEmail, subject, html)
      : { ok: false, messageId: null, error: "No destination email configured" };

    if (result.ok) sent++; else failed++;

    // Skip outreach_log for force_test runs so these profiles remain eligible
    // for real outreach when the master switch is eventually enabled.
    if (!forceTest) {
      await supabase.from("outreach_log").insert({
        unclaimed_profile_id: profile.id,
        source_state: profile.source_state,
        email: profile.email,
        is_test: testMode,
        status: result.ok ? "sent" : "failed",
        sendgrid_message_id: result.messageId,
        sent_at: result.ok ? new Date().toISOString() : null,
        error_detail: result.error,
        email_number: isResend ? 5 : 1,
      });
    }
  }

  if (!forceTest) {
    const now = new Date().toISOString();
    const upserts: { key: string; value: string }[] = [
      { key: "outreach_last_run",   value: now },
      { key: "outreach_last_count", value: String(sent) },
      { key: "daily_emails_sent",   value: String(dailySent + sent) },
      { key: "daily_emails_date",   value: todayUtc },
    ];
    // Stamp the start date on the first real send (drives the ramp-up schedule)
    if (!sm["outreach_start_date"] && sent > 0) {
      upserts.push({ key: "outreach_start_date", value: todayUtc });
    }
    await supabase.from("admin_settings").upsert(upserts, { onConflict: "key" });
  }

  return new Response(
    JSON.stringify({
      ok: true, sent, failed, candidates: batch.length, testMode,
      phase: { state: phase.state, mode: phase.mode }, queueIndex: resolved.index,
      dailyCap, dailySent: dailySent + sent, rampDay,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
