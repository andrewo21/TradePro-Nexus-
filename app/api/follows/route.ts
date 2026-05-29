import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/follows?following_id=xxx — check follow status
export async function GET(request: NextRequest) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ following: false });

  const followingId = request.nextUrl.searchParams.get("following_id");
  if (!followingId) return NextResponse.json({ following: false });

  const { data } = await db.from("follows").select("id").eq("follower_user_id", user.id).eq("following_id", followingId).single();
  return NextResponse.json({ following: !!data });
}

// POST /api/follows — toggle follow { following_id, following_type }
export async function POST(request: NextRequest) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { following_id, following_type } = await request.json();
  if (!following_id || !following_type) return NextResponse.json({ error: "following_id and following_type required." }, { status: 400 });

  const { data: existing } = await db.from("follows").select("id").eq("follower_user_id", user.id).eq("following_id", following_id).single();

  if (existing) {
    await db.from("follows").delete().eq("follower_user_id", user.id).eq("following_id", following_id);
    return NextResponse.json({ following: false });
  } else {
    await db.from("follows").insert({ follower_user_id: user.id, following_id, following_type });
    return NextResponse.json({ following: true });
  }
}
