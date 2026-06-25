import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "andrew@tradepronexus.com";
const FROM_NAME        = "Andrew O'Neill at TradePro Nexus";
const SITE_URL         = "https://www.tradepronexus.com";

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

async function sendEmail(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) return;
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  }).catch(() => {});
}

// Extract a greeting name from a business name — use first word if it looks like
// a personal name (alpha only, 2-15 chars), otherwise fall back to "there".
function extractGreetingName(businessName: string): string {
  const first = businessName.split(/\s+/)[0] ?? "";
  const clean = first.replace(/[^a-zA-Z]/g, "");
  if (clean.length >= 2 && clean.length <= 15) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return "there";
}

function buildEmail1Html(opts: {
  businessName: string;
  profileUrl: string;
  referralUrl: string;
  physicalAddress: string;
}): string {
  const greeting = extractGreetingName(opts.businessName);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:580px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:36px 36px 28px;">

      <p style="margin:0 0 20px;color:#f1f5f9;font-size:16px;font-weight:700;">Subject: Welcome to TradePro Nexus</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hi ${greeting},</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        My name is Andrew O'Neill and I am a 30 year veteran of the commercial construction industry.
      </p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        I built TradePro Nexus because our industry deserved better than phone calls to buddies
        and gut instinct when finding the right crews or the right work. We needed a professional
        home built specifically for the trades — not adapted from a resume tool or a homeowner app.
      </p>

      <p style="margin:0 0 20px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        You just claimed your free listing and I want to personally welcome you.
      </p>

      <p style="margin:0 0 12px;color:#f1f5f9;font-size:15px;font-weight:700;">Here is what makes this platform powerful for you:</p>

      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        The more complete your profile the more likely a GC searching for crews in your market
        finds you first. Add your trade, certifications, crew size, availability, and union
        affiliation if applicable. It takes five minutes and it puts you in front of contractors
        who are actively looking for people like you.
      </p>

      <p style="margin:0 0 8px;color:#f1f5f9;font-size:15px;font-weight:700;">A few things worth knowing:</p>
      <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">Your Trade Card is always free</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Available for Work toggle lets GCs know you are ready for new opportunities</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Live Feed is where the community grows — start posting today</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">Refer 3 trade professionals and earn 20% off your verification badge when it launches</p>
      </div>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${opts.profileUrl}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">
            View Your Trade Card
          </a>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        This platform is yours. I built it for us.
      </p>

      <p style="margin:0 0 4px;color:#e2e8f0;font-size:15px;line-height:1.7;">See you around.</p>

      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;line-height:1.7;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;line-height:1.6;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;text-decoration:none;">${SITE_URL}</a>
      <p style="margin:8px 0 0;color:#475569;font-size:12px;font-style:italic;">Verified by Paper. Not by Algorithm.</p>

    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">
        TradePro Technologies LLC | TradePro Nexus<br>
        ${opts.physicalAddress}<br>
        <a href="${SITE_URL}/unsubscribe" style="color:#64748b;">Unsubscribe</a>
      </p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
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

  // 7. Send Email 1 — immediate "Your profile is live"
  const profileUrl = `${SITE_URL}/pro/${slug}`;
  const physicalAddress = "17629 Fallen Branch Way, Punta Gorda, FL 33982";

  await sendEmail(
    email,
    `Your TradePro Nexus profile is live — ${businessName}`,
    buildEmail1Html({ businessName, profileUrl, referralUrl: `${SITE_URL}/signup?ref=${userId}`, physicalAddress })
  );

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

  return NextResponse.json({ ok: true, slug, profileUrl });
}
