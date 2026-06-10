import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// Returns real platform counts. Cached at edge for 5 minutes so the homepage
// doesn't hammer Supabase on every load.
export const revalidate = 300;

export async function GET() {
  try {
    const db = getSupabaseAdmin() as any;

    const [profileRes, companyRes, waitlistRes, verifiedRes] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("companies").select("*", { count: "exact", head: true }),
      db.from("waitlist").select("*", { count: "exact", head: true }),
      // Individuals ("tradepro") are never verified — only count verifiable profile types.
      db.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "verified").neq("profile_type", "tradepro"),
    ]);

    return NextResponse.json({
      profiles:  profileRes.count  ?? 0,
      companies: companyRes.count  ?? 0,
      waitlist:  waitlistRes.count ?? 0,
      verified:  verifiedRes.count ?? 0,
    });
  } catch {
    return NextResponse.json({ profiles: 0, companies: 0, waitlist: 0, verified: 0 });
  }
}
