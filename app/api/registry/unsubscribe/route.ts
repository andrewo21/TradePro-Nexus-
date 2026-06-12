// GET  /api/registry/unsubscribe?token=...
//   Looks up the unclaimed profile by its remove_token for display on /unsubscribe.
//
// POST /api/registry/unsubscribe
//   Body: { token: string, action: "unsubscribe" | "remove" }
//   "unsubscribe" — sets outreach_eligible=false, marks any outreach_log rows as unsubscribed.
//   "remove"      — hard-deletes the unclaimed_profiles row (cascades to outreach_log).
// Public, token-based — no auth. Token is a random UUID (remove_token).

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;
  const { data: profile } = await db
    .from("unclaimed_profiles")
    .select("business_name, source_state, outreach_eligible, remove_requested")
    .eq("remove_token", token)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  return NextResponse.json({
    businessName: profile.business_name,
    sourceState: profile.source_state,
    outreachEligible: profile.outreach_eligible,
    removeRequested: profile.remove_requested,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token, action } = body as { token?: string; action?: string };

  if (!token || (action !== "unsubscribe" && action !== "remove")) {
    return NextResponse.json({ error: "Missing or invalid token/action." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;
  const { data: profile } = await db
    .from("unclaimed_profiles")
    .select("id")
    .eq("remove_token", token)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  if (action === "unsubscribe") {
    await db
      .from("unclaimed_profiles")
      .update({ outreach_eligible: false })
      .eq("id", profile.id);

    await db
      .from("outreach_log")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("unclaimed_profile_id", profile.id)
      .neq("status", "unsubscribed");

    return NextResponse.json({ ok: true, action: "unsubscribe" });
  }

  // action === "remove" — hard delete (cascades to outreach_log)
  await db.from("unclaimed_profiles").delete().eq("id", profile.id);

  return NextResponse.json({ ok: true, action: "remove" });
}
