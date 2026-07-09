import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { ADMIN_EMAILS } from "@/lib/constants";

export async function POST() {
  const supabase = (await getSupabaseServer()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!ADMIN_EMAILS.includes(user?.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-news`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "admin_trigger" }),
      }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to trigger news fetch." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = (await getSupabaseServer()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!ADMIN_EMAILS.includes(user?.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { enabled } = await request.json() as { enabled: boolean };
  const db = getSupabaseAdmin() as any;
  await db.from("admin_settings").upsert(
    { key: "news_feed_enabled", value: enabled ? "true" : "false" },
    { onConflict: "key" }
  );
  return NextResponse.json({ ok: true, enabled });
}
