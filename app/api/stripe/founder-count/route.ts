import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const db = getSupabaseAdmin() as any;
    const { count } = await db
      .from("gc_subscriptions")
      .select("*", { count: "exact", head: true });
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
