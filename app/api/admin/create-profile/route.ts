import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL      = "andrew@tradeprotech.ai";
const SENDGRID_KEY     = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "andrew@tradepronexus.com";
const FROM_NAME        = "Andrew O'Neill at TradePro Nexus";
const SITE_URL         = "https://www.tradepronexus.com";
const PHYSICAL_ADDRESS = "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";

async function sendSg(to: string, subject: string, html: string) {
  if (!SENDGRID_KEY) return;
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  }).catch(() => {});
}

function welcomeHtml(firstName: string, profileUrl: string, referralUrl: string): string {
  return `<!DOCTYPE html><html>
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
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hi ${firstName},</p>
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">My name is Andrew O'Neill and I am a 30 year veteran of the commercial construction industry.</p>
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">I built TradePro Nexus because our industry deserved better than phone calls to buddies and gut instinct when finding the right crews or the right work. We needed a professional home built specifically for the trades — not adapted from a resume tool or a homeowner app.</p>
      <p style="margin:0 0 20px;color:#e2e8f0;font-size:15px;line-height:1.7;">You just claimed your free listing and I want to personally welcome you.</p>
      <p style="margin:0 0 12px;color:#f1f5f9;font-size:15px;font-weight:700;">Here is what makes this platform powerful for you:</p>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">The more complete your profile the more likely a GC searching for crews in your market finds you first. Add your trade, certifications, crew size, availability, and union affiliation if applicable. It takes five minutes and it puts you in front of contractors who are actively looking for people like you.</p>
      <p style="margin:0 0 8px;color:#f1f5f9;font-size:15px;font-weight:700;">A few things worth knowing:</p>
      <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">Your Trade Card is always free</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Available for Work toggle lets GCs know you are ready for new opportunities</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Live Feed is where the community grows — start posting today</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">Refer 3 trade professionals and earn 20% off your verification badge when it launches</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${profileUrl}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">View Your Trade Card</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">This platform is yours. I built it for us.</p>
      <p style="margin:0 0 4px;color:#e2e8f0;font-size:15px;line-height:1.7;">See you around.</p>
      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;line-height:1.7;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;line-height:1.6;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;text-decoration:none;">${SITE_URL}</a>
      <p style="margin:8px 0 0;color:#475569;font-size:12px;font-style:italic;">Verified by Paper. Not by Algorithm.</p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">
        ${PHYSICAL_ADDRESS}<br>
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

function magicLinkHtml(firstName: string, magicLink: string, profileUrl: string): string {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#3b82f6;height:4px;"></td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:900;">Log in to manage your profile.</h1>
      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.6;">
        Hey ${firstName}, your TradePro Nexus profile is live. Click below to log in and manage your Trade Card — no password required.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;width:100%;">
        <tr><td style="background:#3b82f6;border-radius:12px;text-align:center;">
          <a href="${magicLink}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">Log In to My Account</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#475569;font-size:12px;text-align:center;">This link expires in 24 hours. No password needed.</p>
      <div style="background:#0f172a;border-radius:10px;padding:12px 16px;margin-top:16px;">
        <p style="margin:0;color:#64748b;font-size:12px;">Your profile: <a href="${profileUrl}" style="color:#f97316;">${profileUrl}</a></p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;">${PHYSICAL_ADDRESS}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function generateUniqueSlug(db: any, name1: string, name2: string, table: "profiles" | "companies"): Promise<string> {
  const base = `${name1}-${name2}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "trade-pro";

  const { data } = await db.from(table).select("slug").eq("slug", base).maybeSingle();
  if (!data) return base;

  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 4)}`;
    const { data: ex } = await db.from(table).select("slug").eq("slug", candidate).maybeSingle();
    if (!ex) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  // Admin auth check
  const authDb = await getSupabaseServer();
  const { data: { user: adminUser } } = await (authDb as any).auth.getUser();
  if (adminUser?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    accountType = "tradepro",
    // Trade Pro fields
    firstName, lastName, businessName, trade,
    yearsExperience, crewSize, unionMember, unionName, unionLocalNumber,
    certifications, availableForWork,
    // GC fields
    companyName, tradeSpecialties, yearsInBusiness,
    // Shared
    email, phone, city, state,
  } = body;

  const isGC = accountType === "gc";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (isGC && !companyName) {
    return NextResponse.json({ error: "Company name is required for GC accounts." }, { status: 400 });
  }
  if (!isGC && (!firstName || !lastName || !trade)) {
    return NextResponse.json({ error: "First name, last name, and trade are required." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  // 1. Create auth user — email pre-confirmed, no password
  const displayName = isGC ? companyName : `${firstName} ${lastName}`;
  let userId: string;
  const { data: newUser, error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      role: isGC ? "gc" : "tradepro",
      profile_type: isGC ? "gc" : "tradepro",
      via_claim: !isGC,
      admin_created: true,
    },
  });

  if (createErr) {
    const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = (users ?? []).find((u: any) => u.email === email);
    if (!existing) {
      return NextResponse.json({ error: `Could not create account: ${createErr.message}` }, { status: 500 });
    }
    userId = existing.id;
  } else {
    userId = newUser.user.id;
  }

  let profileUrl: string;
  let slug: string;
  const greetingName = isGC ? (companyName?.split(" ")[0] ?? "there") : (firstName ?? "there");

  if (isGC) {
    // ── GC account: creates a companies record ───────────────────────────────
    slug = await generateUniqueSlug(db, companyName, "", "companies");
    const specialtiesArray = tradeSpecialties
      ? tradeSpecialties.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const { error: coErr } = await db.from("companies").insert({
      user_id:         userId,
      slug,
      name:            companyName.trim(),
      email:           email.trim(),
      phone:           phone?.trim() || null,
      location_city:   city?.trim() || null,
      location_state:  state?.trim() || null,
      trade_specialties: specialtiesArray,
      years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
      availability_status: "available",
    });

    if (coErr) {
      const { data: existing } = await db.from("companies").select("slug").eq("user_id", userId).maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: `Could not create company: ${coErr.message}` }, { status: 500 });
      }
      slug = existing.slug;
    }
    profileUrl = `${SITE_URL}/company/${slug}`;

  } else {
    // ── Trade Pro account: creates a profiles record ─────────────────────────
    slug = await generateUniqueSlug(db, firstName, lastName, "profiles");
    const certsArray = certifications
      ? certifications.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

    const { error: profileErr } = await db.from("profiles").insert({
      user_id:              userId,
      slug,
      first_name:           firstName.trim(),
      last_name:            lastName.trim(),
      firm_name:            businessName?.trim() || null,
      trade:                trade.trim(),
      profile_type:         "tradepro",
      location_city:        city?.trim() || null,
      location_state:       state?.trim() || null,
      phone:                phone?.trim() || null,
      email:                email.trim(),
      years_experience:     yearsExperience ? parseInt(yearsExperience) : null,
      crew_size:            crewSize ? parseInt(crewSize) : null,
      union_member:         !!unionMember,
      union_name:           unionName?.trim() || null,
      union_local_number:   unionLocalNumber?.trim() || null,
      other_certifications: certsArray,
      availability_status:  availableForWork ? "available" : "booked",
      is_internal:          false,
      is_seed_account:      false,
    });

    if (profileErr) {
      const { data: existing } = await db.from("profiles").select("slug").eq("user_id", userId).maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: `Could not create profile: ${profileErr.message}` }, { status: 500 });
      }
      slug = existing.slug;
    }
    profileUrl = `${SITE_URL}/pro/${slug}`;

    // Check for matching unclaimed_profiles record and mark as claimed
    const biz = businessName?.trim() || (firstName?.trim() + " " + lastName?.trim());
    if (biz || email) {
      let uq = db.from("unclaimed_profiles").select("id").eq("claimed", false).eq("visible", true);
      if (biz) uq = uq.ilike("business_name", `%${biz}%`); else uq = uq.eq("email", email);
      const { data: unclaimed } = await uq.maybeSingle();
      if (unclaimed) {
        await db.from("unclaimed_profiles").update({
          claimed: true, claimed_by: userId, claimed_at: new Date().toISOString(),
        }).eq("id", unclaimed.id);
      }
    }
  }

  // Generate magic link
  const { data: linkData } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE_URL}/account` },
  });
  const magicLink = linkData?.properties?.action_link ?? `${SITE_URL}/login`;

  // Send welcome email + magic link email
  const referralUrl = `${SITE_URL}/signup?ref=${userId}`;
  await sendSg(email, "Welcome to TradePro Nexus", welcomeHtml(greetingName, profileUrl, referralUrl));
  await sendSg(email, "Your TradePro Nexus login link", magicLinkHtml(greetingName, magicLink, profileUrl));

  return NextResponse.json({ ok: true, slug, profileUrl, userId, magicLink, accountType });
}
