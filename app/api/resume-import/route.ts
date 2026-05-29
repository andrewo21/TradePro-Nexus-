import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// POST /api/resume-import
// Called by the TradePro Resume Builder ("Send to Nexus" button).
// Authenticated via shared RESUME_IMPORT_SECRET header.
// Pre-populates a user's Trade Card with resume data.
//
// Expected payload shape (matches Resume Builder export format):
// {
//   secret: string,           // must match RESUME_IMPORT_SECRET
//   user_email: string,       // used to find or create the Nexus user
//   first_name: string,
//   last_name: string,
//   phone?: string,
//   location_city?: string,
//   location_state?: string,
//   location_zip?: string,
//   trade: string,
//   years_experience?: number,
//   certifications?: string[],
//   skills?: string[],
//   bio?: string,
//   availability_status?: "available" | "available_soon" | "booked"
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, user_email, first_name, last_name, ...profileData } = body;

    // Authenticate with shared secret
    if (secret !== process.env.RESUME_IMPORT_SECRET) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!user_email?.trim() || !first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json({ error: "user_email, first_name, and last_name are required." }, { status: 400 });
    }

    const db = getSupabaseAdmin() as any;

    // Find the Nexus user by email
    const { data: users } = await db.auth.admin.listUsers();
    const nexusUser = users?.users?.find((u: any) => u.email?.toLowerCase() === user_email.toLowerCase());

    if (!nexusUser) {
      // User doesn't have a Nexus account yet — return a sign-up URL with pre-filled data
      const signupUrl = `https://tradepronexus.com/signup?email=${encodeURIComponent(user_email)}&name=${encodeURIComponent(`${first_name} ${last_name}`)}`;
      return NextResponse.json({
        imported: false,
        action: "signup_required",
        signup_url: signupUrl,
        message: "User doesn't have a TradePro Nexus account. Direct them to the signup URL.",
      });
    }

    // Check if they already have a profile
    const { data: existingProfile } = await db
      .from("profiles")
      .select("id, slug")
      .eq("user_id", nexusUser.id)
      .single();

    const slug = existingProfile?.slug
      ?? `${first_name.toLowerCase()}-${last_name.toLowerCase()}`.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const update: Record<string, unknown> = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
    };

    if (profileData.phone)              update.phone = profileData.phone;
    if (profileData.location_city)      update.location_city = profileData.location_city;
    if (profileData.location_state)     update.location_state = profileData.location_state;
    if (profileData.location_zip)       update.location_zip = profileData.location_zip;
    if (profileData.trade)              update.trade = profileData.trade;
    if (profileData.years_experience)   update.years_experience = profileData.years_experience;
    if (profileData.bio)                update.bio = profileData.bio;
    if (profileData.availability_status) update.availability_status = profileData.availability_status;
    if (profileData.certifications?.length) update.other_certifications = profileData.certifications;

    if (existingProfile) {
      await db.from("profiles").update(update).eq("id", existingProfile.id);
      return NextResponse.json({ imported: true, action: "updated", profile_slug: existingProfile.slug });
    }

    // Create new profile
    const { data: newProfile } = await db.from("profiles").insert({
      user_id: nexusUser.id,
      slug,
      trade: profileData.trade ?? "Trade Pro",
      ...update,
    }).select("slug").single();

    return NextResponse.json({
      imported: true,
      action: "created",
      profile_slug: newProfile?.slug ?? slug,
      profile_url: `https://tradepronexus.com/pro/${newProfile?.slug ?? slug}`,
    });
  } catch (err) {
    console.error("Resume import error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
