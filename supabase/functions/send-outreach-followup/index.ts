import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Outreach follow-up sender (Email 2) ────────────────────────────────────────
// Sends a re-engagement email to unclaimed_profiles that:
//   - received Email 1 (email_number=1, status='sent')
//   - have NOT bounced, unsubscribed, or removed
//   - are still unclaimed, outreach_eligible, visible
//   - have NOT already received a follow-up (email_number>=2)
//
// Normally triggered by pg_cron. Also supports:
//   { force_test: true, limit: N }  → sends to test email only, N ≤ 10
//   { dry_run: true }               → counts eligible, sends nothing
//
// SAFETY: checks admin_settings.outreach_enabled first (unless force_test).

const SITE_URL         = "https://www.tradepronexus.com";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL       = "outreach@mail.tradepronexus.com";
const FROM_NAME        = "TradePro Nexus";

function buildEmailHtml(opts: {
  claimUrl: string;
  unsubscribeUrl: string;
  removeUrl: string;
  physicalAddress: string;
  sourceState: string;
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
    <p style="margin:0 0 16px;">You started claiming your free listing on TradePro Nexus but did not finish. It is still there waiting for you.</p>
    <p style="margin:0 0 24px;">Takes about 60 seconds to complete.</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#f97316;border-radius:10px;">
        <a href="${opts.claimUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">Complete my listing &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;color:#1e293b;font-size:15px;">Andrew O&rsquo;Neill</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">Founder, TradePro Nexus</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">30-Year Construction Veteran</p>
    <p style="margin:0 0 2px;color:#64748b;font-size:13px;">(561) 247-1381</p>
    <p style="margin:0;color:#64748b;font-size:13px;">tradepronexus.com</p>
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

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await req.json().catch(() => ({}));
  const forceTest = body.force_test === true;
  const dryRun    = body.dry_run === true;
  const forceLimit = forceTest ? Math.min(Number(body.limit ?? 10), 10) : null;

  // ── Master switch — bypassed only for force_test ────────────────────────────
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", [
      "outreach_enabled",
      "outreach_test_mode",
      "outreach_test_email",
      "outreach_batch_size",
      "outreach_physical_address",
      "outreach_daily_cap",
      "daily_emails_sent",
      "daily_emails_date",
    ]);

  const sm: Record<string, string> = {};
  for (const row of settings ?? []) sm[row.key] = row.value;

  if (!forceTest && !dryRun && sm["outreach_enabled"] !== "true") {
    return new Response(JSON.stringify({ skipped: "disabled" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const testMode  = forceTest ? true : sm["outreach_test_mode"] === "true";
  const testEmail = sm["outreach_test_email"] || "";
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  // ── Daily cap (skipped for force_test/dry_run) ──────────────────────────────
  const todayUtc = new Date().toISOString().split("T")[0];
  let dailySent = 0;
  let batchSize = forceLimit ?? Math.max(1, Math.min(500, parseInt(sm["outreach_batch_size"] ?? "50") || 50));

  if (!forceTest && !dryRun) {
    dailySent = parseInt(sm["daily_emails_sent"] ?? "0") || 0;
    if (sm["daily_emails_date"] !== todayUtc) dailySent = 0;
    const dailyCap = Math.max(1, parseInt(sm["outreach_daily_cap"] ?? "1000") || 1000);
    const remaining = dailyCap - dailySent;
    if (remaining <= 0) {
      return new Response(JSON.stringify({ skipped: "daily_cap_reached", dailyCap, dailySent }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    batchSize = Math.min(batchSize, remaining);
  }

  // ── Eligible profiles: received email 1, not excluded, not already followed up ─
  // Exclusions applied at DB level:
  //   - outreach_eligible = false  (covers bounced + unsubscribed from our sync)
  //   - outreach_log records with status bounced/unsubscribed
  //   - already has email_number >= 2
  const { data: batchRaw, error: batchErr } = await supabase.rpc(
    "get_followup_batch",
    { p_batch_size: dryRun ? 0 : batchSize }
  );

  // Fallback if RPC doesn't exist yet: raw query
  let batch: any[] = [];
  if (batchErr) {
    // RPC not found — use inline query
    const { data: e1 } = await supabase
      .from("outreach_log")
      .select("unclaimed_profile_id")
      .eq("email_number", 1)
      .eq("status", "sent");

    const sentIds = (e1 ?? []).map((r: any) => r.unclaimed_profile_id as string);

    const { data: excluded } = await supabase
      .from("outreach_log")
      .select("unclaimed_profile_id")
      .or("status.in.(bounced,unsubscribed),bounced_at.not.is.null,unsubscribed_at.not.is.null");

    const excludedSet = new Set((excluded ?? []).map((r: any) => r.unclaimed_profile_id as string));

    const { data: alreadyFollowed } = await supabase
      .from("outreach_log")
      .select("unclaimed_profile_id")
      .gte("email_number", 2);

    for (const r of alreadyFollowed ?? []) excludedSet.add((r as any).unclaimed_profile_id);

    const eligibleIds = sentIds.filter(id => !excludedSet.has(id));

    if (dryRun) {
      return new Response(
        JSON.stringify({ dry_run: true, eligible_count: eligibleIds.length }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: candidates } = await supabase
      .from("unclaimed_profiles")
      .select("id, business_name, source_state, email, claim_token, remove_token")
      .in("id", eligibleIds.slice(0, batchSize * 4))
      .eq("outreach_eligible", true)
      .eq("visible", true)
      .eq("claimed", false)
      .eq("remove_requested", false)
      .not("email", "is", null)
      .limit(batchSize);

    batch = candidates ?? [];
  } else {
    if (dryRun) {
      return new Response(
        JSON.stringify({ dry_run: true, eligible_count: batchRaw?.length ?? 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    batch = batchRaw ?? [];
  }

  let sent = 0;
  let failed = 0;

  for (const profile of batch) {
    const updates: Record<string, string> = {};
    let claimToken = profile.claim_token as string | null;
    let removeToken = profile.remove_token as string | null;
    if (!claimToken) { claimToken = crypto.randomUUID(); updates.claim_token = claimToken; }
    if (!removeToken) { removeToken = crypto.randomUUID(); updates.remove_token = removeToken; }
    if (Object.keys(updates).length) {
      await supabase.from("unclaimed_profiles").update(updates).eq("id", profile.id);
    }

    const html = buildEmailHtml({
      claimUrl: `${SITE_URL}/build?claim=${claimToken}&business=${encodeURIComponent(profile.business_name)}`,
      unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=unsubscribe`,
      removeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=remove`,
      physicalAddress,
      sourceState: profile.source_state,
    });

    const subject = "Your TradePro Nexus listing is still waiting";
    const toEmail = testMode ? testEmail : profile.email;

    const result = toEmail
      ? await sendViaSendGrid(toEmail, subject, html)
      : { ok: false, messageId: null, error: "No destination email" };

    if (result.ok) sent++; else failed++;

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
        email_number: 2,
      });
    }
  }

  if (!forceTest) {
    await supabase.from("admin_settings").upsert([
      { key: "outreach_followup_last_run",   value: new Date().toISOString() },
      { key: "outreach_followup_last_count", value: String(sent) },
      { key: "daily_emails_sent",  value: String(dailySent + sent) },
      { key: "daily_emails_date",  value: todayUtc },
    ], { onConflict: "key" });
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, candidates: batch.length, testMode }),
    { headers: { "Content-Type": "application/json" } }
  );
});
