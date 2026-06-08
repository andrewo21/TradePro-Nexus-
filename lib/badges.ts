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

  const { data: existing } = await db
    .from("user_badges")
    .select("badge_slug")
    .eq("user_id", userId);
  const held = new Set<string>((existing ?? []).map((r: any) => r.badge_slug));

  const toAward: Array<{ slug: string; coupon_code?: string }> = [];

  if (trigger === "post") {
    const { data: prof } = await db.from("profiles").select("id").eq("user_id", userId).single();
    if (prof) {
      const { count: totalPosts } = await db
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", prof.id)
        .eq("author_type", "profile");

      const n = totalPosts ?? 0;

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

  return toAward.map(b => getBadgeBySlug(b.slug)!).filter(Boolean);
}
