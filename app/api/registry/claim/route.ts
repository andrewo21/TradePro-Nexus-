import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { sendWelcomeEmail, extractGreetingName } from "@/lib/email/welcomeEmail";
import { mapLicenseTypeToTrade, generateUniqueSlug } from "@/lib/registry/claimProfile";

const SITE_URL = "https://www.tradepronexus.com";

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
    .select("id, business_name, license_type, license_number, city, state, source_state, phone, claimed, email")
    .eq("claim_token", token)
    .maybeSingle() as { data: UnclaimedProfile | null };

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

  const businessName  = profile.business_name ?? "Trade Pro";
  const trade         = mapLicenseTypeToTrade(profile.license_type);
  const stateAbbr     = profile.state || profile.source_state || "FL";

  // Reuse an existing profile row if this user already has one (e.g. re-claiming
  // after a partial signup); otherwise create it now so the account is fully
  // live — no separate builder wizard required.
  const { data: existingProfile } = await (admin as any)
    .from("profiles")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle();

  let slug: string = existingProfile?.slug;
  if (!slug) {
    slug = await generateUniqueSlug(admin, businessName);
    const nameParts = businessName.split(/\s+/);
    const { error: profileErr } = await (admin as any).from("profiles").insert({
      user_id:            user.id,
      slug,
      first_name:         nameParts[0] ?? "Trade",
      last_name:          nameParts.slice(1).join(" ") || "Pro",
      firm_name:          businessName,
      trade,
      profile_type:       "tradepro",
      location_city:      profile.city || null,
      location_state:     stateAbbr,
      license_number:     profile.license_number ?? null,
      phone:              profile.phone ?? null,
      availability_status: "available",
      is_internal:        false,
      is_seed_account:    false,
    });
    if (profileErr) {
      return NextResponse.json({ error: "Could not create profile. Please try again." }, { status: 500 });
    }
  }

  const profileUrl = `${SITE_URL}/pro/${slug}`;

  // Await the welcome email — must not be fire-and-forget because Vercel
  // terminates the execution context the moment the response is sent.
  const welcomeResult = await sendWelcomeEmail({
    to: user.email!,
    subject: `Your TradePro Nexus profile is live, ${businessName}`,
    greetingName: extractGreetingName(businessName),
    introLine: "You just claimed your free listing and I want to personally welcome you.",
    ctaUrl: profileUrl,
    ctaLabel: "View Your Trade Card",
  });
  if (!welcomeResult.ok) {
    console.error("[registry/claim] welcome email failed:", welcomeResult.error);
  }

  return NextResponse.json({ ok: true, slug, profileUrl });
}
