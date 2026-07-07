import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const SITE_URL = "https://www.tradepronexus.com";

// GET /api/raffle/status
// Returns the logged-in user's raffle entry status: referral link/count,
// whether they've posted, and whether they're fully qualified.
export async function GET() {
  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getSupabaseAdmin() as any;

  const { data: row } = await db
    .from("raffle_entrants")
    .select("referral_code, first_post_at, referral_count, qualified, entered_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const referralCode = row?.referral_code ?? null;
  const hasPost = !!row?.first_post_at;
  const referralCount = row?.referral_count ?? 0;
  const qualified = row?.qualified ?? false;

  const remaining: string[] = [];
  if (!hasPost) remaining.push("Create one post on the Live Feed");
  if (referralCount < 2) remaining.push(`Refer ${2 - referralCount} more ${2 - referralCount === 1 ? "friend" : "friends"} who sign up`);

  return NextResponse.json({
    referralCode,
    referralLink: referralCode ? `${SITE_URL}/signup?ref=${referralCode}` : null,
    referralCount,
    hasPost,
    qualified,
    enteredAt: row?.entered_at ?? null,
    remaining,
  });
}
