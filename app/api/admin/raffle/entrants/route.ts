import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// GET /api/admin/raffle/entrants
// Access is enforced by proxy.ts (ADMIN_ALLOWED_EMAILS) for all /api/admin/* paths.
export async function GET() {
  const db = getSupabaseAdmin() as any;

  const { data, error } = await db
    .from("raffle_entrants")
    .select("user_id, first_name, last_name, email, referral_code, referral_count, entered_at")
    .eq("qualified", true)
    .order("entered_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entrants: data ?? [] });
}
