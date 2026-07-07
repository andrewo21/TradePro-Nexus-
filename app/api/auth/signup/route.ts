import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { sendWelcomeEmail, extractGreetingName } from "@/lib/email/welcomeEmail";

const SITE_URL = "https://www.tradepronexus.com";

// POST /api/auth/signup
// Body: { email, password, full_name, role, profile_type }
// Creates the account through the admin API with email_confirm: true, the same
// auto-confirm pattern already proven by the claim flow. One auth model, no
// email-verification dependency: the account is live the moment this returns ok.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").toString();
  const fullName = (body.full_name ?? "").trim();
  const role = body.role === "gc" ? "gc" : "tradepro";
  const profileType = (body.profile_type ?? "tradepro").toString();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  // Reject re-registration against an existing account with a clear, immediate error,
  // rather than silently resending a confirmation email for a stale signup attempt.
  const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = (users ?? []).find((u: any) => u.email === email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in instead." },
      { status: 409 }
    );
  }

  const { data: newUser, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, profile_type: profileType },
  });

  if (createErr || !newUser?.user) {
    console.error("[api/auth/signup] createUser failed:", createErr?.message ?? "unknown error");
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
  }

  const welcomeResult = await sendWelcomeEmail({
    to: email,
    subject: "Welcome to TradePro Nexus",
    greetingName: extractGreetingName(fullName),
    introLine: "You just created your free account and I want to personally welcome you.",
    ctaUrl: `${SITE_URL}/build`,
    ctaLabel: "Build Your Trade Card",
  });
  if (!welcomeResult.ok) {
    console.error("[api/auth/signup] welcome email failed:", welcomeResult.error);
    // Non-fatal — the account already exists and is usable. Email delivery is
    // logged for follow-up, not a reason to fail account creation.
  }

  return NextResponse.json({ ok: true, userId: newUser.user.id });
}
