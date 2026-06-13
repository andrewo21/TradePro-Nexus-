import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const { content, trade_tags, image_urls, author_type, audience, mentions } = body as {
      content: string;
      trade_tags?: string[];
      image_urls?: string[];
      author_type: "profile" | "company";
      audience?: "everyone" | "connections";
      mentions?: { type: "profile" | "company"; id: string; name: string; slug: string }[];
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
      trade_tags: trade_tags ?? [],
      image_urls: image_urls ?? [],
      audience: audience === "connections" ? "connections" : "everyone",
      mentions: mentions ?? [],
      is_moderated: false,
    }).select().single();

    if (error) throw error;

    // Check for newly earned badges (fire-and-forget errors don't block the post)
    let newBadges: import("@/lib/badges").Badge[] = [];
    try {
      newBadges = await checkAndAwardBadges(user.id, "post");
    } catch (badgeErr) {
      console.error("Badge check error:", badgeErr);
    }

    return NextResponse.json({ ...post, newBadges });
  } catch (err) {
    console.error("Feed post error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
