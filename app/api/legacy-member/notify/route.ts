import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const SENDGRID_KEY     = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "andrew@tradepronexus.com";
const FROM_NAME        = "Andrew O'Neill at TradePro Nexus";
const PHYSICAL_ADDRESS = "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";
const SITE_URL         = "https://www.tradepronexus.com";

// POST /api/legacy-member/notify
// Called after profile creation when legacy_member = true.
// Sends the legacy member welcome email from Andrew.
export async function POST() {
  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin() as any;

  // Confirm this user actually has legacy_member status
  const { data: profile } = await db
    .from("profiles")
    .select("legacy_member, first_name, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.legacy_member) {
    return NextResponse.json({ ok: false, reason: "not_legacy" });
  }

  const email = user.email;
  if (!email || !SENDGRID_KEY) {
    return NextResponse.json({ ok: false, reason: "no_email_or_key" });
  }

  const firstName    = profile.first_name || "there";
  const profileUrl   = profile.slug ? `${SITE_URL}/pro/${profile.slug}` : `${SITE_URL}/account`;
  const referralUrl  = `${SITE_URL}/signup?ref=${user.id}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:580px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:linear-gradient(90deg,#b45309,#d97706,#f59e0b);height:4px;"></td></tr>
    <tr><td style="padding:36px 36px 28px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="font-size:36px;">&#127941;</span>
      </div>
      <h1 style="margin:0 0 8px;color:#f59e0b;font-size:22px;font-weight:900;text-align:center;">You are a Legacy Member.</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;text-align:center;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">One of the first 100 members of TradePro Nexus</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hi ${firstName},</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        You joined TradePro Nexus when it was new. Before the press. Before the marketing. Before anyone told you to.
      </p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        That means something.
      </p>

      <div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #b45309/40;">
        <p style="margin:0 0 8px;color:#f59e0b;font-size:16px;font-weight:900;">Your verification badge will always be free.</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">
          When verification launches, Legacy Members pay nothing. No charge. No expiration. Ever.
          That's our commitment to the people who showed up first.
        </p>
      </div>

      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        Your Legacy Member badge is on your Trade Card now. Share it.
      </p>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${profileUrl}" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">View My Trade Card</a>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        Refer other trade pros and they get 20% off verification when it launches. You get that discount too, on top of your Legacy Member free status.
      </p>

      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Your referral link:</p>
        <a href="${referralUrl}" style="color:#f97316;font-size:13px;font-weight:700;">${referralUrl}</a>
      </div>

      <p style="margin:0 0 4px;color:#e2e8f0;font-size:15px;line-height:1.7;">See you around.</p>
      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;">${SITE_URL}</a>
      <p style="margin:8px 0 0;color:#475569;font-size:12px;font-style:italic;">Verified by Paper. Not by Algorithm.</p>

    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">${PHYSICAL_ADDRESS}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
      subject: "You are one of the first 100 members of TradePro Nexus.",
      content: [{ type: "text/html", value: html }],
    }),
  }).catch(() => null);

  return NextResponse.json({ ok: res?.ok ?? false });
}
