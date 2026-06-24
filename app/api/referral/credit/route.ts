import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "outreach@mail.tradepronexus.com";
const FROM_NAME        = "TradePro Nexus";
const SITE_URL         = "https://www.tradepronexus.com";

// Referral reward tiers → verification_discount_pct
function getDiscount(count: number): number {
  if (count >= 10) return 100;
  if (count >= 3)  return 20;
  if (count >= 1)  return 10;
  return 0;
}

function getTierLabel(count: number): string {
  if (count >= 10) return "Free verification ($99 value)";
  if (count >= 3)  return "20% off verification";
  if (count >= 1)  return "10% off verification";
  return "No discount yet";
}

// POST /api/referral/credit
// Called right after a new user completes signup.
// Body: { referrer_id: string }  — the user ID from the ?ref= param
export async function POST(req: NextRequest) {
  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const referrerId = (body.referrer_id ?? "").trim();

  if (!referrerId || referrerId === user.id) {
    return NextResponse.json({ ok: false, reason: "invalid_referrer" });
  }

  const db = getSupabaseAdmin() as any;

  // Insert the referral — UNIQUE constraint on referred_user_id prevents double-counting
  const { error: insertError } = await db
    .from("referral_tracking")
    .insert({ referrer_id: referrerId, referred_user_id: user.id, status: "completed" });

  if (insertError) {
    // Duplicate or other constraint — not an error for the caller
    return NextResponse.json({ ok: false, reason: "already_tracked" });
  }

  // Count total referrals for the referrer and update their discount
  const { count: referralCount } = await db
    .from("referral_tracking")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "completed");

  const count = referralCount ?? 0;
  const discount = getDiscount(count);

  await db
    .from("profiles")
    .update({ verification_discount_pct: discount })
    .eq("user_id", referrerId);

  // Send notification email to referrer (fire and await — small payload, fast)
  try {
    const { data: referrerProfile } = await db
      .from("profiles")
      .select("first_name, email")
      .eq("user_id", referrerId)
      .maybeSingle();

    const { data: referrerAuth } = await db.auth.admin.getUserById(referrerId);
    const toEmail = referrerProfile?.email || referrerAuth?.user?.email;

    if (toEmail && SENDGRID_API_KEY) {
      const firstName = referrerProfile?.first_name || "there";
      const tierLabel = getTierLabel(count);
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:18px;font-weight:800;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;padding:32px;">
    <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:800;">Someone joined using your link</h1>
    <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
      Hey ${firstName}, a new trade pro just joined TradePro Nexus using your referral link.
    </p>
    <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Your referrals</p>
      <p style="margin:0 0 4px;color:#f1f5f9;font-size:32px;font-weight:900;">${count}</p>
      <p style="margin:0;color:#f97316;font-size:14px;font-weight:700;">${tierLabel}</p>
    </div>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;line-height:1.5;">
      Your discount will apply automatically when verification launches.
      ${count < 10 ? `Refer ${count < 3 ? 3 - count : 10 - count} more to reach the next tier.` : "You have earned free verification."}
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#f97316;border-radius:10px;">
        <a href="${SITE_URL}/account" style="display:inline-block;padding:12px 24px;color:#fff;font-weight:700;font-size:14px;text-decoration:none;">View Your Referrals</a>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#475569;font-size:11px;text-align:center;">
      TradePro Technologies LLC | TradePro Nexus<br>17629 Fallen Branch Way, Punta Gorda, FL 33982
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject: `Someone just joined TradePro Nexus using your link`,
          content: [{ type: "text/html", value: html }],
        }),
      });
    }
  } catch {
    // Email failure should not block the credit response
  }

  return NextResponse.json({ ok: true, referralCount: count, discount });
}
