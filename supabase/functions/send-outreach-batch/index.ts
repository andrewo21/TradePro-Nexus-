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

const SITE_URL          = "https://www.tradepronexus.com";
const SENDGRID_API_KEY  = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "outreach@mail.tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";

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
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Your business is listed on TradePro Nexus</h1>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        We found <strong style="color:#f1f5f9;">${opts.businessName}</strong> in our public ${opts.sourceState} ${trade} licensing directory.
        Trade pros and GCs in your area are already searching TradePro Nexus to find crews like yours.
      </p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Claim your free Digital Trading Card to control how your business appears, add your contact info, and start getting discovered.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="${opts.claimUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Claim Your Free Trade Card</a>
        </td></tr>
      </table>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
          This listing was created from public state licensing records. We do not display it as "verified" until you claim it.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0 0 8px;color:#475569;font-size:12px;">TradePro Nexus &middot; A TradePro Technologies LLC product</p>
      <p style="margin:0 0 8px;color:#475569;font-size:11px;">This email is a commercial advertisement sent by TradePro Technologies.</p>
      <p style="margin:0 0 8px;color:#475569;font-size:11px;">${opts.physicalAddress}</p>
      <p style="margin:0;color:#475569;font-size:11px;">
        <a href="${opts.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="${opts.removeUrl}" style="color:#64748b;">Remove My Listing</a>
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
  const batchSize = forceLimit ?? Math.max(1, Math.min(500, parseInt(sm["outreach_batch_size"] ?? "50") || 50));
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  // ── Select eligible, not-yet-contacted profiles ─────────────────────────────
  const { data: alreadyContacted } = await supabase
    .from("outreach_log")
    .select("unclaimed_profile_id");
  const contactedIds = new Set((alreadyContacted ?? []).map((r: { unclaimed_profile_id: string }) => r.unclaimed_profile_id));

  const { data: candidates } = await supabase
    .from("unclaimed_profiles")
    .select("id, business_name, license_type, source_state, email, claim_token, remove_token")
    .eq("outreach_eligible", true)
    .eq("visible", true)
    .eq("claimed", false)
    .eq("remove_requested", false)
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(batchSize * 4); // over-fetch a bit to skip already-contacted client-side

  const batch = (candidates ?? []).filter((p: { id: string }) => !contactedIds.has(p.id)).slice(0, batchSize);

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

    const html = buildEmailHtml({
      businessName: profile.business_name,
      licenseType: profile.license_type,
      sourceState: profile.source_state,
      claimUrl: `${SITE_URL}/build?claim=${claimToken}&business=${encodeURIComponent(profile.business_name)}`,
      unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=unsubscribe`,
      removeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=remove`,
      physicalAddress,
    });

    const subject = `${profile.business_name} — claim your free TradePro Nexus listing`;
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
        email_number: 1,
      });
    }
  }

  if (!forceTest) {
    const now = new Date().toISOString();
    await supabase.from("admin_settings").upsert([
      { key: "outreach_last_run",   value: now },
      { key: "outreach_last_count", value: String(sent) },
    ], { onConflict: "key" });
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, candidates: batch.length, testMode }),
    { headers: { "Content-Type": "application/json" } }
  );
});
