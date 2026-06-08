import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { checkAndAwardBadges } from "@/lib/badges";

// POST /api/badges/check?trigger=profile|post|follow
// Called after actions that may unlock badges.
export async function POST(request: Request) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ newBadges: [] });

  const url = new URL(request.url);
  const trigger = (url.searchParams.get("trigger") ?? "profile") as "profile" | "post" | "follow";

  try {
    const newBadges = await checkAndAwardBadges(user.id, trigger);
    return NextResponse.json({ newBadges });
  } catch (err) {
    console.error("Badge check error:", err);
    return NextResponse.json({ newBadges: [] });
  }
}
