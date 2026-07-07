import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// POST /api/admin/raffle/pick-winner
// Access is enforced by proxy.ts (ADMIN_ALLOWED_EMAILS) for all /api/admin/* paths.
// Randomly selects one qualified entrant and returns their name and email.
export async function POST() {
  const db = getSupabaseAdmin() as any;

  const { data, error } = await db
    .from("raffle_entrants")
    .select("user_id, first_name, last_name, email, referral_code, referral_count, entered_at")
    .eq("qualified", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entrants = data ?? [];
  if (!entrants.length) {
    return NextResponse.json({ error: "No qualified entrants yet." }, { status: 404 });
  }

  const winner = entrants[Math.floor(Math.random() * entrants.length)];

  return NextResponse.json({ winner, totalEntrants: entrants.length });
}
