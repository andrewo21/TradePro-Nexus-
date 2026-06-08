import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/news/follow — list sources the current user follows
export async function GET() {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ sources: [] });

  const { data } = await db.from("followed_news_sources")
    .select("source_name")
    .eq("user_id", user.id);

  return NextResponse.json({ sources: (data ?? []).map((r: any) => r.source_name) });
}

// POST /api/news/follow — toggle follow for a source { source_name }
export async function POST(request: NextRequest) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source_name } = await request.json() as { source_name: string };
  if (!source_name?.trim()) return NextResponse.json({ error: "source_name required" }, { status: 400 });

  const { data: existing } = await db.from("followed_news_sources")
    .select("id").eq("user_id", user.id).eq("source_name", source_name).single();

  if (existing) {
    await db.from("followed_news_sources").delete()
      .eq("user_id", user.id).eq("source_name", source_name);
    return NextResponse.json({ following: false });
  } else {
    await db.from("followed_news_sources").insert({ user_id: user.id, source_name });
    return NextResponse.json({ following: true });
  }
}
