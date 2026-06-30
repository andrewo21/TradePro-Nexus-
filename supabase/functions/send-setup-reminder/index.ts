import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Setup Reminder (Email 2 in claim flow) ────────────────────────────────────
// Runs every 15 minutes via pg_cron.
// Finds profiles claimed via magic link (setup_reminder_sent_at IS NULL)
// that are 10-45 minutes old (value already received, timing feels right).
// Sends a "complete your profile" email with the magic login link.

const SITE_URL         = "https://www.tradepronexus.com";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL       = "outreach@mail.tradepronexus.com";
const FROM_NAME        = "TradePro Nexus";

function buildEmail2Html(opts: {
  firstName: string;
  businessName: string;
  profileUrl: string;
  magicLink: string;
  physicalAddress: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:900;">One more step to get found by GCs faster.</h1>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Your <strong style="color:#f1f5f9;">${opts.businessName}</strong> profile is live. Adding a few more details will help you get discovered faster.
      </p>
      <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Quick wins that increase your visibility</p>
        ${[
          "Add your crew size so GCs know your capacity",
          "Upload a profile photo",
          "List your certifications and specialties",
          "Set your availability status",
        ].map(item => `<p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">&#10003; &nbsp;${item}</p>`).join("")}
      </div>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${opts.magicLink}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">
            Complete My Profile
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:12px;text-align:center;">No password needed. Just click the button above.</p>
      <div style="background:#1e3a2f;border:1px solid #166534;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 6px;color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Add to your home screen</p>
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;line-height:1.5;">Get a TradePro Nexus icon on your phone. No app store needed.</p>
        <p style="margin:0 0 2px;color:#64748b;font-size:12px;line-height:1.5;"><strong style="color:#94a3b8;">iPhone:</strong> Tap the share icon, then tap Add to Home Screen.</p>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;"><strong style="color:#94a3b8;">Android:</strong> Tap the menu icon, then tap Install App or Add to Home Screen.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0 0 4px;color:#475569;font-size:11px;">TradePro Technologies LLC | TradePro Nexus</p>
      <p style="margin:0;color:#475569;font-size:11px;">${opts.physicalAddress}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["outreach_physical_address"]);
  const sm: Record<string, string> = {};
  for (const r of settings ?? []) sm[r.key] = r.value;
  const physicalAddress = sm["outreach_physical_address"] || "17629 Fallen Branch Way, Punta Gorda, FL 33982";

  // Find profiles created 10-45 min ago via claim that haven't received Email 2
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, firm_name, slug")
    .is("setup_reminder_sent_at", null)
    .gte("created_at", new Date(Date.now() - 45 * 60 * 1000).toISOString())
    .lte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .eq("is_seed_account", false)
    .eq("is_internal", false);

  if (!profiles?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;

  for (const profile of profiles) {
    // Get auth user to check email and setup_magic_link in metadata
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
    if (!user?.email) continue;

    // Check if user came via magic claim (has via_claim in metadata)
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    if (!meta.via_claim) continue;

    // Generate a fresh magic link for the email
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
      options: { redirectTo: `${SITE_URL}/account` },
    });
    const magicLink = linkData?.properties?.action_link ?? `${SITE_URL}/login`;

    const businessName = profile.firm_name || `${profile.first_name}`;
    const profileUrl   = `${SITE_URL}/pro/${profile.slug}`;
    const html = buildEmail2Html({
      firstName:   profile.first_name || "there",
      businessName,
      profileUrl,
      magicLink,
      physicalAddress,
    });

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
        subject: "One more step to get found by GCs faster",
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (res.ok) {
      await supabase
        .from("profiles")
        .update({ setup_reminder_sent_at: new Date().toISOString() })
        .eq("user_id", profile.user_id);
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
