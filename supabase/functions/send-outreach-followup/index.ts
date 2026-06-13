import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Outreach follow-up sender (Email 2) ────────────────────────────────────────
// Triggered daily by pg_cron (job "send-outreach-followup"). Sends a one-time
// "still unclaimed" follow-up to unclaimed_profiles that:
//   - were sent Email 1 (email_number=1, status='sent') at least 30 days ago
//   - never opened Email 1 (opened_at IS NULL) — openers are never re-contacted
//   - have not already been sent Email 2 (email_number=2)
//   - are still outreach_eligible, visible, unclaimed, and not removal-requested
//
// SAFETY: the FIRST thing this function does is check admin_settings.outreach_enabled.
// If it is not exactly "true", the function no-ops and sends nothing.

const SITE_URL          = "https://www.tradepronexus.com";
const SENDGRID_API_KEY  = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "outreach@mail.tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";
const THIRTY_DAYS_MS    = 30 * 24 * 60 * 60 * 1000;

function buildEmailHtml(opts: {
  businessName: string;
  licenseType: string | null;
  sourceState: string;
  claimUrl: string;
  unsubscribeUrl: string;
  removeUrl: string;
  physicalAddress: string;
}): string {
  const trade = opts.licenseType?.trim() || "trade professional";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1e293b;border-radius:10px;padding:8px;text-align:center;vertical-align:middle;">
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="52" height="52" rx="10" fill="#0f172a"/>
          <path d="M12 38 L26 14 L40 38" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 30 L35 30" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="26" cy="38" r="3.5" fill="#f97316"/>
          <path d="M22 14 L30 14" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:600;color:#f1f5f9;">TradePro</span>
        <span style="font-size:18px;font-weight:600;color:#f97316;"> Nexus</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px 32px 0;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:-0.01em;">One last note about your listing</h1>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        About a month ago we reached out because <strong style="color:#f1f5f9;">${opts.businessName}</strong> is listed in the
        TradePro Nexus ${opts.sourceState} ${trade} directory. We wanted to follow up one time in case our first email got buried.
      </p>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        TradePro Nexus is a free verified marketplace where GCs and project managers search for qualified crews in new markets.
        When a contractor from out of state lands a job in your area, they search Nexus to find local verified trade professionals.
      </p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Your listing is live. Claiming it takes about 5 minutes and costs nothing.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="${opts.claimUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Claim Your Free Trade Card</a>
        </td></tr>
      </table>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
          This is our final outreach email — if you'd rather not hear from us, use the unsubscribe link below and we will never contact you again.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0 0 8px;color:#475569;font-size:11px;">This email is a commercial advertisement sent by TradePro Technologies.</p>
      <p style="margin:0 0 4px;color:#475569;font-size:12px;">TradePro Technologies LLC | TradePro Nexus</p>
      <p style="margin:0 0 8px;color:#475569;font-size:11px;">${opts.physicalAddress}</p>
      <p style="margin:0 0 2px;color:#475569;font-size:11px;">
        To unsubscribe: <a href="${opts.unsubscribeUrl}" style="color:#64748b;">${opts.unsubscribeUrl}</a>
      </p>
      <p style="margin:0;color:#475569;font-size:11px;">
        To remove your listing: <a href="${opts.removeUrl}" style="color:#64748b;">${opts.removeUrl}</a>
      </p>
    </td></tr>
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

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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
    ]);

  const sm: Record<string, string> = {};
  for (const row of settings ?? []) sm[row.key] = row.value;

  if (sm["outreach_enabled"] !== "true") {
    return new Response(JSON.stringify({ skipped: "disabled" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const testMode  = sm["outreach_test_mode"] === "true";
  const testEmail = sm["outreach_test_email"] || "";
  const batchSize = Math.max(1, Math.min(500, parseInt(sm["outreach_batch_size"] ?? "50") || 50));
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  // ── Find profiles sent Email 1 >= 30 days ago who never opened it ───────────
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const { data: email1Sent } = await supabase
    .from("outreach_log")
    .select("unclaimed_profile_id")
    .eq("email_number", 1)
    .eq("status", "sent")
    .is("opened_at", null)
    .lte("sent_at", cutoff);

  const nonOpenerIds = new Set((email1Sent ?? []).map((r: { unclaimed_profile_id: string }) => r.unclaimed_profile_id));

  // ── Exclude anyone already sent Email 2 ──────────────────────────────────────
  const { data: email2Sent } = await supabase
    .from("outreach_log")
    .select("unclaimed_profile_id")
    .eq("email_number", 2);

  for (const row of email2Sent ?? []) nonOpenerIds.delete((row as { unclaimed_profile_id: string }).unclaimed_profile_id);

  const candidateIds = Array.from(nonOpenerIds).slice(0, batchSize * 4);

  let batch: any[] = [];
  if (candidateIds.length > 0) {
    const { data: candidates } = await supabase
      .from("unclaimed_profiles")
      .select("id, business_name, license_type, source_state, email, claim_token, remove_token")
      .in("id", candidateIds)
      .eq("outreach_eligible", true)
      .eq("visible", true)
      .eq("claimed", false)
      .eq("remove_requested", false)
      .not("email", "is", null)
      .limit(batchSize);
    batch = candidates ?? [];
  }

  let sent = 0;
  let failed = 0;

  for (const profile of batch) {
    // Tokens were generated during Email 1 send — fall back just in case.
    const updates: Record<string, string> = {};
    let claimToken = profile.claim_token as string | null;
    let removeToken = profile.remove_token as string | null;
    if (!claimToken) { claimToken = crypto.randomUUID(); updates.claim_token = claimToken; }
    if (!removeToken) { removeToken = crypto.randomUUID(); updates.remove_token = removeToken; }
    if (Object.keys(updates).length) {
      await supabase.from("unclaimed_profiles").update(updates).eq("id", profile.id);
    }

    const html = buildEmailHtml({
      businessName: profile.business_name,
      licenseType: profile.license_type,
      sourceState: profile.source_state,
      claimUrl: `${SITE_URL}/build?claim=${claimToken}&business=${encodeURIComponent(profile.business_name)}`,
      unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=unsubscribe`,
      removeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=remove`,
      physicalAddress,
    });

    const subject = "One last note — your TradePro Nexus profile is still unclaimed";
    const toEmail = testMode ? testEmail : profile.email;

    const result = toEmail
      ? await sendViaSendGrid(toEmail, subject, html)
      : { ok: false, messageId: null, error: "No destination email configured" };

    if (result.ok) sent++; else failed++;

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

  const now = new Date().toISOString();
  await supabase.from("admin_settings").upsert([
    { key: "outreach_followup_last_run",   value: now },
    { key: "outreach_followup_last_count", value: String(sent) },
  ], { onConflict: "key" });

  return new Response(
    JSON.stringify({ ok: true, sent, failed, candidates: batch.length, testMode }),
    { headers: { "Content-Type": "application/json" } }
  );
});
