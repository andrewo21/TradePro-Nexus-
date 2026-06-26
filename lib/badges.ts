import { getSupabaseAdmin } from "./supabaseServer";
import { BADGES, getBadgeBySlug, type Badge } from "./badge-definitions";

export type { Badge };
export { BADGES, getBadgeBySlug };

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VERI10-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Returns newly awarded Badge objects (ignores already-held ones)
export async function checkAndAwardBadges(
  userId: string,
  trigger: "post" | "follow" | "profile",
): Promise<Badge[]> {
  const db = getSupabaseAdmin() as any;

  // Never award badges to seed/bot accounts
  const { data: seedCheck } = await db
    .from("profiles")
    .select("is_seed_account")
    .eq("user_id", userId)
    .maybeSingle();
  if (seedCheck?.is_seed_account) return [];

  const { data: existing } = await db
    .from("user_badges")
    .select("badge_slug")
    .eq("user_id", userId);
  const held = new Set<string>((existing ?? []).map((r: any) => r.badge_slug));

  const toAward: Array<{ slug: string; coupon_code?: string }> = [];

  if (trigger === "post") {
    const { data: prof } = await db.from("profiles")
      .select("id, is_seed_account, legacy_member_eligible, legacy_member")
      .eq("user_id", userId)
      .single();
    // Never award badges to seed/bot accounts
    if (prof && !prof.is_seed_account) {
      const { count: totalPosts } = await db
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", prof.id)
        .eq("author_type", "profile");

      const n = totalPosts ?? 0;

      // Legacy Member: eligible (first 100 signup) + first post = earned
      if (n >= 1 && prof.legacy_member_eligible && !prof.legacy_member) {
        await db.from("profiles").update({
          legacy_member: true,
          legacy_member_granted_at: new Date().toISOString(),
        }).eq("user_id", userId);
        toAward.push({ slug: "legacy_member" });
      }

      if (n >= 1 && !held.has("active_member")) {
        toAward.push({ slug: "active_member" });
      }
      if (n >= 10 && !held.has("community_pro")) {
        toAward.push({ slug: "community_pro" });
      }
      if (n >= 20 && !held.has("verified_contributor")) {
        const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recent } = await db
          .from("feed_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", prof.id)
          .eq("author_type", "profile")
          .gte("created_at", since);
        if ((recent ?? 0) >= 20) {
          toAward.push({ slug: "verified_contributor", coupon_code: generateCouponCode() });
        }
      }
    }
  }

  if (trigger === "follow") {
    if (!held.has("networked")) {
      const { count } = await db
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_user_id", userId);
      if ((count ?? 0) >= 1) {
        toAward.push({ slug: "networked" });
      }
    }
  }

  if (trigger === "profile") {
    if (!held.has("profile_champion")) {
      const { data: prof } = await db
        .from("profiles")
        .select("bio, location_city, location_state, phone, avatar_url, trade, years_experience")
        .eq("user_id", userId)
        .single();
      if (
        prof &&
        prof.bio?.trim() &&
        prof.location_city?.trim() &&
        prof.location_state?.trim() &&
        prof.phone?.trim() &&
        prof.avatar_url?.trim() &&
        prof.trade?.trim() &&
        (prof.years_experience ?? 0) > 0
      ) {
        toAward.push({ slug: "profile_champion" });
      }
    }
  }

  if (toAward.length === 0) return [];

  await db.from("user_badges").upsert(
    toAward.map(b => ({ user_id: userId, badge_slug: b.slug, coupon_code: b.coupon_code ?? null })),
    { onConflict: "user_id,badge_slug", ignoreDuplicates: true }
  );

  // Send notification emails
  if (toAward.some(b => b.slug === "active_member")) {
    sendActiveMemberEmail(db, userId).catch(() => {});
  }
  if (toAward.some(b => b.slug === "legacy_member")) {
    sendLegacyMemberEmail(db, userId).catch(() => {});
  }

  return toAward.map(b => getBadgeBySlug(b.slug)!).filter(Boolean);
}

const SITE_URL         = "https://www.tradepronexus.com";
const SENDGRID_KEY     = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "outreach@mail.tradepronexus.com";
const PHYSICAL_ADDRESS = "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

async function sendActiveMemberEmail(db: any, userId: string): Promise<void> {
  if (!SENDGRID_KEY) return;

  const { data: { user } } = await db.auth.admin.getUserById(userId);
  if (!user?.email) return;

  const { data: prof } = await db
    .from("profiles")
    .select("first_name, slug")
    .eq("user_id", userId)
    .maybeSingle();

  const firstName    = prof?.first_name || "there";
  const referralLink = `${SITE_URL}/signup?ref=${userId}`;
  const profileUrl   = prof?.slug ? `${SITE_URL}/pro/${prof.slug}` : `${SITE_URL}/account`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#eab308;height:4px;"></td></tr>
    <tr><td style="padding:32px;">
      <div style="font-size:32px;text-align:center;margin-bottom:16px;">⚡</div>
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:900;text-align:center;">You earned the Active Member badge.</h1>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.6;text-align:center;">
        Hey ${firstName}, your first post is live on the TradePro Nexus feed.
        The badge is on your Trade Card now.
      </p>
      <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Your discount progress</p>
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Refer 3 trade pros to earn 20% off verification when it launches.</p>
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Refer 10 to get verification free ($99 value).</p>
        <p style="margin:8px 0 0;color:#f97316;font-size:13px;font-weight:700;">Your referral link:</p>
        <p style="margin:4px 0 0;"><a href="${referralLink}" style="color:#f97316;font-size:13px;">${referralLink}</a></p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${profileUrl}" style="display:block;padding:12px 24px;color:#fff;font-weight:800;font-size:14px;text-decoration:none;">View My Trade Card</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;">${PHYSICAL_ADDRESS}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: user.email }] }],
      from: { email: FROM_EMAIL, name: "TradePro Nexus" },
      reply_to: { email: "andrew@tradepronexus.com", name: "TradePro Nexus" },
      subject: "You just earned your Active Member badge on TradePro Nexus",
      content: [{ type: "text/html", value: html }],
    }),
  });
}

async function sendLegacyMemberEmail(db: any, userId: string): Promise<void> {
  if (!SENDGRID_KEY) return;
  const { data: { user } } = await db.auth.admin.getUserById(userId);
  if (!user?.email) return;
  const { data: prof } = await db.from("profiles").select("first_name, firm_name, slug").eq("user_id", userId).maybeSingle();
  const greeting     = prof?.firm_name || prof?.first_name || "there";
  const profileUrl   = prof?.slug ? `${SITE_URL}/pro/${prof.slug}` : `${SITE_URL}/account`;
  const referralUrl  = `${SITE_URL}/signup?ref=${userId}`;
  const html = `<!DOCTYPE html><html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:580px;">
  <tr><td align="center" style="padding-bottom:24px;"><span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span></td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:linear-gradient(90deg,#b45309,#d97706,#f59e0b);height:4px;"></td></tr>
    <tr><td style="padding:36px;">
      <div style="text-align:center;margin-bottom:16px;font-size:40px;">🏅</div>
      <h1 style="margin:0 0 8px;color:#f59e0b;font-size:22px;font-weight:900;text-align:center;">Legacy Member badge earned.</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:13px;text-align:center;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">One of the first 100 members of TradePro Nexus</p>
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">You did it, ${greeting}.</p>
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        You are one of the first 100 Legacy Members of TradePro Nexus. Sign up. Post once. Badge earned. Your verification is free for life.
      </p>
      <div style="background:#0f172a;border-radius:12px;padding:18px 20px;margin-bottom:24px;border-left:4px solid #f59e0b;">
        <p style="margin:0 0 6px;color:#f59e0b;font-size:15px;font-weight:900;">What this means:</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">
          When verification launches, you pay nothing. Free. Forever. No charge. No expiration. That is our commitment to the people who showed up first.
        </p>
      </div>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;width:100%;">
        <tr><td style="background:#f59e0b;border-radius:12px;text-align:center;">
          <a href="${profileUrl}" style="display:block;padding:14px 28px;color:#0f172a;font-weight:900;font-size:15px;text-decoration:none;">View My Trade Card</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6;">
        Refer trade pros and they get 20% off verification when it launches. Your referral link:<br>
        <a href="${referralUrl}" style="color:#f97316;">${referralUrl}</a>
      </p>
      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;">${SITE_URL}</a>
      <p style="margin:8px 0 0;color:#475569;font-size:12px;font-style:italic;">Verified by Paper. Not by Algorithm.</p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;">${PHYSICAL_ADDRESS}</p>
    </td></tr>
  </td></tr>
</table></td></tr></table></body></html>`;
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: user.email }] }],
      from: { email: "andrew@tradepronexus.com", name: "Andrew O'Neill at TradePro Nexus" },
      reply_to: { email: "andrew@tradepronexus.com" },
      subject: "You did it. Legacy Member badge earned.",
      content: [{ type: "text/html", value: html }],
    }),
  });
}
