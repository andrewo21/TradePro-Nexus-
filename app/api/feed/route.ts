import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const { content, project_name, trade_tags, author_type } = body as {
      content: string;
      project_name?: string;
      trade_tags?: string[];
      author_type: "profile" | "company";
    };

    if (!content?.trim()) return NextResponse.json({ error: "Content is required." }, { status: 400 });

    // Find the author record
    let authorId: string | null = null;
    if (author_type === "profile") {
      const { data } = await db.from("profiles").select("id").eq("user_id", user.id).single();
      authorId = data?.id ?? null;
    } else {
      const { data } = await db.from("companies").select("id").eq("user_id", user.id).single();
      authorId = data?.id ?? null;
    }

    if (!authorId) return NextResponse.json({ error: "Profile not found. Build your Trade Card first." }, { status: 404 });

    const { data: post, error } = await db.from("feed_posts").insert({
      author_id: authorId,
      author_type,
      content: content.trim(),
      project_name: project_name?.trim() || null,
      trade_tags: trade_tags ?? [],
      is_moderated: false,
    }).select().single();

    if (error) throw error;

    return NextResponse.json(post);
  } catch (err) {
    console.error("Feed post error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
