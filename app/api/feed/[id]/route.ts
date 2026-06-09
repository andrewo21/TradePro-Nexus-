import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

async function getAuthorId(db: any, user: any): Promise<{ id: string; type: "profile" | "company" } | null> {
  const [profRes, compRes] = await Promise.all([
    db.from("profiles").select("id").eq("user_id", user.id).single(),
    db.from("companies").select("id").eq("user_id", user.id).single(),
  ]);
  if (profRes.data) return { id: profRes.data.id, type: "profile" };
  if (compRes.data) return { id: compRes.data.id, type: "company" };
  return null;
}

// PATCH /api/feed/[id] — edit post content (owner only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const author = await getAuthorId(db, user);
  if (!author) return NextResponse.json({ error: "No profile found." }, { status: 404 });

  const { content, project_name, trade_tags } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const { data, error } = await db
    .from("feed_posts")
    .update({ content: content.trim(), project_name: project_name?.trim() || null, trade_tags: trade_tags ?? [] })
    .eq("id", id)
    .eq("author_id", author.id) // ensures ownership
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Post not found or not yours." }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/feed/[id] — delete post (owner or admin)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const isAdmin = user.email === ADMIN_EMAIL;

  if (isAdmin) {
    // Admin can delete any post — use service role to bypass RLS
    const adminDb = getSupabaseAdmin() as any;
    await adminDb.from("feed_posts").delete().eq("id", id);
    return NextResponse.json({ deleted: true });
  }

  // Regular user: owner check enforced
  const author = await getAuthorId(db, user);
  if (!author) return NextResponse.json({ error: "No profile found." }, { status: 404 });

  const { error } = await db
    .from("feed_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", author.id);

  if (error) return NextResponse.json({ error: "Post not found or not yours." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
