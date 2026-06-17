import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const BOT_PATTERN = /bot|crawl|spider|curl|python|wget|scraper|headless|phantom|selenium/i;

export async function POST(req: NextRequest) {
  // Ignore known bots and crawlers
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_PATTERN.test(ua)) {
    return NextResponse.json({ ok: true });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    const admin = getSupabaseAdmin() as any;
    await admin.rpc("increment_site_visits", { visit_date: today });
  } catch {
    // Never fail the client request over a tracking error
  }

  return NextResponse.json({ ok: true });
}
