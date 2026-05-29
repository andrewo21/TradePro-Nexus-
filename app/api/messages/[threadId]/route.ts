import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/messages/[threadId] — get messages in a thread
export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Verify thread belongs to this GC
  const { data: thread } = await db.from("message_threads").select("id").eq("id", threadId).eq("gc_user_id", user.id).single();
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const { data: messages } = await db
    .from("messages")
    .select("id, sender_user_id, content, read_at, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  // Mark unread messages as read
  await db.from("messages").update({ read_at: new Date().toISOString() }).eq("thread_id", threadId).is("read_at", null).neq("sender_user_id", user.id);

  return NextResponse.json({ messages: messages ?? [] });
}

// POST /api/messages/[threadId] — send a reply in existing thread
export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: thread } = await db.from("message_threads").select("id").eq("id", threadId).eq("gc_user_id", user.id).single();
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const { data: message } = await db
    .from("messages")
    .insert({ thread_id: threadId, sender_user_id: user.id, content: content.trim() })
    .select()
    .single();

  await db.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);

  return NextResponse.json(message);
}
