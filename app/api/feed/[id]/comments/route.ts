import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

type Params = { params: Promise<{ id: string }> };

// GET /api/feed/[id]/comments
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const db = getSupabaseAdmin() as any;

  const { data: comments, error } = await db
    .from("post_comments")
    .select("id, content, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!comments?.length) return NextResponse.json({ comments: [] });

  // Enrich with profile info in one batch query
  const userIds = [...new Set(comments.map((c: any) => c.user_id))];
  const { data: profiles } = await db
    .from("profiles")
    .select("user_id, first_name, last_name, slug, trade, is_seed_account")
    .in("user_id", userIds);

  const pm: Record<string, any> = {};
  for (const p of profiles ?? []) pm[p.user_id] = p;

  const enriched = comments.map((c: any) => {
    const prof = pm[c.user_id];
    return {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user_id: c.user_id,
      author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Member",
      author_slug: prof?.slug ?? null,
      author_trade: prof?.trade ?? null,
    };
  });

  return NextResponse.json({ comments: enriched });
}

// POST /api/feed/[id]/comments
export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;

  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = (body.content ?? "").trim();
  if (!content || content.length > 1000) {
    return NextResponse.json({ error: "Comment must be 1–1000 characters." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  const { data: comment, error } = await db
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, content })
    .select("id, content, created_at, user_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with author profile
  const { data: prof } = await db
    .from("profiles")
    .select("first_name, last_name, slug, trade")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: comment.user_id,
      author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Member",
      author_slug: prof?.slug ?? null,
      author_trade: prof?.trade ?? null,
    },
  });
}
