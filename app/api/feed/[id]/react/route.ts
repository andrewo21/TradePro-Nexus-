import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const VALID_TYPES = ["like", "fire", "strong", "on_the_job", "helpful", "connect"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const { type } = await request.json() as { type: string | null };

  // null or invalid type = remove reaction
  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    await db.from("post_reactions").delete()
      .eq("post_id", postId).eq("user_id", user.id);
    return NextResponse.json({ reaction: null, counts: await getCounts(db, postId) });
  }

  // Check if user already has a reaction on this post
  const { data: existing } = await db.from("post_reactions")
    .select("reaction_type").eq("post_id", postId).eq("user_id", user.id).single();

  if (existing?.reaction_type === type) {
    // Toggle off — remove
    await db.from("post_reactions").delete()
      .eq("post_id", postId).eq("user_id", user.id);
    return NextResponse.json({ reaction: null, counts: await getCounts(db, postId) });
  }

  // Upsert new reaction (insert or replace)
  await db.from("post_reactions").upsert(
    { post_id: postId, user_id: user.id, reaction_type: type },
    { onConflict: "post_id,user_id" }
  );

  return NextResponse.json({ reaction: type, counts: await getCounts(db, postId) });
}

async function getCounts(db: any, postId: string): Promise<Record<string, number>> {
  const { data } = await db.from("post_reactions")
    .select("reaction_type")
    .eq("post_id", postId);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.reaction_type] = (counts[row.reaction_type] ?? 0) + 1;
  }
  return counts;
}
