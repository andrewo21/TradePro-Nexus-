import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

type UnclaimedProfile = {
  id: string;
  business_name: string;
  license_type: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  source_state: string | null;
  claimed: boolean;
  claimed_by: string | null;
};

// GET ?token= — validate claim token, return unclaimed profile data for pre-fill
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await (admin as any)
    .from("unclaimed_profiles")
    .select("id, business_name, license_type, city, state, phone, email, license_number, source_state, claimed")
    .eq("claim_token", token)
    .maybeSingle() as { data: UnclaimedProfile | null };

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.claimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 410 });
  }

  return NextResponse.json({
    id: profile.id,
    business_name: profile.business_name,
    license_type: profile.license_type,
    city: profile.city,
    state: profile.state,
    phone: profile.phone,
    email: profile.email,
    license_number: profile.license_number,
    source_state: profile.source_state,
  });
}

// POST { token } — mark unclaimed profile as claimed, link to user, fire welcome email
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { token } = body as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await (admin as any)
    .from("unclaimed_profiles")
    .select("id, claimed, email")
    .eq("claim_token", token)
    .maybeSingle() as { data: Pick<UnclaimedProfile, "id" | "claimed" | "email"> | null };

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.claimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const { error: updateError } = await (admin as any)
    .from("unclaimed_profiles")
    .update({
      claimed: true,
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    return NextResponse.json({ error: (updateError as { message: string }).message }, { status: 500 });
  }

  // Await the welcome email — must not be fire-and-forget because Vercel
  // terminates the execution context the moment the response is sent.
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-claim-welcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ unclaimed_profile_id: profile.id }),
    });
  } catch {
    // Email failure should not block the claim success response
  }

  return NextResponse.json({ ok: true });
}
