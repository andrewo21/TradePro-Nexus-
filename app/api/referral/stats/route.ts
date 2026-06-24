import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getSupabaseAdmin() as any;

  const { count } = await db
    .from("referral_tracking")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("status", "completed");

  const referralCount = count ?? 0;

  return NextResponse.json({
    referralCount,
    referrerId: user.id,
  });
}
