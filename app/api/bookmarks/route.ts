import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/bookmarks — list post IDs the current user has bookmarked
export async function GET() {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ bookmarks: [] });

  const { data } = await db.from("bookmarks").select("post_id").eq("user_id", user.id);
  return NextResponse.json({ bookmarks: (data ?? []).map((b: any) => b.post_id) });
}

// POST /api/bookmarks — toggle bookmark { post_id }
export async function POST(request: NextRequest) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { post_id } = await request.json();
  if (!post_id) return NextResponse.json({ error: "post_id required." }, { status: 400 });

  // Check if already bookmarked
  const { data: existing } = await db.from("bookmarks").select("id").eq("user_id", user.id).eq("post_id", post_id).single();

  if (existing) {
    await db.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post_id);
    return NextResponse.json({ bookmarked: false });
  } else {
    await db.from("bookmarks").insert({ user_id: user.id, post_id });
    return NextResponse.json({ bookmarked: true });
  }
}
