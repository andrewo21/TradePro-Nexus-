import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// POST /api/profile-view — record a GC viewing a Trade Card
// Called client-side on /pro/[slug] page load when viewer is a GC
export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ ok: false });

    const { profile_id } = await request.json();
    if (!profile_id) return NextResponse.json({ ok: false });

    // Don't record self-views
    const { data: ownProfile } = await db.from("profiles").select("id").eq("user_id", user.id).single();
    if (ownProfile?.id === profile_id) return NextResponse.json({ ok: false });

    await db.from("profile_views").insert({ viewer_user_id: user.id, profile_id });

    // TODO Phase 6: trigger push notification to profile owner
    // await sendPushNotification({ type: 'profile_viewed', profile_id, viewer_id: user.id });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
