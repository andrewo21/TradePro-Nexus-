import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Onboarding Drip (Emails 2-4) ────────────────────────────────────────────
// Email 1 ("Your Trade Card is live") is the existing synchronous welcome
// email sent at profile creation -- not duplicated here.
//
// Runs once daily via pg_cron. For each profile whose account age has
// crossed a stage threshold and hasn't received that stage's email yet,
// sends exactly one email (day 3, day 7, or day 14), each with a single
// simple action -- no overwhelming checklist.
//
// Transactional (tied to the user's own account activity), not promotional
// outreach -- does not check outreach_enabled and has no unsubscribe link,
// same classification as send-claim-welcome.

const SITE_URL         = "https://www.tradepronexus.com";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "andrew@tradepronexus.com";
const FROM_NAME         = "Andrew O'Neill at TradePro Nexus";

type Stage = {
  column: "onboarding_email2_sent_at" | "onboarding_email3_sent_at" | "onboarding_email4_sent_at";
  minDays: number;
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
};

const STAGES: Stage[] = [
  {
    column: "onboarding_email2_sent_at",
    minDays: 3,
    subject: "Add your photo to get 3x more profile views.",
    headline: "One photo. 3x more views.",
    body: "Trade Cards with a profile photo get seen way more often than blank ones. Takes about 30 seconds to add yours.",
    ctaLabel: "Add My Photo",
    ctaPath: "/account",
  },
  {
    column: "onboarding_email3_sent_at",
    minDays: 7,
    subject: "GCs in your area are searching. Make sure your availability is set.",
    headline: "Are you available right now?",
    body: "GCs filter by availability first. If yours isn't set, you might be getting skipped in searches you'd otherwise show up in.",
    ctaLabel: "Set My Availability",
    ctaPath: "/account",
  },
  {
    column: "onboarding_email4_sent_at",
    minDays: 14,
    subject: "You are one post away from earning your Active Member badge.",
    headline: "One post from your Active Member badge.",
    body: "Post once on the Live Feed and the Active Member badge goes straight on your Trade Card. A finished job, a project photo, anything works.",
    ctaLabel: "Post to the Live Feed",
    ctaPath: "/feed",
  },
];

function buildEmailHtml(opts: {
  firstName: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
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
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hi ${opts.firstName},</p>
      <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:900;">${opts.headline}</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">${opts.body}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${opts.ctaUrl}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">
            ${opts.ctaLabel}
          </a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#475569;font-size:12px;">Andrew O'Neill, Founder, TradePro Nexus</p>
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
  const forceTest  = body.force_test === true;
  const testEmail  = body.test_email as string | undefined;

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["outreach_physical_address"]);
  const sm: Record<string, string> = {};
  for (const r of settings ?? []) sm[r.key] = r.value;
  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

  const results: Record<string, number> = {};

  for (const stage of STAGES) {
    const cutoff = new Date(Date.now() - stage.minDays * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("profiles")
      .select("user_id, first_name, slug")
      .is(stage.column, null)
      .eq("is_seed_account", false)
      .eq("is_internal", false)
      .lte("created_at", cutoff);

    if (forceTest) query = query.limit(1);

    const { data: dueProfiles } = await query;
    let sent = 0;

    for (const profile of dueProfiles ?? []) {
      // profiles.email is frequently unset (most claim-flow profiles never
      // populate it) -- auth.users is the reliable source, same pattern
      // send-setup-reminder already uses.
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
      const recipientEmail = user?.email ?? null;
      if (!recipientEmail && !testEmail) continue;

      const html = buildEmailHtml({
        firstName: profile.first_name || "there",
        headline: stage.headline,
        body: stage.body,
        ctaLabel: stage.ctaLabel,
        ctaUrl: `${SITE_URL}${stage.ctaPath}`,
        physicalAddress,
      });

      const toEmail = forceTest ? (testEmail || recipientEmail!) : recipientEmail!;
      const result = await sendViaSendGrid(toEmail, stage.subject, html);

      if (result.ok) {
        sent++;
        if (!forceTest) {
          await supabase
            .from("profiles")
            .update({ [stage.column]: new Date().toISOString() })
            .eq("user_id", profile.user_id);
        }
      }
    }

    results[stage.column] = sent;
  }

  return new Response(JSON.stringify({ ok: true, sent: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
