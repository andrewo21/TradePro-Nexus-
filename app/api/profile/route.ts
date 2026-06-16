import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const ALLOWED_FIELDS = [
  "bio", "phone", "email",
  "trade", "years_experience", "crew_size", "payroll_type",
  "location_city", "location_state", "location_zip",
  "firm_name", "license_number",
];

export async function PATCH(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;

    // Only allow known safe fields — no touching verification_status, user_id, slug, etc.
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const { data, error } = await db
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !data) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
