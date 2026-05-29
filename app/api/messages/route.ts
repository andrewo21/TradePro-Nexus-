import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// GET /api/messages — list threads for the current GC user
export async function GET() {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ threads: [] });

  const role = user.user_metadata?.role;
  if (role !== "gc") return NextResponse.json({ threads: [], error: "GC accounts only." });

  const { data: threads } = await db
    .from("message_threads")
    .select("id, other_id, other_type, last_message_at, created_at")
    .eq("gc_user_id", user.id)
    .order("last_message_at", { ascending: false });

  return NextResponse.json({ threads: threads ?? [] });
}

// POST /api/messages — start or continue a thread { other_id, other_type, content }
export async function POST(request: NextRequest) {
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Only paid GCs can DM — check subscription
  const role = user.user_metadata?.role;
  if (role !== "gc") return NextResponse.json({ error: "GC accounts only." }, { status: 403 });

  // Verify active/trialing subscription
  const adminDb = getSupabaseAdmin() as any;
  const { data: company } = await adminDb.from("companies").select("id").eq("user_id", user.id).single();
  if (company) {
    const { data: sub } = await adminDb
      .from("gc_subscriptions")
      .select("status")
      .eq("company_id", company.id)
      .in("status", ["trialing", "active"])
      .single();
    if (!sub) return NextResponse.json({ error: "Active GC subscription required to send messages." }, { status: 403 });
  }

  const { other_id, other_type, content } = await request.json();
  if (!other_id || !other_type || !content?.trim()) {
    return NextResponse.json({ error: "other_id, other_type, and content required." }, { status: 400 });
  }

  // Upsert thread
  let { data: thread } = await db
    .from("message_threads")
    .select("id")
    .eq("gc_user_id", user.id)
    .eq("other_id", other_id)
    .single();

  if (!thread) {
    const { data: newThread } = await db
      .from("message_threads")
      .insert({ gc_user_id: user.id, other_id, other_type })
      .select()
      .single();
    thread = newThread;
  }

  if (!thread) return NextResponse.json({ error: "Failed to create thread." }, { status: 500 });

  // Insert message
  const { data: message } = await db
    .from("messages")
    .insert({ thread_id: thread.id, sender_user_id: user.id, content: content.trim() })
    .select()
    .single();

  // Update thread last_message_at
  await db.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", thread.id);

  return NextResponse.json({ thread_id: thread.id, message });
}
