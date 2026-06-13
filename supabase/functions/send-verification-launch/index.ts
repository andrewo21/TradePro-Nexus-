import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Verification launch sender (Email 4) ────────────────────────────────────────
// FUTURE — triggered manually (one-time announcement) when the Phase 4
// verification pipeline goes live. NOT registered in pg_cron — invoke this
// function's URL directly (e.g. via the Supabase dashboard or a one-off curl)
// once verification is ready for claimed profiles.
//
// Sends to claimed registry profiles (unclaimed_profiles.claimed = true) that
// have an email on file and have not already been sent Email 4.
//
// SAFETY: the FIRST thing this function does is check admin_settings.outreach_enabled.
// If it is not exactly "true", the function no-ops and sends nothing.

const SITE_URL          = "https://www.tradepronexus.com";
const SENDGRID_API_KEY  = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "outreach@mail.tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";

function buildEmailHtml(opts: {
  businessName: string;
  verifyUrl: string;
  unsubscribeUrl: string;
  removeUrl: string;
  physicalAddress: string;
}): string {
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
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Verification is now open</h1>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Hi <strong style="color:#f1f5f9;">${opts.businessName}</strong>, verification is now live on TradePro Nexus.
      </p>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        For a one-time fee of $99, we review your COI, bonding certificate, and state license. If everything checks out, your profile gets a
        Verified badge that GCs can see when searching for crews.
      </p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Verified profiles get significantly more visibility in search results. GCs specifically filter for verified businesses when they need to move fast on a project.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="${opts.verifyUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Start Verification</a>
        </td></tr>
      </table>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;line-height:1.5;">A few things to know:</p>
        <ul style="margin:0;padding-left:18px;color:#64748b;font-size:12px;line-height:1.7;">
          <li>One-time fee of $99</li>
          <li>If your documents are denied, you receive a $79 refund</li>
          <li>Verification is for business entities only</li>
          <li>Your COI, bonding, and license are reviewed by a human — not an algorithm</li>
        </ul>
      </div>
      <p style="margin:0 0 24px;color:#f1f5f9;font-size:13px;font-weight:700;letter-spacing:0.02em;text-align:center;">Verified by Paper. Not by Algorithm.</p>
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

  // ── Exclude anyone already sent Email 4 ──────────────────────────────────────
  const { data: email4Sent } = await supabase
    .from("outreach_log")
    .select("unclaimed_profile_id")
    .eq("email_number", 4);
  const alreadySent = new Set((email4Sent ?? []).map((r: { unclaimed_profile_id: string }) => r.unclaimed_profile_id));

  const { data: candidates } = await supabase
    .from("unclaimed_profiles")
    .select("id, business_name, source_state, email, remove_token")
    .eq("claimed", true)
    .not("email", "is", null)
    .order("claimed_at", { ascending: true })
    .limit(batchSize * 4);

  const batch = (candidates ?? []).filter((p: { id: string }) => !alreadySent.has(p.id)).slice(0, batchSize);

  let sent = 0;
  let failed = 0;

  for (const profile of batch) {
    let removeToken = profile.remove_token as string | null;
    if (!removeToken) {
      removeToken = crypto.randomUUID();
      await supabase.from("unclaimed_profiles").update({ remove_token: removeToken }).eq("id", profile.id);
    }

    const html = buildEmailHtml({
      businessName: profile.business_name,
      verifyUrl: `${SITE_URL}/verify`,
      unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=unsubscribe`,
      removeUrl: `${SITE_URL}/unsubscribe?token=${removeToken}&action=remove`,
      physicalAddress,
    });

    const subject = "Verification is now open — get your TradePro Nexus badge";
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
      email_number: 4,
    });
  }

  const now = new Date().toISOString();
  await supabase.from("admin_settings").upsert([
    { key: "verification_launch_last_run",   value: now },
    { key: "verification_launch_last_count", value: String(sent) },
  ], { onConflict: "key" });

  return new Response(
    JSON.stringify({ ok: true, sent, failed, candidates: batch.length, testMode }),
    { headers: { "Content-Type": "application/json" } }
  );
});
