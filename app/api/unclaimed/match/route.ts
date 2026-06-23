import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// GET /api/unclaimed/match?name={name}
// Searches unclaimed_profiles by business_name for the signup "magic match" prompt.
// Returns up to 3 matches with enough info to show the "Is this you?" card.
// No auth required — this runs before the account is created.
export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") ?? "").trim();
  if (name.length < 3) return NextResponse.json({ matches: [] });

  const db = getSupabaseAdmin() as any;

  const { data } = await db
    .from("unclaimed_profiles")
    .select("id, business_name, license_type, city, source_state, claim_token")
    .ilike("business_name", `%${name}%`)
    .eq("visible", true)
    .eq("claimed", false)
    .eq("remove_requested", false)
    .order("quality_score", { ascending: false })
    .limit(3);

  return NextResponse.json({ matches: data ?? [] });
}
