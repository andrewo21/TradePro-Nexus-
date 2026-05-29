import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// POST /api/feed/[id]/pin — toggle pinned post on the user's profile or company
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await db.from("profiles").select("id, pinned_post_id").eq("user_id", user.id).single();
  const { data: company } = await db.from("companies").select("id, pinned_post_id").eq("user_id", user.id).single();

  const target = profile ?? company;
  const table = profile ? "profiles" : "companies";
  if (!target) return NextResponse.json({ error: "No profile found." }, { status: 404 });

  // Toggle: if already pinned, unpin; otherwise pin
  const newPinId = target.pinned_post_id === postId ? null : postId;
  await db.from(table).update({ pinned_post_id: newPinId }).eq("id", target.id);

  return NextResponse.json({ pinned: newPinId !== null, post_id: newPinId });
}
