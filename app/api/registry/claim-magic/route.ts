import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { sendWelcomeEmail, extractGreetingName } from "@/lib/email/welcomeEmail";

const SITE_URL = "https://www.tradepronexus.com";

// Map DBPR / DPOR license_type strings to our trade dropdown values
function mapLicenseTypeToTrade(lt: string | null): string {
  if (!lt) return "Civil";
  const s = lt.toLowerCase();
  if (s.includes("electric"))                         return "Electrical";
  if (s.includes("plumb"))                            return "Plumbing";
  if (s.includes("hvac") || s.includes("air cond") || s.includes("refriger")) return "HVAC";
  if (s.includes("roof"))                             return "Roofing";
  if (s.includes("mechanic"))                         return "Mechanical";
  if (s.includes("fire") || s.includes("sprinkler"))  return "Fire Suppression";
  if (s.includes("concrete") || s.includes("cement")) return "Concrete";
  if (s.includes("mason"))                            return "Masonry";
  if (s.includes("paint") || s.includes("coating"))  return "Painting";
  if (s.includes("drywall") || s.includes("gypsum")) return "Drywall";
  if (s.includes("carpent") || s.includes("building contractor")) return "Carpentry";
  if (s.includes("steel") || s.includes("ironwork")) return "Structural Steel";
  return "Civil";
}

async function generateUniqueSlug(db: any, businessName: string): Promise<string> {
  const base = (businessName || "trade-pro")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "trade-pro";

  const { data } = await db.from("profiles").select("slug").eq("slug", base).maybeSingle();
  if (!data) return base;

  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    const { data: ex } = await db.from("profiles").select("slug").eq("slug", candidate).maybeSingle();
    if (!ex) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// POST /api/registry/claim-magic
// Body: { token: string, email: string }
// No existing auth required — creates the account from scratch.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = (body.token ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!token || !email || !email.includes("@")) {
    return NextResponse.json({ error: "token and valid email required" }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  // 1. Validate claim token
  const { data: profile } = await db
    .from("unclaimed_profiles")
    .select("id, business_name, license_type, license_number, city, state, source_state, phone, claimed, remove_token")
    .eq("claim_token", token)
    .eq("visible", true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Invalid or expired claim link." }, { status: 404 });
  }
  if (profile.claimed) {
    return NextResponse.json({ error: "This listing has already been claimed." }, { status: 409 });
  }

  const businessName  = profile.business_name ?? "Trade Pro";
  const trade         = mapLicenseTypeToTrade(profile.license_type);
  const city          = profile.city ?? "";
  const stateAbbr     = profile.state || profile.source_state || "FL";
  const licenseNumber = profile.license_number ?? null;
  const phone         = profile.phone ?? null;

  // 2. Create auth user (email pre-confirmed, no password)
  // If the user already exists, reuse their account.
  let userId: string;
  const { data: newUser, error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: businessName,
      profile_type: "tradepro",
      via_claim: true,
    },
  });

  if (createErr) {
    // User already exists — look them up by email
    const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (users ?? []).find((u: any) => u.email === email);
    if (!existing) {
      return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
    }
    userId = existing.id;
  } else {
    userId = newUser.user.id;
  }

  // 3. Generate a unique slug from the business name
  const slug = await generateUniqueSlug(db, businessName);

  // 4. Create the profile record
  const nameParts = businessName.split(/\s+/);
  const firstName = nameParts[0] ?? "Trade";
  const lastName  = nameParts.slice(1).join(" ") || "Pro";

  const { error: profileErr } = await db.from("profiles").insert({
    user_id:            userId,
    slug,
    first_name:         firstName,
    last_name:          lastName,
    firm_name:          businessName,
    trade,
    profile_type:       "tradepro",
    location_city:      city || null,
    location_state:     stateAbbr,
    license_number:     licenseNumber,
    phone:              phone || null,
    availability_status: "available",
    is_internal:        false,
    is_seed_account:    false,
    // setup_reminder_sent_at left NULL — edge function picks this up after 10 min
  });

  if (profileErr) {
    // Profile may already exist for this user
    const { data: existing } = await db.from("profiles").select("slug").eq("user_id", userId).maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Could not create profile. Please try again." }, { status: 500 });
    }
    // Use existing slug
    const profileUrl = `${SITE_URL}/pro/${existing.slug}`;
    return NextResponse.json({ ok: true, slug: existing.slug, profileUrl });
  }

  // 5. Mark unclaimed profile as claimed
  await db
    .from("unclaimed_profiles")
    .update({ claimed: true, claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq("id", profile.id);

  // 6. Generate magic link for future logins
  const { data: linkData } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE_URL}/account` },
  });
  const magicLink = linkData?.properties?.action_link ?? `${SITE_URL}/login`;

  // 7. Send the welcome email — synchronous so it fires within seconds of account creation
  const profileUrl = `${SITE_URL}/pro/${slug}`;

  const welcomeResult = await sendWelcomeEmail({
    to: email,
    subject: `Your TradePro Nexus profile is live, ${businessName}`,
    greetingName: extractGreetingName(businessName),
    introLine: "You just claimed your free listing and I want to personally welcome you.",
    ctaUrl: profileUrl,
    ctaLabel: "View Your Trade Card",
  });
  if (!welcomeResult.ok) {
    console.error("[claim-magic] welcome email failed:", welcomeResult.error);
  }

  // 8. Store magic link on profile for Email 2 (edge function reads it)
  // We store it temporarily so the setup-reminder edge function can include it
  await db.from("profiles").update({
    bio: null, // Keep bio empty — they'll fill it in
  }).eq("user_id", userId);

  // Also log to outreach_log to link this claim back to the outreach email
  // (best effort — don't fail the claim if this errors)
  try {
    await db.from("outreach_log").insert({
      unclaimed_profile_id: profile.id,
      source_state: profile.source_state,
      email: profile.phone ? null : email,
      is_test: false,
      status: "claimed",
      email_number: 3,
      sent_at: new Date().toISOString(),
    });
  } catch { /* non-critical */ }

  // Store magic link in a temp metadata field for Email 2
  // (we store it on the auth user metadata for the edge function to read)
  await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: businessName,
      profile_type: "tradepro",
      via_claim: true,
      setup_magic_link: magicLink,
    },
  });

  // 9. Check legacy member status and send notification if applicable
  const { data: createdProfile } = await db
    .from("profiles")
    .select("legacy_member")
    .eq("user_id", userId)
    .maybeSingle();

  const isLegacy = !!createdProfile?.legacy_member;

  return NextResponse.json({ ok: true, slug, profileUrl, isLegacyMember: isLegacy });
}
