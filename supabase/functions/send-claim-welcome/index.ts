import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Claim welcome sender (Email 3) ──────────────────────────────────────────────
// Transactional — NOT a promotional/CAN-SPAM email. Fires once when a contractor
// successfully claims their registry profile. Does NOT check outreach_enabled —
// that switch gates batch promotional outreach, not user-triggered transactions.
//
//   POST /functions/v1/send-claim-welcome   { "unclaimed_profile_id": "<uuid>" }
//
// Respects outreach_test_mode: in test mode, all mail routes to outreach_test_email.

const SITE_URL          = "https://www.tradepronexus.com";
const SENDGRID_API_KEY  = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "outreach@mail.tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";

function buildEmailHtml(opts: {
  businessName: string;
  profileUrl: string;
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
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Welcome to TradePro Nexus</h1>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Hi <strong style="color:#f1f5f9;">${opts.businessName}</strong>, your TradePro Nexus profile is now claimed and live in the directory.
      </p>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
        GCs and project managers searching for qualified crews in your area can now find you. Here&rsquo;s what you can do next to make your profile stronger:
      </p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#94a3b8;font-size:15px;line-height:1.8;">
        <li>Add your trade specialties and certifications</li>
        <li>Set your availability status — let GCs know you are open for new work</li>
        <li>Add your crew size so contractors know your capacity</li>
        <li>Complete your profile to earn the Profile Champion badge</li>
      </ul>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="${opts.profileUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">View My Profile</a>
        </td></tr>
      </table>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
          Verification is coming soon. When it launches, verified businesses get a badge that signals to GCs that your COI, bonding, and license have been reviewed. You will be notified when verification opens.
        </p>
      </div>
      <div style="background:#1e3a2f;border:1px solid #166534;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0 0 6px;color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Add to your home screen</p>
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;line-height:1.5;">Get a TradePro Nexus icon on your phone. No app store needed.</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;line-height:1.5;"><strong style="color:#94a3b8;">iPhone:</strong> Tap the share icon, then tap Add to Home Screen.</p>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;"><strong style="color:#94a3b8;">Android:</strong> Tap the menu icon, then tap Install App or Add to Home Screen.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
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

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch test-mode settings only — outreach_enabled does not gate this function
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["outreach_test_mode", "outreach_test_email", "outreach_physical_address"]);

  const sm: Record<string, string> = {};
  for (const row of settings ?? []) sm[row.key] = row.value;

  const testMode  = sm["outreach_test_mode"] === "true";
  const testEmail = sm["outreach_test_email"] || "";
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  const { unclaimed_profile_id } = await req.json().catch(() => ({ unclaimed_profile_id: null }));
  if (!unclaimed_profile_id) {
    return new Response(JSON.stringify({ error: "unclaimed_profile_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("unclaimed_profiles")
    .select("id, business_name, source_state, email, claimed, claimed_by, remove_token")
    .eq("id", unclaimed_profile_id)
    .single();

  if (!profile || !profile.claimed || !profile.email) {
    return new Response(JSON.stringify({ error: "Profile not found, not claimed, or has no email on file" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Look up the claimer's live Trading Card slug ─────────────────────────────
  let profileUrl = `${SITE_URL}/account`;
  if (profile.claimed_by) {
    const { data: tradePro } = await supabase
      .from("profiles")
      .select("slug")
      .eq("user_id", profile.claimed_by)
      .maybeSingle();
    if (tradePro?.slug) {
      profileUrl = `${SITE_URL}/pro/${tradePro.slug}`;
    } else {
      const { data: company } = await supabase
        .from("companies")
        .select("slug")
        .eq("user_id", profile.claimed_by)
        .maybeSingle();
      if (company?.slug) profileUrl = `${SITE_URL}/company/${company.slug}`;
    }
  }

  const html = buildEmailHtml({
    businessName: profile.business_name,
    profileUrl,
    unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${profile.remove_token}&action=unsubscribe`,
    removeUrl: `${SITE_URL}/unsubscribe?token=${profile.remove_token}&action=remove`,
    physicalAddress,
  });

  const subject = "Welcome to TradePro Nexus — your profile is live";
  const toEmail = testMode ? testEmail : profile.email;

  const result = toEmail
    ? await sendViaSendGrid(toEmail, subject, html)
    : { ok: false, messageId: null, error: "No destination email configured" };

  await supabase.from("outreach_log").insert({
    unclaimed_profile_id: profile.id,
    source_state: profile.source_state,
    email: profile.email,
    is_test: testMode,
    status: result.ok ? "sent" : "failed",
    sendgrid_message_id: result.messageId,
    sent_at: result.ok ? new Date().toISOString() : null,
    error_detail: result.error,
    email_number: 3,
  });

  return new Response(
    JSON.stringify({ ok: result.ok, error: result.error, testMode }),
    { headers: { "Content-Type": "application/json" } }
  );
});
